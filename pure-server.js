const http = require('http');
const url = require('url');
const querystring = require('querystring');

// Importar Firebase
let db = null;
let isFirebaseWorking = null;
let firebaseError = null;

// Intentar conectar Firebase
try {
  const firebaseModule = require('./firebase/config');
  db = firebaseModule.db;
  isFirebaseWorking = firebaseModule.isFirebaseWorking;
  console.log('✅ Firebase conectado exitosamente');
} catch (error) {
  console.error('❌ Error conectando Firebase:', error.message);
  firebaseError = error.message;
}

// Simulador de base de datos (fallback si Firebase falla)
let blogs = [
  { id: '1', titulo: 'Blog de prueba', texto: 'Contenido de ejemplo', imagen: '', videoUrl: '', fecha: new Date().toISOString() }
];

const server = http.createServer((req, res) => {
  // CORS headers - Permitir tu dominio de producción
  const allowedOrigins = [
    'http://localhost:4200',
    'https://emhpsicoterapia.cl'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${path}`);

  // Crear blog
  if (method === 'POST' && path === '/api/blog/crear') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('📝 Creando blog:', data);
        
        if (!data.titulo || !data.texto) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Título y texto requeridos' }));
          return;
        }

        const newBlog = {
          titulo: data.titulo,
          texto: data.texto,
          imagen: data.imagen || '',
          videoUrl: data.videoUrl || '',
          fecha: new Date()
        };

        let blogId;
        
        // Intentar guardar en Firebase primero
        if (db && isFirebaseWorking) {
          try {
            const firebaseWorks = await isFirebaseWorking();
            if (firebaseWorks) {
              const blogRef = db.collection('blogs').doc();
              await blogRef.set(newBlog);
              blogId = blogRef.id;
              console.log('✅ Blog guardado en Firebase con ID:', blogId);
            } else {
              throw new Error('Firebase no está respondiendo');
            }
          } catch (fbError) {
            console.error('❌ Error en Firebase, usando memoria:', fbError.message);
            // Fallback a memoria
            blogId = Date.now().toString();
            newBlog.id = blogId;
            blogs.push(newBlog);
          }
        } else {
          // Usar memoria si Firebase no está disponible
          blogId = Date.now().toString();
          newBlog.id = blogId;
          blogs.push(newBlog);
          console.log('📝 Blog guardado en memoria (Firebase no disponible)');
        }
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          message: 'Blog creado exitosamente', 
          blogId: blogId,
          data: { ...newBlog, id: blogId },
          storage: db ? 'firebase' : 'memory'
        }));
      } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error interno', error: error.message }));
      }
    });
    return;
  }

  // Obtener blogs
  if (method === 'GET' && path === '/api/blog/obtener') {
    const handleGetBlogs = async () => {
      try {
        let blogsToReturn = [];
        
      // Intentar obtener de Firebase primero
      if (db && isFirebaseWorking) {
        try {
          const firebaseWorks = await isFirebaseWorking();
          if (firebaseWorks) {
            const snapshot = await db.collection('blogs').get();
            blogsToReturn = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('📖 Blogs obtenidos de Firebase:', blogsToReturn.length);
          } else {
            throw new Error('Firebase no está respondiendo');
          }
        } catch (fbError) {
          console.error('❌ Error obteniendo de Firebase:', fbError.message);
          blogsToReturn = blogs; // Fallback a memoria
          console.log('📖 Blogs obtenidos de memoria:', blogsToReturn.length);
        }
      } else {
        blogsToReturn = blogs; // Usar memoria
        console.log('📖 Blogs obtenidos de memoria:', blogsToReturn.length);
      }        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(blogsToReturn));
      } catch (error) {
        console.error('Error obteniendo blogs:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error obteniendo blogs', error: error.message }));
      }
    };
    
    handleGetBlogs();
    return;
  }

  // Test endpoint con diagnóstico completo
  if (method === 'GET' && path === '/api/test') {
    const handleTest = async () => {
      const testFirebase = async () => {
        if (db && isFirebaseWorking) {
          try {
            const works = await isFirebaseWorking();
            return works;
          } catch (error) {
            return false;
          }
        }
        return false;
      };
      
      const fbWorks = await testFirebase();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'Servidor HTTP puro con Firebase funcionando', 
        timestamp: new Date().toISOString(),
        firebase_connected: !!db,
        firebase_working: fbWorks,
        firebase_error: firebaseError,
        blogs_count: blogs.length,
        diagnosis: {
          server: '✅ Funcionando',
          firebase_module: db ? '✅ Cargado' : '❌ Error',
          firebase_auth: fbWorks ? '✅ Autenticado' : '❌ No autenticado',
          fallback: '✅ Memoria disponible'
        },
        instructions: !fbWorks ? {
          step1: 'Ir a https://console.firebase.google.com',
          step2: 'Seleccionar proyecto: psicoterapia-7fb0d',
          step3: 'Configuración → Cuentas de servicio',
          step4: 'Generar nueva clave privada',
          step5: 'Guardar como: firebase/key.json.json',
          step6: 'Reiniciar servidor'
        } : null
      }));
    };
    
    handleTest();
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Ruta no encontrada' }));
});

const port = 3000;
server.listen(port, () => {
  console.log(`🚀 Servidor HTTP puro funcionando en puerto ${port}`);
  console.log(`� Firebase: ${db ? '✅ Conectado' : '❌ No disponible'}`);
  if (firebaseError) {
    console.log(`🔥 Error Firebase: ${firebaseError}`);
  }
  console.log(`�📚 ${blogs.length} blogs iniciales cargados`);
});