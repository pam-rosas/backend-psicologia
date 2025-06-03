const express = require('express');
const router = express.Router();
const db = require('../firebase/config');
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


router.get('/horarios-disponibles', async (req, res) => {
  const { fecha } = req.query;

  if (!fecha) {
    return res.status(400).json({ error: 'Debe proporcionar una fecha (YYYY-MM-DD)' });
  }

  try {
    const diasMap = {
      'lunes': 'lunes',
      'martes': 'martes',
      'miércoles': 'miercoles',
      'jueves': 'jueves',
      'viernes': 'viernes',
      'sábado': 'sabado',
      'domingo': 'domingo',
    };

    const fechaLocal = moment.tz(fecha, zonaHoraria).toDate();
    const fechaStr = moment(fechaLocal).format('YYYY-MM-DD');

    const doc = await db.collection('horarios').doc('horario-general').get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'No se encontró el horario configurado' });
    }
    const data = doc.data();

    const excepciones = data.excepciones || {};
    const horarioSemanal = data.horarioSemanal || {};

    const diaSemanaOriginal = moment(fechaLocal).locale('es').format('dddd').toLowerCase();
    const diaSemana = diasMap[diaSemanaOriginal] || diaSemanaOriginal;

    console.log('Fecha consultada:', fechaStr);
    console.log('Día original:', diaSemanaOriginal);
    console.log('Día corregido:', diaSemana);
    console.log('Horario semanal:', horarioSemanal[diaSemana]);
    console.log('Excepciones:', excepciones[fechaStr]);

    let tipoHorario = 'semanal';
    let horariosValidos = [];

    if (excepciones.hasOwnProperty(fechaStr)) {
      tipoHorario = 'excepción';
      horariosValidos = excepciones[fechaStr];
    } else {
      horariosValidos = horarioSemanal[diaSemana] || [];
    }

    if (!horariosValidos.length) {
      return res.status(200).json({ fecha, tipoHorario, horariosDisponibles: [] });
    }

    // Obtener citas agendadas para la fecha
    const inicioDia = moment.tz(fechaStr, zonaHoraria).startOf('day').toDate();
const finDia = moment.tz(fechaStr, zonaHoraria).endOf('day').toDate();

const snapshot = await db.collection('citas')
  .where('fecha_hora', '>=', inicioDia)
  .where('fecha_hora', '<=', finDia)
  .get();

const horasOcupadas = snapshot.docs.map(doc => {
  const cita = doc.data();
  return moment.tz(cita.fecha_hora.toDate(), zonaHoraria).format('HH:mm'); // Asegurarse de que sea Date
});

    const horariosDisponibles = horariosValidos.filter(hora => !horasOcupadas.includes(hora));

    return res.status(200).json({ fecha, tipoHorario, horariosDisponibles });

  } catch (error) {
    console.error('Error al obtener horarios disponibles:', error);
    return res.status(500).json({ error: 'Error al obtener horarios disponibles' });
  }
});

// GET todos los tratamientos
router.get('/tratamientos', async (req, res) => {
  const snapshot = await db.collection('tratamientos').get();
  const tratamientos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(tratamientos);
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
  const { nombre, correo, fecha_hora, tratamiento } = req.body;

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
    // Obtener horarios válidos para esa fecha
    const horariosValidos = await obtenerHorarioValido(fecha.toDate());
    console.log('Horarios válidos para la fecha:', horariosValidos, 'Hora seleccionada:', horaSeleccionada);

    if (!horariosValidos.includes(horaSeleccionada)) {
      return res.status(400).json({ error: 'La hora seleccionada no está disponible para esa fecha.' });
    }

    // 🔒 Verificar si ya hay una cita EXACTA en esa fecha y hora
    const citaExistente = await db.collection('citas')
      .where('fecha_hora', '==', fecha.toDate()) // comparar como Date real
      .get();

    if (!citaExistente.empty) {
      return res.status(400).json({ error: 'Ya hay una cita agendada en esa fecha y hora.' });
    }

    // Guardar la nueva cita
    const nuevaCita = await db.collection('citas').add({
      nombre,
      correo,
      fecha_hora: fecha.toDate(), // guardar como timestamp
      tratamiento,
      precio,
      estado: 'pendiente',
    });

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

    return res.status(201).json({
      id: nuevaCita.id,
      nombre,
      correo,
      fecha_hora,
      tratamiento,
      precio,
      estado: 'pendiente',
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



module.exports = router;
