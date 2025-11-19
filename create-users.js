const bcrypt = require('bcryptjs');
const { db } = require('./firebase/config');

async function createUsers() {
  try {
    // Usuario administrador
    const adminUsername = 'admin';
    const adminPassword = 'admin123';
    
    // Usuario regular
    const userUsername = 'usuario';
    const userPassword = 'usuario123';
    
    // Verificar si admin ya existe
    const adminSnapshot = await db.collection('administradores').where('username', '==', adminUsername).get();
    if (adminSnapshot.empty) {
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
      await db.collection('administradores').add({
        username: adminUsername,
        contrasena: hashedAdminPassword,
        role: 'admin'
      });
      console.log('✅ Administrador creado exitosamente');
      console.log('   Username:', adminUsername);
      console.log('   Password:', adminPassword);
      console.log('   Role: admin');
    } else {
      // Actualizar admin existente para agregar rol si no lo tiene
      adminSnapshot.forEach(async doc => {
        const data = doc.data();
        if (!data.role) {
          await db.collection('administradores').doc(doc.id).update({ role: 'admin' });
          console.log('✅ Rol "admin" agregado al administrador existente');
        } else {
          console.log('ℹ️  El administrador ya existe con rol:', data.role);
        }
      });
    }
    
    // Verificar si usuario ya existe
    const userSnapshot = await db.collection('administradores').where('username', '==', userUsername).get();
    if (userSnapshot.empty) {
      const hashedUserPassword = await bcrypt.hash(userPassword, 10);
      await db.collection('administradores').add({
        username: userUsername,
        contrasena: hashedUserPassword,
        role: 'usuario'
      });
      console.log('✅ Usuario regular creado exitosamente');
      console.log('   Username:', userUsername);
      console.log('   Password:', userPassword);
      console.log('   Role: usuario');
    } else {
      console.log('ℹ️  El usuario regular ya existe');
    }
    
    console.log('\n📝 Usuarios disponibles:');
    console.log('   Admin -> username: admin, password: admin123');
    console.log('   Usuario -> username: usuario, password: usuario123');
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
  }
  
  process.exit(0);
}

createUsers();
