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
    console.log(`\n📖 ============ GET PAGE CONTENT ============`);
    console.log(`📄 Página solicitada: ${pageId}`);

    const { data: content, error } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_id', pageId)
      .maybeSingle();

    if (error) {
      console.error(`❌ Error en query Supabase:`, error);
      throw error;
    }

    console.log(`📦 Resultado de Supabase:`, content ? '✅ ENCONTRADO' : '⚠️  NO ENCONTRADO');
    
    if (content) {
      console.log(`🔍 Datos del registro:`, {
        id: content.id,
        page_id: content.page_id,
        content_type: typeof content.content,
        content_length: JSON.stringify(content.content).length,
        content_preview: JSON.stringify(content.content).substring(0, 150) + '...',
        created_at: content.created_at,
        updated_at: content.updated_at
      });
    }

    // Estructura por defecto para inicio
    const defaultInicio = {
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
    };

    if (!content) {
      console.log(`⚠️  No hay contenido guardado en DB para "${pageId}"`);
      console.log(`📋 Devolviendo valores por defecto...`);
      if (pageId === 'inicio') {
        console.log(`🏠 Usando defaults de inicio`);
        console.log('============ FIN GET PAGE CONTENT (DEFAULTS) ============\n');
        return res.json(defaultInicio);
      }
      console.log('============ FIN GET PAGE CONTENT (EMPTY) ============\n');
      return res.json({});
    }

    // Parsear content si está almacenado como string
    const parsedContent = typeof content.content === 'string' 
      ? JSON.parse(content.content) 
      : content.content;

    // Hacer merge con defaults si es página inicio
    let finalContent = parsedContent;
    if (pageId === 'inicio') {
      finalContent = {
        ...defaultInicio,
        ...parsedContent
      };
      console.log(`🔀 Merged con defaults. Keys finales:`, Object.keys(finalContent));
    }

    const imageUrls = extractImageUrls(finalContent);
    console.log(`📸 Imágenes en contenido final (${imageUrls.length}):`);
    imageUrls.forEach(img => console.log(`   - ${img.path}: ${img.url}`));

    console.log(`✅ Devolviendo contenido. Keys:`, Object.keys(finalContent));
    console.log('============ FIN GET PAGE CONTENT ============\n');
    res.status(200).json(finalContent);
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
      const { data: updated, error: updateError } = await supabase
        .from('page_content')
        .update({ 
          content: contentData 
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
      const { data: newContent, error: insertError } = await supabase
        .from('page_content')
        .insert([{
          page_id: pageId,
          content: contentData
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
    console.log('\n📄 ============ PATCH BATCH PAGE CONTENT ============');
    console.log(`👤 Usuario:`, req.user ? { id: req.user.id, role: req.user.role } : 'NO AUTH');
    
    if (req.user.role !== 'admin') {
      console.error('❌ Acceso denegado - Usuario no es admin');
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const { pageId } = req.params;
    const { updates } = req.body;

    console.log(`📄 Página: ${pageId}`);
    console.log(`📝 Updates recibidos:`);
    console.log(JSON.stringify(updates, null, 2));
    console.log(`🔢 Cantidad de campos: ${Object.keys(updates || {}).length}`);

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No hay actualizaciones para aplicar' });
    }

    // Obtener contenido actual
    console.log(`🔍 Buscando contenido actual...`);
    const { data: current, error: fetchError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_id', pageId)
      .maybeSingle();

    if (fetchError) {
      console.error(`❌ Error al buscar contenido:`, fetchError);
      throw fetchError;
    }

    console.log(`📦 Contenido actual:`, current ? 'ENCONTRADO' : 'NO ENCONTRADO');

    // Parsear el contenido actual
    let currentContent = {};
    if (current) {
      currentContent = typeof current.content === 'string' 
        ? JSON.parse(current.content) 
        : current.content || {};
      console.log(`🔓 Contenido parseado. Keys actuales:`, Object.keys(currentContent));
    }

    // Aplicar actualizaciones con deep merge para preservar estructura
    console.log('🔀 Aplicando deep merge...');
    console.log('   Contenido antes del merge:', JSON.stringify(currentContent).substring(0, 200) + '...');
    const updatedContent = deepMerge(currentContent, updates);
    console.log('   Contenido después del merge:', JSON.stringify(updatedContent).substring(0, 200) + '...');

    console.log(`✅ Merge completado. Keys finales:`, Object.keys(updatedContent));
    const imageUrls = extractImageUrls(updatedContent);
    console.log(`📸 URLs de imágenes encontradas (${imageUrls.length}):`);
    imageUrls.forEach(img => console.log(`   - ${img.path}: ${img.url.substring(0, 60)}...`));

    if (current) {
      // Actualizar existente
      console.log(`✏️  Actualizando registro existente...`);
      console.log(`   ID: ${current.id}`);
      console.log(`   Contenido a guardar:`, JSON.stringify(updatedContent).substring(0, 300) + '...');
      
      const { data: content, error: updateError } = await supabase
        .from('page_content')
        .update({ 
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', current.id)
        .select()
        .single();

      if (updateError) {
        console.error(`❌ ERROR al actualizar en Supabase:`);
        console.error('   Mensaje:', updateError.message);
        console.error('   Código:', updateError.code);
        console.error('   Detalles:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }

      console.log(`✅ ACTUALIZACIÓN EXITOSA en Supabase`);
      console.log(`   Contenido guardado:`, JSON.stringify(content.content).substring(0, 200) + '...');
      console.log(`🎉 Respondiendo al frontend con éxito`);
      console.log('============ FIN PATCH BATCH ============\n');
      
      return res.status(200).json({ 
        success: true,
        message: `${Object.keys(updates).length} campos actualizados exitosamente`,
        content: content.content
      });
    } else {
      // Crear nuevo
      console.log(`➕ NO existe contenido previo - Creando nuevo registro...`);
      console.log(`   Página: ${pageId}`);
      console.log(`   Contenido inicial:`, JSON.stringify(updatedContent).substring(0, 300) + '...');
      
      const { data: content, error: insertError } = await supabase
        .from('page_content')
        .insert([{
          page_id: pageId,
          content: updatedContent,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) {
        console.error(`❌ ERROR al crear en Supabase:`);
        console.error('   Mensaje:', insertError.message);
        console.error('   Código:', insertError.code);
        console.error('   Detalles:', JSON.stringify(insertError, null, 2));
        throw insertError;
      }

      console.log(`✅ CREACIÓN EXITOSA en Supabase`);
      console.log(`   ID nuevo: ${content.id}`);
      console.log(`🎉 Respondiendo al frontend con éxito`);
      console.log('============ FIN PATCH BATCH ============\n');
      
      return res.status(201).json({ 
        success: true,
        message: `Contenido creado con ${Object.keys(updates).length} campos`,
        content: content.content
      });
    }
  } catch (error) {
    console.error('💥 EXCEPCIÓN CAPTURADA en batch update:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   Error completo:', JSON.stringify(error, null, 2));
    console.log('============ FIN PATCH BATCH (ERROR) ============\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Error al actualizar contenido', 
      error: error.message 
    });
  }
});

/**
 * Helper: Deep merge de objetos preservando arrays y valores anidados
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // Si es objeto, hacer merge recursivo
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      // Si es primitivo o array, reemplazar directamente
      output[key] = source[key];
    }
  }
  
  return output;
}

/**
 * Helper: Extraer URLs de imágenes del contenido para debugging
 */
function extractImageUrls(content) {
  const urls = [];
  const findUrls = (obj, prefix = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string' && (value.includes('supabase') || value.includes('http'))) {
        urls.push({ path, url: value });
      } else if (value && typeof value === 'object') {
        findUrls(value, path);
      }
    }
  };
  findUrls(content);
  return urls;
}

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
