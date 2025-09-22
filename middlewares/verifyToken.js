const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  console.log('[AUTH] Verifying token...');
  
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    console.log('[AUTH] No token provided');
    return res.status(401).json({ 
      success: false, 
      error: 'Token de acceso requerido' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_jwt_secret');
    req.user = decoded;
    console.log('[AUTH] Token valid for user:', decoded.email);
    next();
  } catch (error) {
    console.log('[AUTH] Invalid token:', error.message);
    return res.status(403).json({ 
      success: false, 
      error: 'Token inválido' 
    });
  }
};

module.exports = verifyToken;
