const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    console.log('[AUTH] No token provided');
    return res.status(403).json({ message: 'No se proporcionó token' });
  }

  jwt.verify(token, 'mi_clave_secreta', (err, decoded) => {
    if (err) {
      console.log('[AUTH] No token provided');
      return res.status(403).json({ message: 'Token inválido' });
    }

    // Almacenamos la información decodificada en el request (si es necesario)
    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;
