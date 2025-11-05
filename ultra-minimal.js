const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

// CORS básico
const corsOptions = {
  origin: ['https://emhpsicoterapia.cl', 'http://localhost:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.options('*', cors(corsOptions));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Body:`, req.body);
  next();
});

// Simulador de base de datos en memoria
let blogs = [
  { id: '1', titulo: 'Blog de prueba', texto: 'Contenido de ejemplo', imagen: '', videoUrl: '', fecha: new Date() }
];

// Rutas de blog sin archivos externos
app.post('/api/blog/crear', (req, res) => {
  try {
    console.log('📝 Creando blog con datos:', req.body);
    
    const { titulo, texto, imagen, videoUrl } = req.body;
    
    if (!titulo || !texto) {
      return res.status(400).json({ 
        message: 'Título y texto son requeridos',
        received: { titulo, texto }
      });
    }

    const newBlog = {
      id: Date.now().toString(),
      titulo,
      texto,
      imagen: imagen || '',
      videoUrl: videoUrl || '',
      fecha: new Date()
    };

    blogs.push(newBlog);

    console.log('✅ Blog creado exitosamente con ID:', newBlog.id);
    res.status(201).json({ 
      message: 'Blog creado exitosamente', 
      blogId: newBlog.id,
      data: newBlog
    });
  } catch (error) {
    console.error('❌ Error al crear el blog:', error);
    res.status(500).json({ 
      message: 'Error al crear el blog', 
      error: error.message
    });
  }
});

app.get('/api/blog/obtener', (req, res) => {
  try {
    console.log('📖 Obteniendo blogs:', blogs.length, 'blogs encontrados');
    res.status(200).json(blogs);
  } catch (error) {
    console.error('❌ Error al obtener blogs:', error);
    res.status(500).json({ message: 'Error al obtener blogs', error: error.message });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Servidor funcionando con simulador de BD', 
    timestamp: new Date(),
    blogs_count: blogs.length
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor funcionando en puerto ${port} con ${blogs.length} blogs iniciales`);
});