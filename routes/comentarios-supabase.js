const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');

/**
 * @route   GET /api/comentarios
 * @desc    Obtener todos los comentarios públicos aprobados
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { data: comentarios, error } = await supabase
      .from('comments')
      .select(`
        id,
        name,
        text,
        rating,
        created_at
      `)
      .eq('is_approved', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(comentarios);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ 
      message: 'Error al obtener comentarios', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/comentarios/admin
 * @desc    Obtener todos los comentarios (incluyendo pendientes)
 * @access  Private (Admin)
 */
router.get('/admin', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { data: comentarios, error } = await supabase
      .from('comments')
      .select(`
        id,
        name,
        text,
        rating,
        is_approved,
        created_at
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(comentarios);
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ 
      message: 'Error al obtener comentarios', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/comentarios
 * @desc    Crear un nuevo comentario (requiere aprobación)
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { nombre, texto, calificacion } = req.body;

    // Validaciones
    if (!nombre || !texto || calificacion === undefined) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: nombre, texto, calificacion' 
      });
    }

    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ 
        message: 'La calificación debe estar entre 1 y 5' 
      });
    }

    const { data: comentario, error } = await supabase
      .from('comments')
      .insert([{
        name: nombre,
        text: texto,
        rating: calificacion,
        is_approved: false // Requiere aprobación del admin
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      message: 'Comentario enviado exitosamente. Será revisado antes de publicarse.',
      comentario 
    });
  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({ 
      message: 'Error al guardar comentario', 
      error: error.message 
    });
  }
});

/**
 * @route   PATCH /api/comentarios/:id/aprobar
 * @desc    Aprobar un comentario
 * @access  Private (Admin)
 */
router.patch('/:id/aprobar', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    const { data: comentario, error } = await supabase
      .from('comments')
      .update({ is_approved: true })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!comentario) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    res.status(200).json({ 
      message: 'Comentario aprobado exitosamente',
      comentario 
    });
  } catch (error) {
    console.error('Error al aprobar comentario:', error);
    res.status(500).json({ 
      message: 'Error al aprobar comentario', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/comentarios/:id
 * @desc    Eliminar un comentario (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    const { data: comentario, error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!comentario) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    res.status(200).json({ message: 'Comentario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({ 
      message: 'Error al eliminar comentario', 
      error: error.message 
    });
  }
});

module.exports = router;
