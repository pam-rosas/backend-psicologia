// routes/login.js
const express = require('express');
const router = express.Router();
const db = require('../firebase/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Login de administrador
// Ruta de login
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

    // Comparar la contraseña con la encriptada
    const isMatch = await bcrypt.compare(contrasena, adminData.contrasena);

    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Generar el token JWT
    const token = jwt.sign(
      { username: adminData.username }, // Datos que deseas incluir en el token
      'mi_clave_secreta',               // Clave secreta para firmar el token (cámbiala por una más segura)
      { expiresIn: '1h' }               // El token expirará en 1 hora
    );

    // Responder con el token
    res.status(200).json({
      message: 'Login exitoso',
      user: { username: adminData.username },
      token: token // Aquí mandamos el token generado
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});
// Crear un nuevo administrador con contraseña encriptada
router.post('/register', async (req, res) => {
  const { username, contrasena } = req.body;

  try {
    // Verifica si el usuario ya existe
    const snapshot = await db.collection('administradores').where('username', '==', username).get();

    if (!snapshot.empty) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Encriptar la contraseña
    const saltRounds = 10; // Nivel de seguridad
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    // Crea el nuevo administrador con contraseña encriptada
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
