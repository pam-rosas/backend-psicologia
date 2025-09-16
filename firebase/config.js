// firebase/config.js
const admin = require('firebase-admin');

// Usar la instancia de Firebase ya inicializada
const db = admin.firestore();

module.exports = db;
