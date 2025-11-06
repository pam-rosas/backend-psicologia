const bcrypt = require('bcryptjs');
const db = require('./firebase/config');

async function createAdmin() {
  try {
    const username = 'admin';
    const password = 'admin123'; // Cambia esta contraseña
    
    // Verificar si ya existe
    const snapshot = await db.collection('administradores').where('username', '==', username).get();
    if (!snapshot.empty) {
      console.log('❌ El usuario admin ya existe');
      return;
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear administrador
    await db.collection('administradores').add({
      username,
      contrasena: hashedPassword
    });
    
    console.log('✅ Administrador creado exitosamente');
    console.log('Username:', username);
    console.log('Password:', password);
    
  } catch (error) {
    console.error('❌ Error creando administrador:', error);
  }
  
  process.exit(0);
}

createAdmin();