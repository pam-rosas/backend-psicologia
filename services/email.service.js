// services/email.service.js
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.adminEmail = process.env.ADMIN_EMAIL;
    this.isConfigured = false;
    this.emailQueue = [];
    this.isProcessingQueue = false;
    
    // Detectar si estamos en Render (SMTP bloqueado)
    this.isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_NAME;
    
    // Configuración de retry (adaptativa según entorno)
    this.maxRetries = this.isRender ? 1 : 3; // Solo 1 intento en Render
    this.retryDelay = 2000; // 2 segundos entre intentos
    this.timeout = this.isRender ? 3000 : 15000; // 3s en Render, 15s en otros
    
    this.initializeTransporter();
  }

  /**
   * Inicializa el transporter de nodemailer con Gmail
   */
  initializeTransporter() {
    try {
      // Si estamos en Render, desactivar completamente el email
      if (this.isRender) {
        console.warn('🚫 Email service disabled on Render (SMTP ports blocked)');
        console.warn('   → Emails will be skipped (non-blocking)');
        this.isConfigured = false;
        return;
      }

      // Verificar si las variables de entorno están configuradas
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️  Email service not configured (missing GMAIL_USER or GMAIL_APP_PASSWORD)');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        },
        // Configuración optimizada para evitar timeouts
        connectionTimeout: this.timeout, // Usa timeout adaptativo
        greetingTimeout: Math.min(this.timeout, 10000),
        socketTimeout: this.timeout,
        pool: true, // Usar pool de conexiones
        maxConnections: 5, // Máximo 5 conexiones simultáneas
        maxMessages: 100, // Máximo 100 mensajes por conexión
        rateDelta: 1000, // Intervalo de rate limiting
        rateLimit: 5 // Máximo 5 emails por segundo
      });

      this.isConfigured = true;
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing email service:', error.message);
      this.isConfigured = false;
      // NO lanzar error - permitir que la app continúe sin email
    }
  }

  /**
   * Sleep utility para delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sleep utility para delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica que el servicio de email esté configurado correctamente
   */
  async verifyConnection() {
    if (!this.isConfigured) {
      console.warn('⚠️  Email service not configured, skipping verification');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Envía un email con retry logic y timeout
   * @param {Object} options - Opciones del email
   * @param {string} options.to - Destinatario
   * @param {string} options.subject - Asunto
   * @param {string} options.html - Contenido HTML
   * @param {string} options.text - Contenido texto plano (opcional)
   * @param {number} options.retryCount - Contador interno de reintentos
   */
  async sendEmailWithRetry({ to, subject, html, text, retryCount = 0 }) {
    // Verificar si el servicio está configurado
    if (!this.isConfigured) {
      // Solo log en primer intento para no spam en Render
      if (retryCount === 0) {
        console.warn(`⚠️  Email skipped (${this.isRender ? 'Render SMTP blocked' : 'not configured'}): ${subject}`);
      }
      return { 
        success: false, 
        error: this.isRender ? 'SMTP blocked on Render' : 'Email service not configured',
        skipped: true 
      };
    }

    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"EMH Psicoterapia Online" <${process.env.GMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      // Crear promesa con timeout
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email timeout exceeded')), this.timeout)
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);
      console.log(`✅ Email sent successfully: ${subject} -> ${to} (attempt ${retryCount + 1})`);
      return { success: true, messageId: info.messageId, attempts: retryCount + 1 };

    } catch (error) {
      const isLastAttempt = retryCount >= this.maxRetries - 1;
      
      if (isLastAttempt) {
        console.error(`❌ Email failed after ${this.maxRetries} attempts: ${subject} -> ${to}`);
        console.error(`   Error: ${error.message}`);
        return { 
          success: false, 
          error: error.message,
          skipped: false,
          attempts: retryCount + 1
        };
      }

      // Retry con exponential backoff
      const delay = this.retryDelay * Math.pow(2, retryCount);
      console.warn(`⚠️  Email attempt ${retryCount + 1} failed, retrying in ${delay}ms: ${subject}`);
      await this.sleep(delay);
      
      return await this.sendEmailWithRetry({ 
        to, 
        subject, 
        html, 
        text, 
        retryCount: retryCount + 1 
      });
    }
  }

  /**
   * Añade email a la cola para envío asíncrono
   * @param {Object} emailData - Datos del email
   */
  async queueEmail(emailData) {
    this.emailQueue.push({
      ...emailData,
      timestamp: Date.now(),
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    console.log(`📬 Email queued: ${emailData.subject} (Queue size: ${this.emailQueue.length})`);
    
    // Iniciar procesamiento de cola si no está en curso
    if (!this.isProcessingQueue) {
      this.processQueue();
    }

    return { queued: true, queueSize: this.emailQueue.length };
  }

  /**
   * Procesa la cola de emails de forma asíncrona
   */
  async processQueue() {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    console.log('🚀 Starting email queue processing...');

    while (this.emailQueue.length > 0) {
      const emailData = this.emailQueue.shift();
      
      try {
        await this.sendEmailWithRetry(emailData);
        // Pequeño delay entre emails para no saturar
        await this.sleep(200);
      } catch (error) {
        console.error(`❌ Critical error processing email ${emailData.id}:`, error.message);
        // Continuar con el siguiente email
      }
    }

    this.isProcessingQueue = false;
    console.log('✅ Email queue processing completed');
  }

  /**
   * Envía un email (método legacy - ahora usa sendEmailWithRetry)
   */
  async sendEmail({ to, subject, html, text }) {
    return await this.sendEmailWithRetry({ to, subject, html, text });
  }

  /**
   * Envía notificación de confirmación de cita al paciente
   */
  async sendAppointmentConfirmation(appointmentData) {
    const { patientEmail, patientName, date, time, treatmentName, price } = appointmentData;

    const subject = '✅ Confirmación de Cita - EMH Psicoterapia Online';
    const html = this.generateAppointmentConfirmationHTML({
      patientName,
      date,
      time,
      treatmentName,
      price
    });

    return await this.sendEmail({
      to: patientEmail,
      subject,
      html
    });
  }

  /**
   * Envía notificación de confirmación de cita al admin
   */
  async sendAppointmentConfirmationToAdmin(appointmentData) {
    const { patientEmail, patientName, patientPhone, date, time, treatmentName, price, paymentId } = appointmentData;

    const subject = '🔔 Nueva Cita Agendada - EMH Psicoterapia Online';
    const html = this.generateAdminAppointmentNotificationHTML({
      patientName,
      patientEmail,
      patientPhone,
      date,
      time,
      treatmentName,
      price,
      paymentId
    });

    return await this.sendEmail({
      to: this.adminEmail,
      subject,
      html
    });
  }

  /**
   * Envía notificación de reagendamiento al paciente
   */
  async sendRescheduleConfirmation(rescheduleData) {
    const { patientEmail, patientName, oldDate, oldTime, newDate, newTime, treatmentName } = rescheduleData;

    const subject = '📅 Cita Reagendada - EMH Psicoterapia Online';
    const html = this.generateRescheduleConfirmationHTML({
      patientName,
      oldDate,
      oldTime,
      newDate,
      newTime,
      treatmentName
    });

    return await this.sendEmail({
      to: patientEmail,
      subject,
      html
    });
  }

  /**
   * Envía notificación de reagendamiento al admin
   */
  async sendRescheduleConfirmationToAdmin(rescheduleData) {
    const { patientEmail, patientName, patientPhone, oldDate, oldTime, newDate, newTime, treatmentName } = rescheduleData;

    const subject = '📅 Cita Reagendada por Paciente - EMH Psicoterapia Online';
    const html = this.generateAdminRescheduleNotificationHTML({
      patientName,
      patientEmail,
      patientPhone,
      oldDate,
      oldTime,
      newDate,
      newTime,
      treatmentName
    });

    return await this.sendEmail({
      to: this.adminEmail,
      subject,
      html
    });
  }

  /**
   * Envía notificación de cancelación al paciente
   */
  async sendCancellationConfirmation(cancellationData) {
    const { patientEmail, patientName, date, time, treatmentName, reason } = cancellationData;

    const subject = '❌ Cita Cancelada - EMH Psicoterapia Online';
    const html = this.generateCancellationConfirmationHTML({
      patientName,
      date,
      time,
      treatmentName,
      reason
    });

    return await this.sendEmail({
      to: patientEmail,
      subject,
      html
    });
  }

  /**
   * Envía notificación de cancelación al admin
   */
  async sendCancellationConfirmationToAdmin(cancellationData) {
    const { patientEmail, patientName, patientPhone, date, time, treatmentName, reason } = cancellationData;

    const subject = '❌ Cita Cancelada por Paciente - EMH Psicoterapia Online';
    const html = this.generateAdminCancellationNotificationHTML({
      patientName,
      patientEmail,
      patientPhone,
      date,
      time,
      treatmentName,
      reason
    });

    return await this.sendEmail({
      to: this.adminEmail,
      subject,
      html
    });
  }

  // ============================================================================
  // GENERADORES DE TEMPLATES HTML
  // ============================================================================

  /**
   * Genera HTML para confirmación de cita al paciente
   */
  generateAppointmentConfirmationHTML(data) {
    const { patientName, date, time, treatmentName, price } = data;
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #667eea; }
          .detail-value { color: #333; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .success-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="success-icon">✅</div>
          <h1>¡Cita Confirmada!</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${patientName}</strong>,</p>
          <p>Tu cita ha sido confirmada exitosamente. A continuación encontrarás los detalles:</p>
          
          <div class="appointment-details">
            <div class="detail-row">
              <span class="detail-label">Tratamiento:</span>
              <span class="detail-value">${treatmentName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Fecha:</span>
              <span class="detail-value">${date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Hora:</span>
              <span class="detail-value">${time}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Precio:</span>
              <span class="detail-value">$${price.toLocaleString('es-CL')} CLP</span>
            </div>
          </div>

          <p><strong>Importante:</strong></p>
          <ul>
            <li>Te enviaremos un recordatorio 24 horas antes de tu cita</li>
            <li>Si necesitas reagendar, por favor contáctanos con al menos 24 horas de anticipación</li>
            <li>Asegúrate de tener una conexión estable a internet para la sesión online</li>
          </ul>

          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        </div>
        <div class="footer">
          <p><strong>EMH Psicoterapia Online</strong></p>
          <p>Email: contacto@emhpsicoterapiaonline.com</p>
          <p>WhatsApp: +56 9 9473 9587</p>
          <p>© ${new Date().getFullYear()} EMH Psicoterapia Online. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera HTML para notificación de cita al admin
   */
  generateAdminAppointmentNotificationHTML(data) {
    const { patientName, patientEmail, patientPhone, date, time, treatmentName, price, paymentId } = data;
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c3e50; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #2c3e50; }
          .detail-value { color: #333; }
          .alert-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="alert-icon">🔔</div>
          <h1>Nueva Cita Agendada</h1>
        </div>
        <div class="content">
          <p>Se ha registrado una nueva cita en el sistema:</p>
          
          <div class="appointment-details">
            <h3>Información del Paciente</h3>
            <div class="detail-row">
              <span class="detail-label">Nombre:</span>
              <span class="detail-value">${patientName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${patientEmail}</span>
            </div>
            ${patientPhone ? `
            <div class="detail-row">
              <span class="detail-label">Teléfono:</span>
              <span class="detail-value">${patientPhone}</span>
            </div>
            ` : ''}
            
            <h3 style="margin-top: 20px;">Detalles de la Cita</h3>
            <div class="detail-row">
              <span class="detail-label">Tratamiento:</span>
              <span class="detail-value">${treatmentName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Fecha:</span>
              <span class="detail-value">${date}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Hora:</span>
              <span class="detail-value">${time}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Precio:</span>
              <span class="detail-value">$${price.toLocaleString('es-CL')} CLP</span>
            </div>
            ${paymentId ? `
            <div class="detail-row">
              <span class="detail-label">ID de Pago:</span>
              <span class="detail-value">${paymentId}</span>
            </div>
            ` : ''}
          </div>

          <p><strong>Acción requerida:</strong> Verifica la disponibilidad y prepara los materiales necesarios para la sesión.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera HTML para confirmación de reagendamiento al paciente
   */
  generateRescheduleConfirmationHTML(data) {
    const { patientName, oldDate, oldTime, newDate, newTime, treatmentName } = data;
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .old-date { text-decoration: line-through; color: #999; }
          .new-date { color: #27ae60; font-weight: bold; }
          .detail-row { margin: 10px 0; padding: 10px; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="icon">📅</div>
          <h1>Cita Reagendada</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${patientName}</strong>,</p>
          <p>Tu cita ha sido reagendada exitosamente.</p>
          
          <div class="appointment-details">
            <h3>Tratamiento: ${treatmentName}</h3>
            
            <div class="detail-row">
              <p><strong>Fecha anterior:</strong> <span class="old-date">${oldDate} a las ${oldTime}</span></p>
            </div>
            
            <div class="detail-row">
              <p><strong>Nueva fecha:</strong> <span class="new-date">${newDate} a las ${newTime}</span></p>
            </div>
          </div>

          <p>Te enviaremos un recordatorio 24 horas antes de tu nueva cita.</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p><strong>EMH Psicoterapia Online</strong></p>
          <p>Email: contacto@emhpsicoterapiaonline.com</p>
          <p>WhatsApp: +56 9 9473 9587</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera HTML para notificación de reagendamiento al admin
   */
  generateAdminRescheduleNotificationHTML(data) {
    const { patientName, patientEmail, patientPhone, oldDate, oldTime, newDate, newTime, treatmentName } = data;
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
          .old-date { text-decoration: line-through; color: #999; }
          .new-date { color: #27ae60; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 48px; margin-bottom: 10px;">📅</div>
          <h1>Cita Reagendada</h1>
        </div>
        <div class="content">
          <p>El paciente <strong>${patientName}</strong> ha reagendado su cita.</p>
          
          <div class="appointment-details">
            <h3>Información del Paciente</h3>
            <div class="detail-row">
              <strong>Nombre:</strong> ${patientName}
            </div>
            <div class="detail-row">
              <strong>Email:</strong> ${patientEmail}
            </div>
            ${patientPhone ? `
            <div class="detail-row">
              <strong>Teléfono:</strong> ${patientPhone}
            </div>
            ` : ''}
            
            <h3 style="margin-top: 20px;">Cambios en la Cita</h3>
            <div class="detail-row">
              <strong>Tratamiento:</strong> ${treatmentName}
            </div>
            <div class="detail-row">
              <strong>Fecha anterior:</strong> <span class="old-date">${oldDate} a las ${oldTime}</span>
            </div>
            <div class="detail-row">
              <strong>Nueva fecha:</strong> <span class="new-date">${newDate} a las ${newTime}</span>
            </div>
          </div>

          <p><strong>Acción requerida:</strong> Actualiza tu calendario con la nueva fecha.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera HTML para confirmación de cancelación al paciente
   */
  generateCancellationConfirmationHTML(data) {
    const { patientName, date, time, treatmentName, reason } = data;
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c; }
          .detail-row { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="icon">❌</div>
          <h1>Cita Cancelada</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${patientName}</strong>,</p>
          <p>Tu cita ha sido cancelada según tu solicitud.</p>
          
          <div class="appointment-details">
            <h3>Detalles de la Cita Cancelada</h3>
            <div class="detail-row">
              <strong>Tratamiento:</strong> ${treatmentName}
            </div>
            <div class="detail-row">
              <strong>Fecha:</strong> ${date}
            </div>
            <div class="detail-row">
              <strong>Hora:</strong> ${time}
            </div>
            ${reason ? `
            <div class="detail-row">
              <strong>Motivo:</strong> ${reason}
            </div>
            ` : ''}
          </div>

          <p>Si deseas agendar una nueva cita, puedes hacerlo a través de nuestra plataforma en cualquier momento.</p>
          <p>Esperamos verte pronto.</p>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p><strong>EMH Psicoterapia Online</strong></p>
          <p>Email: contacto@emhpsicoterapiaonline.com</p>
          <p>WhatsApp: +56 9 9473 9587</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera HTML para notificación de cancelación al admin
   */
  generateAdminCancellationNotificationHTML(data) {
    const { patientName, patientEmail, patientPhone, date, time, treatmentName, reason } = data;
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
          <h1>Cita Cancelada</h1>
        </div>
        <div class="content">
          <p>El paciente <strong>${patientName}</strong> ha cancelado su cita.</p>
          
          <div class="appointment-details">
            <h3>Información del Paciente</h3>
            <div class="detail-row">
              <strong>Nombre:</strong> ${patientName}
            </div>
            <div class="detail-row">
              <strong>Email:</strong> ${patientEmail}
            </div>
            ${patientPhone ? `
            <div class="detail-row">
              <strong>Teléfono:</strong> ${patientPhone}
            </div>
            ` : ''}
            
            <h3 style="margin-top: 20px;">Detalles de la Cita Cancelada</h3>
            <div class="detail-row">
              <strong>Tratamiento:</strong> ${treatmentName}
            </div>
            <div class="detail-row">
              <strong>Fecha:</strong> ${date}
            </div>
            <div class="detail-row">
              <strong>Hora:</strong> ${time}
            </div>
            ${reason ? `
            <div class="detail-row">
              <strong>Motivo:</strong> ${reason}
            </div>
            ` : ''}
          </div>

          <p><strong>Acción requerida:</strong> Actualiza tu calendario y la disponibilidad del horario.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Elimina tags HTML de un string
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

// Crear instancia singleton
const emailService = new EmailService();

module.exports = emailService;
