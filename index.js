const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

const verifyToken = require('./middlewares/verifyToken');
const loginRoutes = require('./routes/login');
const citasRoutes = require('./routes/citas');
const comentariosRoutes = require('./routes/comentarios');
const blogsRoutes = require('./routes/blog');
const tallerRoutes = require('./routes/taller');
const horarioRoutes = require('./routes/horario');

const app = express();
const port = 3000;

// Inicializar Firebase con clave de servicio
let serviceAccount;
if (process.env.NODE_ENV === 'production') {
  // En producción, usar variables de entorno
  serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI
  };
} else {
  // En desarrollo, usar variables de entorno también
  serviceAccount = {
    type: "service_account",
    project_id: "psicoterapia-7fb0d",
    private_key_id: "75d64566506061131075c331c3401033e3611b14",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCPUbw+Tsl4D1El\nB6UtcSAu0R2Hm0Rt91vjAe7pJGYPRDcoAWjVks+xVUjgGkydHnDNI1pfz4Y1eOPV\nsE+2RV29UGWe10SFpeGP8rAgWopjr6T5Z8CTAFttKGhHnUoPOWyitD9CIWkN6mbC\n4LQRD6yIJj6H5IxT2klZo8FffftwiJPVeXHjoh6IV56PonPLn1kELE0Bg1Ifw04W\n0yjVI44yU2tysCkDcQr2CyrMNwX702DmAhMUe8W6yAYscIIUbvHmHSjxh4BfEyKq\nrUJIpUBxFGLS9UJjHamUPnH/QIRJLDU5lfGk27BrnXnU6FOkS/FC7zjZUXU/G8Q2\nPndAoyyTAgMBAAECggEALn3BtmahdVhmpr/9pamSWo2Maj6EarW4sYGhijC8CMzE\npa4bX1jSFgEH9Gajnr5OskT7HqR3sWXnZpzcptCGsZBgfq/vMvmWG7eKydwFE4RZ\nXGx7LFSL0/OtLDoKWbjzlC4rbRzgctqsfiAdWYF/ouThGP0bRmJDtBfqdTstcxnm\ngrnurFMGpRjOju53KELqxsoSE2TL8H5pyYtwb/WktPehKed6bbzqGG9vA0PHbLsW\nAiMKrCvIuTFZiJ3yC+qOAxN2KzMtlt1iIvzkmQiptHODwrzo6QFN4tBBgPU6RZZv\nflyjgu38BIsc9ZD6Q3tWgh2Yrgl+lJmMocBDXndnJQKBgQDKLb02Gexw7ifSp2UR\nT86wVCEPY+lEj5w5/uFW8v9ONpApOrtYxtYD0swhoD2c1uYqQgz855JK36PCqqTA\n+ZTlJfv4l0zB0NDZrdNzm9MUXOR5NqKW9t0t0QYE/2L8MhH3007l3kY5VLVuk80Z\nloBvgmE6qbjjABEL8h7N/vhbVQKBgQC1eMqf4yUz1dwca8VN1eFAfRLGPaxdRoaN\ntX04dKCrJaIz43npfdZUQR8MONG4FVUfy3KLjJJV6AseMj+1KUU7zsv2AjNdh4Wd\nuf0yYAEGAfo9gH+jMYKQPnowBJIkVU0gggm7N1FsoYXIqu91E580pNPTNq4vRkug\nrcpnlyp4RwKBgDfjFN6To+xDqPZuF14FtZjAaLMcZyrwl7rgXeHvIeu44XjEJ22O\n6TH9XzgcV2u3a8BaqcRvLt1LnLT+/rPpSeNd8JzzFeCtnE3P4xeeB2cllnJ7S853\nRwSXNxbCkdYs8RKUcsbP/pFyfQSoDpX4KGCqpb3VlKoLJqsqrqE6zeRRAoGACuP1\n3QSHrgWukPISxCoKu5EF+GmpF2vtFUIIAsRVBBBdHJoRLecEXsgNsfES/OYi1qah\n+Cf2fDtRt30yf4+7fOxbJydYp8tDRITt4gEK7q5dsyUsA8Ir4LYvJQSRNKb92u6S\n4O5f75H98l33wuHrkwA1Sh6k82dXkIv9cpwKy28CgYEAlPut4TAkYRiHgQhP0ezC\nQVILevn8vfgSeBUKtROsvEZwzwF/l/5LoCRIZv22YEkfiacju3XADBfO+Ip5OoJ0\nUml3ADtQpASQKsp6c9idBfh7tkfTa3v+TNDkwSdD8Izs5I2SeOwIJZH1WnrT0qKk\n2KA2dQxvTZ67RS7zrNycJi4=\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@psicoterapia-7fb0d.iam.gserviceaccount.com",
    client_id: "114019932203655106575",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token"
  };
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://psicoterapia-7fb0d.firebaseio.com'
  });
} else {
  admin.app();
}

const db = admin.firestore();
module.exports = db;

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: ['https://emhpsicoterapia.cl', 'http://localhost:4200'],
  credentials: true
}));

// Middleware para capturar todas las peticiones
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Body:`, req.body);
  next();
});

// Rutas
app.use('/api/citas', citasRoutes);
app.use('/api/comentarios', comentariosRoutes);
app.use('/api/blog', blogsRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/taller', tallerRoutes); 
app.use('/api/horario', horarioRoutes);

app.get('/api/admin', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Bienvenido a la sección de administrador', user: req.user });
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${port} - Deploy v2`);
});
