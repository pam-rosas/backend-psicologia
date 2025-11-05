// index.js - Redirection to pure-server.js for production
// This file redirects to pure-server.js to avoid path-to-regexp issues in Express

console.log('🔀 Redirigiendo a pure-server.js para evitar errores de Express...');
require('./pure-server.js');