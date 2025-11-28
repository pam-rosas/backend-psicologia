/**
 * Logger simple pero estructurado
 * En producción se puede reemplazar con Winston o similar
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    
    return `[${timestamp}] [${level}] ${message} ${metaString}`;
  }

  info(message, meta = {}) {
    console.log(this.formatMessage('INFO', message, meta));
  }

  error(message, meta = {}) {
    console.error(this.formatMessage('ERROR', message, meta));
  }

  warn(message, meta = {}) {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  debug(message, meta = {}) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }
}

module.exports = new Logger();
