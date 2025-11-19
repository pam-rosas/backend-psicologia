// check-env.js
// Script para verificar que todas las variables de entorno necesarias están configuradas
require('dotenv').config();

console.log('🔍 Verificando configuración de variables de entorno...\n');

const requiredVars = {
  'SUPABASE_URL': { required: true, type: 'url', description: 'URL de Supabase' },
  'SUPABASE_ANON_KEY': { required: true, type: 'string', description: 'Key anónima de Supabase' },
  'SUPABASE_SERVICE_ROLE_KEY': { required: true, type: 'string', description: 'Key de servicio de Supabase' },
  'JWT_SECRET': { required: true, type: 'string', description: 'Secreto para JWT' },
  'NODE_ENV': { required: true, type: 'enum', values: ['development', 'production'], description: 'Entorno de ejecución' },
  'PORT': { required: false, type: 'number', description: 'Puerto del servidor', default: '3000' },
  'FRONTEND_URL_LOCAL': { required: false, type: 'url', description: 'URL local del frontend', default: 'http://localhost:4200' },
  'FRONTEND_URL_PROD': { required: false, type: 'url', description: 'URL de producción del frontend' },
  'FRONTEND_URL_CUSTOM': { required: false, type: 'url', description: 'Dominio personalizado' },
  'FRONTEND_URL_CUSTOM_WWW': { required: false, type: 'url', description: 'Dominio con www' },
};

let hasErrors = false;
let hasWarnings = false;

Object.entries(requiredVars).forEach(([varName, config]) => {
  const value = process.env[varName];
  const prefix = config.required ? '🔴' : '🟡';
  
  if (!value) {
    if (config.required) {
      console.log(`❌ ${varName}: FALTA (requerida)`);
      console.log(`   📝 ${config.description}`);
      hasErrors = true;
    } else {
      console.log(`⚠️  ${varName}: No configurada (opcional)`);
      console.log(`   📝 ${config.description}`);
      if (config.default) {
        console.log(`   🔧 Usando valor por defecto: ${config.default}`);
      }
      hasWarnings = true;
    }
    console.log();
    return;
  }

  // Validar tipo
  if (config.type === 'url' && !value.startsWith('http')) {
    console.log(`⚠️  ${varName}: Formato incorrecto (debe ser una URL)`);
    console.log(`   Valor actual: ${value.substring(0, 50)}...`);
    hasWarnings = true;
    console.log();
    return;
  }

  if (config.type === 'enum' && !config.values.includes(value)) {
    console.log(`⚠️  ${varName}: Valor inválido`);
    console.log(`   Valor actual: ${value}`);
    console.log(`   Valores permitidos: ${config.values.join(', ')}`);
    hasWarnings = true;
    console.log();
    return;
  }

  if (config.type === 'number' && isNaN(Number(value))) {
    console.log(`⚠️  ${varName}: Debe ser un número`);
    console.log(`   Valor actual: ${value}`);
    hasWarnings = true;
    console.log();
    return;
  }

  // Validar que no sea valor de ejemplo
  if (value.includes('your_') || value.includes('change_this')) {
    console.log(`❌ ${varName}: Valor de ejemplo detectado`);
    console.log(`   Cambia este valor en .env a uno real`);
    hasErrors = true;
    console.log();
    return;
  }

  // Verificar longitud mínima para secretos
  if (varName === 'JWT_SECRET' && value.length < 32) {
    console.log(`⚠️  ${varName}: Demasiado corto (mínimo 32 caracteres recomendados)`);
    console.log(`   Longitud actual: ${value.length}`);
    console.log(`   💡 Genera uno fuerte con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`);
    hasWarnings = true;
    console.log();
    return;
  }

  console.log(`✅ ${varName}: Configurado correctamente`);
  if (config.type === 'string') {
    console.log(`   Longitud: ${value.length} caracteres`);
  } else {
    console.log(`   Valor: ${value}`);
  }
  console.log();
});

console.log('='.repeat(50));

if (hasErrors) {
  console.log('\n❌ ERRORES CRÍTICOS ENCONTRADOS');
  console.log('   El servidor no funcionará correctamente.');
  console.log('   Configura las variables requeridas en .env\n');
  process.exit(1);
}

if (hasWarnings) {
  console.log('\n⚠️  ADVERTENCIAS ENCONTRADAS');
  console.log('   El servidor puede funcionar, pero revisa las configuraciones.\n');
}

if (!hasErrors && !hasWarnings) {
  console.log('\n✅ TODAS LAS VARIABLES CONFIGURADAS CORRECTAMENTE');
  console.log('   El servidor está listo para ejecutarse.\n');
}

// Mostrar resumen de CORS
console.log('🌐 URLs permitidas para CORS:');
const corsUrls = [
  process.env.FRONTEND_URL_LOCAL,
  process.env.FRONTEND_URL_PROD,
  process.env.FRONTEND_URL_CUSTOM,
  process.env.FRONTEND_URL_CUSTOM_WWW
].filter(Boolean);

if (corsUrls.length === 0) {
  console.log('   ⚠️  Ninguna URL configurada (se usará localhost:4200 por defecto)');
} else {
  corsUrls.forEach(url => {
    console.log(`   ✓ ${url}`);
  });
}
console.log();
