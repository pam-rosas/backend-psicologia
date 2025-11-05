// firebase/config.js
const admin = require('firebase-admin');

// Firebase credentials from environment variables (for production)
// or local file (for development)
let serviceAccount = null;

// Option 1: Use individual environment variables (like in Render)
if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
  try {
    serviceAccount = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Convert \\n to actual newlines
      client_email: process.env.client_email,
      client_id: process.env.client_id,
      auth_uri: process.env.auth_uri || "https://accounts.google.com/o/oauth2/auth",
      token_uri: process.env.token_uri || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url || "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.client_x509_cert_url,
      universe_domain: process.env.universe_domain || "googleapis.com"
    };
    console.log('✅ Credenciales cargadas desde variables de entorno individuales');
  } catch (err) {
    console.error('❌ Error construyendo serviceAccount desde variables individuales:', err.message);
  }
}

// Option 2: Use FIREBASE_SERVICE_ACCOUNT environment variable (JSON string)
if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Credenciales cargadas desde variable de entorno FIREBASE_SERVICE_ACCOUNT');
  } catch (err) {
    console.error('❌ Error parseando FIREBASE_SERVICE_ACCOUNT:', err.message);
  }
}

// Option 3: Use GOOGLE_APPLICATION_CREDENTIALS file path
if (!serviceAccount && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log(`✅ Credenciales cargadas desde GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo cargar credenciales desde GOOGLE_APPLICATION_CREDENTIALS:`, err.message);
  }
}

// Option 4: Local file for development
if (!serviceAccount) {
  try {
    serviceAccount = require('./key.json.json');
    console.log('✅ Credenciales cargadas desde firebase/key.json.json (desarrollo local)');
  } catch (err) {
    console.warn('⚠️ No se encontró firebase/key.json.json (normal en producción)');
  }
}

if (!serviceAccount) {
  console.error('❌ No se encontraron credenciales de Firebase.');
  console.error('🔧 Para producción, configura las variables FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID, etc.');
  console.error('🔧 Para desarrollo local, coloca el archivo en firebase/key.json.json');
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
