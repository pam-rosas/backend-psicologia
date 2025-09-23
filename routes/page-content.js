const express = require('express');
const router = express.Router();
const db = require('../firebase/config');
const upload = require('../middlewares/upload');
const { uploadImage } = require('../cloudinary/config');

// GET - Obtener contenido de una página específica
router.get('/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const doc = await db.collection('page-content').doc(pageId).get();
    
    if (!doc.exists) {
      // Devolver estructura por defecto para inicio
      if (pageId === 'inicio') {
        return res.json({
          contactInfo: { 
            title: 'Contacto', 
            items: ['📧 Email: contacto@psicoterapia.com', '📱 Teléfono: +56 9 9473 9587'] 
          },
          tarotText: { 
            content: 'Descubre tu camino con nuestras lecturas de tarot profesionales' 
          },
          services: [
            {
              imageKey: 'service1-image',
              imageUrl: 'assets/h11.png',
              title: 'Psicoterapia Individual',
              items: ['Consulta inicial: $30.000', 'Sesión: $25.000'],
              link: '/formulario',
              buttonText: 'Agendar cita'
            },
            {
              imageKey: 'service2-image', 
              imageUrl: 'assets/h12.avif',
              title: 'Taller Grupal',
              items: ['Sesión grupal: $15.000', 'Paquete mensual: $50.000'],
              link: '/formulario',
              buttonText: 'Ver más'
            }
          ],
          conveniosInfo: { 
            title: 'Convenios', 
            description: 'Trabajamos con FONASA y diferentes instituciones de salud' 
          }
        });
      }
      return res.json({});
    }
    
    res.json(doc.data());
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ error: 'Error al obtener contenido' });
  }
});

// PUT - Actualizar contenido de una página
router.put('/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const content = req.body;
    
    // Guardar en la colección 'page-content' con el ID recibido (ej: 'inicio')
    await db.collection('page-content').doc(pageId).set(
      {
        ...content,
        updatedAt: new Date()
      },
      { merge: true }
    );
    
    console.log(`✅ Contenido actualizado para página: ${pageId}`, {
      services: content.services?.length || 0,
      hasContactInfo: !!content.contactInfo
    });
    
    res.json({ message: 'Contenido actualizado exitosamente', id: pageId });
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    res.status(500).json({ error: 'Error al actualizar contenido' });
  }
});

// POST - Subir imagen para un servicio específico y actualizar Firebase
router.post('/:pageId/service-image/:serviceIndex', upload.single('imagen'), async (req, res) => {
  try {
    const { pageId, serviceIndex } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    console.log(`📸 Uploading service image for page: ${pageId}, service: ${serviceIndex}`);

    // Subir imagen a Cloudinary
    const base64String = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    const uploadOptions = {
      folder: `psicologia/services`,
      public_id: `${pageId}_service_${serviceIndex}_${Date.now()}`,
      transformation: [
        { width: 800, height: 600, crop: 'limit' }
      ]
    };

    const uploadResult = await uploadImage(base64String, uploadOptions);

    // Obtener contenido actual de Firebase
    const doc = await db.collection('page-content').doc(pageId).get();
    let content = doc.exists ? doc.data() : {};
    
    // Asegurar que existe la estructura de servicios
    if (!content.services) {
      content.services = [];
    }

    // Actualizar la URL de la imagen del servicio específico
    const index = parseInt(serviceIndex);
    if (content.services[index]) {
      content.services[index].imageUrl = uploadResult.secure_url;
      content.services[index].imagePublicId = uploadResult.public_id;
    }

    // Guardar en Firebase
    await db.collection('page-content').doc(pageId).set(
      {
        ...content,
        updatedAt: new Date()
      },
      { merge: true }
    );

    console.log(`✅ Imagen de servicio actualizada: ${uploadResult.secure_url}`);

    res.json({
      success: true,
      message: 'Imagen subida y guardada exitosamente',
      data: {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        serviceIndex: index
      }
    });

  } catch (error) {
    console.error('Error al subir imagen de servicio:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al subir imagen de servicio',
      details: error.message 
    });
  }
});



module.exports = router;