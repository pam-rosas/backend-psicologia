const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Configuración de CORS
const corsOptions = {
  origin: ['https://emhpsicoterapia.cl', 'http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.options('*', cors(corsOptions));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Body:`, req.body);
  next();
});

// Solo cargar la ruta de blog
try {
  const blogsRoutes = require('./routes/blog-clean');
  app.use('/api/blog', blogsRoutes);
  console.log('✅ Ruta de blog cargada exitosamente');
} catch (error) {
  console.error('❌ Error al cargar ruta de blog:', error.message);
}

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor mínimo funcionando - solo blog habilitado',
    timestamp: new Date()
  });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor mínimo corriendo en http://localhost:${port}`);
});