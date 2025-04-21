// en routes/comentarios.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// Obtener comentarios
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('comentarios').get();
    const comentarios = snapshot.docs.map(doc => doc.data());
    res.status(200).json(comentarios);
  } catch (err) {
    res.status(500).send('Error al obtener comentarios');
  }
});

// Enviar comentario
router.post('/', async (req, res) => {
  const { nombre, texto, calificacion } = req.body;
  try {
    await db.collection('comentarios').add({
      nombre,
      texto,
      calificacion,
      fecha: new Date()
    });
    res.status(200).send('Comentario guardado');
  } catch (err) {
    res.status(500).send('Error al guardar comentario');
  }
});

module.exports = router;
