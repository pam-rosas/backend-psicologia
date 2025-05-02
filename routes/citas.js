const express = require('express');
const router = express.Router();
const db = require('../firebase/config');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
const zonaHoraria = 'America/Santiago';

// Configura el transporte SMTP para Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'eduardo@emhpsicoterapia.cl',
    pass: 'fhiu rxhd ycfr hczr'  // Usa una clave de aplicación válida
  }
});

// Verifica la conexión con el servidor de correo
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

// Horarios disponibles
const horariosDisponibles = {
  lunes: ['19:00', '20:00'],
  martes: ['19:00', '20:00'],
  miércoles: ['19:00', '20:00'],
  jueves: ['19:00', '20:00'],
  viernes: ['16:00', '17:00', '18:00'],
  sábado: ['11:00', '12:00', '13:00']
};

// Verifica si el horario es válido
function esHorarioValido(dia, hora) {
  const horarioDia = horariosDisponibles[dia.toLowerCase()];
  return horarioDia && horarioDia.includes(hora);
}

// Crear una cita
router.post('/reservar', async (req, res) => {
  const { nombre, correo, fecha_hora, tratamiento } = req.body;

  if (!tratamientos[tratamiento]) {
    return res.status(400).json({ error: 'Tratamiento inválido' });
  }

  const fecha = moment.tz(fecha_hora, zonaHoraria);
  if (!fecha.isValid()) {
    return res.status(400).json({ error: 'Fecha y hora inválidas' });
  }

  const diaSemana = fecha.day();
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dia = dias[diaSemana];
  const horaSeleccionada = `${String(fecha.hour()).padStart(2, '0')}:${String(fecha.minute()).padStart(2, '0')}`;

  if (dia === 'domingo') {
    return res.status(400).json({ error: 'No se trabaja los domingos' });
  }

  if (!esHorarioValido(dia, horaSeleccionada)) {
    return res.status(400).json({ error: 'La hora seleccionada no está disponible para este día' });
  }

  try {
    const nuevaCita = await db.collection('citas').add({
      nombre,
      correo,
      fecha_hora: fecha.toDate(),  // Guardar como timestamp
      tratamiento,
      precio: {
        nacional: tratamientos[tratamiento].precioNacional,
        internacional: tratamientos[tratamiento].precioInternacional,
        sesiones: tratamientos[tratamiento].sesiones
      },
      estado: 'pendiente',
    });

    console.log('Cita guardada con ID:', nuevaCita.id);

    // Enviar correo al cliente
    const mailOptionsCliente = {
      from: 'eduardo@emhpsicoterapia.cl',
      to: correo,
      subject: '🌿 Confirmación de tu cita con la Psicólogo Eduardo',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px; color: #333;">
          <h2 style="color: #6a1b9a;">Hola ${nombre},</h2>
          <p>¡Gracias por reservar tu espacio con el Psicólogo Eduardo!</p>
          <p><strong>🗓️ Tratamiento:</strong> ${tratamiento}</p>
          <p><strong>📅 Fecha:</strong> ${fecha.format('DD/MM/YYYY')}</p>
          <p><strong>🕒 Hora:</strong> ${horaSeleccionada} hrs</p>
          <p>Tu cita ha sido agendada con éxito. Recibirás un recordatorio el día anterior.</p>
          <br />
          <p style="font-style: italic;">Si tienes cualquier duda o necesitas reprogramar, no dudes en responder a este correo.</p>
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
      fecha_hora: fecha.toDate(),
      tratamiento,
      precio: {
        nacional: tratamientos[tratamiento].precioNacional,
        internacional: tratamientos[tratamiento].precioInternacional,
        sesiones: tratamientos[tratamiento].sesiones
      },
      estado: 'pendiente',
    });

  } catch (error) {
    console.error('Error al crear cita:', error);
    return res.status(500).send('Error al crear la cita.');
  }
});

module.exports = router;
