// firebase/config.js
const admin = require('firebase-admin');

// Inicializa la aplicación Firebase con tus credenciales
admin.initializeApp({
  credential: admin.credential.cert(require('../firebase/key.json')), // Aquí debes colocar la ruta correcta a tu archivo key.json
});

const db = admin.firestore();

module.exports = db;
