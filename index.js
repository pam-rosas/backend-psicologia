// index.js - Production entry point
// Uses pure-server.js to avoid path-to-regexp issues with Express

console.log('🚀 Iniciando servidor para producción...');
console.log('📝 Usando pure-server.js (HTTP nativo) para evitar errores de Express/path-to-regexp');

// Cargar el servidor puro que ya funciona perfectamente
require('./pure-server.js');