const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');

/**
 * @route   GET /api/page-content/:pageId
 * @desc    Obtener contenido de una página específica
 * @access  Public
 */
router.get('/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;

    const { data: content, error } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_id', pageId)
      .maybeSingle();

    if (error) throw error;

    if (!content) {
      // Devolver estructura por defecto para inicio
      if (pageId === 'inicio') {
        return res.json({
          contactInfo: { 
            title: 'Contacto', 
            items: ['📧 Email: eduardo@emhpsicoterapia.cl', '📱 Teléfono: +56 9 9473 9587'] 
          },
          tarotText: { 
            content: 'Descubre tu camino con nuestras lecturas de tarot profesionales' 
          },
          services: [
            {
              imageKey: 'service1-image',
              imageUrl: 'assets/h11.avif',
              title: 'Psicoterapia e Hipnoterapia',
              items: ['Sesión individual: $40.000 CLP / $50 USD'],
              link: '/formulario',
              buttonText: 'Agendar cita'
            },
            {
              imageKey: 'service2-image', 
              imageUrl: 'assets/h12.avif',
              title: 'Taller de Duelo',
              items: ['4 sesiones grupales: $70.000 CLP / $85 USD'],
              link: '/taller',
              buttonText: 'Ver más'
            }
          ],
          conveniosInfo: { 
            title: 'Convenios', 
            description: 'Atención profesional con opciones de pago flexibles' 
          }
        });
      }
      return res.json({});
    }

    // Parsear content_json si está almacenado como string
    const parsedContent = typeof content.content_json === 'string' 
      ? JSON.parse(content.content_json) 
      : content.content_json;

    res.status(200).json(parsedContent);
  } catch (error) {
    console.error('Error al obtener contenido de página:', error);
    res.status(500).json({ 
      message: 'Error al obtener contenido de página', 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/page-content/:pageId
 * @desc    Crear o actualizar contenido de una página
 * @access  Private (Admin)
 */
router.post('/:pageId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { pageId } = req.params;
    const contentData = req.body;

    if (!contentData || Object.keys(contentData).length === 0) {
      return res.status(400).json({ message: 'El contenido no puede estar vacío' });
    }

    // Verificar si ya existe contenido para esta página
    const { data: existing, error: checkError } = await supabase
      .from('page_content')
      .select('id')
      .eq('page_id', pageId)
      .is('deleted_at', null)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Actualizar existente
      const { data: content, error: updateError } = await supabase
        .from('page_content')
        .update({ 
          content_json: contentData 
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({ 
        message: 'Contenido actualizado exitosamente',
        content 
      });
    } else {
      // Crear nuevo
      const { data: content, error: insertError } = await supabase
        .from('page_content')
        .insert([{
          page_id: pageId,
          content_json: contentData,
          created_by: req.user.id
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      return res.status(201).json({ 
        message: 'Contenido creado exitosamente',
        content 
      });
    }
  } catch (error) {
    console.error('Error al guardar contenido:', error);
    res.status(500).json({ 
      message: 'Error al guardar contenido', 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/page-content/:pageId
 * @desc    Actualizar contenido de una página (alias de POST)
 * @access  Private (Admin)
 */
router.put('/:pageId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { pageId } = req.params;
    const contentData = req.body;

    if (!contentData || Object.keys(contentData).length === 0) {
      return res.status(400).json({ message: 'El contenido no puede estar vacío' });
    }

    const { data: content, error } = await supabase
      .from('page_content')
      .update({ 
        content_json: contentData 
      })
      .eq('page_id', pageId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!content) {
      return res.status(404).json({ message: 'Contenido de página no encontrado' });
    }

    res.status(200).json({ 
      message: 'Contenido actualizado exitosamente',
      content 
    });
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    res.status(500).json({ 
      message: 'Error al actualizar contenido', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/page-content/:pageId
 * @desc    Eliminar contenido de una página (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:pageId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { pageId } = req.params;

    const { data: content, error } = await supabase
      .from('page_content')
      .update({ deleted_at: new Date().toISOString() })
      .eq('page_id', pageId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    if (!content) {
      return res.status(404).json({ message: 'Contenido de página no encontrado' });
    }

    res.status(200).json({ message: 'Contenido eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar contenido:', error);
    res.status(500).json({ 
      message: 'Error al eliminar contenido', 
      error: error.message 
    });
  }
});

/**
 * @route   PATCH /api/page-content/:pageId/batch
 * @desc    Actualizar múltiples campos de contenido de forma eficiente
 * @access  Private (Admin)
 * @body    { updates: { [contentId]: newValue } }
 */
router.patch('/:pageId/batch', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { pageId } = req.params;
    const { updates } = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No hay actualizaciones para aplicar' });
    }

    // Obtener contenido actual
    const { data: current, error: fetchError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_id', pageId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Parsear el contenido actual
    let currentContent = {};
    if (current) {
      currentContent = typeof current.content_json === 'string' 
        ? JSON.parse(current.content_json) 
        : current.content_json || {};
    }

    // Aplicar actualizaciones usando deep merge para preservar estructura anidada
    const updatedContent = { ...currentContent };
    for (const [contentId, value] of Object.entries(updates)) {
      // Manejar rutas anidadas como "service-title-0" o "contact-item-1"
      const keys = contentId.split('-');
      
      if (keys.length === 1) {
        // Campo simple
        updatedContent[contentId] = value;
      } else {
        // Estructura anidada - por ahora, actualización simple
        // TODO: Implementar deep path update si es necesario
        updatedContent[contentId] = value;
      }
    }

    if (current) {
      // Actualizar existente
      const { data: content, error: updateError } = await supabase
        .from('page_content')
        .update({ 
          content_json: updatedContent 
        })
        .eq('id', current.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({ 
        success: true,
        message: `${Object.keys(updates).length} campos actualizados exitosamente`,
        content: content.content_json
      });
    } else {
      // Crear nuevo
      const { data: content, error: insertError } = await supabase
        .from('page_content')
        .insert([{
          page_id: pageId,
          content_json: updatedContent,
          created_by: req.user.id
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      return res.status(201).json({ 
        success: true,
        message: `Contenido creado con ${Object.keys(updates).length} campos`,
        content: content.content_json
      });
    }
  } catch (error) {
    console.error('Error en batch update:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al actualizar contenido', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/page-content
 * @desc    Obtener lista de todas las páginas con contenido
 * @access  Private (Admin)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { data: pages, error } = await supabase
      .from('page_content')
      .select('page_id, created_at, updated_at')
      .is('deleted_at', null)
      .order('page_id');

    if (error) throw error;

    res.status(200).json(pages);
  } catch (error) {
    console.error('Error al obtener páginas:', error);
    res.status(500).json({ 
      message: 'Error al obtener páginas', 
      error: error.message 
    });
  }
});

module.exports = router;
