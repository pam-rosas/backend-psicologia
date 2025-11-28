const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware para verificar JWT token
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('No authorization header provided');
      return res.status(401).json({ 
        success: false, 
        error: 'Token de autenticación requerido' 
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      logger.warn('No token in authorization header');
      return res.status(401).json({ 
        success: false, 
        error: 'Token de autenticación requerido' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_clave_secreta');
    req.user = decoded;
    
    logger.debug('Token verified successfully', { 
      userId: decoded.id, 
      username: decoded.username,
      role: decoded.role 
    });
    
    next();
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expirado' 
      });
    }
    
    return res.status(403).json({ 
      success: false, 
      error: 'Token inválido' 
    });
  }
};

/**
 * Middleware para verificar roles específicos
 */
const verifyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      logger.warn('No role found in request');
      return res.status(403).json({ 
        success: false, 
        error: 'Acceso denegado: rol no especificado' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('User role not authorized', { 
        userRole: req.user.role, 
        allowedRoles 
      });
      return res.status(403).json({ 
        success: false, 
        error: 'Acceso denegado: permisos insuficientes' 
      });
    }

    logger.debug('Role authorized', { role: req.user.role });
    next();
  };
};

/**
 * Middleware opcional de autenticación
 * Agrega user a req si el token es válido, pero no bloquea si no lo es
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_clave_secreta');
        req.user = decoded;
        logger.debug('Optional auth: user authenticated', { userId: decoded.id });
      }
    }
  } catch (error) {
    logger.debug('Optional auth: no valid token', { error: error.message });
  }
  
  next();
};

module.exports = {
  verifyToken,
  verifyRole,
  optionalAuth
};
