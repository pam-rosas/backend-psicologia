const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

const citasRoutes = require('./routes/citas');
const comentariosRoutes = require('./routes/comentarios');
const blogsRoutes = require('./routes/blog');

const app = express(); // 👈 Esto debe ir antes de usar `app.use`
const port = 3000;

// Inicializar Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://tu-proyecto-id.firebaseio.com' // 👈 Cambia esto por el real de tu proyecto
  });
} else {
  admin.app();
}

const db = admin.firestore();
module.exports = db; // 👈 Esto permite usar `db` en otros archivos (como rutas)

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Rutas
app.use('/api/citas', citasRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/blog', blogsRoutes);

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
