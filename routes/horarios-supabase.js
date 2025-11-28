const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');

/**
 * @route   GET /api/horarios
 * @desc    Obtener horarios semanales y excepciones
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Obtener horarios semanales
    const { data: horarios, error: horariosError } = await supabase
      .from('horarios_disponibles')
      .select('*')
      .eq('activo', true)
      .order('dia_semana');
    if (horariosError) throw horariosError;

    // Obtener excepciones (solo futuras o de hoy)
    const today = new Date().toISOString().split('T')[0];
    const { data: excepciones, error: excError } = await supabase
      .from('excepciones_horarios')
      .select('*')
      .gte('fecha', today)
      .order('fecha');
    if (excError) throw excError;

    // Formatear respuesta
    const horarioSemanal = {};
    const diasMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    horarios.forEach(horario => {
      const dia = diasMap[horario.dia_semana];
      if (!horarioSemanal[dia]) {
        horarioSemanal[dia] = [];
      }
      horarioSemanal[dia].push({
        inicio: horario.hora_inicio,
        fin: horario.hora_fin,
        modalidad: horario.modalidad
      });
    });

    const excepcionesMap = {};
    excepciones.forEach(exc => {
      excepcionesMap[exc.fecha] = [{
        inicio: exc.hora_inicio,
        fin: exc.hora_fin,
        motivo: exc.motivo,
        bloqueado: exc.bloqueado
      }];
    });

    res.status(200).json({
      horarioSemanal,
      excepciones: excepcionesMap
    });
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({ 
      message: 'Error al obtener horarios', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/horarios/semanal
 * @desc    Crear o actualizar horario semanal
 * @access  Private (Admin)
 */
router.post('/semanal', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { horarioSemanal } = req.body;

    if (!horarioSemanal) {
      return res.status(400).json({ message: 'horarioSemanal es requerido' });
    }

    const diasMap = {
      'domingo': 0,
      'lunes': 1,
      'martes': 2,
      'miercoles': 3,
      'jueves': 4,
      'viernes': 5,
      'sabado': 6
    };

    // Eliminar TODOS los horarios existentes para evitar duplicados
    await supabase
      .from('horarios_disponibles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    // Insertar nuevos horarios
    const horariosToInsert = [];
    Object.entries(horarioSemanal).forEach(([dia, rangos]) => {
      const dayNumber = diasMap[dia];
      if (dayNumber === undefined) return;
      rangos.forEach(rango => {
        if (rango.inicio && rango.fin) {
          horariosToInsert.push({
            dia_semana: dayNumber,
            hora_inicio: rango.inicio,
            hora_fin: rango.fin,
            modalidad: rango.modalidad || 'ambas',
            activo: true
          });
        }
      });
    });

    if (horariosToInsert.length > 0) {
      const { error } = await supabase
        .from('horarios_disponibles')
        .insert(horariosToInsert);
      if (error) throw error;
    }

    res.status(200).json({ 
      message: 'Horario semanal actualizado exitosamente',
      count: horariosToInsert.length
    });
  } catch (error) {
    console.error('Error al guardar horario:', error);
    res.status(500).json({ 
      message: 'Error al guardar horario', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/horarios/excepcion
 * @desc    Crear una excepción de horario (día especial o bloqueado)
 * @access  Private (Admin)
 */
router.post('/excepcion', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { fecha, hora_inicio, hora_fin, motivo, bloqueado } = req.body;

    if (!fecha) {
      return res.status(400).json({ message: 'fecha es requerida' });
    }

    const { data: excepcion, error } = await supabase
      .from('excepciones_horarios')
      .insert([{
        fecha,
        hora_inicio: hora_inicio || null,
        hora_fin: hora_fin || null,
        motivo: motivo || null,
        bloqueado: bloqueado === undefined ? false : bloqueado
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Excepción creada exitosamente',
      excepcion 
    });
  } catch (error) {
    console.error('Error al crear excepción:', error);
    res.status(500).json({ 
      message: 'Error al crear excepción', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/horarios/excepcion/:fecha
 * @desc    Eliminar una excepción de horario
 * @access  Private (Admin)
 */
router.delete('/excepcion/:fecha', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { fecha } = req.params;

    const { data: excepcion, error } = await supabase
      .from('excepciones_horarios')
      .delete()
      .eq('fecha', fecha)
      .select()
      .single();

    if (error) throw error;

    if (!excepcion) {
      return res.status(404).json({ message: 'Excepción no encontrada' });
    }

    res.status(200).json({ message: 'Excepción eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar excepción:', error);
    res.status(500).json({ 
      message: 'Error al eliminar excepción', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/horarios/disponibles/:fecha
 * @desc    Obtener horas disponibles para una fecha específica
 * @access  Public
 */
router.get('/disponibles/:fecha', async (req, res) => {
  try {
    const { fecha } = req.params;
    const date = new Date(fecha + 'T00:00:00');
    const dayOfWeek = date.getDay();

    // Verificar si hay excepción para este día
    const { data: excepciones, error: excError } = await supabase
      .from('excepciones_horarios')
      .select('*')
      .eq('fecha', fecha);
    if (excError) throw excError;

    let availableSlots = [];
    const excepcion = excepciones && excepciones.length > 0 ? excepciones[0] : null;
    if (excepcion && excepcion.hora_inicio && excepcion.hora_fin && !excepcion.bloqueado) {
      availableSlots.push({
        inicio: excepcion.hora_inicio,
        fin: excepcion.hora_fin
      });
    } else if (!excepcion || !excepcion.bloqueado) {
      // Usar horario semanal normal
      const { data: horarios, error: horariosError } = await supabase
        .from('horarios_disponibles')
        .select('*')
        .eq('dia_semana', dayOfWeek)
        .eq('activo', true)
        .order('hora_inicio');
      if (horariosError) throw horariosError;
      availableSlots = horarios.map(h => ({
        inicio: h.hora_inicio,
        fin: h.hora_fin
      }));
    }

    // Obtener citas confirmadas para este día
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('appointment_datetime')
      .gte('appointment_datetime', fecha + 'T00:00:00')
      .lt('appointment_datetime', fecha + 'T23:59:59')
      .in('status', ['confirmed', 'pending']);

    if (apptError) throw apptError;

    const bookedTimes = appointments.map(a => {
      const dt = new Date(a.appointment_datetime);
      return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    });

    // Generar horas individuales y filtrar las ocupadas
    const horasDisponibles = [];
    availableSlots.forEach(slot => {
      const [startHour, startMin] = slot.inicio.split(':').map(Number);
      const [endHour, endMin] = slot.fin.split(':').map(Number);
      
      let currentHour = startHour;
      let currentMin = startMin;

      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        
        if (!bookedTimes.includes(timeStr)) {
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
      horasDisponibles: horasDisponibles.sort()
    });
  } catch (error) {
    console.error('Error al obtener horas disponibles:', error);
    res.status(500).json({ 
      message: 'Error al obtener horas disponibles', 
      error: error.message 
    });
  }
});

module.exports = router;
