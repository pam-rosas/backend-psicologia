// create-users-supabase.js
const bcrypt = require('bcryptjs');
const { supabase } = require('./db/supabase');

async function createUsers() {
  try {
    console.log('🚀 Creando usuarios en Supabase...\n');
    
    // Usuario administrador
    const adminUsername = 'admin';
    const adminPassword = 'admin123';
    
    // Usuario regular
    const userUsername = 'usuario';
    const userPassword = 'usuario123';
    
    // Verificar si admin ya existe
    const { data: existingAdmin, error: adminCheckError } = await supabase
      .from('users')
      .select('username, role')
      .eq('username', adminUsername)
      .limit(1);
    
    if (adminCheckError) {
      console.error('❌ Error verificando admin:', adminCheckError.message);
    } else if (existingAdmin && existingAdmin.length > 0) {
      console.log('ℹ️  El administrador ya existe');
      console.log('   Username:', existingAdmin[0].username);
      console.log('   Role:', existingAdmin[0].role);
    } else {
      // Crear admin
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
      const { data: newAdmin, error: adminInsertError } = await supabase
        .from('users')
        .insert({
          username: adminUsername,
          password_hash: hashedAdminPassword,
          role: 'admin',
          email: 'admin@emhpsicoterapia.cl'
        })
        .select()
        .single();
      
      if (adminInsertError) {
        console.error('❌ Error creando admin:', adminInsertError.message);
      } else {
        console.log('✅ Administrador creado exitosamente');
        console.log('   ID:', newAdmin.id);
        console.log('   Username:', adminUsername);
        console.log('   Password:', adminPassword);
        console.log('   Role: admin\n');
      }
    }
    
    // Verificar si usuario ya existe
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('username, role')
      .eq('username', userUsername)
      .limit(1);
    
    if (userCheckError) {
      console.error('❌ Error verificando usuario:', userCheckError.message);
    } else if (existingUser && existingUser.length > 0) {
      console.log('ℹ️  El usuario regular ya existe');
      console.log('   Username:', existingUser[0].username);
      console.log('   Role:', existingUser[0].role);
    } else {
      // Crear usuario
      const hashedUserPassword = await bcrypt.hash(userPassword, 10);
      const { data: newUser, error: userInsertError } = await supabase
        .from('users')
        .insert({
          username: userUsername,
          password_hash: hashedUserPassword,
          role: 'usuario',
          email: 'usuario@test.com'
        })
        .select()
        .single();
      
      if (userInsertError) {
        console.error('❌ Error creando usuario:', userInsertError.message);
      } else {
        console.log('✅ Usuario regular creado exitosamente');
        console.log('   ID:', newUser.id);
        console.log('   Username:', userUsername);
        console.log('   Password:', userPassword);
        console.log('   Role: usuario\n');
      }
    }
    
    console.log('📝 Resumen de usuarios:');
    console.log('   Admin  → username: admin,   password: admin123');
    console.log('   Usuario → username: usuario, password: usuario123');
    console.log('\n✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
  
  process.exit(0);
}

createUsers();
