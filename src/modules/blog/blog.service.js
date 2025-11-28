const blogRepository = require('./blog.repository');
const CreateBlogDto = require('./dto/create-blog.dto');
const UpdateBlogDto = require('./dto/update-blog.dto');
const BlogResponseDto = require('./dto/blog-response.dto');
const BlogValidator = require('./validators/blog.validator');
const logger = require('../../common/utils/logger');

/**
 * Servicio de lógica de negocio para blogs
 */
class BlogService {
  /**
   * Crear un nuevo blog
   */
  async createBlog(blogData, userId) {
    try {
      logger.info('Creating new blog', { userId, title: blogData.title });

      // Validar datos
      const validation = BlogValidator.validateCreateBlog(blogData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Crear DTO con datos sanitizados
      const createDto = new CreateBlogDto({
        title: validation.sanitizedData.title,
        content: validation.sanitizedData.content,
        imageUrl: validation.sanitizedData.imageUrl,
        videoUrl: validation.sanitizedData.videoUrl,
        createdBy: userId
      });

      // Guardar en base de datos
      const blog = await blogRepository.create(createDto.toDatabase());

      logger.info('Blog created successfully', { blogId: blog.id });

      // Retornar DTO de respuesta
      return new BlogResponseDto(blog);
    } catch (error) {
      logger.error('Error creating blog', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Obtener todos los blogs con paginación
   */
  async getAllBlogs(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      logger.info('Fetching blogs', { page, limit });

      const result = await blogRepository.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      return {
        blogs: BlogResponseDto.fromArray(result.data),
        pagination: result.pagination
      };
    } catch (error) {
      logger.error('Error fetching blogs', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener un blog por ID
   */
  async getBlogById(id) {
    try {
      logger.info('Fetching blog by ID', { blogId: id });

      const blog = await blogRepository.findById(id);

      if (!blog) {
        throw new Error('Blog no encontrado');
      }

      return new BlogResponseDto(blog);
    } catch (error) {
      logger.error('Error fetching blog', { error: error.message, blogId: id });
      throw error;
    }
  }

  /**
   * Actualizar un blog
   */
  async updateBlog(id, updateData, userId) {
    try {
      logger.info('Updating blog', { blogId: id, userId });

      // Verificar que el blog existe
      const exists = await blogRepository.exists(id);
      if (!exists) {
        throw new Error('Blog no encontrado');
      }

      // Validar datos
      const validation = BlogValidator.validateUpdateBlog(updateData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Crear DTO con datos sanitizados
      const updateDto = new UpdateBlogDto(validation.sanitizedData);

      // Actualizar en base de datos
      const blog = await blogRepository.update(id, updateDto.toDatabase());

      if (!blog) {
        throw new Error('Blog no encontrado');
      }

      logger.info('Blog updated successfully', { blogId: id });

      return new BlogResponseDto(blog);
    } catch (error) {
      logger.error('Error updating blog', { error: error.message, blogId: id, userId });
      throw error;
    }
  }

  /**
   * Eliminar un blog (soft delete)
   */
  async deleteBlog(id, userId) {
    try {
      logger.info('Deleting blog', { blogId: id, userId });

      const blog = await blogRepository.delete(id);

      if (!blog) {
        throw new Error('Blog no encontrado');
      }

      logger.info('Blog deleted successfully', { blogId: id });

      return { success: true, message: 'Blog eliminado exitosamente' };
    } catch (error) {
      logger.error('Error deleting blog', { error: error.message, blogId: id, userId });
      throw error;
    }
  }

  /**
   * Buscar blogs por texto
   */
  async searchBlogs(searchText, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;

      logger.info('Searching blogs', { searchText, page, limit });

      if (!searchText || searchText.trim().length < 2) {
        throw new Error('El texto de búsqueda debe tener al menos 2 caracteres');
      }

      const result = await blogRepository.search(searchText.trim(), {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return {
        blogs: BlogResponseDto.fromArray(result.data),
        pagination: result.pagination,
        searchText
      };
    } catch (error) {
      logger.error('Error searching blogs', { error: error.message, searchText });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de blogs
   */
  async getBlogStats() {
    try {
      const total = await blogRepository.count();

      return {
        total,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting blog stats', { error: error.message });
      throw error;
    }
  }
}

module.exports = new BlogService();
