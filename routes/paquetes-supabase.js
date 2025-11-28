const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');

// ============================================
// ENDPOINTS PÚBLICOS - PAQUETES
// ============================================

/**
 * GET /api/paquetes
 * Obtener todos los paquetes activos
 */
router.get('/paquetes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('paquetes')
      .select('*')
      .eq('activo', true)
      .order('destacado', { ascending: false })
      .order('nombre', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      paquetes: data
    });
  } catch (error) {
    console.error('Error al obtener paquetes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquetes',
      error: error.message
    });
  }
});

// ============================================
// ENDPOINTS ADMIN - PAQUETES
// ============================================

/**
 * GET /api/admin/paquetes
 * Obtener todos los paquetes (activos e inactivos) para administración
 * Requiere token de autenticación
 */
router.get('/admin/paquetes', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('paquetes')
      .select('*')
      .order('destacado', { ascending: false })
      .order('nombre', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      paquetes: data || []
    });
  } catch (error) {
    console.error('Error al obtener paquetes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquetes',
      error: error.message
    });
  }
});

/**
 * GET /api/paquetes/:id
 * Obtener un paquete específico
 */
router.get('/paquetes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('paquetes')
      .select('*')
      .eq('id', id)
      .eq('activo', true)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.json({
      success: true,
      paquete: data
    });
  } catch (error) {
    console.error('Error al obtener paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquete',
      error: error.message
    });
  }
});

// ============================================
// ENDPOINTS ADMIN - PAQUETES
// ============================================

/**
 * POST /api/paquetes
 * Crear nuevo paquete (solo admin)
 */
router.post('/paquetes', verifyToken, async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      duracion,
      modalidad,
      precio_nacional,
      precio_internacional,
      sesiones,
      icono,
      color,
      destacado
    } = req.body;

    // Validaciones
    if (!nombre || !duracion || !precio_nacional) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: nombre, duracion, precio_nacional'
      });
    }

    const { data, error } = await supabase
      .from('paquetes')
      .insert({
        nombre,
        descripcion,
        duracion,
        modalidad: modalidad || 'online',
        precio_nacional,
        precio_internacional,
        sesiones: sesiones || 1,
        icono,
        color,
        destacado: destacado || false,
        activo: true
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Paquete creado exitosamente',
      paquete: data
    });
  } catch (error) {
    console.error('Error al crear paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear paquete',
      error: error.message
    });
  }
});

/**
 * PUT /api/paquetes/:id
 * Actualizar paquete existente (solo admin)
 */
router.put('/paquetes/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      duracion,
      modalidad,
      precio_nacional,
      precio_internacional,
      sesiones,
      icono,
      color,
      destacado,
      activo
    } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Solo actualizar campos proporcionados
    if (nombre !== undefined) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (duracion !== undefined) updateData.duracion = duracion;
    if (modalidad !== undefined) updateData.modalidad = modalidad;
    if (precio_nacional !== undefined) updateData.precio_nacional = precio_nacional;
    if (precio_internacional !== undefined) updateData.precio_internacional = precio_internacional;
    if (sesiones !== undefined) updateData.sesiones = sesiones;
    if (icono !== undefined) updateData.icono = icono;
    if (color !== undefined) updateData.color = color;
    if (destacado !== undefined) updateData.destacado = destacado;
    if (activo !== undefined) updateData.activo = activo;

    const { data, error } = await supabase
      .from('paquetes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Paquete actualizado exitosamente',
      paquete: data
    });
  } catch (error) {
    console.error('Error al actualizar paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar paquete',
      error: error.message
    });
  }
});

/**
 * DELETE /api/paquetes/:id
 * Desactivar paquete (soft delete, solo admin)
 */
router.delete('/paquetes/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('paquetes')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Paquete desactivado exitosamente',
      paquete: data
    });
  } catch (error) {
    console.error('Error al desactivar paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desactivar paquete',
      error: error.message
    });
  }
});

module.exports = router;
