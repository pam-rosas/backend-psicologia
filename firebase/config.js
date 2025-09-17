// firebase/config.js
const admin = require('firebase-admin');

try {
  // Asegúrate que la ruta sea correcta
  const serviceAccount = require('etc/secrets/key.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('Firebase inicializado correctamente');
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  throw error;
}

// Test de conexión
const db = admin.firestore();
db.collection('administradores').limit(1).get()
  .then(() => {
    console.log('✅ Conexión a Firestore exitosa');
  })
  .catch(error => {
    console.error('❌ Error de conexión a Firestore:', error);
  });

// IMPORTANTE: Exporta el objeto admin, NO db
module.exports = admin;  // Exporta admin en lugar de db

// Test simple que puedes añadir al final de config.js para probar
const adminObj = require('./config'); // Auto-importa este mismo archivo
console.log('¿El objeto admin tiene firestore?', typeof adminObj.firestore === 'function');
