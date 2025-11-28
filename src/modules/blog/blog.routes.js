const express = require('express');
const router = express.Router();
const blogController = require('./blog.controller');
const { verifyToken, verifyRole } = require('../../common/middlewares/auth.middleware');

/**
 * Rutas de blogs con arquitectura REST
 * 
 * Públicas:
 * - GET /api/blogs - Listar blogs (con paginación)
 * - GET /api/blogs/:id - Ver detalle de un blog
 * - GET /api/blogs/search - Buscar blogs
 * 
 * Protegidas (requiere autenticación y rol admin):
 * - POST /api/blogs - Crear blog
 * - PUT /api/blogs/:id - Actualizar blog
 * - DELETE /api/blogs/:id - Eliminar blog
 * - GET /api/blogs/stats - Estadísticas
 */

// ===== RUTAS PÚBLICAS =====
// Obtener todos los blogs (con paginación)
router.get('/', blogController.getAll.bind(blogController));

// Buscar blogs (debe ir antes de /:id)
router.get('/search', blogController.search.bind(blogController));

// Obtener un blog por ID
router.get('/:id', blogController.getById.bind(blogController));

// ===== RUTAS PROTEGIDAS (ADMIN ONLY) =====
// Crear un nuevo blog
router.post(
  '/',
  verifyToken,
  verifyRole('admin'),
  blogController.create.bind(blogController)
);

// Actualizar un blog
router.put(
  '/:id',
  verifyToken,
  verifyRole('admin'),
  blogController.update.bind(blogController)
);

// Eliminar un blog
router.delete(
  '/:id',
  verifyToken,
  verifyRole('admin'),
  blogController.delete.bind(blogController)
);

// Obtener estadísticas
router.get(
  '/admin/stats',
  verifyToken,
  verifyRole('admin'),
  blogController.getStats.bind(blogController)
);

module.exports = router;
