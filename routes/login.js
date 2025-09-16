// routes/login.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs'); // ✅ Usa bcryptjs para evitar errores de compilación
const jwt = require('jsonwebtoken');

// Obtener la instancia de Firestore
const db = admin.firestore();

// 🔐 Ruta de login de administrador
router.post('/', async (req, res) => {
  const { username, contrasena } = req.body;
  console.log('Intentando login:', { username });
  try {
    const snapshot = await db.collection('administradores').where('username', '==', username).get();
    console.log('Snapshot obtenido:', snapshot);
    if (snapshot.empty) {
      console.log('Usuario no encontrado');
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    let adminData;
    snapshot.forEach(doc => {
      adminData = doc.data();
    });
    console.log('Datos de admin:', adminData);

    if (!adminData || !adminData.contrasena) {
      console.log('Datos de administrador incompletos');
      return res.status(500).json({ message: 'Datos de administrador incompletos' });
    }

    // ✅ Compara contraseñas con bcryptjs
    const isMatch = await bcrypt.compare(contrasena, adminData.contrasena);
    console.log('¿Contraseña coincide?', isMatch);
    if (!isMatch) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // 🔑 Generar token JWT
    const token = jwt.sign(
      { username: adminData.username },
      'mi_clave_secreta', // ⚠️ Reemplaza esto por una variable de entorno en producción
      { expiresIn: '1h' }
    );
    console.log('Token generado:', token);

    res.status(200).json({
      message: 'Login exitoso',
      user: { username: adminData.username },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
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
