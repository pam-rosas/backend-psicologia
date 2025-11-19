// test-api-login.js
// Script para probar el endpoint de login directamente
const axios = require('axios');

async function testLoginAPI() {
  try {
    console.log('🧪 Probando API de Login\n');
    
    // Test 1: Login con admin
    console.log('📝 Test 1: Login con admin/admin123');
    try {
      const response1 = await axios.post('http://localhost:3000/api/login', {
        username: 'admin',
        contrasena: 'admin123'
      });
      
      console.log('✅ Status:', response1.status);
      console.log('✅ Respuesta:', JSON.stringify(response1.data, null, 2));
      console.log();
    } catch (error) {
      console.log('❌ Error:', error.response?.status);
      console.log('❌ Mensaje:', error.response?.data);
      console.log();
    }
    
    // Test 2: Login con usuario
    console.log('📝 Test 2: Login con usuario/usuario123');
    try {
      const response2 = await axios.post('http://localhost:3000/api/login', {
        username: 'usuario',
        contrasena: 'usuario123'
      });
      
      console.log('✅ Status:', response2.status);
      console.log('✅ Respuesta:', JSON.stringify(response2.data, null, 2));
      console.log();
    } catch (error) {
      console.log('❌ Error:', error.response?.status);
      console.log('❌ Mensaje:', error.response?.data);
      console.log();
    }
    
    // Test 3: Login con credenciales incorrectas
    console.log('📝 Test 3: Login con credenciales incorrectas');
    try {
      const response3 = await axios.post('http://localhost:3000/api/login', {
        username: 'admin',
        contrasena: 'wrongpassword'
      });
      
      console.log('✅ Status:', response3.status);
      console.log('✅ Respuesta:', response3.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.status);
      console.log('❌ Mensaje:', error.response?.data);
      console.log();
    }
    
    console.log('✅ Tests completados');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testLoginAPI();
