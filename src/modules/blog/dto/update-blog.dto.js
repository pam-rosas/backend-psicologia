/**
 * DTO para actualización de blogs
 * Solo actualiza campos proporcionados
 */
class UpdateBlogDto {
  constructor(data) {
    // Solo asignar campos que vienen en el request
    if (data.title !== undefined) this.title = data.title;
    if (data.content !== undefined) this.content = data.content;
    if (data.imageUrl !== undefined) this.imageUrl = data.imageUrl;
    if (data.videoUrl !== undefined) this.videoUrl = data.videoUrl;
  }

  /**
   * Validación de datos a actualizar
   */
  static validate(data) {
    const errors = [];

    if (data.title !== undefined) {
      if (typeof data.title !== 'string') {
        errors.push('El título debe ser texto');
      } else if (data.title.trim().length < 3) {
        errors.push('El título debe tener al menos 3 caracteres');
      } else if (data.title.length > 255) {
        errors.push('El título no puede exceder 255 caracteres');
      }
    }

    if (data.content !== undefined) {
      if (typeof data.content !== 'string') {
        errors.push('El contenido debe ser texto');
      } else if (data.content.trim().length < 10) {
        errors.push('El contenido debe tener al menos 10 caracteres');
      }
    }

    if (data.imageUrl !== undefined && data.imageUrl !== null && typeof data.imageUrl !== 'string') {
      errors.push('La URL de imagen debe ser texto');
    }

    if (data.videoUrl !== undefined && data.videoUrl !== null && typeof data.videoUrl !== 'string') {
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
    const updateData = {};
    
    if (this.title !== undefined) updateData.title = this.title.trim();
    if (this.content !== undefined) updateData.content = this.content.trim();
    if (this.imageUrl !== undefined) updateData.image_url = this.imageUrl;
    if (this.videoUrl !== undefined) updateData.video_url = this.videoUrl;

    return updateData;
  }
}

module.exports = UpdateBlogDto;
