const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');
const nodemailer = require('nodemailer');

// Configurar transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'eduardo@emhpsicoterapia.cl',
    pass: process.env.EMAIL_PASS || 'fhiu rxhd ycfr hczr'
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Error con nodemailer:', error);
  } else {
    console.log('✉️ Servidor de correo listo');
  }
});

/**
 * Función helper: Validar RUT chileno
 */
function validarRUT(rut) {
  // Remover puntos y guión
  const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '');
  
  // Verificar formato básico
  if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;
  
  // Extraer número y dígito verificador
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  // Calcular dígito verificador
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i)) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const dvEsperado = 11 - (suma % 11);
  let dvCalculado;
  
  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = dvEsperado.toString();
  
  return dv === dvCalculado;
}

/**
 * Función helper: Enviar correo de confirmación
 */
async function enviarCorreoConfirmacion(cita, tratamiento, patient) {
  const patientEmail = patient.email;
  const patientName = patient.full_name;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'eduardo@emhpsicoterapia.cl',
    to: patientEmail,
    subject: `Confirmación de Cita - ${tratamiento.name}`,
    html: `
      <h2>Cita Confirmada</h2>
      <p>Hola ${patientName},</p>
      <p>Tu cita ha sido confirmada exitosamente:</p>
      <ul>
        <li><strong>Tratamiento:</strong> ${tratamiento.name}</li>
        <li><strong>Fecha:</strong> ${new Date(cita.appointment_datetime).toLocaleDateString('es-CL')}</li>
        <li><strong>Hora:</strong> ${new Date(cita.appointment_datetime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</li>
        <li><strong>Precio:</strong> $${tratamiento.price_national} CLP</li>
      </ul>
      <p>Si necesitas cancelar o reprogramar, contáctanos con al menos 24 horas de anticipación.</p>
      <p>Saludos,<br>EMH Psicoterapia</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✉️ Correo enviado a:', patientEmail);
  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
  }
}

/**
 * @route   GET /api/citas/horarios-disponibles
 * @desc    Obtener horarios disponibles para una fecha específica
 * @access  Public
 */
router.get('/horarios-disponibles', async (req, res) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ message: 'Fecha es requerida' });
    }

    const date = new Date(fecha + 'T00:00:00');
    const dayOfWeek = date.getDay();

    // 1. Verificar si hay excepción para este día
    const { data: exception, error: excError } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('date', fecha)
      .is('deleted_at', null)
      .maybeSingle();

    if (excError) throw excError;

    let availableSlots = [];

    if (exception) {
      // Usar horario de excepción
      if (exception.is_available && exception.start_time && exception.end_time) {
        availableSlots.push({
          inicio: exception.start_time,
          fin: exception.end_time
        });
      }
    } else {
      // Usar horario semanal normal
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('start_time');

      if (schedError) throw schedError;

      availableSlots = schedules.map(s => ({
        inicio: s.start_time,
        fin: s.end_time
      }));
    }

    // 2. Obtener citas confirmadas/pendientes para este día
    const { data: citas, error: citasError } = await supabase
      .from('appointments')
      .select('appointment_datetime')
      .gte('appointment_datetime', `${fecha}T00:00:00`)
      .lt('appointment_datetime', `${fecha}T23:59:59`)
      .in('status', ['confirmed', 'pending']);

    if (citasError) throw citasError;

    // Extraer horas ocupadas
    const bookedTimes = new Set(
      citas.map(a => {
        const time = new Date(a.appointment_datetime);
        return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      })
    );

    // 3. Generar horas individuales disponibles (slots de 60 min)
    const horasDisponibles = [];
    availableSlots.forEach(slot => {
      const [startHour, startMin] = slot.inicio.split(':').map(Number);
      const [endHour, endMin] = slot.fin.split(':').map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;

      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        
        if (!bookedTimes.has(timeStr)) {
          horasDisponibles.push(timeStr);
        }

        // Incrementar 60 minutos
        currentMin += 60;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    });

    res.status(200).json({
      fecha,
      horariosDisponibles: horasDisponibles.sort(),
      totalHoras: horasDisponibles.length
    });
  } catch (error) {
    console.error('Error al obtener horarios disponibles:', error);
    res.status(500).json({ 
      message: 'Error al obtener horarios disponibles', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/citas
 * @desc    Crear una nueva cita
 * @access  Public (pero vincula al usuario si está autenticado)
 */
router.post('/', async (req, res) => {
  try {
    const { patient, treatment_id, fecha, hora, notas } = req.body;

    // Intentar extraer user_id del token (opcional)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Token inválido o expirado - continuar sin vincular
        console.log('Token opcional inválido, continuando sin vincular usuario');
      }
    }

    // Validar que venga el objeto patient
    if (!patient || typeof patient !== 'object') {
      return res.status(400).json({ 
        message: 'El campo "patient" es requerido y debe ser un objeto' 
      });
    }

    // Extraer datos del paciente (incluir user_id si está disponible)
    const patientData = {
      full_name: patient.full_name,
      email: patient.email,
      rut: patient.rut,
      phone: patient.phone,
      birth_date: patient.birth_date,
      address: patient.address,
      city: patient.city,
      region: patient.region,
      emergency_contact_name: patient.emergency_contact_name,
      emergency_contact_phone: patient.emergency_contact_phone,
      medical_notes: patient.medical_notes,
      user_id: userId // Vincular al usuario si está autenticado
    };

    // Validaciones básicas
    if (!patientData.full_name || !patientData.email || !treatment_id || !fecha || !hora) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: patient.full_name, patient.email, treatment_id, fecha, hora' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientData.email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    // Validar RUT si se proporciona
    if (patientData.rut && !validarRUT(patientData.rut)) {
      return res.status(400).json({ message: 'RUT inválido' });
    }

    // 1. Buscar o crear paciente
    let patientId;
    
    // Primero intentar buscar por RUT (si existe)
    if (patientData.rut) {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('rut', patientData.rut)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (existingPatient) {
        patientId = existingPatient.id;
        
        // Actualizar datos del paciente si hay cambios
        await supabase
          .from('patients')
          .update({
            ...patientData,
            updated_at: new Date().toISOString()
          })
          .eq('id', patientId);
      }
    }
    
    // Si no se encontró por RUT, buscar por email
    if (!patientId) {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('email', patientData.email)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (existingPatient) {
        patientId = existingPatient.id;
        
        // Actualizar datos del paciente
        await supabase
          .from('patients')
          .update({
            ...patientData,
            updated_at: new Date().toISOString()
          })
          .eq('id', patientId);
      }
    }
    
    // Si no existe, crear nuevo paciente
    if (!patientId) {
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert([patientData])
        .select('id')
        .single();
      
      if (patientError) throw patientError;
      patientId = newPatient.id;
    }

    // 2. Verificar que el tratamiento existe
    const { data: tratamiento, error: tratError } = await supabase
      .from('treatments')
      .select('*')
      .eq('id', treatment_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (tratError || !tratamiento) {
      return res.status(404).json({ message: 'Tratamiento no encontrado o inactivo' });
    }

    // 3. Construir fecha y hora completa
    const appointmentDateTime = `${fecha}T${hora}:00`;

    // 4. Verificar disponibilidad
    const { data: existingAppt, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_datetime', appointmentDateTime)
      .in('status', ['confirmed', 'pending'])
      .is('deleted_at', null)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingAppt) {
      return res.status(409).json({ 
        message: 'Esta hora ya está reservada. Por favor selecciona otra.' 
      });
    }

    // 5. Crear la cita con patient_id
    const { data: cita, error: citaError } = await supabase
      .from('appointments')
      .insert([{
        treatment_id: treatment_id,
        patient_id: patientId,
        appointment_datetime: appointmentDateTime,
        status: 'pending',
        notes: notas,
        price_national: tratamiento.price_national,
        price_international: tratamiento.price_international,
        sessions: tratamiento.sessions
      }])
      .select()
      .single();

    if (citaError) throw citaError;

    // 6. Obtener datos completos del paciente para respuesta y correo
    const { data: patientInfo } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    // Enviar correo de confirmación (asíncrono)
    enviarCorreoConfirmacion(cita, tratamiento, patientInfo).catch(err => 
      console.error('Error al enviar correo:', err)
    );

    res.status(201).json({ 
      success: true,
      message: 'Cita creada exitosamente. Recibirás un correo de confirmación.',
      cita: {
        id: cita.id,
        patient_id: patientId,
        treatment_id: tratamiento.id,
        tratamiento: tratamiento.name,
        fecha: fecha,
        hora: hora,
        appointment_datetime: cita.appointment_datetime,
        status: cita.status
      },
      paciente: {
        id: patientInfo.id,
        full_name: patientInfo.full_name,
        email: patientInfo.email,
        rut: patientInfo.rut,
        phone: patientInfo.phone
      }
    });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({ 
      message: 'Error al crear cita', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/citas/mis-citas
 * @desc    Obtener las citas del usuario autenticado
 * @access  Private (Usuario regular)
 */
router.get('/mis-citas', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar citas del usuario a través de la relación patients.user_id
    const { data: citas, error } = await supabase
      .from('appointments')
      .select(`
        *,
        treatments (
          id,
          name,
          description,
          price_national,
          price_international,
          sessions
        ),
        patients!inner (
          id,
          full_name,
          email,
          phone,
          city
        )
      `)
      .eq('patients.user_id', userId)
      .is('deleted_at', null)
      .order('appointment_datetime', { ascending: false });

    if (error) throw error;

    res.status(200).json(citas);
  } catch (error) {
    console.error('Error al obtener mis citas:', error);
    res.status(500).json({ 
      message: 'Error al obtener tus citas', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/citas
 * @desc    Obtener todas las citas (con filtros opcionales)
 * @access  Private (Admin)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { status, fecha, tratamientoId } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        treatments (
          id,
          name,
          price_national,
          price_international
        ),
        patients (
          id,
          full_name,
          email,
          rut,
          phone,
          city
        )
      `)
      .order('appointment_datetime', { ascending: false });

    // Aplicar filtros opcionales
    if (status) {
      query = query.eq('status', status);
    }

    if (fecha) {
      query = query.gte('appointment_datetime', `${fecha}T00:00:00`)
                   .lt('appointment_datetime', `${fecha}T23:59:59`);
    }

    if (tratamientoId) {
      query = query.eq('treatment_id', tratamientoId);
    }

    const { data: citas, error } = await query;

    if (error) throw error;

    res.status(200).json(citas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ 
      message: 'Error al obtener citas', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/citas/:id
 * @desc    Obtener una cita específica
 * @access  Private (Admin)
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    const { data: cita, error } = await supabase
      .from('appointments')
      .select(`
        *,
        treatments (
          id,
          name,
          price_national,
          price_international,
          sessions
        ),
        patients (
          id,
          full_name,
          email,
          rut,
          phone,
          birth_date,
          city,
          emergency_contact_name,
          emergency_contact_phone,
          medical_notes
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.status(200).json(cita);
  } catch (error) {
    console.error('Error al obtener cita:', error);
    res.status(500).json({ 
      message: 'Error al obtener cita', 
      error: error.message 
    });
  }
});

/**
 * @route   PATCH /api/citas/:id/status
 * @desc    Actualizar el estado de una cita
 * @access  Private (Admin)
 */
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Status inválido. Opciones: ${validStatuses.join(', ')}` 
      });
    }

    const { data: cita, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.status(200).json({ 
      message: `Cita ${status}`,
      cita 
    });
  } catch (error) {
    console.error('Error al actualizar status de cita:', error);
    res.status(500).json({ 
      message: 'Error al actualizar status de cita', 
      error: error.message 
    });
  }
});

/**
 * @route   PATCH /api/citas/:id/pago
 * @desc    Actualizar el estado de pago de una cita
 * @access  Private (Admin)
 */
router.patch('/:id/pago', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { paymentStatus, paymentMethod, transactionId } = req.body;

    const validPaymentStatuses = ['pending', 'paid', 'refunded', 'failed'];
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        message: `Estado de pago inválido. Opciones: ${validPaymentStatuses.join(', ')}` 
      });
    }

    const updateData = { payment_status: paymentStatus };
    if (paymentMethod) updateData.payment_method = paymentMethod;
    if (transactionId) updateData.transaction_id = transactionId;

    const { data: cita, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.status(200).json({ 
      message: 'Estado de pago actualizado',
      cita 
    });
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    res.status(500).json({ 
      message: 'Error al actualizar pago', 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/citas/:id
 * @desc    Reprogramar una cita (cambiar fecha/hora)
 * @access  Private (Admin)
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { fecha, hora, notas } = req.body;

    if (!fecha || !hora) {
      return res.status(400).json({ message: 'fecha y hora son requeridos' });
    }

    const appointmentDateTime = `${fecha}T${hora}:00`;

    // Verificar que no haya otra cita en ese horario
    const { data: existingAppt, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_datetime', appointmentDateTime)
      .neq('id', id) // Excluir la cita actual
      .in('status', ['confirmed', 'pending'])
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingAppt) {
      return res.status(409).json({ 
        message: 'Esta hora ya está reservada. Por favor selecciona otra.' 
      });
    }

    const updateData = { appointment_datetime: appointmentDateTime };
    if (notas !== undefined) updateData.notes = notas;

    const { data: cita, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.status(200).json({ 
      message: 'Cita reprogramada exitosamente',
      cita 
    });
  } catch (error) {
    console.error('Error al reprogramar cita:', error);
    res.status(500).json({ 
      message: 'Error al reprogramar cita', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/citas/:id
 * @desc    Cancelar una cita (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    // Actualizar status a cancelada y soft delete
    const { data: cita, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        deleted_at: new Date().toISOString() 
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!cita) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.status(200).json({ message: 'Cita cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).json({ 
      message: 'Error al cancelar cita', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/citas/estadisticas/resumen
 * @desc    Obtener estadísticas de citas
 * @access  Private (Admin)
 */
router.get('/estadisticas/resumen', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Obtener citas del mes actual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const { data: citas, error } = await supabase
      .from('appointments')
      .select('status, payment_status')
      .gte('appointment_datetime', firstDay)
      .lte('appointment_datetime', lastDay);

    if (error) throw error;

    const stats = {
      totalCitas: citas.length,
      confirmadas: citas.filter(c => c.status === 'confirmed').length,
      pendientes: citas.filter(c => c.status === 'pending').length,
      completadas: citas.filter(c => c.status === 'completed').length,
      canceladas: citas.filter(c => c.status === 'cancelled').length,
      pagadas: citas.filter(c => c.payment_status === 'paid').length,
      pendientesPago: citas.filter(c => c.payment_status === 'pending').length
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas', 
      error: error.message 
    });
  }
});

module.exports = router;
