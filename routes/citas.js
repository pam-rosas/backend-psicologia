const express = require('express');
const router = express.Router();
const db = require('../firebase/config');

// Mapeo de tratamientos y precios
const tratamientos = {
  'Taller de duelo': {
    precioNacional: 70000,
    precioInternacional: 85, // USD por persona
    sesiones: 4, // 4 sesiones de 1 hora
  },
  'Psicoterapia e hipnoterapia': {
    precioNacional: 40000,
    precioInternacional: 50, // USD por sesión
    sesiones: 1, // Una sola sesión
  }
};

// Definir los horarios disponibles para cada día
const horariosDisponibles = {
  lunes: ['19:00', '20:00'],
  martes: ['19:00', '20:00'],
  miércoles: ['19:00', '20:00'],
  jueves: ['19:00', '20:00'],
  viernes: ['16:00', '17:00', '18:00'],
  sábado: ['11:00', '12:00', '13:00']
};

// Función para verificar si el horario es válido
function esHorarioValido(dia, hora) {
  const horarioDia = horariosDisponibles[dia.toLowerCase()];
  console.log(`Horarios disponibles para ${dia}:`, horarioDia);  // Depuración
  console.log('Hora seleccionada:', hora);  // Depuración
  return horarioDia && horarioDia.includes(hora);
}

// Ruta para crear una cita con tratamiento
router.post('/reservar', async (req, res) => {
  const { nombre, correo, fecha_hora, tratamiento } = req.body;

  console.log('Datos recibidos:', req.body);  // Depuración para verificar los datos que recibimos

  // Validación del tratamiento
  if (!tratamientos[tratamiento]) {
    return res.status(400).json({ error: 'Tratamiento inválido' });
  }

  const precio = tratamientos[tratamiento];
  console.log('Precio del tratamiento:', precio); // Depuración

  // Obtener el día de la semana y la hora de la cita
  const fecha = new Date(fecha_hora);

  // Verificar si la fecha es válida
  if (isNaN(fecha.getTime())) {
    return res.status(400).json({ error: 'Fecha y hora inválidas' });
  }

  const diaSemana = fecha.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado

  // Ajustar el día de la semana para que el domingo sea 0 y lunes sea 1
  const diaAjustado = (diaSemana === 0) ? 6 : diaSemana - 1;  // domingo -> sábado, lunes -> lunes, ...

  const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const dia = dias[diaAjustado]; // Ajustar a la lista correcta

  const horaSeleccionada = `${fecha.getHours()}:${fecha.getMinutes() < 10 ? '0' : ''}${fecha.getMinutes()}`;

  console.log(`Día seleccionado: ${dia}`); // Depuración
  console.log(`Hora seleccionada: ${horaSeleccionada}`); // Depuración

  // Validar si el día es domingo (no se trabaja)
  if (dia === 'domingo') {
    return res.status(400).json({ error: 'No se trabaja los domingos' });
  }

  // Verificar si la hora seleccionada está disponible en el día
  if (!esHorarioValido(dia, horaSeleccionada)) {
    return res.status(400).json({ error: 'La hora seleccionada no está disponible para este día' });
  }

  try {
    // Guardar la cita en Firestore
    const nuevaCita = await db.collection('citas').add({
      nombre,
      correo,
      fecha_hora,
      tratamiento,
      precio,
      estado: 'pendiente',
    });

    console.log('Cita guardada con ID:', nuevaCita.id);  // Depuración

    // Devolver respuesta con la cita creada
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

// Ruta para obtener todas las citas
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

module.exports = router;
