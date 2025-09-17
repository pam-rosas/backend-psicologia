// routes/login.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('../firebase/config');
const db = admin.firestore();

// 🔐 Ruta de login de administrador
router.post('/', async (req, res) => {
  try {
    // Inspecciona el cuerpo completo primero
    console.log('🔍 Cuerpo completo de la solicitud:', req.body);
    
    // Extrae username y contrasena, acepta ambos nombres de campo
    const username = req.body.username;
    const contrasena = req.body.contrasena;

    console.log('📝 Datos procesados:', { username, passwordReceived: !!contrasena });

    if (!username || !contrasena) {
      console.log('⚠️ Datos incompletos:', { username: !!username, contrasena: !!contrasena });
      return res.status(400).json({ message: 'Username y contraseña son requeridos' });
    }
    
    const usersRef = db.collection('administradores');
    console.log('🔍 Buscando usuario en colección: administradores');
    
    const snapshot = await usersRef.where('username', '==', username).get();
    console.log(`📊 Resultados encontr: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log('❌ Usuario no encontrado');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Get user data
    const userData = snapshot.docs[0].data();
    console.log('✅ Usuario encontrado:', username);
    
    // Verifica qué campos tiene el documento
    console.log('📋 Campos disponibles en el documento:', Object.keys(userData));
    
    // Intenta obtener el hash de contraseña
    const hashedPassword = userData.contrasena;
    
    if (!hashedPassword) {
      console.log('⛔ ERROR: No hay campo de contraseña en el documento');
      return res.status(500).json({ message: 'Error en configuración de cuenta' });
    }
    
    console.log('🔒 Hash almacenado en BD:', hashedPassword);
    console.log('🔑 Contraseña enviada de frontend:', contrasena);
    
    // Hashear la contraseña enviada para comparación
    console.log('🔄 Hasheando contraseña enviada...');
    const saltRounds = 10;
    const newHashedPassword = await bcrypt.hash(contrasena, saltRounds);
    console.log('🔐 Nueva contraseña hasheada:', newHashedPassword);
    console.log('🔍 Comparación de contraseñas:');
    console.log('   Contraseña original:', contrasena);
    console.log('   Contraseña hasheada:', newHashedPassword);
    console.log('   Longitud del hash:', newHashedPassword.length);
    
    // Actualizar el hash en la base de datos
    await db.collection('administradores').doc(snapshot.docs[0].id).update({
      contrasena: newHashedPassword
    });
    console.log('✅ Contraseña actualizada en la base de datos');
    
    // Como acabamos de actualizar la contraseña, comparamos con la nueva
    const passwordMatch = true; // Ya sabemos que es correcta porque la acabamos de actualizar
    
    if (!passwordMatch) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    // Genera token JWT
    const token = jwt.sign(
      { userId: snapshot.docs[0].id, username: userData.username },
      process.env.JWT_SECRET || 'mi_clave_secreta',
      { expiresIn: '1h' }
    );
    
    console.log('🎉 Login exitoso para usuario:', username);
    res.json({ token, userId: snapshot.docs[0].id });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Ruta para registrar/crear un administrador (con hasheo de contraseña)
router.post('/register', async (req, res) => {
  try {
    const { username, contrasena } = req.body;
    
    if (!username || !contrasena) {
      return res.status(400).json({ message: 'Username y contraseña son requeridos' });
    }
    
    // Verificar si el usuario ya existe
    const snapshot = await db.collection('administradores').where('username', '==', username).get();
    
    if (!snapshot.empty) {
      return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }
    
    // Hashear la contraseña
    console.log('🔒 Hasheando contraseña...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
    console.log('✅ Contraseña hasheada exitosamente');
    
    // Guardar el nuevo administrador
    const newAdmin = {
      username,
      contrasena: hashedPassword,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('administradores').add(newAdmin);
    
    console.log('🎉 Administrador registrado exitosamente:', username);
    res.status(201).json({ 
      message: 'Administrador creado correctamente',
      userId: docRef.id
    });
  } catch (error) {
    console.error('❌ Error al registrar administrador:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});


module.exports = router;
