const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Función de prueba para verificar la configuración
const testConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary conectado correctamente:', result);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Cloudinary:', error);
    return false;
  }
};

// Función para subir imagen desde buffer o archivo
const uploadImage = async (file, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'psicologia/general',
      quality: 'auto:good',
      format: 'auto',
      transformation: [
        { width: 1200, height: 800, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    };

    const uploadOptions = { ...defaultOptions, ...options };
    
    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Función para eliminar imagen
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
};

// Función para generar URL optimizada
const getOptimizedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    fetch_format: 'auto',
    quality: 'auto',
    secure: true
  };

  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

// Función para obtener imágenes de una carpeta
const getImagesByFolder = async (folder, maxResults = 50) => {
  try {
    const result = await cloudinary.search
      .expression(`folder:${folder}`)
      .sort_by([['created_at', 'desc']])
      .max_results(maxResults)
      .execute();

    return result.resources.map(img => ({
      public_id: img.public_id,
      secure_url: img.secure_url,
      width: img.width,
      height: img.height,
      created_at: img.created_at,
      bytes: img.bytes
    }));
  } catch (error) {
    console.error('Error fetching images:', error);
    throw new Error(`Fetch failed: ${error.message}`);
  }
};

module.exports = {
  cloudinary,
  testConnection,
  uploadImage,
  deleteImage,
  getOptimizedUrl,
  getImagesByFolder
};