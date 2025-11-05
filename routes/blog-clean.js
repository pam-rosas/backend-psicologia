const express = require('express');
const router = express.Router();
const db = require('../firebase/config');

router.post('/crear', async (req, res) => {
  try {
    const { titulo, texto, imagen, videoUrl } = req.body;
    
    if (!titulo || !texto) {
      return res.status(400).json({ message: 'Titulo y texto requeridos' });
    }

    const blogRef = db.collection('blogs').doc();
    await blogRef.set({
      titulo,
      texto,
      imagen: imagen || '',
      videoUrl: videoUrl || '',
      fecha: new Date()
    });

    res.status(201).json({ 
      message: 'Blog creado exitosamente', 
      blogId: blogRef.id 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear blog', error: error.message });
  }
});

router.get('/obtener', async (req, res) => {
  try {
    const snapshot = await db.collection('blogs').get();
    const blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener blogs', error: error.message });
  }
});

module.exports = router;