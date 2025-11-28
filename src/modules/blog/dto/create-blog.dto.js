/**
 * DTO para creación de blogs
 * Define la estructura de datos esperada para crear un blog
 */
class CreateBlogDto {
  constructor(data) {
    this.title = data.title;
    this.content = data.content;
    this.imageUrl = data.imageUrl || null;
    this.videoUrl = data.videoUrl || null;
    this.createdBy = data.createdBy; // UUID del usuario
  }

  /**
   * Validación básica de datos requeridos
   */
  static validate(data) {
    const errors = [];

    if (!data.title || typeof data.title !== 'string') {
      errors.push('El título es requerido y debe ser texto');
    } else if (data.title.trim().length < 3) {
      errors.push('El título debe tener al menos 3 caracteres');
    } else if (data.title.length > 255) {
      errors.push('El título no puede exceder 255 caracteres');
    }

    if (!data.content || typeof data.content !== 'string') {
      errors.push('El contenido es requerido y debe ser texto');
    } else if (data.content.trim().length < 10) {
      errors.push('El contenido debe tener al menos 10 caracteres');
    }

    if (data.imageUrl && typeof data.imageUrl !== 'string') {
      errors.push('La URL de imagen debe ser texto');
    }

    if (data.videoUrl && typeof data.videoUrl !== 'string') {
      errors.push('La URL de video debe ser texto');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convierte a formato de base de datos
   */
  toDatabase() {
    return {
      title: this.title.trim(),
      content: this.content.trim(),
      image_url: this.imageUrl,
      video_url: this.videoUrl,
      created_by: this.createdBy
    };
  }
}

module.exports = CreateBlogDto;
