const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');

/**
 * @route   GET /api/talleres
 * @desc    Obtener todos los talleres activos con sus sesiones
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { data: talleres, error } = await supabase
      .from('workshops')
      .select(`
        *,
        workshop_sessions (
          id,
          session_number,
          session_date,
          session_time,
          description
        )
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('start_date', { ascending: true });

    if (error) throw error;

    // Ordenar sesiones por número
    talleres.forEach(taller => {
      if (taller.workshop_sessions) {
        taller.workshop_sessions.sort((a, b) => a.session_number - b.session_number);
      }
    });

    res.status(200).json(talleres);
  } catch (error) {
    console.error('Error al obtener talleres:', error);
    res.status(500).json({ 
      message: 'Error al obtener talleres', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/talleres/:id
 * @desc    Obtener un taller específico con sus sesiones
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: taller, error } = await supabase
      .from('workshops')
      .select(`
        *,
        workshop_sessions (
          id,
          session_number,
          session_date,
          session_time,
          description
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    if (!taller) {
      return res.status(404).json({ message: 'Taller no encontrado' });
    }

    // Ordenar sesiones
    if (taller.workshop_sessions) {
      taller.workshop_sessions.sort((a, b) => a.session_number - b.session_number);
    }

    res.status(200).json(taller);
  } catch (error) {
    console.error('Error al obtener taller:', error);
    res.status(500).json({ 
      message: 'Error al obtener taller', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/talleres
 * @desc    Crear un nuevo taller con sus sesiones
 * @access  Private (Admin)
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const {
      titulo,
      subtitulo,
      descripcion,
      facilitador,
      fechaInicio,
      precioNacional,
      precioInternacional,
      sesiones, // Array de sesiones: [{ numero, fecha, hora, descripcion }]
      politicaCancelacion,
      datosContacto
    } = req.body;

    // Validaciones
    if (!titulo || !subtitulo || !fechaInicio || !precioNacional || !precioInternacional) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: titulo, subtitulo, fechaInicio, precioNacional, precioInternacional' 
      });
    }

    if (!sesiones || !Array.isArray(sesiones) || sesiones.length === 0) {
      return res.status(400).json({ 
        message: 'Debe proporcionar al menos una sesión' 
      });
    }

    // Crear el taller
    const { data: taller, error: tallerError } = await supabase
      .from('workshops')
      .insert([{
        title: titulo,
        subtitle: subtitulo,
        description: descripcion || null,
        facilitator: facilitador || null,
        start_date: fechaInicio,
        price_national: precioNacional,
        price_international: precioInternacional,
        cancellation_policy: politicaCancelacion || null,
        contact_info: datosContacto || null,
        is_active: true,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (tallerError) throw tallerError;

    // Crear las sesiones
    const sesionesInsert = sesiones.map(sesion => ({
      workshop_id: taller.id,
      session_number: sesion.numero,
      session_date: sesion.fecha,
      session_time: sesion.hora || null,
      description: sesion.descripcion || null
    }));

    const { data: sesionesCreadas, error: sesionesError } = await supabase
      .from('workshop_sessions')
      .insert(sesionesInsert)
      .select();

    if (sesionesError) throw sesionesError;

    res.status(201).json({ 
      message: 'Taller creado exitosamente',
      taller: {
        ...taller,
        workshop_sessions: sesionesCreadas
      }
    });
  } catch (error) {
    console.error('Error al crear taller:', error);
    res.status(500).json({ 
      message: 'Error al crear taller', 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/talleres/:id
 * @desc    Actualizar un taller (sin sesiones)
 * @access  Private (Admin)
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;
    const {
      titulo,
      subtitulo,
      descripcion,
      facilitador,
      fechaInicio,
      precioNacional,
      precioInternacional,
      politicaCancelacion,
      datosContacto,
      isActive
    } = req.body;

    const updateData = {};
    if (titulo !== undefined) updateData.title = titulo;
    if (subtitulo !== undefined) updateData.subtitle = subtitulo;
    if (descripcion !== undefined) updateData.description = descripcion;
    if (facilitador !== undefined) updateData.facilitator = facilitador;
    if (fechaInicio !== undefined) updateData.start_date = fechaInicio;
    if (precioNacional !== undefined) updateData.price_national = precioNacional;
    if (precioInternacional !== undefined) updateData.price_international = precioInternacional;
    if (politicaCancelacion !== undefined) updateData.cancellation_policy = politicaCancelacion;
    if (datosContacto !== undefined) updateData.contact_info = datosContacto;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: taller, error } = await supabase
      .from('workshops')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!taller) {
      return res.status(404).json({ message: 'Taller no encontrado' });
    }

    res.status(200).json({ 
      message: 'Taller actualizado exitosamente',
      taller 
    });
  } catch (error) {
    console.error('Error al actualizar taller:', error);
    res.status(500).json({ 
      message: 'Error al actualizar taller', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/talleres/:id/sesiones
 * @desc    Agregar una sesión a un taller
 * @access  Private (Admin)
 */
router.post('/:id/sesiones', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { numero, fecha, hora, descripcion } = req.body;

    if (!numero || !fecha) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: numero, fecha' 
      });
    }

    // Verificar que el taller existe
    const { data: taller, error: tallerError } = await supabase
      .from('workshops')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (tallerError) throw tallerError;

    if (!taller) {
      return res.status(404).json({ message: 'Taller no encontrado' });
    }

    const { data: sesion, error } = await supabase
      .from('workshop_sessions')
      .insert([{
        workshop_id: id,
        session_number: numero,
        session_date: fecha,
        session_time: hora || null,
        description: descripcion || null
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Sesión agregada exitosamente',
      sesion 
    });
  } catch (error) {
    console.error('Error al agregar sesión:', error);
    res.status(500).json({ 
      message: 'Error al agregar sesión', 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/talleres/:id/sesiones/:sesionId
 * @desc    Actualizar una sesión específica
 * @access  Private (Admin)
 */
router.put('/:id/sesiones/:sesionId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id, sesionId } = req.params;
    const { numero, fecha, hora, descripcion } = req.body;

    const updateData = {};
    if (numero !== undefined) updateData.session_number = numero;
    if (fecha !== undefined) updateData.session_date = fecha;
    if (hora !== undefined) updateData.session_time = hora;
    if (descripcion !== undefined) updateData.description = descripcion;

    const { data: sesion, error } = await supabase
      .from('workshop_sessions')
      .update(updateData)
      .eq('id', sesionId)
      .eq('workshop_id', id)
      .select()
      .single();

    if (error) throw error;

    if (!sesion) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }

    res.status(200).json({ 
      message: 'Sesión actualizada exitosamente',
      sesion 
    });
  } catch (error) {
    console.error('Error al actualizar sesión:', error);
    res.status(500).json({ 
      message: 'Error al actualizar sesión', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/talleres/:id/sesiones/:sesionId
 * @desc    Eliminar una sesión
 * @access  Private (Admin)
 */
router.delete('/:id/sesiones/:sesionId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id, sesionId } = req.params;

    const { data: sesion, error } = await supabase
      .from('workshop_sessions')
      .delete()
      .eq('id', sesionId)
      .eq('workshop_id', id)
      .select()
      .single();

    if (error) throw error;

    if (!sesion) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }

    res.status(200).json({ message: 'Sesión eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    res.status(500).json({ 
      message: 'Error al eliminar sesión', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/talleres/:id
 * @desc    Eliminar un taller (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    const { data: taller, error } = await supabase
      .from('workshops')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!taller) {
      return res.status(404).json({ message: 'Taller no encontrado' });
    }

    res.status(200).json({ message: 'Taller eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar taller:', error);
    res.status(500).json({ 
      message: 'Error al eliminar taller', 
      error: error.message 
    });
  }
});

/**
 * @route   PATCH /api/talleres/:id/toggle
 * @desc    Activar/Desactivar un taller
 * @access  Private (Admin)
 */
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    const { data: current, error: fetchError } = await supabase
      .from('workshops')
      .select('is_active')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError) throw fetchError;

    if (!current) {
      return res.status(404).json({ message: 'Taller no encontrado' });
    }

    const { data: taller, error: updateError } = await supabase
      .from('workshops')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({ 
      message: `Taller ${taller.is_active ? 'activado' : 'desactivado'} exitosamente`,
      taller 
    });
  } catch (error) {
    console.error('Error al cambiar estado del taller:', error);
    res.status(500).json({ 
      message: 'Error al cambiar estado del taller', 
      error: error.message 
    });
  }
});

module.exports = router;
