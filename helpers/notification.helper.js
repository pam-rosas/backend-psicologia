// helpers/notification.helper.js
const emailService = require('../services/email.service');
const moment = require('moment-timezone');

/**
 * Helper para formatear datos de cita antes de enviar notificaciones
 * Utiliza envío asíncrono con cola para no bloquear el sistema
 */
class NotificationHelper {
  
  /**
   * Formatea una fecha para mostrar en emails
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {string} - Fecha formateada en español
   */
  static formatDate(fecha) {
    return moment(fecha).locale('es').format('dddd, D [de] MMMM [de] YYYY');
  }

  /**
   * Formatea una hora para mostrar en emails
   * @param {string} hora - Hora en formato HH:mm o HH:mm:ss
   * @returns {string} - Hora formateada
   */
  static formatTime(hora) {
    // Si la hora incluye segundos, los removemos
    return hora.substring(0, 5);
  }

  /**
   * Envía notificaciones de confirmación de cita después de una reserva
   * Usa envío asíncrono para no bloquear la respuesta
   * @param {Object} citaData - Datos de la cita
   * @param {Object} paqueteData - Datos del paquete/tratamiento
   * @param {string} paymentId - ID del pago (opcional)
   * @param {boolean} async - Si es true, usa cola asíncrona (default: true)
   */
  static async notifyAppointmentConfirmation(citaData, paqueteData, paymentId = null, async = true) {
    try {
      console.log('📧 Preparando notificaciones de confirmación de cita...');

      const appointmentData = {
        patientEmail: citaData.email_paciente,
        patientName: citaData.nombre_paciente,
        patientPhone: citaData.telefono_paciente,
        date: this.formatDate(citaData.fecha),
        time: this.formatTime(citaData.hora),
        treatmentName: paqueteData.nombre,
        price: paqueteData.precio_nacional,
        paymentId: paymentId
      };

      // Preparar emails
      const patientEmailData = {
        to: appointmentData.patientEmail,
        subject: '✅ Confirmación de Cita - EMH Psicoterapia Online',
        html: emailService.generateAppointmentConfirmationHTML(appointmentData)
      };

      const adminEmailData = {
        to: emailService.adminEmail,
        subject: '🔔 Nueva Cita Agendada - EMH Psicoterapia Online',
        html: emailService.generateAdminAppointmentNotificationHTML(appointmentData)
      };

      if (async) {
        // Envío asíncrono - no bloquea la respuesta
        emailService.queueEmail(patientEmailData);
        emailService.queueEmail(adminEmailData);
        console.log('✅ Notificaciones añadidas a la cola de envío');
        return { success: true, queued: true };
      } else {
        // Envío síncrono - espera respuesta (solo para casos críticos)
        const results = await Promise.allSettled([
          emailService.sendEmail(patientEmailData),
          emailService.sendEmail(adminEmailData)
        ]);
        console.log('✅ Notificaciones enviadas síncronamente');
        return { success: true, results };
      }
    } catch (error) {
      console.error('❌ Error preparando notificaciones:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificaciones de reagendamiento de cita
   * Usa envío asíncrono para no bloquear la respuesta
   * @param {Object} citaAnterior - Datos de la cita anterior
   * @param {Object} citaNueva - Datos de la nueva cita
   * @param {Object} paqueteData - Datos del paquete/tratamiento
   * @param {boolean} async - Si es true, usa cola asíncrona (default: true)
   */
  static async notifyReschedule(citaAnterior, citaNueva, paqueteData, async = true) {
    try {
      console.log('📧 Preparando notificaciones de reagendamiento...');

      const rescheduleData = {
        patientEmail: citaNueva.email_paciente,
        patientName: citaNueva.nombre_paciente,
        patientPhone: citaNueva.telefono_paciente,
        oldDate: this.formatDate(citaAnterior.fecha),
        oldTime: this.formatTime(citaAnterior.hora),
        newDate: this.formatDate(citaNueva.fecha),
        newTime: this.formatTime(citaNueva.hora),
        treatmentName: paqueteData.nombre
      };

      // Preparar emails
      const patientEmailData = {
        to: rescheduleData.patientEmail,
        subject: '📅 Cita Reagendada - EMH Psicoterapia Online',
        html: emailService.generateRescheduleConfirmationHTML(rescheduleData)
      };

      const adminEmailData = {
        to: emailService.adminEmail,
        subject: '📅 Cita Reagendada por Paciente - EMH Psicoterapia Online',
        html: emailService.generateAdminRescheduleNotificationHTML(rescheduleData)
      };

      if (async) {
        // Envío asíncrono - no bloquea la respuesta
        emailService.queueEmail(patientEmailData);
        emailService.queueEmail(adminEmailData);
        console.log('✅ Notificaciones de reagendamiento añadidas a la cola');
        return { success: true, queued: true };
      } else {
        // Envío síncrono
        const results = await Promise.allSettled([
          emailService.sendEmail(patientEmailData),
          emailService.sendEmail(adminEmailData)
        ]);
        console.log('✅ Notificaciones de reagendamiento enviadas síncronamente');
        return { success: true, results };
      }
    } catch (error) {
      console.error('❌ Error preparando notificaciones de reagendamiento:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificaciones de cancelación de cita
   * Usa envío asíncrono para no bloquear la respuesta
   * @param {Object} citaData - Datos de la cita cancelada
   * @param {Object} paqueteData - Datos del paquete/tratamiento
   * @param {string} reason - Motivo de cancelación (opcional)
   * @param {boolean} async - Si es true, usa cola asíncrona (default: true)
   */
  static async notifyCancellation(citaData, paqueteData, reason = null, async = true) {
    try {
      console.log('📧 Preparando notificaciones de cancelación...');

      const cancellationData = {
        patientEmail: citaData.email_paciente,
        patientName: citaData.nombre_paciente,
        patientPhone: citaData.telefono_paciente,
        date: this.formatDate(citaData.fecha),
        time: this.formatTime(citaData.hora),
        treatmentName: paqueteData.nombre,
        reason: reason
      };

      // Preparar emails
      const patientEmailData = {
        to: cancellationData.patientEmail,
        subject: '❌ Cita Cancelada - EMH Psicoterapia Online',
        html: emailService.generateCancellationConfirmationHTML(cancellationData)
      };

      const adminEmailData = {
        to: emailService.adminEmail,
        subject: '❌ Cita Cancelada - EMH Psicoterapia Online',
        html: emailService.generateAdminCancellationNotificationHTML(cancellationData)
      };

      if (async) {
        // Envío asíncrono - no bloquea la respuesta
        emailService.queueEmail(patientEmailData);
        emailService.queueEmail(adminEmailData);
        console.log('✅ Notificaciones de cancelación añadidas a la cola');
        return { success: true, queued: true };
      } else {
        // Envío síncrono
        const results = await Promise.allSettled([
          emailService.sendEmail(patientEmailData),
          emailService.sendEmail(adminEmailData)
        ]);
        console.log('✅ Notificaciones de cancelación enviadas síncronamente');
        return { success: true, results };
      }
    } catch (error) {
      console.error('❌ Error preparando notificaciones de cancelación:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificación cuando el admin crea una cita manualmente
   * Similar a notifyAppointmentConfirmation pero sin ID de pago
   */
  static async notifyManualAppointmentCreation(citaData, paqueteData) {
    return this.notifyAppointmentConfirmation(citaData, paqueteData, null);
  }

  /**
   * Envía notificación cuando el admin cambia el estado de una cita
   * (solo si es cancelación)
   */
  static async notifyStatusChange(citaData, paqueteData, newStatus, oldStatus) {
    // Solo enviamos notificación si la cita se está cancelando
    if (newStatus === 'cancelada' && oldStatus !== 'cancelada') {
      return this.notifyCancellation(citaData, paqueteData, 'Cancelada por el administrador');
    }
    
    return { success: true, message: 'No se requiere notificación para este cambio de estado' };
  }
}

module.exports = NotificationHelper;
