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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_clave_secreta');
    req.user = decoded;
    console.log('[AUTH] Token valid for user:', decoded.username, 'Role:', decoded.role);
    next();
  } catch (error) {
    console.log('[AUTH] Invalid token:', error.message);
    return res.status(403).json({ 
      success: false, 
      error: 'Token inválido' 
    });
  }
};

// Middleware para verificar roles específicos
const verifyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      console.log('[AUTH] No role found in token');
      return res.status(403).json({ 
        success: false, 
        error: 'Acceso denegado: rol no especificado' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log('[AUTH] User role not authorized:', req.user.role);
      return res.status(403).json({ 
        success: false, 
        error: 'Acceso denegado: permisos insuficientes' 
      });
    }

    console.log('[AUTH] Role authorized:', req.user.role);
    next();
  };
};

module.exports = { verifyToken, verifyRole };
