// routes/login-supabase.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🔐 Ruta de login
router.post('/', async (req, res) => {
  const { username, contrasena } = req.body;
  console.log('[LOGIN] Intento de login:', { username });
  
  try {
    // 🔑 VERIFICACIÓN DE ADMIN DESDE VARIABLES DE ENTORNO
    // Primero verificar si es el usuario admin configurado en .env
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin';
    
    if (username === adminUsername && adminPassword && contrasena === adminPassword) {
      console.log('[LOGIN] ✅ Login exitoso como ADMIN desde variables de entorno');
      
      // Generar token JWT para admin
      const token = jwt.sign(
        { 
          id: 'admin-env',
          username: adminUsername,
          role: 'admin'
        },
        process.env.JWT_SECRET || 'mi_clave_secreta',
        { expiresIn: '24h' }
      );
      
      return res.status(200).json({
        message: 'Login exitoso',
        user: { 
          id: 'admin-env',
          username: adminUsername,
          role: 'admin',
          email: adminEmail
        },
        token
      });
    }
    
    // Si no es admin desde env, buscar en base de datos (usuarios regulares)
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .is('deleted_at', null)
      .limit(1);
    
    if (error) {
      console.error('[LOGIN] Error consultando usuario:', error);
      return res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
    
    if (!users || users.length === 0) {
      console.log('[LOGIN] Usuario no encontrado');
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }
    
    const user = users[0];
    console.log('[LOGIN] Usuario encontrado en BD:', user.username);
    
    if (!user.password_hash) {
      console.log('[LOGIN] Datos de usuario incompletos');
      return res.status(500).json({ message: 'Datos de usuario incompletos' });
    }
    
    // Verificar contraseña hasheada
    const isMatch = await bcrypt.compare(contrasena, user.password_hash);
    console.log('[LOGIN] ¿Contraseña coincide?', isMatch);
    
    if (!isMatch) {
      console.log('[LOGIN] Contraseña incorrecta');
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }
    
    // Generar token JWT con rol
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role || 'usuario'
      },
      process.env.JWT_SECRET || 'mi_clave_secreta',
      { expiresIn: '24h' }
    );
    
    console.log('[LOGIN] Token generado con rol:', user.role);
    
    res.status(200).json({
      message: 'Login exitoso',
      user: { 
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      },
      token
    });
    
  } catch (error) {
    console.error('[LOGIN] Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

// 🔐 Ruta para registrar nuevos usuarios
router.post('/register', async (req, res) => {
  const { username, contrasena, role, email } = req.body;
  
  try {
    // Verificar si el usuario ya existe
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .limit(1);
    
    if (checkError) {
      return res.status(500).json({ message: 'Error verificando usuario', error: checkError.message });
    }
    
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);
    
    // Crear usuario
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: hashedPassword,
        role: role || 'usuario',
        email: email || null
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[REGISTER] Error creando usuario:', insertError);
      return res.status(500).json({ message: 'Error creando usuario', error: insertError.message });
    }
    
    console.log('[REGISTER] Usuario creado:', newUser.username);
    
    res.status(201).json({ 
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    });
    
  } catch (error) {
    console.error('[REGISTER] Error en registro:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

module.exports = router;
