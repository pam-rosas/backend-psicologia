const express = require('express');
const router = express.Router();
const db = require('../firebase/config');

// GET - Obtener contenido de una página específica
router.get('/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const doc = await db.collection('page-content').doc(pageId).get();
    res.json(doc.data());
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ error: 'Error al obtener contenido' });
  }
});

// PUT - Actualizar contenido de una página
router.put('/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const content = req.body;
    // Guardar en la colección 'page-content' con el ID recibido (ej: 'inicio')
    await db.collection('page-content').doc(pageId).set(
      {
        ...content,
        updatedAt: new Date()
      },
      { merge: true }
    );
    res.json({ message: 'Contenido actualizado exitosamente', id: pageId });
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    res.status(500).json({ error: 'Error al actualizar contenido' });
  }
});



module.exports = router;