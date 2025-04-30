// routes/login.js
const express = require('express');
const router = express.Router();
const db = require('../firebase/config');
const bcrypt = require('bcryptjs'); // ✅ Usa bcryptjs para evitar errores de compilación
const jwt = require('jsonwebtoken');

// 🔐 Ruta de login de administrador
router.post('/', async (req, res) => {
  const { username, contrasena } = req.body;

  try {
    const snapshot = await db.collection('administradores').where('username', '==', username).get();

    if (snapshot.empty) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    let adminData;
    snapshot.forEach(doc => {
      adminData = doc.data();
    });

    // ✅ Compara contraseñas con bcryptjs
    const isMatch = await bcrypt.compare(contrasena, adminData.contrasena);
    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // 🔑 Generar token JWT
    const token = jwt.sign(
      { username: adminData.username },
      'mi_clave_secreta', // ⚠️ Reemplaza esto por una variable de entorno en producción
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login exitoso',
      user: { username: adminData.username },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// 🔐 Ruta para registrar nuevos administradores
router.post('/register', async (req, res) => {
  const { username, contrasena } = req.body;

  try {
    const snapshot = await db.collection('administradores').where('username', '==', username).get();
    if (!snapshot.empty) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // ✅ Encriptar contraseña con bcryptjs
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    await db.collection('administradores').add({
      username,
      contrasena: hashedPassword
    });

    res.status(201).json({ message: 'Administrador creado exitosamente' });
  } catch (error) {
    console.error('Error creando administrador:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
