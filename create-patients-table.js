// Script para crear tabla patients directamente
const { supabase } = require('./db/supabase');
const fs = require('fs');

async function ejecutarMigracion() {
  console.log('📝 Creando tabla patients...');
  
  const sql = fs.readFileSync('./db/quick-add-patients.sql', 'utf8');
  
  // Dividir en statements individuales
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('ALTER TABLE') || statement.includes('DO $$')) {
      try {
        console.log('Ejecutando:', statement.substring(0, 50) + '...');
        
        // Usar query raw de Supabase
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          console.log('⚠️  Nota:', error.message);
        } else {
          console.log('✅ OK');
        }
      } catch (e) {
        console.log('⚠️  Error:', e.message);
      }
    }
  }
  
  // Verificar que la tabla existe
  console.log('\n🔍 Verificando tabla patients...');
  const { data, error } = await supabase.from('patients').select('id').limit(1);
  
  if (error) {
    console.log('❌ Tabla patients NO existe aún');
    console.log('Por favor ejecuta el SQL manualmente en:');
    console.log('https://supabase.com/dashboard/project/zeyvbwhzhobeiooqqrxp/sql/new');
    console.log('Contenido: db/quick-add-patients.sql');
  } else {
    console.log('✅ Tabla patients creada correctamente!');
  }
  
  process.exit(0);
}

ejecutarMigracion();
