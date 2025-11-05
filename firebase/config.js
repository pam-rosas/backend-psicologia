// firebase/config.js
const admin = require('firebase-admin');

// Prefer credentials provided by the environment variable
// (recommended for production): set GOOGLE_APPLICATION_CREDENTIALS to the
// absolute path of the service account JSON file.
// Fallback: try to load a local ./key.json.json file (for local development).
let serviceAccount = null;
const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (envPath) {
  try {
    serviceAccount = require(envPath);
    console.log(`✅ Credenciales cargadas desde ruta indicada en GOOGLE_APPLICATION_CREDENTIALS: ${envPath}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo cargar credenciales desde GOOGLE_APPLICATION_CREDENTIALS (${envPath}):`, err.message);
  }
}

if (!serviceAccount) {
  try {
    // Intentar carga local por compatibilidad con el repo actual
    serviceAccount = require('./key.json.json');
    console.log('✅ Credenciales cargadas desde firebase/key.json.json (fall back local)');
  } catch (err) {
    console.warn('⚠️ No se encontró firebase/key.json.json. Si estás en producción, establece GOOGLE_APPLICATION_CREDENTIALS.');
  }
}

if (!serviceAccount) {
  console.error('❌ No se han encontrado credenciales de servicio de Firebase.');
  console.error('🔧 SOLUCIÓN: Genera y descarga una clave de cuenta de servicio desde:');
  console.error('   1) https://console.firebase.google.com');
  console.error('   2) Selecciona tu proyecto → Configuración (engranaje) → Cuentas de servicio');
  console.error('   3) Generar nueva clave privada → guardar el JSON en el servidor');
  console.error('   4) Definir la variable de entorno GOOGLE_APPLICATION_CREDENTIALS con la ruta absoluta de ese JSON');
}

// Configuración completa de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB20a_8NRHpl0HL6Cjq9iovs0ffLVPoDRk",
  authDomain: "psicoterapia-7fb0d.firebaseapp.com",
  projectId: "psicoterapia-7fb0d",
  storageBucket: "psicoterapia-7fb0d.appspot.com",
  messagingSenderId: "256703380974",
  appId: "1:256703380974:web:4b0896f5dc2cfcdfd7a2ff"
};

// Inicializar Firebase solo si hay credenciales disponibles
if (!admin.apps.length) {
  try {
    if (!serviceAccount) {
      console.warn('⚠️ Inicializando Firebase sin credenciales. Las operaciones a Firestore fallarán hasta que se provean credenciales válidas.');
      // Inicializar de todas formas para permitir uso parcial (por ejemplo, emuladores)
      admin.initializeApp();
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        ...firebaseConfig
      });
      console.log('✅ Firebase inicializado correctamente');
    }
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error.message);
  }
} else {
  console.log('ℹ️ Firebase ya estaba inicializado');
}

const db = admin.firestore();

// Función para verificar si Firebase está funcionando (safe)
const isFirebaseWorking = async () => {
  try {
    await db.collection('test').limit(1).get();
    return true;
  } catch (error) {
    console.error('Firebase no funciona:', error.message);
    return false;
  }
};

// Logueo de verificación no-blocking: intenta una lectura simple y emite recomendaciones
(async () => {
  try {
    await db.collection('test').limit(1).get();
    console.log('✅ Conexión a Firestore (lectura) exitosa');
  } catch (error) {
    console.error('❌ Error de conexión a Firestore (lectura):', error.message);
    if (error.code === 16 || (error.message && error.message.toUpperCase().includes('UNAUTHENTICATED'))) {
      console.error('🔧 SOLUCIÓN: Las credenciales de Firebase necesitan ser regeneradas o la variable GOOGLE_APPLICATION_CREDENTIALS no está configurada.');
      console.error('📝 Pasos sugeridos:');
      console.error('   1. Ve a https://console.firebase.google.com');
      console.error('   2. Proyecto: psicoterapia-7fb0d');
      console.error('   3. Configuración → Cuentas de servicio');
      console.error('   4. Generar nueva clave privada → descargar JSON');
      console.error('   5. Subir ese JSON al servidor y establecer:');
      console.error('      setx GOOGLE_APPLICATION_CREDENTIALS "C:\ruta\a\firebase\key.json.json"');
      console.error('      (o configúralo en tu entorno de despliegue)');
    }
  }
})();

module.exports = { db, isFirebaseWorking };
