const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');

/**
 * @route   GET /api/tratamientos
 * @desc    Obtener todos los tratamientos activos
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { data: tratamientos, error } = await supabase
      .from('treatments')
      .select(`
        id,
        name,
        description,
        price_national,
        price_international,
        sessions,
        duration,
        is_active,
        created_at
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;

    res.status(200).json(tratamientos);
  } catch (error) {
    console.error('Error al obtener tratamientos:', error);
    res.status(500).json({ 
      message: 'Error al obtener tratamientos', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/tratamientos/admin
 * @desc    Obtener todos los tratamientos (incluyendo inactivos)
 * @access  Private (Admin)
 */
router.get('/admin', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { data: tratamientos, error } = await supabase
      .from('treatments')
      .select('*')
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;

    res.status(200).json(tratamientos);
  } catch (error) {
    console.error('Error al obtener tratamientos:', error);
    res.status(500).json({ 
      message: 'Error al obtener tratamientos', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/tratamientos/:id
 * @desc    Obtener un tratamiento por ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tratamiento, error } = await supabase
      .from('treatments')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    if (!tratamiento) {
      return res.status(404).json({ message: 'Tratamiento no encontrado' });
    }

    res.status(200).json(tratamiento);
  } catch (error) {
    console.error('Error al obtener tratamiento:', error);
    res.status(500).json({ 
      message: 'Error al obtener tratamiento', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/tratamientos
 * @desc    Crear un nuevo tratamiento
 * @access  Private (Admin)
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { 
      nombre, 
      descripcion, 
      precioNacional, 
      precioInternacional, 
      numeroSesiones,
      duracionMinutos 
    } = req.body;

    // Validaciones
    if (!nombre || !precioNacional || !precioInternacional || !numeroSesiones) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: nombre, precioNacional, precioInternacional, numeroSesiones' 
      });
    }

    const { data: tratamiento, error } = await supabase
      .from('treatments')
      .insert([{
        name: nombre,
        description: descripcion || null,
        price_national: precioNacional,
        price_international: precioInternacional,
        sessions: numeroSesiones,
        duration: duracionMinutos ? `${duracionMinutos} min` : '60 min',
        is_active: true,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Tratamiento creado exitosamente',
      tratamiento 
    });
  } catch (error) {
    console.error('Error al crear tratamiento:', error);
    res.status(500).json({ 
      message: 'Error al crear tratamiento', 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/tratamientos/:id
 * @desc    Actualizar un tratamiento
 * @access  Private (Admin)
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { 
      nombre, 
      descripcion, 
      precioNacional, 
      precioInternacional, 
      numeroSesiones,
      duracionMinutos,
      isActive 
    } = req.body;

    const updateData = {};
    if (nombre !== undefined) updateData.name = nombre;
    if (descripcion !== undefined) updateData.description = descripcion;
    if (precioNacional !== undefined) updateData.price_national = precioNacional;
    if (precioInternacional !== undefined) updateData.price_international = precioInternacional;
    if (numeroSesiones !== undefined) updateData.sessions = numeroSesiones;
    if (duracionMinutos !== undefined) updateData.duration = `${duracionMinutos} min`;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: tratamiento, error } = await supabase
      .from('treatments')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!tratamiento) {
      return res.status(404).json({ message: 'Tratamiento no encontrado' });
    }

    res.status(200).json({ 
      message: 'Tratamiento actualizado exitosamente',
      tratamiento 
    });
  } catch (error) {
    console.error('Error al actualizar tratamiento:', error);
    res.status(500).json({ 
      message: 'Error al actualizar tratamiento', 
      error: error.message 
    });
  }
});

/**
 * @route   PATCH /api/tratamientos/:id/toggle
 * @desc    Activar/Desactivar un tratamiento
 * @access  Private (Admin)
 */
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    // Obtener el estado actual
    const { data: current, error: fetchError } = await supabase
      .from('treatments')
      .select('is_active')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError) throw fetchError;

    if (!current) {
      return res.status(404).json({ message: 'Tratamiento no encontrado' });
    }

    // Invertir el estado
    const { data: tratamiento, error: updateError } = await supabase
      .from('treatments')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({ 
      message: `Tratamiento ${tratamiento.is_active ? 'activado' : 'desactivado'} exitosamente`,
      tratamiento 
    });
  } catch (error) {
    console.error('Error al cambiar estado del tratamiento:', error);
    res.status(500).json({ 
      message: 'Error al cambiar estado del tratamiento', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/tratamientos/:id
 * @desc    Eliminar un tratamiento (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    // Verificar si hay citas asociadas
    const { data: citas, error: citasError } = await supabase
      .from('appointments')
      .select('id')
      .eq('treatment_id', id)
      .is('deleted_at', null)
      .limit(1);

    if (citasError) throw citasError;

    if (citas && citas.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el tratamiento porque tiene citas asociadas. Considere desactivarlo en su lugar.' 
      });
    }

    const { data: tratamiento, error } = await supabase
      .from('treatments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!tratamiento) {
      return res.status(404).json({ message: 'Tratamiento no encontrado' });
    }

    res.status(200).json({ message: 'Tratamiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar tratamiento:', error);
    res.status(500).json({ 
      message: 'Error al eliminar tratamiento', 
      error: error.message 
    });
  }
});

module.exports = router;
