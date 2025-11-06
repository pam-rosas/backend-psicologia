const { db } = require('./firebase/config');

async function checkAdmin() {
  try {
    console.log('🔍 Buscando administradores en Firebase...');
    
    const snapshot = await db.collection('administradores').get();
    
    if (snapshot.empty) {
      console.log('❌ No hay administradores en la base de datos');
      return;
    }
    
    console.log('✅ Administradores encontrados:');
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('- Username:', data.username);
      console.log('- Contraseña hasheada:', data.contrasena ? 'Sí' : 'No');
      console.log('- ID del documento:', doc.id);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error consultando administradores:', error);
  }
  
  process.exit(0);
}

checkAdmin();