const express = require('express');
const router = express.Router();
const db = require('../firebase/config'); // Usar Firebase config
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
const zonaHoraria = 'America/Santiago';  // O la zona horaria que necesitas

// Configura el transporte SMTP para Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'eduardo@emhpsicoterapia.cl',
    pass: 'fhiu rxhd ycfr hczr'  // eduardo@emhpsicoterapia.cl   pass fhiu rxhd ycfr hczr Asegúrate de usar la contraseña correcta o un token de aplicación
  }
});
//

// rjef xrxc ercx ragf ---> pass de pam.latasoft@gmail.com
transporter.verify((error, success) => {
  if (error) {
    console.error('Error con nodemailer:', error);
  } else {
    console.log('Servidor de correo listo');
  }
});

// Mapeo de tratamientos y precios
const tratamientos = {
  'Taller de duelo': {
    precioNacional: 70000,
    precioInternacional: 85,
    sesiones: 4,
  },
  'Psicoterapia e hipnoterapia': {
    precioNacional: 40000,
    precioInternacional: 50,
    sesiones: 1,
  }
};

const diasMap = {
  'lunes': 'lunes',
  'martes': 'martes',
  'miércoles': 'miercoles',
  'jueves': 'jueves',
  'viernes': 'viernes',
  'sábado': 'sabado',
  'domingo': 'domingo',
};

// Obtener el horario válido para una fecha (considerando excepciones)
async function obtenerHorarioValido(fechaISO) {
  const docRef = db.collection('horarios').doc('horario-general');
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('No se encontró el horario configurado');
  }

  const data = doc.data();
  const excepciones = data.excepciones || {};
  const horarioSemanal = data.horarioSemanal || {};

  // Usar moment.tz para mantener zona horaria
  const mFecha = moment.tz(fechaISO, zonaHoraria);

  const fechaStr = mFecha.format('YYYY-MM-DD');
  const diaSemanaOriginal = mFecha.locale('es').format('dddd').toLowerCase();

  const diasMap = {
    'lunes': 'lunes',
    'martes': 'martes',
    'miércoles': 'miercoles',
    'jueves': 'jueves',
    'viernes': 'viernes',
    'sábado': 'sabado',
    'domingo': 'domingo',
  };

  const diaSemana = diasMap[diaSemanaOriginal] || diaSemanaOriginal;

  if (excepciones[fechaStr]) {
    return excepciones[fechaStr];
  }

  return horarioSemanal[diaSemana] || [];
}

// Función para generar horas individuales desde rangos
function generarHorasDesdeRangos(rangos) {
  const horas = [];
  
  console.log('Generando horas desde rangos:', rangos);
  
  if (!rangos || !Array.isArray(rangos)) {
    console.log('No hay rangos válidos');
    return horas;
  }
  
  rangos.forEach((rango, index) => {
    console.log(`Procesando rango ${index}:`, rango);
    
    if (rango && rango.inicio && rango.fin) {
      const [inicioHora] = rango.inicio.split(':').map(Number);
      const [finHora] = rango.fin.split(':').map(Number);
      
      console.log(`Generando horas desde ${inicioHora} hasta ${finHora}`);
      
      // Generar slots de 1 hora desde inicio hasta fin-1
      for (let hora = inicioHora; hora < finHora; hora++) {
        const horaFormateada = `${hora.toString().padStart(2, '0')}:00`;
        horas.push(horaFormateada);
        console.log(`Hora generada: ${horaFormateada}`);
      }
    }
  });
  
  // Remover duplicados y ordenar
  const horasUnicas = [...new Set(horas)].sort();
  console.log('Horas únicas finales:', horasUnicas);
  
  return horasUnicas;
}

// Función para generar rangos de horarios disponibles
function generarRangosDisponibles(rangos) {
  const horariosDisponibles = [];
  
  console.log('Generando rangos disponibles desde:', rangos);
  
  if (!rangos || !Array.isArray(rangos)) {
    console.log('No hay rangos válidos');
    return horariosDisponibles;
  }
  
  rangos.forEach((rango, index) => {
    console.log(`Procesando rango ${index}:`, rango);
    
    if (rango && rango.inicio && rango.fin) {
      // Enviar el rango completo con inicio y fin
      const rangoCompleto = {
        inicio: rango.inicio,
        fin: rango.fin,
        display: `${rango.inicio} - ${rango.fin}`
      };
      
      horariosDisponibles.push(rangoCompleto);
      console.log(`Rango agregado:`, rangoCompleto);
    }
  });
  
  console.log('Rangos disponibles finales:', horariosDisponibles);
  return horariosDisponibles;
}

router.get('/horarios-disponibles', async (req, res) => {
  const { fecha } = req.query;
  
  if (!fecha) {
    return res.status(400).json({ error: 'Fecha requerida' });
  }

  try {
    console.log('Obteniendo horarios disponibles para fecha:', fecha);
    
    // Convertir la fecha a objeto Date para el inicio y fin del día
    const fechaInicio = new Date(fecha + 'T00:00:00.000Z');
    const fechaFin = new Date(fecha + 'T23:59:59.999Z');
    
    // Obtener horarios válidos para esa fecha (rangos)
    const rangosHorarios = await obtenerHorarioValido(fechaInicio);
    console.log('Rangos de horarios:', rangosHorarios);
    
    // Convertir rangos a horas individuales
    const horasIndividuales = generarHorasDesdeRangos(rangosHorarios);
    console.log('Horas individuales antes de filtrar:', horasIndividuales);
    
    // ✅ NUEVO: Obtener citas existentes para esa fecha
    const citasExistentes = await db.collection('citas')
      .where('fecha_hora', '>=', fechaInicio)
      .where('fecha_hora', '<=', fechaFin)
      .get();
    
    // Extraer las horas ocupadas
    const horasOcupadas = [];
    citasExistentes.forEach(doc => {
      const citaData = doc.data();
      if (citaData.fecha_hora && citaData.fecha_hora.toDate) {
        const fechaCita = moment.tz(citaData.fecha_hora.toDate(), zonaHoraria);
        const horaOcupada = fechaCita.format('HH:mm');
        horasOcupadas.push(horaOcupada);
      }
    });
    
    console.log('Horas ocupadas encontradas:', horasOcupadas);
    
    // ✅ FILTRAR las horas disponibles removiendo las ocupadas
    const horasDisponibles = horasIndividuales.filter(hora => {
      // Extraer solo la hora de inicio si está en formato "HH:MM - HH:MM"
      const horaInicio = hora.includes(' - ') ? hora.split(' - ')[0] : hora;
      return !horasOcupadas.includes(horaInicio);
    });
    
    console.log('Horas disponibles después de filtrar:', horasDisponibles);

    res.json({
      fecha: fecha,
      horariosDisponibles: horasDisponibles,
      totalHoras: horasDisponibles.length,
      horasOcupadas: horasOcupadas // Para debugging
    });

  } catch (error) {
    console.error('Error al obtener horarios disponibles:', error);
    res.status(500).json({ 
      error: 'Error al obtener horarios disponibles',
      details: error.message 
    });
  }
});

// GET todos los tratamientos
router.get('/tratamientos', async (req, res) => {
  try {
    console.log('Obteniendo tratamientos...');
    const snapshot = await db.collection('tratamientos').get();
    
    if (snapshot.empty) {
      console.log('No hay tratamientos, creando tratamientos por defecto...');
      
      // Crear tratamientos por defecto
      const tratamientosDefault = [
        {
          nombre: 'Psicoterapia e hipnoterapia',
          precioNacional: 40000,
          precioInternacional: 50,
          sesiones: 1
        },
        {
          nombre: 'Taller de duelo',
          precioNacional: 70000,
          precioInternacional: 85,
          sesiones: 4
        }
      ];
      
      for (const tratamiento of tratamientosDefault) {
        await db.collection('tratamientos').add(tratamiento);
      }
      
      console.log('Tratamientos por defecto creados');
      return res.json(tratamientosDefault.map((t, index) => ({ id: `default_${index}`, ...t })));
    }
    
    const tratamientos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Tratamientos encontrados:', tratamientos.length);
    res.json(tratamientos);
  } catch (error) {
    console.error('Error al obtener tratamientos:', error);
    res.status(500).json({ error: 'Error al obtener tratamientos', details: error.message });
  }
});

// POST crear tratamiento
router.post('/tratamientos', async (req, res) => {
  const { nombre, precioNacional, precioInternacional, sesiones } = req.body;
  const nuevo = await db.collection('tratamientos').add({
    nombre,
    precioNacional,
    precioInternacional,
    sesiones
  });
  res.status(201).json({ id: nuevo.id });
});

// PUT actualizar tratamiento
router.put('/tratamientos/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  await db.collection('tratamientos').doc(id).update(data);
  res.json({ message: 'Tratamiento actualizado' });
});

// DELETE tratamiento
router.delete('/tratamientos/:id', async (req, res) => {
  const { id } = req.params;
  await db.collection('tratamientos').doc(id).delete();
  res.json({ message: 'Tratamiento eliminado' });
});


router.post('/reservar', async (req, res) => {
  const { 
    nombre, 
    correo, 
    fecha_hora, 
    tratamiento,
    monto,           // ✅ Agregar estos campos
    estado_pago,     // ✅ 
    metodo_pago,     // ✅
    fecha_pago       // ✅
  } = req.body;

  // Validar tratamiento
 const tratamientoDoc = await db.collection('tratamientos')
  .where('nombre', '==', tratamiento)
  .limit(1)
  .get();

if (tratamientoDoc.empty) {
  return res.status(400).json({ error: 'Tratamiento inválido' });
}

const precio = tratamientoDoc.docs[0].data();

  const fecha = moment.tz(fecha_hora, zonaHoraria); // momento con zona horaria

  if (!fecha.isValid()) {
    return res.status(400).json({ error: 'Fecha y hora inválidas' });
  }

  const horaSeleccionada = fecha.format('HH:mm');

  // Rechazar domingos
  const diaSemana = fecha.day(); // 0 (domingo)
  if (diaSemana === 0) {
    return res.status(400).json({ error: 'No se trabaja los domingos' });
  }

  try {
    // Obtener horarios válidos para esa fecha (rangos)
    const rangosHorarios = await obtenerHorarioValido(fecha.toDate());
    console.log('Rangos de horarios para la fecha:', rangosHorarios);
    
    // Convertir rangos a horas individuales
    const horasIndividuales = generarHorasDesdeRangos(rangosHorarios);
    console.log('Horas individuales disponibles:', horasIndividuales, 'Hora seleccionada:', horaSeleccionada);

    if (!horasIndividuales.includes(horaSeleccionada)) {
      return res.status(400).json({ error: 'La hora seleccionada no está disponible para esa fecha.' });
    }

    // 🔒 Verificar si ya hay una cita EXACTA en esa fecha y hora
    const citaExistente = await db.collection('citas')
      .where('fecha_hora', '==', fecha.toDate()) // comparar como Date real
      .get();

    if (!citaExistente.empty) {
      return res.status(400).json({ error: 'Ya hay una cita agendada en esa fecha y hora.' });
    }

    // Guardar la nueva cita con campos adicionales si existen
    const nuevaCitaData = {
      nombre,
      correo,
      fecha_hora: fecha.toDate(),
      tratamiento,
      precio,
      estado: 'pendiente',
    };

    // Agregar campos de pago si están presentes
    if (monto) nuevaCitaData.monto = monto;
    if (estado_pago) nuevaCitaData.estado_pago = estado_pago;
    if (metodo_pago) nuevaCitaData.metodo_pago = metodo_pago;
    if (fecha_pago) nuevaCitaData.fecha_pago = fecha_pago;

    const nuevaCita = await db.collection('citas').add(nuevaCitaData);

    console.log('Cita guardada con ID:', nuevaCita.id);

    // 📨 Enviar correos
    const mailOptionsCliente = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: correo,
      subject: '🌿 Confirmación de tu cita con el Psicólogo Eduardo',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px; color: #333;">
          <h2 style="color: #6a1b9a;">Hola ${nombre},</h2>
          <p>¡Gracias por reservar tu espacio con el Psicólogo Eduardo!</p>
          <p><strong>🗓️ Tratamiento:</strong> ${tratamiento}</p>
          <p><strong>📅 Fecha:</strong> ${fecha.format('DD/MM/YYYY')}</p>
          <p><strong>🕒 Hora:</strong> ${horaSeleccionada} hrs</p>
          <p>Tu cita ha sido agendada con éxito. Recibirás un recordatorio el día anterior.</p>
          <p style="font-style: italic;">Si tienes cualquier duda o necesitas reprogramar, no dudes en responder a este correo.</p>
          <p>Con cariño,<br><strong>Psicólogo Eduardo</strong></p>
        </div>
      `
    };

    transporter.sendMail(mailOptionsCliente, (error, info) => {
      if (error) {
        console.error('Error al enviar correo al cliente:', error);
      } else {
        console.log('Correo al cliente enviado:', info.response);
      }
    });

    const mailOptionsPsicologo = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: 'eduardo@emhpsicoterapia.cl',
      subject: '📥 Nueva cita reservada',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #eef6f9; border-radius: 10px; color: #333;">
          <h2 style="color: #00796b;">Nueva reserva de cita</h2>
          <p><strong>👤 Nombre del paciente:</strong> ${nombre}</p>
          <p><strong>✉️ Correo:</strong> ${correo}</p>
          <p><strong>💆‍♀️ Tratamiento:</strong> ${tratamiento}</p>
          <p><strong>🗓️ Fecha:</strong> ${fecha.format('DD/MM/YYYY')}</p>
          <p><strong>🕒 Hora:</strong> ${horaSeleccionada} hrs</p>
        </div>
      `
    };

    transporter.sendMail(mailOptionsPsicologo, (error, info) => {
      if (error) {
        console.error('Error al enviar correo al psicólogo:', error);
      } else {
        console.log('Correo al psicólogo enviado:', info.response);
      }
    });

    // Enviar correo adicional a Matías
    const mailOptionsMatias = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: correo,
      subject: '📥 Nueva cita reservada - Notificación',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #e8f5e8; border-radius: 10px; color: #333;">
          <h2 style="color: #2e7d32;">Nueva reserva confirmada ✅</h2>
          <p><strong>👤 Nombre del paciente:</strong> ${nombre}</p>
          <p><strong>✉️ Correo:</strong> ${correo}</p>
          <p><strong>💆‍♀️ Tratamiento:</strong> ${tratamiento}</p>
          <p><strong>🗓️ Fecha:</strong> ${fecha.format('DD/MM/YYYY')}</p>
          <p><strong>🕒 Hora:</strong> ${horaSeleccionada} hrs</p>
          <p><strong>💰 Precio:</strong> $${precio.precioNacional}</p>
        </div>
      `
    };

    transporter.sendMail(mailOptionsMatias, (error, info) => {
      if (error) {
        console.error('Error al enviar correo a Matías:', error);
      } else {
        console.log('Correo a Matías enviado:', info.response);
      }
    });

    return res.status(201).json({
      id: nuevaCita.id,
      nombre,
      correo,
      fecha_hora,
      tratamiento,
      precio,
      estado: 'pendiente',
      ...(monto && { monto }),
      ...(estado_pago && { estado_pago }),
      ...(metodo_pago && { metodo_pago }),
      ...(fecha_pago && { fecha_pago })
    });

  } catch (error) {
    console.error('Error al crear cita:', error);
    return res.status(500).json({ error: 'Error al crear la cita.' });
  }
});



// Obtener todas las citas
router.get('/ver', async (req, res) => {
  try {
    const snapshot = await db.collection('citas').orderBy('fecha_hora', 'desc').get();

    const reservas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(reservas);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    return res.status(500).json({ error: 'Error al obtener las reservas.' });
  }
});

// Reagendar una cita
router.put('/reagendar/:id', async (req, res) => {
  const id = req.params.id;
  const { nueva_fecha_hora } = req.body;

  if (!nueva_fecha_hora) {
    return res.status(400).json({ error: 'Nueva fecha y hora requerida' });
  }

  const nuevaFecha = moment.tz(nueva_fecha_hora, zonaHoraria).toDate();

  if (isNaN(nuevaFecha.getTime())) {
    return res.status(400).json({ error: 'Fecha inválida' });
  }

  const diaSemana = nuevaFecha.getDay();
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dia = dias[diaSemana];
  const hora = `${nuevaFecha.getHours()}:${nuevaFecha.getMinutes().toString().padStart(2, '0')}`;

  if (dia === 'domingo') {
    return res.status(400).json({ error: 'No se trabaja los domingos' });
  }


  try {
    // Obtener los datos actuales de la cita
    const citaRef = await db.collection('citas').doc(id).get();
    const cita = citaRef.data();

    // Actualizar la cita en la base de datos
    await db.collection('citas').doc(id).update({
      fecha_hora: nueva_fecha_hora,
      estado: 'reagendada',
    });

    // Enviar correo al cliente
    const mailOptionsCliente = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: cita.correo,
      subject: '🌿 Reprogramación de tu cita con el Psicólogo Eduardo',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px; color: #333;">
          <h2 style="color: #6a1b9a;">Hola ${cita.nombre},</h2>
          <p>Tu cita ha sido reprogramada.</p>
          <p><strong>🗓️ Tratamiento:</strong> ${cita.tratamiento}</p>
          <p><strong>📅 Nueva Fecha:</strong> ${nuevaFecha.toLocaleDateString()}</p>
          <p><strong>🕒 Nueva Hora:</strong> ${hora} hrs</p>
          <br />
          <p>Si tienes cualquier duda o necesitas más cambios, no dudes en responder a este correo.</p>
          <br />
          <p>Con cariño,</p>
          <p><strong>Psicólogo Eduardo</strong></p>
        </div>
      `
    };

    transporter.sendMail(mailOptionsCliente, (error, info) => {
      if (error) {
        console.error('Error al enviar correo al cliente:', error);
      } else {
        console.log('Correo al cliente enviado:', info.response);
      }
    });

    // Enviar correo al psicólogo
    const mailOptionsPsicologo = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: 'eduardo@emhpsicoterapia.cl',  // Tu correo real
      subject: '📥 Cita reprogramada',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #eef6f9; border-radius: 10px; color: #333;">
          <h2 style="color: #00796b;">Cita reprogramada</h2>
          <p><strong>👤 Nombre del paciente:</strong> ${cita.nombre}</p>
          <p><strong>✉️ Correo:</strong> ${cita.correo}</p>
          <p><strong>💆‍♀️ Tratamiento:</strong> ${cita.tratamiento}</p>
          <p><strong>🗓️ Nueva Fecha:</strong> ${nuevaFecha.toLocaleDateString()}</p>
          <p><strong>🕒 Nueva Hora:</strong> ${hora} hrs</p>
        </div>
      `
    };

    transporter.sendMail(mailOptionsPsicologo, (error, info) => {
      if (error) {
        console.error('Error al enviar correo al psicólogo:', error);
      } else {
        console.log('Correo al psicólogo enviado:', info.response);
      }
    });

    return res.status(200).json({ mensaje: 'Cita reagendada con éxito' });

  } catch (error) {
    console.error('Error al reagendar cita:', error);
    res.status(500).send('Error al reagendar la cita');
  }
});
// Cancelar una cita
router.delete('/cancelar/:id', async (req, res) => {
  const id = req.params.id;

  try {
    // Obtener los datos actuales de la cita
    const citaRef = await db.collection('citas').doc(id).get();
    const cita = citaRef.data();

    // Eliminar la cita de la base de datos
    await db.collection('citas').doc(id).delete();

    // Enviar correo al cliente
    const mailOptionsCliente = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: cita.correo,
      subject: '🌿 Cancelación de tu cita con el Psicólogo Eduardo',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px; color: #333;">
          <h2 style="color: #6a1b9a;">Hola ${cita.nombre},</h2>
          <p>Lamentablemente, tu cita ha sido cancelada.</p>
          <p><strong>🗓️ Tratamiento:</strong> ${cita.tratamiento}</p>
          <p><strong>📅 Fecha:</strong> ${cita.fecha_hora}</p>
          <br />
          <p>Si deseas agendar otra cita, no dudes en contactarnos.</p>
          <br />
          <p>Con cariño,</p>
          <p><strong>Psicólogo Eduardo</strong></p>
        </div>
      `
    };

    transporter.sendMail(mailOptionsCliente, (error, info) => {
      if (error) {
        console.error('Error al enviar correo al cliente:', error);
      } else {
        console.log('Correo al cliente enviado:', info.response);
      }
    });

    // Enviar correo al psicólogo
    const mailOptionsPsicologo = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: 'eduardo@emhpsicoterapia.cl',  // Tu correo real
      subject: '📥 Cita cancelada',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #eef6f9; border-radius: 10px; color: #333;">
          <h2 style="color: #00796b;">Cita cancelada</h2>
          <p><strong>👤 Nombre del paciente:</strong> ${cita.nombre}</p>
          <p><strong>✉️ Correo:</strong> ${cita.correo}</p>
          <p><strong>💆‍♀️ Tratamiento:</strong> ${cita.tratamiento}</p>
          <p><strong>🗓️ Fecha:</strong> ${cita.fecha_hora}</p>
        </div>
      `
    };

    transporter.sendMail(mailOptionsPsicologo, (error, info) => {
      if (error) {
        console.error('Error al enviar correo al psicólogo:', error);
      } else {
        console.log('Correo al psicólogo enviado:', info.response);
      }
    });

    return res.status(200).json({ mensaje: 'Cita cancelada con éxito' });

  } catch (error) {
    console.error('Error al cancelar cita:', error);
    res.status(500).send('Error al cancelar la cita');
  }
});

// Endpoint para notificar a Matías sobre nueva reservación
router.post('/notificar-reservacion', async (req, res) => {
  try {
    const { nombre, correo, tratamiento, fecha, hora, precio } = req.body;

    if (!nombre || !correo || !tratamiento || !fecha || !hora) {
      return res.status(400).json({ error: 'Faltan datos requeridos para la notificación' });
    }

    // Enviar correo a Matías
    const mailOptionsMatias = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: 'matias61100@gmail.com',
      subject: '🎉 Nueva reservación confirmada - Notificación Frontend',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #e3f2fd; border-radius: 10px; color: #333;">
          <h2 style="color: #1976d2;">¡Nueva Reservación Confirmada! 🎉</h2>
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3;">
            <p><strong>👤 Cliente:</strong> ${nombre}</p>
            <p><strong>📧 Email:</strong> ${correo}</p>
            <p><strong>🏥 Tratamiento:</strong> ${tratamiento}</p>
            <p><strong>📅 Fecha:</strong> ${fecha}</p>
            <p><strong>⏰ Hora:</strong> ${hora}</p>
            <p><strong>💰 Precio:</strong> $${precio || 'No especificado'}</p>
          </div>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            📱 Notificación enviada desde el frontend de reservaciones
          </p>
        </div>
      `
    };

    await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptionsMatias, (error, info) => {
        if (error) {
          console.error('Error al enviar correo a Matías:', error);
          reject(error);
        } else {
          console.log('Correo de notificación a Matías enviado:', info.response);
          resolve(info);
        }
      });
    });

    res.status(200).json({ 
      success: true,
      message: 'Notificación enviada exitosamente a Matías' 
    });

  } catch (error) {
    console.error('Error en notificar-reservacion:', error);
    res.status(500).json({ 
      error: 'Error al enviar notificación',
      details: error.message 
    });
  }
});

module.exports = router;
