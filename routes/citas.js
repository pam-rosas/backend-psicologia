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
    user: 'pam.latasoft@gmail.com',
    pass: 'rjef xrxc ercx ragf'  // eduardo@emhpsicoterapia.cl Asegúrate de usar la contraseña correcta o un token de aplicación
  }
});
//fhiu rxhd ycfr hczr

// 
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
// Crear una cita
router.post('/reservar', async (req, res) => {
  const { nombre, correo, fecha_hora, tratamiento } = req.body;

  if (!tratamientos[tratamiento]) {
    return res.status(400).json({ error: 'Tratamiento inválido' });
  }

  const precio = tratamientos[tratamiento];

  const fecha = moment.tz(fecha_hora, zonaHoraria).toDate();

  if (isNaN(fecha.getTime())) {
    return res.status(400).json({ error: 'Fecha y hora inválidas' });
  }

  const diaSemana = fecha.getDay();
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dia = dias[diaSemana];
  const horaSeleccionada = `${fecha.getHours()}:${fecha.getMinutes().toString().padStart(2, '0')}`;

  if (dia === 'domingo') {
    return res.status(400).json({ error: 'No se trabaja los domingos' });
  }

  if (!esHorarioValido(dia, horaSeleccionada)) {
    return res.status(400).json({ error: 'La hora seleccionada no está disponible para este día' });
  }

  try {
    // 🔍 VERIFICAR HORA OCUPADA
    const snapshot = await db.collection('citas')
      .where('fecha_hora', '==', fecha_hora)
      .get();

    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Ya hay una cita agendada en esa fecha y hora.' });
    }

    // 🆗 GUARDAR NUEVA CITA
    const nuevaCita = await db.collection('citas').add({
      nombre,
      correo,
      fecha_hora,
      tratamiento,
      precio,
      estado: 'pendiente',
    });


    console.log('Cita guardada con ID:', nuevaCita.id);

    // Enviar correo de confirmación al cliente
    const mailOptionsCliente = {
      from: 'pam.latasoft@gmail.com',
      to: correo,
      subject: '🌿 Confirmación de tu cita con la Psicólogo Eduardo',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px; color: #333;">
          <h2 style="color: #6a1b9a;">Hola ${nombre},</h2>
          <p>¡Gracias por reservar tu espacio con la Psicólogo Eduardo!</p>
          <p><strong>🗓️ Tratamiento:</strong> ${tratamiento}</p>
          <p><strong>📅 Fecha:</strong> ${fecha.toLocaleDateString()}</p>
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

    const mailOptionsPsicologo = {
      from: 'pam.latasoft@gmail.com',
      to: 'pam.latasoft@gmail.com',  // Tu correo real
      subject: '📥 Nueva cita reservada',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #eef6f9; border-radius: 10px; color: #333;">
          <h2 style="color: #00796b;">Nueva reserva de cita</h2>
          <p><strong>👤 Nombre del paciente:</strong> ${nombre}</p>
          <p><strong>✉️ Correo:</strong> ${correo}</p>
          <p><strong>💆‍♀️ Tratamiento:</strong> ${tratamiento}</p>
          <p><strong>🗓️ Fecha:</strong> ${fecha.toLocaleDateString()}</p>
          <p><strong>🕒 Hora:</strong> ${horaSeleccionada} hrs</p>
          <br />
          <p style="font-size: 14px; color: #666;">Por favor, revisa la plataforma si deseas ver más detalles o confirmar la disponibilidad.</p>
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
    return res.status(500).send('Error al crear la cita.');
  }
});

// Obtener todas las citas
router.get('/ver', async (req, res) => {
  try {
    const snapshot = await db.collection('citas').get();
    const citas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json(citas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return res.status(500).send('Error al obtener citas.');
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

  if (!esHorarioValido(dia, hora)) {
    return res.status(400).json({ error: 'Horario no disponible para este día' });
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
      from: 'pam.latasoft@gmail.com',
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
      from: 'pam.latasoft@gmail.com',
      to: 'pam.latasoft@gmail.com',  // Tu correo real
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
      from: 'pam.latasoft@gmail.com',
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
      from: 'pam.latasoft@gmail.com',
      to: 'pam.latasoft@gmail.com',  // Tu correo real
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
