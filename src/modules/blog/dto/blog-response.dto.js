/**
 * DTO para respuestas de blogs
 * Formatea los datos del blog para enviar al cliente
 */
class BlogResponseDto {
  constructor(blog) {
    this.id = blog.id;
    this.title = blog.title;
    this.content = blog.content;
    this.imageUrl = blog.image_url;
    this.videoUrl = blog.video_url;
    this.createdAt = blog.created_at;
    this.updatedAt = blog.updated_at;
    this.createdBy = blog.created_by;
    
    // Si existe información del creador, incluirla
    if (blog.creator) {
      this.creator = {
        id: blog.creator.id,
        username: blog.creator.username,
        email: blog.creator.email
      };
    }
  }

  /**
   * Convierte un array de blogs
   */
  static fromArray(blogs) {
    return blogs.map(blog => new BlogResponseDto(blog));
  }

  /**
   * Formato para lista (sin contenido completo)
   */
  toListFormat() {
    return {
      id: this.id,
      title: this.title,
      excerpt: this.content.substring(0, 150) + '...',
      imageUrl: this.imageUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      creator: this.creator
    };
  }
}

module.exports = BlogResponseDto;
