const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

/**
 * Validadores personalizados para blogs
 */
class BlogValidator {
  /**
   * Sanitiza contenido HTML para prevenir XSS
   * Permite etiquetas HTML seguras para contenido rico
   */
  static sanitizeHtml(content) {
    if (!content) return '';
    
    // Configuración para permitir etiquetas HTML comunes en blogs
    const sanitizeOptions = {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'div', 'span',
        'strong', 'em', 'b', 'i', 'u', 's',
        'ul', 'ol', 'li',
        'a', 'img',
        'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      allowedAttributes: {
        'a': ['href', 'target', 'rel'],
        'img': ['src', 'alt', 'width', 'height', 'style'],
        'div': ['class', 'style'],
        'span': ['class', 'style'],
        'p': ['class', 'style'],
        'h1': ['class', 'style'],
        'h2': ['class', 'style'],
        'h3': ['class', 'style'],
        'h4': ['class', 'style'],
        'h5': ['class', 'style'],
        'h6': ['class', 'style'],
        'td': ['colspan', 'rowspan', 'style'],
        'th': ['colspan', 'rowspan', 'style']
      },
      allowedStyles: {
        '*': {
          'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/],
          'text-align': [/^left$/, /^right$/, /^center$/],
          'font-size': [/^\d+(?:px|em|rem|%)$/],
          'font-weight': [/^\d+$/, /^bold$/, /^normal$/],
          'font-style': [/^italic$/, /^normal$/],
          'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
          'margin': [/^\d+(?:px|em|rem|%)$/],
          'margin-top': [/^\d+(?:px|em|rem|%)$/],
          'margin-bottom': [/^\d+(?:px|em|rem|%)$/],
          'margin-left': [/^\d+(?:px|em|rem|%)$/],
          'margin-right': [/^\d+(?:px|em|rem|%)$/],
          'padding': [/^\d+(?:px|em|rem|%)$/],
          'padding-top': [/^\d+(?:px|em|rem|%)$/],
          'padding-bottom': [/^\d+(?:px|em|rem|%)$/],
          'padding-left': [/^\d+(?:px|em|rem|%)$/],
          'padding-right': [/^\d+(?:px|em|rem|%)$/],
          'width': [/^\d+(?:px|em|rem|%)$/],
          'max-width': [/^\d+(?:px|em|rem|%)$/],
          'height': [/^\d+(?:px|em|rem|%)$/],
          'display': [/^block$/, /^inline$/, /^inline-block$/, /^flex$/],
          'flex': [/^.*$/],
          'flex-direction': [/^row$/, /^column$/],
          'flex-wrap': [/^wrap$/, /^nowrap$/],
          'flex-shrink': [/^\d+$/],
          'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/]
        }
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {
        img: ['http', 'https', 'data']
      }
    };
    
    return sanitizeHtml(content, sanitizeOptions);
  }

  /**
   * Valida URL de imagen
   */
  static validateImageUrl(url) {
    if (!url) return { valid: true };

    if (!validator.isURL(url, { protocols: ['http', 'https'] })) {
      return { valid: false, error: 'URL de imagen inválida' };
    }

    // Validar extensiones comunes de imagen
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
    const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext));
    
    if (!hasValidExtension) {
      return { valid: false, error: 'La URL debe apuntar a una imagen válida' };
    }

    return { valid: true };
  }

  /**
   * Valida y normaliza URL de video de YouTube
   */
  static validateAndNormalizeVideoUrl(url) {
    if (!url) return { valid: true, normalizedUrl: null };

    // Patrones de YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];

    let videoId = null;
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) {
      return { valid: false, error: 'URL de YouTube inválida' };
    }

    return {
      valid: true,
      normalizedUrl: `https://www.youtube.com/embed/${videoId}`
    };
  }

  /**
   * Valida longitud de texto
   */
  static validateLength(text, min, max, fieldName) {
    if (!text || typeof text !== 'string') {
      return { valid: false, error: `${fieldName} es requerido` };
    }

    const trimmed = text.trim();
    
    if (trimmed.length < min) {
      return { valid: false, error: `${fieldName} debe tener al menos ${min} caracteres` };
    }

    if (trimmed.length > max) {
      return { valid: false, error: `${fieldName} no puede exceder ${max} caracteres` };
    }

    return { valid: true };
  }

  /**
   * Valida datos completos de creación de blog
   */
  static validateCreateBlog(data) {
    const errors = [];

    // Validar título
    const titleValidation = this.validateLength(data.title, 3, 255, 'El título');
    if (!titleValidation.valid) {
      errors.push(titleValidation.error);
    }

    // Validar contenido
    const contentValidation = this.validateLength(data.content, 10, 50000, 'El contenido');
    if (!contentValidation.valid) {
      errors.push(contentValidation.error);
    }

    // Validar imagen URL si existe
    if (data.imageUrl) {
      const imageValidation = this.validateImageUrl(data.imageUrl);
      if (!imageValidation.valid) {
        errors.push(imageValidation.error);
      }
    }

    // Validar video URL si existe
    if (data.videoUrl) {
      const videoValidation = this.validateAndNormalizeVideoUrl(data.videoUrl);
      if (!videoValidation.valid) {
        errors.push(videoValidation.error);
      } else if (videoValidation.normalizedUrl) {
        // Normalizar la URL
        data.videoUrl = videoValidation.normalizedUrl;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        title: data.title?.trim(),
        content: this.sanitizeHtml(data.content),
        imageUrl: data.imageUrl || null,
        videoUrl: data.videoUrl || null
      }
    };
  }

  /**
   * Valida datos de actualización de blog
   */
  static validateUpdateBlog(data) {
    const errors = [];
    const sanitizedData = {};

    // Validar título si viene
    if (data.title !== undefined) {
      const titleValidation = this.validateLength(data.title, 3, 255, 'El título');
      if (!titleValidation.valid) {
        errors.push(titleValidation.error);
      } else {
        sanitizedData.title = data.title.trim();
      }
    }

    // Validar contenido si viene
    if (data.content !== undefined) {
      const contentValidation = this.validateLength(data.content, 10, 50000, 'El contenido');
      if (!contentValidation.valid) {
        errors.push(contentValidation.error);
      } else {
        sanitizedData.content = this.sanitizeHtml(data.content);
      }
    }

    // Validar imagen URL si viene
    if (data.imageUrl !== undefined) {
      if (data.imageUrl) {
        const imageValidation = this.validateImageUrl(data.imageUrl);
        if (!imageValidation.valid) {
          errors.push(imageValidation.error);
        }
      }
      sanitizedData.imageUrl = data.imageUrl;
    }

    // Validar video URL si viene
    if (data.videoUrl !== undefined) {
      if (data.videoUrl) {
        const videoValidation = this.validateAndNormalizeVideoUrl(data.videoUrl);
        if (!videoValidation.valid) {
          errors.push(videoValidation.error);
        } else if (videoValidation.normalizedUrl) {
          sanitizedData.videoUrl = videoValidation.normalizedUrl;
        }
      } else {
        sanitizedData.videoUrl = null;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }
}

module.exports = BlogValidator;
