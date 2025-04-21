const express = require('express');
const router = express.Router();
const { db } = require('../firebase/config');

// GET ejemplo
router.get('/usuarios', async (req, res) => {
  try {
    const usuariosSnapshot = await db.collection('usuarios').get();
    const usuarios = usuariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

module.exports = router;
