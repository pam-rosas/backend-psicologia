const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const verifyToken = require('./middlewares/verifyToken');
const loginRoutes = require('./routes/login');
const citasRoutes = require('./routes/citas');
const comentariosRoutes = require('./routes/comentarios');
const blogsRoutes = require('./routes/blog');
const tallerRoutes = require('./routes/taller');
const horarioRoutes = require('./routes/horario');
const imageRoutes = require('./routes/images');
// Importar nuevas rutas
const pageContentRoutes = require('./routes/page-content');
const mediaRoutes = require('./routes/media');
const webpayRoutes = require('./routes/webpay');


const app = express();
const port = 3000;

// Configuración de CORS más específica
const corsOptions = {
  origin: ['https://emhpsicoterapia.cl', 'http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH' , 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(bodyParser.json());
app.use(cors(corsOptions));

// Middleware para capturar todas las peticiones
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Body:`, req.body );
  next();
});

// Rutas
app.use('/api/citas', citasRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/blog', blogsRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/taller', tallerRoutes); 
app.use('/api/horario', horarioRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/webpay', webpayRoutes)

// Usar las nuevas rutas
app.use('/api/page-content', pageContentRoutes);
app.use('/api/media', mediaRoutes);


app.get('/api/admin', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Bienvenido a la sección de administrador', user: req.user });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${port} - Deploy v2`);
});

// Verificar que existe: c:\psicologia\backend-psicologia\routes\images.js
// Y que está siendo importado en index.js

// Si no existe, créalo con este contenido básico:
const router = express.Router();

// Ruta de prueba
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Ruta de imágenes funcionando',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
