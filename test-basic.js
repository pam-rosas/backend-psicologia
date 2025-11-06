const http = require('http');

function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
    };

    if (data && method === 'POST') {
      options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      };
    }

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log(`${method} ${path} - Status: ${res.statusCode}`);
        console.log('Response:', body);
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });

    req.on('error', (e) => {
      console.error(`Error en ${method} ${path}:`, e.message);
      reject(e);
    });

    if (data && method === 'POST') {
      req.write(data);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Probando endpoints básicos...\n');
  
  try {
    // Probar endpoint de test
    console.log('Test 1: GET /api/test');
    await testEndpoint('/api/test');
    
    console.log('\n---\n');
    
    // Probar endpoint de blog
    console.log('Test 2: GET /api/blog/obtener');
    await testEndpoint('/api/blog/obtener');
    
    console.log('\n---\n');
    
    // Probar login (solo si los otros funcionan)
    console.log('Test 3: POST /api/login');
    const loginData = JSON.stringify({
      username: 'admin1',
      contrasena: 'admin123'
    });
    await testEndpoint('/api/login', 'POST', loginData);
    
  } catch (error) {
    console.error('Error en las pruebas:', error.message);
  }
}

runTests();