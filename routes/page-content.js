const express = require('express');
const router = express.Router();
const db = require('../firebase/config');

// GET - Obtener contenido de una página específica
router.get('/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const doc = await db.collection('page-content').doc(pageId).get();
    
    if (!doc.exists) {
      // Retornar contenido por defecto si no existe
      const defaultContent = getDefaultContent(pageId);
      return res.json(defaultContent);
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
    
    await db.collection('page-content').doc(pageId).set({
      ...content,
      updatedAt: new Date()
    }, { merge: true });
    
    res.json({ message: 'Contenido actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    res.status(500).json({ error: 'Error al actualizar contenido' });
  }
});

// Función para obtener contenido por defecto
function getDefaultContent(pageId) {
  const defaultContents = {
    'inicio': {
      contactInfo: {
        title: 'Contacto',
        items: [
          '+56 9 9473 9587',
          'emhpsicoterapiaonline@gmail.com',
          'contacto@emhpsicoterapiaonline.com',
          'Avenida La Paz, Queilen, Chiloé, Chile'
        ]
      },
      tarotText: {
        content: 'Descubre las respuestas que el universo tiene para ti. El tarot puede iluminar tu camino y brindarte la claridad que necesitas para avanzar con confianza'
      },
      services: [
        {
          imageKey: 'service1-image',
          title: 'Psicoterapia clínica individual online',
          items: ['$40.000'],
          link: '/formulario',
          buttonText: 'Agendar'
        },
        {
          imageKey: 'service2-image',
          title: 'Taller de Duelo',
          items: ['$70.000', 'Plazas disponibles'],
          link: '/taller',
          buttonText: 'Ver mas'
        }
      ],
      conveniosInfo: {
        title: 'Convenios',
        description: 'Contamos con convenios de reembolso de boletas con Banmédica y Vida 3...'
      }
    }
  };
  
  return defaultContents[pageId] || {};
}

module.exports = router;