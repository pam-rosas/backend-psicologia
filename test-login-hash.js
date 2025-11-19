// test-login-hash.js
// Script para diagnosticar el problema de login
const bcrypt = require('bcryptjs');
const { supabase } = require('./db/supabase');

async function testLogin() {
  try {
    console.log('🔍 Diagnóstico de Login\n');
    
    // 1. Verificar usuario admin en la BD
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .is('deleted_at', null)
      .limit(1);
    
    if (error) {
      console.error('❌ Error consultando usuario:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ Usuario "admin" no encontrado en la BD');
      return;
    }
    
    const user = users[0];
    console.log('✅ Usuario encontrado:');
    console.log('   ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Role:', user.role);
    console.log('   Email:', user.email);
    console.log('   Password Hash:', user.password_hash ? user.password_hash.substring(0, 30) + '...' : 'NULL');
    console.log('   Deleted At:', user.deleted_at);
    console.log();
    
    // 2. Probar la contraseña
    const testPassword = 'admin123';
    console.log('🔑 Probando contraseña:', testPassword);
    
    if (!user.password_hash) {
      console.log('❌ El usuario no tiene password_hash en la BD');
      return;
    }
    
    const isMatch = await bcrypt.compare(testPassword, user.password_hash);
    console.log('   Resultado de bcrypt.compare:', isMatch);
    
    if (isMatch) {
      console.log('✅ La contraseña coincide correctamente\n');
    } else {
      console.log('❌ La contraseña NO coincide\n');
      
      // 3. Generar un nuevo hash de prueba
      console.log('🔧 Generando nuevo hash de prueba...');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('   Nuevo hash:', newHash.substring(0, 30) + '...');
      
      const testMatch = await bcrypt.compare(testPassword, newHash);
      console.log('   ¿Funciona bcrypt?', testMatch);
      
      if (testMatch) {
        console.log('\n💡 Solución: El hash en la BD está corrupto.');
        console.log('   Ejecuta: node create-users-supabase.js');
        console.log('   Y luego elimina manualmente los usuarios viejos en Supabase.');
      }
    }
    
    // 4. Verificar también el usuario normal
    console.log('\n' + '='.repeat(50));
    console.log('\n🔍 Verificando usuario "usuario"...\n');
    
    const { data: users2, error2 } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'usuario')
      .is('deleted_at', null)
      .limit(1);
    
    if (users2 && users2.length > 0) {
      const user2 = users2[0];
      console.log('✅ Usuario encontrado:');
      console.log('   Username:', user2.username);
      console.log('   Role:', user2.role);
      
      const isMatch2 = await bcrypt.compare('usuario123', user2.password_hash);
      console.log('   ¿Contraseña correcta?', isMatch2);
    }
    
    console.log('\n✅ Diagnóstico completo');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    process.exit(0);
  }
}

testLogin();
