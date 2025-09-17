const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

try {
  // Intentar cargar desde /etc/secrets en producción
  let serviceAccount;
  
  if (fs.existsSync('/etc/secrets/firebase-key.json')) {
    // Estamos en Render, usar archivo secreto
    serviceAccount = require('/etc/secrets/firebase-key.json');
    console.log('✅ Credenciales cargadas desde /etc/secrets/firebase-key.json');
  } else {
    // Estamos en desarrollo, usar archivo local
    serviceAccount = require('./key.json');
    console.log('✅ Credenciales cargadas desde ./key.json');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  throw error;
}

module.exports = admin;
