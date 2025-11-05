const express = require('express');
const router = express.Router();
const db = require('../firebase/config');

// CREAR BLOG
router.post('/crear', async (req, res) => {
  try {
    console.log('📝 Creando blog con datos:', req.body);
    
    const { titulo, texto, imagen, videoUrl } = req.body;
    
    if (!titulo || !texto) {
      return res.status(400).json({ 
        message: 'Título y texto son requeridos',
        received: { titulo, texto }
      });
    }

    const blogRef = db.collection('blogs').doc();

    const blogData = {
      titulo,
      texto,
      imagen: imagen || '',
      videoUrl: videoUrl || '',
      fecha: new Date(),
    };

    console.log('💾 Guardando en Firestore:', blogData);
    
    await blogRef.set(blogData);

    console.log('✅ Blog creado exitosamente con ID:', blogRef.id);
    res.status(201).json({ 
      message: 'Blog creado exitosamente', 
      blogId: blogRef.id,
      data: blogData
    });
  } catch (error) {
    console.error('❌ Error al crear el blog:', error);
    res.status(500).json({ 
      message: 'Error al crear el blog', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// OBTENER BLOGS
router.get('/obtener', async (req, res) => {
  try {
    const snapshot = await db.collection('blogs').get();
    const blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los blogs', error });
  }
});

module.exports = router;
