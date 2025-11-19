// index.js - Production entry point
// Uses index-supabase.js with Supabase PostgreSQL

require('dotenv').config();

console.log('🚀 Iniciando servidor para producción...');
console.log('🗄️  Usando Supabase PostgreSQL - Firebase completamente eliminado');

// Cargar el servidor con Supabase
require('./index-supabase.js');