const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');

/**
 * @route   GET /api/media
 * @desc    Obtener todas las URLs de media
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { data: mediaUrls, error } = await supabase
      .from('media_urls')
      .select('*')
      .is('deleted_at', null)
      .order('media_key');

    if (error) throw error;

    // Convertir a objeto key-value para compatibilidad
    const urlsMap = {};
    mediaUrls.forEach(item => {
      urlsMap[item.media_key] = item.url;
    });

    // Si está vacío, devolver URLs por defecto
    if (Object.keys(urlsMap).length === 0) {
      return res.json({
        'hero-image': 'assets/f9.jpg',
        'hero-video': 'assets/videos/si2.mp4',
        'service1-image': 'assets/h11.avif',
        'service2-image': 'assets/h12.avif',
        'tarot-image': 'assets/tarot3.jpeg',
        'contact-video': 'assets/videos/si2.mp4'
      });
    }

    res.status(200).json(urlsMap);
  } catch (error) {
    console.error('Error al obtener URLs de media:', error);
    res.status(500).json({ 
      message: 'Error al obtener URLs de media', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/media/:mediaKey
 * @desc    Obtener URL de un media específico
 * @access  Public
 */
router.get('/:mediaKey', async (req, res) => {
  try {
    const { mediaKey } = req.params;

    const { data: media, error } = await supabase
      .from('media_urls')
      .select('*')
      .eq('media_key', mediaKey)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;

    if (!media) {
      return res.status(404).json({ message: 'Media no encontrado' });
    }

    res.status(200).json(media);
  } catch (error) {
    console.error('Error al obtener media:', error);
    res.status(500).json({ 
      message: 'Error al obtener media', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/media
 * @desc    Crear o actualizar URL de media
 * @access  Private (Admin)
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { mediaKey, url, descripcion } = req.body;

    if (!mediaKey || !url) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: mediaKey, url' 
      });
    }

    // Verificar si ya existe
    const { data: existing, error: checkError } = await supabase
      .from('media_urls')
      .select('id')
      .eq('media_key', mediaKey)
      .is('deleted_at', null)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Actualizar existente
      const { data: media, error: updateError } = await supabase
        .from('media_urls')
        .update({ 
          url, 
          description: descripcion || null 
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({ 
        message: 'URL de media actualizada',
        media 
      });
    } else {
      // Crear nuevo
      const { data: media, error: insertError } = await supabase
        .from('media_urls')
        .insert([{
          media_key: mediaKey,
          url,
          description: descripcion || null,
          created_by: req.user.id
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      return res.status(201).json({ 
        message: 'URL de media creada',
        media 
      });
    }
  } catch (error) {
    console.error('Error al guardar media:', error);
    res.status(500).json({ 
      message: 'Error al guardar media', 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/media/:mediaKey
 * @desc    Actualizar URL de un media específico
 * @access  Private (Admin)
 */
router.put('/:mediaKey', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { mediaKey } = req.params;
    const { url, descripcion } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'url es requerida' });
    }

    const updateData = { url };
    if (descripcion !== undefined) updateData.description = descripcion;

    const { data: media, error } = await supabase
      .from('media_urls')
      .update(updateData)
      .eq('media_key', mediaKey)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!media) {
      return res.status(404).json({ message: 'Media no encontrado' });
    }

    res.status(200).json({ 
      message: 'URL de media actualizada',
      media 
    });
  } catch (error) {
    console.error('Error al actualizar media:', error);
    res.status(500).json({ 
      message: 'Error al actualizar media', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/media/:mediaKey
 * @desc    Eliminar un media (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:mediaKey', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { mediaKey } = req.params;

    const { data: media, error } = await supabase
      .from('media_urls')
      .update({ deleted_at: new Date().toISOString() })
      .eq('media_key', mediaKey)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!media) {
      return res.status(404).json({ message: 'Media no encontrado' });
    }

    res.status(200).json({ message: 'Media eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar media:', error);
    res.status(500).json({ 
      message: 'Error al eliminar media', 
      error: error.message 
    });
  }
});

module.exports = router;
