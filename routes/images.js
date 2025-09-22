const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
// const verifyToken = require('../middlewares/verifyToken'); // Comentado
const { 
  uploadImage, 
  deleteImage, 
  getOptimizedUrl, 
  getImagesByFolder,
  testConnection 
} = require('../cloudinary/config');

// Ruta de prueba (SIN autenticación para testing)
router.get('/test', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({ 
      success: isConnected, 
      message: isConnected ? 'Cloudinary y rutas funcionando correctamente' : 'Error de conexión con Cloudinary',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Error en el servicio de imágenes'
    });
  }
});

// Subir imagen para blog (SIN autenticación)
router.post('/blog', upload.single('imagen'), async (req, res) => {
  try {
    console.log('📸 Upload blog image request received');
    console.log('📁 File:', req.file ? 'Present' : 'Missing');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const base64String = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    const uploadOptions = {
      folder: 'psicologia/blog',
      public_id: `blog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transformation: [
        { width: 1200, height: 800, crop: 'limit' }
      ]
    };

    const result = await uploadImage(base64String, uploadOptions);

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error uploading blog image:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Subir imagen general (SIN autenticación)
router.post('/upload/:folder', upload.single('imagen'), async (req, res) => {
  try {
    console.log(`📸 Upload image to folder: ${req.params.folder}`);
    console.log('📁 File:', req.file ? 'Present' : 'Missing');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const { folder } = req.params;
    const allowedFolders = ['homepage', 'blog', 'servicios', 'testimonios', 'general'];
    
    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({ error: 'Carpeta no permitida' });
    }

    const base64String = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    const uploadOptions = {
      folder: `psicologia/${folder}`,
      public_id: `${folder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transformation: [
        { width: 1200, height: 800, crop: 'limit' }
      ]
    };

    const result = await uploadImage(base64String, uploadOptions);

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Subir video (SIN autenticación)
router.post('/upload-video/:folder', upload.single('video'), async (req, res) => {
  try {
    console.log(`🎥 Upload video to folder: ${req.params.folder}`);
    console.log('📁 File:', req.file ? 'Present' : 'Missing');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo de video' });
    }

    const { folder } = req.params;
    const allowedFolders = ['homepage', 'blog', 'servicios', 'general'];
    
    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({ error: 'Carpeta no permitida' });
    }

    const base64String = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    const uploadOptions = {
      folder: `psicologia/${folder}`,
      public_id: `video_${folder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      resource_type: 'video',
      transformation: [
        { width: 1280, height: 720, crop: 'limit' }
      ]
    };

    const result = await uploadImage(base64String, uploadOptions);

    res.json({
      success: true,
      message: 'Video subido exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Eliminar imagen (SIN autenticación)
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const decodedPublicId = decodeURIComponent(publicId);
    
    const deleted = await deleteImage(decodedPublicId);
    
    if (deleted) {
      res.json({ 
        success: true, 
        message: 'Imagen eliminada exitosamente' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Imagen no encontrada o no se pudo eliminar' 
      });
    }

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Obtener imágenes de una carpeta (SIN autenticación)
router.get('/folder/:folder', async (req, res) => {
  try {
    const { folder } = req.params;
    const { limit = 50 } = req.query;
    
    const images = await getImagesByFolder(`psicologia/${folder}`, parseInt(limit));
    
    res.json({
      success: true,
      count: images.length,
      images: images
    });

  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Generar URL optimizada (SIN autenticación)
router.get('/optimized/:publicId', (req, res) => {
  try {
    const { publicId } = req.params;
    const { 
      width = 300, 
      height = 200, 
      crop = 'fill'
    } = req.query;
    
    const decodedPublicId = decodeURIComponent(publicId);
    
    const optimizedUrl = getOptimizedUrl(decodedPublicId, {
      width: parseInt(width),
      height: parseInt(height),
      crop: crop
    });
    
    res.redirect(optimizedUrl);

  } catch (error) {
    console.error('Error generating optimized URL:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error generando URL optimizada',
      details: error.message 
    });
  }
});

module.exports = router;