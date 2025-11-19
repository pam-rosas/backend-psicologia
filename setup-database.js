// setup-database.js
// Script para ejecutar el schema SQL en Supabase
const { supabase } = require('./db/supabase');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    console.log('🚀 Iniciando configuración de base de datos...\n');
    
    // Leer el archivo schema.sql
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Schema SQL cargado');
    console.log('⚠️  IMPORTANTE: Ejecuta el schema manualmente en Supabase SQL Editor');
    console.log('   1. Ve a https://supabase.com/dashboard/project/zeyvbwhzhobeiooqqrxp/sql');
    console.log('   2. Abre el archivo db/schema.sql');
    console.log('   3. Copia y pega el contenido en el SQL Editor');
    console.log('   4. Ejecuta el script (botón "Run")\n');
    
    console.log('⏳ Verificando si las tablas ya existen...\n');
    
    // Verificar si la tabla users existe
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (!usersError) {
      console.log('✅ Tabla "users" detectada');
    } else if (usersError.code === 'PGRST116') {
      console.log('❌ Tabla "users" NO existe - ejecuta el schema SQL primero');
      console.log('   Error:', usersError.message);
    } else {
      console.log('⚠️  Error consultando tabla users:', usersError.message);
    }
    
    // Verificar otras tablas
    const tables = ['blogs', 'treatments', 'appointments', 'workshops', 'schedules', 'comments'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (!error) {
        console.log(`✅ Tabla "${table}" detectada`);
      } else if (error.code === 'PGRST116') {
        console.log(`❌ Tabla "${table}" NO existe`);
      }
    }
    
    console.log('\n📊 Resumen:');
    console.log('   Si todas las tablas están detectadas, puedes proceder a crear usuarios.');
    console.log('   Si alguna tabla NO existe, ejecuta el schema SQL en Supabase.\n');
    
    console.log('🎯 Próximos pasos:');
    console.log('   1. Si el schema ya está ejecutado: node create-users-supabase.js');
    console.log('   2. Si necesitas ejecutar el schema: Ve a Supabase SQL Editor y ejecuta db/schema.sql');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

setupDatabase();
