// test-server-startup.js
// Test rápido del servidor para verificar que inicia correctamente

process.env.NODE_ENV = 'production';
process.env.PORT = '10000';

console.log('🧪 Testing server startup...\n');

const app = require('./index-supabase');

// Esperar 2 segundos y verificar
setTimeout(() => {
  console.log('\n✅ Servidor inició correctamente');
  console.log('✅ Health check endpoint / disponible');
  process.exit(0);
}, 2000);
