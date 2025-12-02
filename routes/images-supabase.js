const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const multer = require('multer');

// Configurar multer para recibir archivos en memoria
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// =====================================================
// RUTA DE PRUEBA
// =====================================================
router.get('/test', async (req, res) => {
  try {
    // Verificar conexión con Supabase Storage
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    res.json({ 
      success: !error, 
      message: !error ? 'Supabase Storage funcionando correctamente' : `Error: ${error.message}`,
      timestamp: new Date().toISOString(),
      buckets: buckets?.map(b => b.name) || []
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Error en el servicio de imágenes'
    });
  }
});

// =====================================================
// SUBIR IMAGEN PARA BLOG
// =====================================================
router.post('/blog', upload.single('imagen'), async (req, res) => {
  try {
    console.log('📸 Upload blog image request received');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No se proporcionó archivo' 
      });
    }

    const file = req.file;
    const fileName = `blog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.mimetype.split('/')[1]}`;
    const filePath = `blog/${fileName}`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error al subir imagen',
        details: error.message 
      });
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: {
        url: publicUrl,
        secure_url: publicUrl,
        public_id: filePath,
        folder: 'blog',
        resource_type: 'image',
        format: file.mimetype.split('/')[1]
      }
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

// =====================================================
// SUBIR IMAGEN A CARPETA ESPECÍFICA
// =====================================================
router.post('/upload/:folder', upload.single('imagen'), async (req, res) => {
  try {
    console.log('\n🖼️  ============ UPLOAD IMAGE REQUEST ============');
    console.log(`📸 Carpeta destino: ${req.params.folder}`);
    console.log(`📦 Archivo recibido:`, req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: `${(req.file.size / 1024).toFixed(2)} KB`
    } : 'NO HAY ARCHIVO');
    
    if (!req.file) {
      console.error('❌ Error: No se proporcionó archivo');
      return res.status(400).json({ 
        success: false,
        error: 'No se proporcionó archivo' 
      });
    }

    const { folder } = req.params;
    const allowedFolders = ['homepage', 'blog', 'servicios', 'testimonios', 'general', 'talleres', 'sobremi', 'inicio', 'hero'];
    
    console.log(`🔍 Validando carpeta "${folder}" contra permitidas:`, allowedFolders);
    
    if (!allowedFolders.includes(folder)) {
      console.error(`❌ Carpeta "${folder}" NO PERMITIDA`);
      return res.status(400).json({ 
        success: false,
        error: 'Carpeta no permitida',
        allowedFolders 
      });
    }
    
    console.log(`✅ Carpeta "${folder}" es válida`);

    const file = req.file;
    const fileName = `${folder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.mimetype.split('/')[1]}`;
    const filePath = `${folder}/${fileName}`;

    console.log(`📝 Generando nombre de archivo: ${fileName}`);
    console.log(`📂 Path completo en Storage: ${filePath}`);
    console.log(`☁️  Subiendo a Supabase Storage bucket "images"...`);

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ ERROR subiendo a Supabase Storage:');
      console.error('   Mensaje:', error.message);
      console.error('   Error completo:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        success: false,
        error: 'Error al subir imagen',
        details: error.message 
      });
    }

    console.log(`✅ Archivo subido exitosamente a Supabase`);
    console.log(`📦 Data de respuesta:`, data);

    // Obtener URL pública
    console.log(`🔗 Generando URL pública...`);
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    
    console.log(`✅ URL pública generada: ${publicUrl}`);

    const responseData = {
      success: true,
      message: 'Imagen subida exitosamente',
      data: {
        url: publicUrl,
        secure_url: publicUrl,
        public_id: filePath,
        folder: folder,
        resource_type: 'image',
        format: file.mimetype.split('/')[1]
      }
    };
    
    console.log('🎉 ÉXITO - Enviando respuesta al frontend:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('============ FIN UPLOAD IMAGE ============\n');
    
    res.json(responseData);

  } catch (error) {
    console.error('💥 EXCEPCIÓN CAPTURADA en upload image:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    console.log('============ FIN UPLOAD IMAGE (ERROR) ============\n');
    
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// =====================================================
// SUBIR VIDEO
// =====================================================
router.post('/upload-video/:folder', upload.single('video'), async (req, res) => {
  try {
    console.log(`🎥 Upload video to folder: ${req.params.folder}`);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No se proporcionó archivo de video' 
      });
    }

    const { folder } = req.params;
    const allowedFolders = ['homepage', 'blog', 'servicios', 'general', 'talleres', 'sobremi', 'inicio', 'hero'];
    
    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({ 
        success: false,
        error: 'Carpeta no permitida',
        allowedFolders 
      });
    }

    const file = req.file;
    const fileName = `video_${folder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.mimetype.split('/')[1]}`;
    const filePath = `videos/${folder}/${fileName}`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading video to Supabase:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error al subir video',
        details: error.message 
      });
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    res.json({
      success: true,
      message: 'Video subido exitosamente',
      data: {
        url: publicUrl,
        secure_url: publicUrl,
        public_id: filePath,
        folder: folder,
        resource_type: 'video',
        format: file.mimetype.split('/')[1]
      }
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

// =====================================================
// ELIMINAR IMAGEN (acepta query parameter)
// =====================================================
router.delete('/delete', async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.query.path || '');
    console.log(`🗑️  Delete image: ${publicId}`);
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro "path" con la ruta de la imagen'
      });
    }
    
    const { data, error } = await supabase.storage
      .from('images')
      .remove([publicId]);
    
    if (error) {
      console.error('Error deleting from Supabase:', error);
      return res.status(404).json({ 
        success: false, 
        error: 'Imagen no encontrada o no se pudo eliminar',
        details: error.message
      });
    }

    res.json({ 
      success: true, 
      message: 'Imagen eliminada exitosamente' 
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// =====================================================
// OBTENER IMÁGENES DE UNA CARPETA
// =====================================================
router.get('/folder/:folder', async (req, res) => {
  try {
    const { folder } = req.params;
    const { limit = 50 } = req.query;
    
    const { data: files, error } = await supabase.storage
      .from('images')
      .list(folder, {
        limit: parseInt(limit),
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing images:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error al listar imágenes',
        details: error.message 
      });
    }

    // Generar URLs públicas
    const images = files.map(file => {
      const filePath = `${folder}/${file.name}`;
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      return {
        public_id: filePath,
        url: publicUrl,
        secure_url: publicUrl,
        format: file.name.split('.').pop(),
        created_at: file.created_at
      };
    });

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

// =====================================================
// GENERAR URL OPTIMIZADA (acepta query parameter)
// =====================================================
router.get('/optimized', (req, res) => {
  try {
    const publicId = decodeURIComponent(req.query.path || '');
    
    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro "path" con la ruta de la imagen'
      });
    }
    
    // Supabase Storage genera URLs públicas directamente
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(publicId);
    
    res.redirect(publicUrl);

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
