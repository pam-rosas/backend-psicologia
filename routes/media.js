const express = require('express');
const router = express.Router();
const db = require('../firebase/config');

// GET - Obtener todas las URLs de media
router.get('/urls', async (req, res) => {
  try {
    const doc = await db.collection('media').doc('urls').get();
    
    if (!doc.exists) {
      // URLs por defecto
      const defaultUrls = {
        'hero-image': 'assets/f9.jpg',
        'hero-video': 'assets/videos/si2.mp4',
        'service1-image': 'assets/h11.avif',
        'service2-image': 'assets/h12.avif',
        'tarot-image': 'assets/tarot3.jpeg',
        'contact-video': 'assets/videos/si2.mp4'
      };
      return res.json(defaultUrls);
    }
    
    res.json(doc.data());
  } catch (error) {
    console.error('Error al obtener URLs de media:', error);
    res.status(500).json({ error: 'Error al obtener URLs de media' });
  }
});

// PUT - Actualizar URL de media específica
router.put('/url/:mediaKey', async (req, res) => {
  try {
    const { mediaKey } = req.params;
    const { url } = req.body;
    
    await db.collection('media').doc('urls').set({
      [mediaKey]: url,
      updatedAt: new Date()
    }, { merge: true });
    
    res.json({ message: 'URL de media actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar URL de media:', error);
    res.status(500).json({ error: 'Error al actualizar URL de media' });
  }
});

// DELETE - Eliminar media (restaurar a por defecto)
router.delete('/:mediaKey', async (req, res) => {
  try {
    const { mediaKey } = req.params;
    
    // Obtener URL por defecto
    const defaultUrls = {
      'hero-image': 'assets/f9.jpg',
      'hero-video': 'assets/videos/si2.mp4',
      'service1-image': 'assets/h11.avif',
      'service2-image': 'assets/h12.avif',
      'tarot-image': 'assets/tarot3.jpeg',
      'contact-video': 'assets/videos/si2.mp4'
    };
    
    const defaultUrl = defaultUrls[mediaKey];
    
    if (defaultUrl) {
      await db.collection('media').doc('urls').set({
        [mediaKey]: defaultUrl,
        updatedAt: new Date()
      }, { merge: true });
    }
    
    res.json({ message: 'Media restaurada a por defecto' });
  } catch (error) {
    console.error('Error al restaurar media:', error);
    res.status(500).json({ error: 'Error al restaurar media' });
  }
});

module.exports = router;