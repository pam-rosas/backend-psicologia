const express = require('express');
const router = express.Router();
const db = require('../firebase/config');

// Ruta para crear un nuevo blog
router.post('/crear', async (req, res) => {
  try {
    const { titulo, texto, imagen } = req.body;
    const blogRef = db.collection('blogs').doc(); // Crear un nuevo documento en la colección 'blogs'
    
    await blogRef.set({
      titulo,
      texto,
      imagen,
      fecha: new Date(),
    });

    res.status(201).json({ message: 'Blog creado exitosamente', blogId: blogRef.id });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el blog', error });
  }
});

// Ruta para obtener todos los blogs
router.get('/obtener', async (req, res) => {
  try {
    const snapshot = await db.collection('blogs').get(); // Obtener todos los blogs de Firestore
    const blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los blogs', error });
  }
});
// Ruta para editar un blog existente
router.put('/editar/:id', async (req, res) => {
  try {
    const blogId = req.params.id;
    const { titulo, texto, imagen } = req.body;

    const blogRef = db.collection('blogs').doc(blogId);
    await blogRef.update({ titulo, texto, imagen });

    res.status(200).json({ message: 'Blog actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el blog', error });
  }
});


module.exports = router;
