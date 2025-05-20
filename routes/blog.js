const express = require('express');
const router  = express.Router();
const db      = require('../firebase/config');

// ----------- CREAR -------------
router.post('/crear', async (req, res) => {
  try {
    const { titulo, texto, imagen, videoUrl = '' } = req.body;     // ← nuevo campo
    const blogRef = db.collection('blogs').doc();

    await blogRef.set({
      titulo,
      texto,
      imagen: imagen || '',        // vacíos si no llegan
      videoUrl,                    // idem
      fecha: new Date(),
    });

    res.status(201).json({ message: 'Blog creado exitosamente', blogId: blogRef.id });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el blog', error });
  }
});

// ----------- OBTENER -----------
router.get('/obtener', async (_req, res) => {
  try {
    const snapshot = await db.collection('blogs').get();
    const blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los blogs', error });
  }
});

// ----------- EDITAR ------------
router.put('/editar/:id', async (req, res) => {
  try {
    const blogId = req.params.id;
    const { titulo, texto, imagen, videoUrl } = req.body; // incluye videoUrl

    const blogRef = db.collection('blogs').doc(blogId);
    await blogRef.update({ titulo, texto, imagen, videoUrl });

    res.status(200).json({ message: 'Blog actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el blog', error });
  }
});

// ----------- ELIMINAR ----------
router.delete('/eliminar/:id', async (req, res) => {
  try {
    await db.collection('blogs').doc(req.params.id).delete();
    res.status(200).json({ message: 'Blog eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el blog', error });
  }
});

module.exports = router;
