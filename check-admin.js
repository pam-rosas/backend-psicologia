const { supabase } = require('./db/supabase');
require('dotenv').config();

async function checkAdmin() {
  try {
    console.log('🔍 Buscando administradores en Supabase...');
    
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, username, email, role, created_at')
      .eq('role', 'admin')
      .is('deleted_at', null);
    
    if (error) {
      console.error('❌ Error consultando administradores:', error);
      process.exit(1);
    }
    
    if (!admins || admins.length === 0) {
      console.log('\n❌ No hay administradores en la base de datos');
      console.log('\nEjecuta el siguiente comando para crear uno:');
      console.log('node create-admin.js');
      process.exit(0);
    }
    
    console.log('\n✅ Administradores encontrados:');
    console.log('══════════════════════════════════');
    admins.forEach(admin => {
      console.log(`\nUsername: ${admin.username}`);
      console.log(`Email: ${admin.email || 'No especificado'}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Creado: ${new Date(admin.created_at).toLocaleString('es-CL')}`);
      console.log(`ID: ${admin.id}`);
      console.log('---');
    });
    console.log('══════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error consultando administradores:', error);
  }
  
  process.exit(0);
}

checkAdmin();