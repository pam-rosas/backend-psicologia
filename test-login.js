const http = require('http');

function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      username: username,
      contrasena: password
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', body);
        resolve({
          statusCode: res.statusCode,
          body: JSON.parse(body)
        });
      });
    });

    req.on('error', (e) => {
      console.error('Error en la petición:', e);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Probando login con credenciales...\n');
  
  // Prueba con admin1
  console.log('Test 1: admin1 + contraseña común');
  try {
    await testLogin('admin1', 'admin123');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n---\n');
  
  // Prueba con admin3
  console.log('Test 2: admin3 + contraseña común');
  try {
    await testLogin('admin3', 'admin123');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n---\n');
  
  // Prueba con credenciales incorrectas
  console.log('Test 3: Credenciales incorrectas');
  try {
    await testLogin('admin1', 'wrongpassword');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runTests();