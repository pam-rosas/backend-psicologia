const bcrypt = require('bcryptjs');
const { supabase } = require('./db/supabase');
require('dotenv').config();

async function createAdmin() {
  try {
    // Leer credenciales desde variables de entorno
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD;
    const email = process.env.ADMIN_EMAIL || 'admin@emhpsicoterapia.cl';
    
    if (!password) {
      console.error('❌ Error: La variable de entorno ADMIN_PASSWORD no está configurada');
      console.log('\nConfigura las credenciales en el archivo .env:');
      console.log('ADMIN_USERNAME=tu_usuario');
      console.log('ADMIN_PASSWORD=tu_contraseña_segura');
      console.log('ADMIN_EMAIL=admin@tudominio.cl');
      process.exit(1);
    }
    
    // Verificar si ya existe en Supabase
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .is('deleted_at', null)
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error verificando usuario:', checkError);
      process.exit(1);
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('❌ El usuario admin ya existe');
      console.log('\nPara cambiar la contraseña, elimina el usuario existente primero o usa otro username.');
      process.exit(1);
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear administrador en Supabase
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        username,
        password_hash: hashedPassword,
        role: 'admin',
        email: email
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error creando administrador:', insertError);
      process.exit(1);
    }
    
    console.log('\n✅ Administrador creado exitosamente');
    console.log('══════════════════════════════════');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Role: admin');
    console.log('══════════════════════════════════');
    console.log('\n⚠️  IMPORTANTE: Guarda estas credenciales de forma segura');
    console.log('⚠️  NO compartas la contraseña y cámbiala periódicamente');
    
  } catch (error) {
    console.error('❌ Error creando administrador:', error);
  }
  
  process.exit(0);
}

createAdmin();