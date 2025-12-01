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
      .from('comentarios')
      .select(`
        id,
        author_name,
        comment_text,
        rating,
        created_at
      `)
      .eq('is_approved', true)
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
      .from('comentarios')
      .select(`
        id,
        author_name,
        comment_text,
        rating,
        is_approved,
        created_at
      `)
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
    const { author_name, comment_text, rating } = req.body;

    // Validaciones
    if (!author_name || !comment_text || rating === undefined) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: author_name, comment_text, rating' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'La calificación debe estar entre 1 y 5' 
      });
    }

    const { data: comentario, error } = await supabase
      .from('comentarios')
      .insert([{
        author_name: author_name.trim(),
        comment_text: comment_text.trim(),
        rating: parseInt(rating),
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
 * @route   PUT /api/comentarios/:id/approve
 * @desc    Aprobar un comentario
 * @access  Private (Admin)
 */
router.put('/:id/approve', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    const { data: comentario, error } = await supabase
      .from('comentarios')
      .update({ is_approved: true })
      .eq('id', id)
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
 * @desc    Eliminar un comentario permanentemente
 * @access  Private (Admin)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { id } = req.params;

    const { data: comentario, error } = await supabase
      .from('comentarios')
      .delete()
      .eq('id', id)
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
