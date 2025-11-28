// index-supabase.js - Servidor Express con Supabase
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Importar configuración de Supabase
const { supabase } = require('./db/supabase');

// Importar middlewares
const { verifyToken, verifyRole } = require('./middlewares/verifyToken');

// Importar rutas Supabase (migradas)
const loginRoutes = require('./routes/login-supabase');
const blogRoutes = require('./routes/blog-supabase');
const citasRoutes = require('./routes/citas-supabase');
const tallerRoutes = require('./routes/talleres-supabase');
const horarioRoutes = require('./routes/horarios-supabase');
const tratamientosRoutes = require('./routes/tratamientos-supabase');
const comentariosRoutes = require('./routes/comentarios-supabase');
const pageContentRoutes = require('./routes/page-content-supabase');
const mediaRoutes = require('./routes/media-supabase');
const imagesRoutes = require('./routes/images-supabase');
const webpayRoutes = require('./routes/webpay');
const paquetesRoutes = require('./routes/paquetes-supabase');

const disponibilidadRoutes = require('./routes/disponibilidad-supabase');
const configuracionDisponibilidadRoutes = require('./routes/configuracion-disponibilidad');

// Rutas de administración
const adminHorariosRoutes = require('./routes/admin-horarios');
const bloquesManualesRoutes = require('./routes/bloques-manuales');
const reservasRoutes = require('./routes/reservas-supabase');
const adminCitasRoutes = require('./routes/admin-citas');

const app = express();
const port = process.env.PORT || 3000;

// Orígenes permitidos desde variables de entorno
const allowedOrigins = [
  process.env.FRONTEND_URL_LOCAL || 'http://localhost:4200',
  process.env.FRONTEND_URL_CUSTOM || 'https://emhpsicoterapia.cl',
  process.env.FRONTEND_URL_CUSTOM_WWW || 'https://www.emhpsicoterapia.cl',
  process.env.FRONTEND_URL_PROD || 'https://psicoterapia-frontend.onrender.com'
].filter(Boolean);

// Configurar CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

// Middlewares
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =====================================================
// RUTAS CON SUPABASE (✅ TODAS MIGRADAS)
// =====================================================

// Autenticación
app.use('/api/login', loginRoutes);

// Blog
app.use('/api/blog', blogRoutes);

// Citas y tratamientos
app.use('/api/citas', citasRoutes);
app.use('/api/tratamientos', tratamientosRoutes);

// Talleres
app.use('/api/talleres', tallerRoutes);

// Horarios
app.use('/api/horarios', horarioRoutes);

// Comentarios
app.use('/api/comentarios', comentariosRoutes);

// Contenido de páginas
app.use('/api/page-content', pageContentRoutes);

// Media URLs
app.use('/api/media', mediaRoutes);

// Imágenes (Supabase Storage)
app.use('/api/images', imagesRoutes);

// Webpay (Integración de pago con Supabase)
app.use('/api/webpay', webpayRoutes);

// Paquetes (Nuevo sistema de agendamiento)
app.use('/api', paquetesRoutes);

// Disponibilidad de horarios (Nuevo sistema de agendamiento)

app.use('/api', disponibilidadRoutes);
app.use('/api/configuracion/disponibilidad', configuracionDisponibilidadRoutes);

// Panel de administración de horarios y excepciones
app.use('/api/admin', adminHorariosRoutes);

// Bloques manuales para gestión de calendario
app.use('/api/bloques-manuales', bloquesManualesRoutes);

// Reservas con paquetes (múltiples sesiones)
app.use('/api/reservas', reservasRoutes);

// Administración de citas (detalle, reagendar, cancelar)
app.use('/api/admin/citas', adminCitasRoutes);

// =====================================================
// RUTA DE PRUEBA
// =====================================================
app.get('/api/test', async (req, res) => {
  try {
    // Probar conexión a Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const supabaseStatus = error 
      ? `❌ Error: ${error.message}` 
      : '✅ Conectado';
    
    res.json({
      message: '🚀 Servidor funcionando con Supabase PostgreSQL',
      timestamp: new Date().toISOString(),
      supabase: supabaseStatus,
      environment: process.env.NODE_ENV || 'development',
      routes: {
        status: '✅ Todas las rutas migradas a Supabase',
        migrated: [
          '/api/login',
          '/api/blog',
          '/api/citas',
          '/api/tratamientos',
          '/api/talleres',
          '/api/horarios',
          '/api/comentarios',
          '/api/page-content',
          '/api/media',
          '/api/images (Supabase Storage)',
          '/api/webpay (Integrado con Supabase)'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error en servidor',
      error: error.message
    });
  }
});

// =====================================================
// MANEJO DE ERRORES
// =====================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error del servidor'
  });
});

// Ruta 404
app.use((req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada',
    path: req.path
  });
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================
app.listen(port, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 SERVIDOR INICIADO');
  console.log('='.repeat(50));
  console.log(`📡 Puerto: ${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Base de datos: Supabase PostgreSQL`);
  console.log(`🔗 URL local: http://localhost:${port}`);
  console.log(`✅ TODAS las rutas migradas a Supabase (11/11)`);
  console.log(`   - /api/login, /api/blog, /api/citas, /api/tratamientos`);
  console.log(`   - /api/talleres, /api/horarios, /api/comentarios`);
  console.log(`   - /api/page-content, /api/media, /api/images, /api/webpay`);
  console.log(`🔥 Firebase completamente eliminado`);
  console.log('='.repeat(50));
});

module.exports = app;
