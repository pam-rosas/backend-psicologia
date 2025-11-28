const blogService = require('./blog.service');
const logger = require('../../common/utils/logger');

/**
 * Controlador para manejar requests HTTP de blogs
 */
class BlogController {
  /**
   * POST /api/blogs - Crear nuevo blog
   */
  async create(req, res) {
    try {
      const blogData = {
        title: req.body.title,
        content: req.body.content,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl
      };

      const userId = req.user.id; // Del middleware de autenticación

      const blog = await blogService.createBlog(blogData, userId);

      res.status(201).json({
        success: true,
        message: 'Blog creado exitosamente',
        data: blog
      });
    } catch (error) {
      logger.error('Error in create blog controller', { error: error.message });
      
      if (error.message.includes('Validation failed')) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error al crear el blog'
      });
    }
  }

  /**
   * GET /api/blogs - Obtener todos los blogs
   */
  async getAll(req, res) {
    try {
      const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await blogService.getAllBlogs(options);

      res.status(200).json({
        success: true,
        data: result.blogs,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in getAll blogs controller', { error: error.message });
      
      res.status(500).json({
        success: false,
        error: 'Error al obtener los blogs'
      });
    }
  }

  /**
   * GET /api/blogs/:id - Obtener un blog por ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const blog = await blogService.getBlogById(id);

      res.status(200).json({
        success: true,
        data: blog
      });
    } catch (error) {
      logger.error('Error in getById blog controller', { error: error.message, id: req.params.id });
      
      if (error.message === 'Blog no encontrado') {
        return res.status(404).json({
          success: false,
          error: 'Blog no encontrado'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error al obtener el blog'
      });
    }
  }

  /**
   * PUT /api/blogs/:id - Actualizar un blog
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = {
        title: req.body.title,
        content: req.body.content,
        imageUrl: req.body.imageUrl,
        videoUrl: req.body.videoUrl
      };

      const userId = req.user.id;

      const blog = await blogService.updateBlog(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Blog actualizado exitosamente',
        data: blog
      });
    } catch (error) {
      logger.error('Error in update blog controller', { error: error.message, id: req.params.id });
      
      if (error.message === 'Blog no encontrado') {
        return res.status(404).json({
          success: false,
          error: 'Blog no encontrado'
        });
      }

      if (error.message.includes('Validation failed')) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error al actualizar el blog'
      });
    }
  }

  /**
   * DELETE /api/blogs/:id - Eliminar un blog
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await blogService.deleteBlog(id, userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error in delete blog controller', { error: error.message, id: req.params.id });
      
      if (error.message === 'Blog no encontrado') {
        return res.status(404).json({
          success: false,
          error: 'Blog no encontrado'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error al eliminar el blog'
      });
    }
  }

  /**
   * GET /api/blogs/search - Buscar blogs
   */
  async search(req, res) {
    try {
      const { q } = req.query;
      const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10
      };

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Parámetro de búsqueda requerido'
        });
      }

      const result = await blogService.searchBlogs(q, options);

      res.status(200).json({
        success: true,
        data: result.blogs,
        pagination: result.pagination,
        searchText: result.searchText
      });
    } catch (error) {
      logger.error('Error in search blogs controller', { error: error.message });
      
      res.status(500).json({
        success: false,
        error: 'Error al buscar blogs'
      });
    }
  }

  /**
   * GET /api/blogs/stats - Obtener estadísticas
   */
  async getStats(req, res) {
    try {
      const stats = await blogService.getBlogStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in stats blogs controller', { error: error.message });
      
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas'
      });
    }
  }
}

module.exports = new BlogController();
