const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

const verifyToken = require('./middlewares/verifyToken');
const loginRoutes = require('./routes/login');
const citasRoutes = require('./routes/citas');
const comentariosRoutes = require('./routes/comentarios');
const blogsRoutes = require('./routes/blog');
const tallerRoutes = require('./routes/taller');
const horarioRoutes = require('./routes/horario');

const app = express();
const port = 3000;

// Inicializar Firebase con clave de servicio
const serviceAccount = require('./firebase/key.json.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://psicoterapia-7fb0d.firebaseio.com'
  });
} else {
  admin.app();
}

const db = admin.firestore();
module.exports = db;

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: ['https://emhpsicoterapia.cl', 'http://localhost:4200'],
  credentials: true
}));

// Middleware para capturar todas las peticiones
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Body:`, req.body);
  next();
});

// Rutas
app.use('/api/citas', citasRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/blog', blogsRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/taller', tallerRoutes); 
app.use('/api/horario', horarioRoutes);

app.get('/api/admin', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Bienvenido a la sección de administrador', user: req.user });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
