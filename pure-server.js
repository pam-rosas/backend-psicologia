const http = require('http');
const url = require('url');
const querystring = require('querystring');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// Obtener headers CORS
const getCorsHeaders = (origin, additionalHeaders = {}) => {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Allow-Credentials': 'true',
    ...additionalHeaders
  };
};

// Enviar JSON con CORS
const sendJSON = (res, statusCode, data, origin) => {
  res.writeHead(statusCode, getCorsHeaders(origin, { 'Content-Type': 'application/json' }));
  res.end(JSON.stringify(data));
};

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:4200',
    'https://emhpsicoterapia.cl',
    'https://www.emhpsicoterapia.cl',
    'https://psicoterapia-frontend.onrender.com'
  ];
  
  // Validar origen
  const validOrigin = allowedOrigins.includes(origin) ? origin : null;
  
  // Establecer headers CORS para todas las respuestas
  const corsHeaders = getCorsHeaders(validOrigin);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
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

  // ======= RUTAS DE TALLER =======
  
  // Crear taller
  if (method === 'POST' && path === '/api/taller/crear') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('Creando taller:', data);
        
        if (!data.subtitulo || !data.fechaInicio || !data.valor || !data.facilitador || !data.descripcionDeServicio || !data.descripcionDeServicio.texto || !data.proximasSesiones || data.proximasSesiones.length === 0 || !data.politicaDeCancelacion || !data.politicaDeCancelacion.texto || !data.datosDeContacto || !data.datosDeContacto.texto) {
          return sendJSON(res, 400, { message: 'Datos incompletos.' }, validOrigin);
        }

        const taller = {
          titulo: "Taller de Duelo",
          subtitulo: data.subtitulo,
          fechaInicio: data.fechaInicio,
          valor: data.valor,
          facilitador: data.facilitador,
          descripcionDeServicio: data.descripcionDeServicio.texto,
          proximasSesiones: data.proximasSesiones,
          politicaDeCancelacion: data.politicaDeCancelacion.texto,
          datosDeContacto: data.datosDeContacto.texto,
          creadoEn: new Date().toISOString()
        };

        let tallerId;
        
        // Intentar guardar en Firebase primero
        if (db && isFirebaseWorking) {
          try {
            const firebaseWorks = await isFirebaseWorking();
            if (firebaseWorks) {
              const docRef = await db.collection('talleres').add(taller);
              tallerId = docRef.id;
              console.log('✅ Taller guardado en Firebase con ID:', tallerId);
            } else {
              throw new Error('Firebase no está respondiendo');
            }
          } catch (fbError) {
            console.error('❌ Error en Firebase:', fbError.message);
            return sendJSON(res, 500, { message: 'Error al guardar en Firebase', error: fbError.message }, validOrigin);
          }
        } else {
          return sendJSON(res, 500, { message: 'Firebase no está disponible' }, validOrigin);
        }
        
        sendJSON(res, 200, { 
          message: 'Taller de Duelo guardado con éxito', 
          id: tallerId
        }, validOrigin);
      } catch (error) {
        console.error('Error al crear taller:', error);
        sendJSON(res, 500, { message: 'Error interno del servidor', error: error.message }, validOrigin);
      }
    });
    return;
  }

  // Obtener todos los talleres
  if (method === 'GET' && path === '/api/taller/lista') {
    const handleGetTalleres = async () => {
      try {
        let talleresToReturn = [];
        
        // Intentar obtener de Firebase
        if (db && isFirebaseWorking) {
          try {
            const firebaseWorks = await isFirebaseWorking();
            if (firebaseWorks) {
              const snapshot = await db.collection('talleres').orderBy('creadoEn', 'desc').get();
              talleresToReturn = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              console.log('📚 Talleres obtenidos de Firebase:', talleresToReturn.length);
            } else {
              throw new Error('Firebase no está respondiendo');
            }
          } catch (fbError) {
            console.error('❌ Error obteniendo talleres de Firebase:', fbError.message);
            return sendJSON(res, 500, { message: 'Error al obtener talleres', error: fbError.message }, validOrigin);
          }
        } else {
          return sendJSON(res, 500, { message: 'Firebase no está disponible' }, validOrigin);
        }
        
        sendJSON(res, 200, talleresToReturn, validOrigin);
      } catch (error) {
        console.error('Error obteniendo talleres:', error);
        sendJSON(res, 500, { message: 'Error obteniendo talleres', error: error.message }, validOrigin);
      }
    };
    
    handleGetTalleres();
    return;
  }

  // Editar taller
  if (method === 'PUT' && path.startsWith('/api/taller/editar/')) {
    const tallerId = path.split('/').pop();
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('Editando taller:', tallerId);
        
        if (!data.subtitulo || !data.fechaInicio || !data.valor || !data.facilitador || !data.descripcionDeServicio || !data.descripcionDeServicio.texto || !data.proximasSesiones || data.proximasSesiones.length === 0 || !data.politicaDeCancelacion || !data.politicaDeCancelacion.texto || !data.datosDeContacto || !data.datosDeContacto.texto) {
          return sendJSON(res, 400, { message: 'Datos incompletos para la edición.' }, validOrigin);
        }

        const tallerActualizado = {
          titulo: "Taller de Duelo",
          subtitulo: data.subtitulo,
          fechaInicio: data.fechaInicio,
          valor: data.valor,
          facilitador: data.facilitador,
          descripcionDeServicio: data.descripcionDeServicio.texto,
          proximasSesiones: data.proximasSesiones,
          politicaDeCancelacion: data.politicaDeCancelacion.texto,
          datosDeContacto: data.datosDeContacto.texto,
          actualizadoEn: new Date().toISOString()
        };
        
        if (db && isFirebaseWorking) {
          try {
            const firebaseWorks = await isFirebaseWorking();
            if (firebaseWorks) {
              const tallerRef = db.collection('talleres').doc(tallerId);
              const doc = await tallerRef.get();
              
              if (!doc.exists) {
                return sendJSON(res, 404, { message: 'Taller no encontrado.' }, validOrigin);
              }
              
              await tallerRef.update(tallerActualizado);
              console.log('✅ Taller actualizado en Firebase');
            } else {
              throw new Error('Firebase no está respondiendo');
            }
          } catch (fbError) {
            console.error('❌ Error actualizando en Firebase:', fbError.message);
            return sendJSON(res, 500, { message: 'Error al actualizar en Firebase', error: fbError.message }, validOrigin);
          }
        } else {
          return sendJSON(res, 500, { message: 'Firebase no está disponible' }, validOrigin);
        }
        
        sendJSON(res, 200, { message: 'Taller actualizado con éxito' }, validOrigin);
      } catch (error) {
        console.error('Error al editar taller:', error);
        sendJSON(res, 500, { message: 'Error interno del servidor', error: error.message }, validOrigin);
      }
    });
    return;
  }

  // Eliminar taller
  if (method === 'DELETE' && path.startsWith('/api/taller/eliminar/')) {
    const tallerId = path.split('/').pop();
    
    const handleDeleteTaller = async () => {
      try {
        if (db && isFirebaseWorking) {
          try {
            const firebaseWorks = await isFirebaseWorking();
            if (firebaseWorks) {
              const tallerRef = db.collection('talleres').doc(tallerId);
              const doc = await tallerRef.get();
              
              if (!doc.exists) {
                return sendJSON(res, 404, { message: 'Taller no encontrado.' }, validOrigin);
              }
              
              await tallerRef.delete();
              console.log('✅ Taller eliminado de Firebase');
            } else {
              throw new Error('Firebase no está respondiendo');
            }
          } catch (fbError) {
            console.error('❌ Error eliminando de Firebase:', fbError.message);
            return sendJSON(res, 500, { message: 'Error al eliminar de Firebase', error: fbError.message }, validOrigin);
          }
        } else {
          return sendJSON(res, 500, { message: 'Firebase no está disponible' }, validOrigin);
        }
        
        sendJSON(res, 200, { message: 'Taller eliminado con éxito.' }, validOrigin);
      } catch (error) {
        console.error('Error al eliminar taller:', error);
        sendJSON(res, 500, { message: 'Error interno del servidor', error: error.message }, validOrigin);
      }
    };
    
    handleDeleteTaller();
    return;
  }

  // 🔐 Ruta de login de administrador
  if (method === 'POST' && path === '/api/login') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const origin = req.headers.origin;
        const { username, contrasena } = JSON.parse(body);
        console.log('Intentando login:', { username });

        const snapshot = await db.collection('administradores').where('username', '==', username).get();
        console.log('Snapshot obtenido:', snapshot);
        
        if (snapshot.empty) {
          console.log('Usuario no encontrado');
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Usuario no encontrado' }));
          return;
        }

        let adminData;
        snapshot.forEach(doc => {
          adminData = doc.data();
        });
        console.log('Datos de admin:', adminData);

        if (!adminData || !adminData.contrasena) {
          console.log('Datos de administrador incompletos');
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Datos de administrador incompletos' }));
          return;
        }

        // ✅ Compara contraseñas con bcryptjs
        const isMatch = await bcrypt.compare(contrasena, adminData.contrasena);
        console.log('¿Contraseña coincide?', isMatch);
        
        if (!isMatch) {
          console.log('Contraseña incorrecta');
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Contraseña incorrecta' }));
          return;
        }

        // 🔑 Generar token JWT
        const token = jwt.sign(
          { username: adminData.username },
          'mi_clave_secreta', // ⚠️ Usar variable de entorno en producción
          { expiresIn: '1h' }
        );
        console.log('Token generado:', token);

        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Login exitoso',
          user: { username: adminData.username },
          token
        }));

      } catch (error) {
        console.error('Error en login:', error);
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error en el servidor', error: error.message }));
      }
    });
    return;
  }

  // ======= RUTAS DE CITAS =======

  // Obtener todas las citas
  if (method === 'GET' && path === '/api/citas/ver') {
    const handleGetCitas = async () => {
      try {
        if (db && isFirebaseWorking) {
          const firebaseWorks = await isFirebaseWorking();
          if (firebaseWorks) {
            const snapshot = await db.collection('citas').orderBy('fecha_hora', 'desc').get();
            const citas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            res.writeHead(200, getCorsHeaders(validOrigin, { 'Content-Type': 'application/json' }));
            res.end(JSON.stringify(citas));
            return;
          }
        }
        
        res.writeHead(500, getCorsHeaders(validOrigin, { 'Content-Type': 'application/json' }));
        res.end(JSON.stringify({ message: 'Firebase no disponible' }));
      } catch (error) {
        console.error('Error obteniendo citas:', error.message);
        res.writeHead(500, getCorsHeaders(validOrigin, { 'Content-Type': 'application/json' }));
        res.end(JSON.stringify({ message: 'Error obteniendo citas', error: error.message }));
      }
    };
    
    handleGetCitas();
    return;
  }

  // RUTAS DE TRATAMIENTOS
  
  // Obtener todos los tratamientos
  if (method === 'GET' && path === '/api/citas/tratamientos') {
    const handleGetTratamientos = async () => {
      try {
        console.log('DEBUG: Obteniendo tratamientos');
        
        if (db && isFirebaseWorking) {
          const firebaseWorks = await isFirebaseWorking();
          if (firebaseWorks) {
            const snapshot = await db.collection('tratamientos').get();
            const tratamientos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('DEBUG: Tratamientos obtenidos de Firebase:', tratamientos.length);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(tratamientos));
            return;
          }
        }
        
        console.log('DEBUG: Firebase no disponible');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Firebase no disponible' }));
      } catch (error) {
        console.log('DEBUG: Error obteniendo tratamientos:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error obteniendo tratamientos', error: error.message }));
      }
    };
    
    handleGetTratamientos();
    return;
  }

  // Crear nuevo tratamiento
  if (method === 'POST' && path === '/api/citas/tratamientos') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('DEBUG: Creando tratamiento:', data);
        
        if (!data.nombre || !data.precioNacional) {
          console.log('DEBUG: Datos incompletos');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Nombre y precio nacional son requeridos' }));
          return;
        }

        const tratamiento = {
          nombre: data.nombre,
          precioNacional: data.precioNacional,
          precioInternacional: data.precioInternacional || 0,
          sesiones: data.sesiones || 1,
          duracion: data.duracion || '',
          descripcion: data.descripcion || '',
          activo: data.activo !== undefined ? data.activo : true,
          creadoEn: new Date()
        };

        if (db && isFirebaseWorking) {
          const firebaseWorks = await isFirebaseWorking();
          if (firebaseWorks) {
            const docRef = await db.collection('tratamientos').add(tratamiento);
            console.log('DEBUG: Tratamiento creado con ID:', docRef.id);
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              message: 'Tratamiento creado exitosamente', 
              id: docRef.id,
              data: tratamiento
            }));
            return;
          }
        }
        
        console.log('DEBUG: Firebase no disponible');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Firebase no disponible' }));
      } catch (error) {
        console.log('DEBUG: Error al crear tratamiento:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error al crear tratamiento', error: error.message }));
      }
    });
    return;
  }

  // Actualizar tratamiento
  if (method === 'PUT' && path.startsWith('/api/citas/tratamientos/')) {
    const tratamientoId = path.split('/').pop();
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('DEBUG: Actualizando tratamiento:', tratamientoId, data);
        
        if (db && isFirebaseWorking) {
          const firebaseWorks = await isFirebaseWorking();
          if (firebaseWorks) {
            const docRef = db.collection('tratamientos').doc(tratamientoId);
            await docRef.update({
              ...data,
              actualizadoEn: new Date()
            });
            console.log('DEBUG: Tratamiento actualizado');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Tratamiento actualizado exitosamente' }));
            return;
          }
        }
        
        console.log('DEBUG: Firebase no disponible');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Firebase no disponible' }));
      } catch (error) {
        console.log('DEBUG: Error al actualizar tratamiento:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error al actualizar tratamiento', error: error.message }));
      }
    });
    return;
  }

  // Eliminar tratamiento
  if (method === 'DELETE' && path.startsWith('/api/citas/tratamientos/')) {
    const tratamientoId = path.split('/').pop();
    const handleDeleteTratamiento = async () => {
      try {
        console.log('DEBUG: Eliminando tratamiento:', tratamientoId);
        
        if (db && isFirebaseWorking) {
          const firebaseWorks = await isFirebaseWorking();
          if (firebaseWorks) {
            await db.collection('tratamientos').doc(tratamientoId).delete();
            console.log('DEBUG: Tratamiento eliminado');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Tratamiento eliminado exitosamente' }));
            return;
          }
        }
        
        console.log('DEBUG: Firebase no disponible');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Firebase no disponible' }));
      } catch (error) {
        console.log('DEBUG: Error al eliminar tratamiento:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Error al eliminar tratamiento', error: error.message }));
      }
    };
    
    handleDeleteTratamiento();
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

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`🚀 Servidor HTTP puro funcionando en puerto ${port}`);
  console.log(`🔥 Firebase: ${db ? '✅ Conectado' : '❌ No disponible'}`);
  if (firebaseError) {
    console.log(`🔥 Error Firebase: ${firebaseError}`);
  }
  console.log(`📚 ${blogs.length} blogs iniciales cargados`);
});