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
    const { data: schedules, error: schedError } = await supabase
      .from('schedules')
      .select('*')
      .eq('is_active', true)
      .order('day_of_week');

    if (schedError) throw schedError;

    // Obtener excepciones (solo futuras o de hoy)
    const today = new Date().toISOString().split('T')[0];
    const { data: exceptions, error: excError } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .gte('exception_date', today)
      .order('exception_date');

    if (excError) throw excError;

    // Formatear respuesta al estilo del sistema antiguo
    const horarioSemanal = {};
    const diasMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    
    schedules.forEach(schedule => {
      const dia = diasMap[schedule.day_of_week];
      if (!horarioSemanal[dia]) {
        horarioSemanal[dia] = [];
      }
      horarioSemanal[dia].push({
        inicio: schedule.start_time,
        fin: schedule.end_time
      });
    });

    const excepcionesMap = {};
    exceptions.forEach(exc => {
      excepcionesMap[exc.exception_date] = [{
        inicio: exc.start_time,
        fin: exc.end_time
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
      .from('schedules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    // Insertar nuevos horarios
    const schedulesToInsert = [];
    Object.entries(horarioSemanal).forEach(([dia, rangos]) => {
      const dayNumber = diasMap[dia];
      if (dayNumber === undefined) return;

      rangos.forEach(rango => {
        if (rango.inicio && rango.fin) {
          schedulesToInsert.push({
            day_of_week: dayNumber,
            start_time: rango.inicio,
            end_time: rango.fin,
            is_active: true
          });
        }
      });
    });

    if (schedulesToInsert.length > 0) {
      const { error } = await supabase
        .from('schedules')
        .insert(schedulesToInsert);

      if (error) throw error;
    }

    res.status(200).json({ 
      message: 'Horario semanal actualizado exitosamente',
      count: schedulesToInsert.length
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

    const { fecha, horaInicio, horaFin, disponible, razon } = req.body;

    if (!fecha) {
      return res.status(400).json({ message: 'fecha es requerida' });
    }

    // Si disponible es false, es un día bloqueado (sin hora inicio/fin)
    // Si disponible es true, debe tener hora inicio y fin
    if (disponible && (!horaInicio || !horaFin)) {
      return res.status(400).json({ 
        message: 'horaInicio y horaFin son requeridos cuando disponible=true' 
      });
    }

    const { data: excepcion, error } = await supabase
      .from('schedule_exceptions')
      .insert([{
        exception_date: fecha,
        start_time: horaInicio || null,
        end_time: horaFin || null,
        reason: razon || null
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
      .from('schedule_exceptions')
      .delete()
      .eq('exception_date', fecha)
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
    const { data: exception, error: excError } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('exception_date', fecha)
      .maybeSingle();

    if (excError) throw excError;

    let availableSlots = [];

    if (exception) {
      // Usar horario de excepción
      if (exception.start_time && exception.end_time) {
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
        .order('start_time');

      if (schedError) throw schedError;

      availableSlots = schedules.map(s => ({
        inicio: s.start_time,
        fin: s.end_time
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
