// routes/blog-supabase.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

// CREAR BLOG
router.post('/crear', async (req, res) => {
  try {
    console.log('📝 [BLOG] Creando blog con datos:', req.body);
    
    const { titulo, texto, imagen, videoUrl } = req.body;
    
    if (!titulo || !texto) {
      return res.status(400).json({ 
        message: 'Título y texto son requeridos',
        received: { titulo, texto }
      });
    }

    const { data: blog, error } = await supabase
      .from('blogs')
      .insert({
        title: titulo,
        content: texto,
        image_url: imagen || null,
        video_url: videoUrl || null,
        created_by: req.user?.id || null // Si viene del middleware de auth
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ [BLOG] Error creando blog:', error);
      return res.status(500).json({ 
        message: 'Error al crear el blog', 
        error: error.message 
      });
    }

    console.log('✅ [BLOG] Blog creado exitosamente:', blog.id);
    res.status(201).json({ 
      message: 'Blog creado exitosamente', 
      blogId: blog.id,
      data: blog
    });
    
  } catch (error) {
    console.error('❌ [BLOG] Error en crear blog:', error);
    res.status(500).json({ 
      message: 'Error al crear el blog', 
      error: error.message
    });
  }
});

// OBTENER BLOGS
router.get('/obtener', async (req, res) => {
  try {
    const { data: blogs, error } = await supabase
      .from('blogs')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ [BLOG] Error obteniendo blogs:', error);
      return res.status(500).json({ message: 'Error al obtener los blogs', error: error.message });
    }
    
    console.log(`✅ [BLOG] ${blogs.length} blogs obtenidos`);
    res.status(200).json(blogs);
    
  } catch (error) {
    console.error('❌ [BLOG] Error:', error);
    res.status(500).json({ message: 'Error al obtener los blogs', error: error.message });
  }
});

// OBTENER UN BLOG POR ID
router.get('/obtener/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: blog, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    
    if (error) {
      console.error('❌ [BLOG] Error obteniendo blog:', error);
      return res.status(404).json({ message: 'Blog no encontrado', error: error.message });
    }
    
    res.status(200).json(blog);
    
  } catch (error) {
    console.error('❌ [BLOG] Error:', error);
    res.status(500).json({ message: 'Error al obtener el blog', error: error.message });
  }
});

// ACTUALIZAR BLOG
router.put('/actualizar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, texto, imagen, videoUrl } = req.body;
    
    const updateData = {};
    if (titulo) updateData.title = titulo;
    if (texto) updateData.content = texto;
    if (imagen !== undefined) updateData.image_url = imagen;
    if (videoUrl !== undefined) updateData.video_url = videoUrl;
    
    const { data: blog, error } = await supabase
      .from('blogs')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [BLOG] Error actualizando blog:', error);
      return res.status(500).json({ message: 'Error al actualizar el blog', error: error.message });
    }
    
    console.log('✅ [BLOG] Blog actualizado:', id);
    res.status(200).json({ message: 'Blog actualizado exitosamente', data: blog });
    
  } catch (error) {
    console.error('❌ [BLOG] Error:', error);
    res.status(500).json({ message: 'Error al actualizar el blog', error: error.message });
  }
});

// ELIMINAR BLOG (soft delete)
router.delete('/eliminar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: blog, error } = await supabase
      .from('blogs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [BLOG] Error eliminando blog:', error);
      return res.status(500).json({ message: 'Error al eliminar el blog', error: error.message });
    }
    
    console.log('✅ [BLOG] Blog eliminado (soft):', id);
    res.status(200).json({ message: 'Blog eliminado exitosamente' });
    
  } catch (error) {
    console.error('❌ [BLOG] Error:', error);
    res.status(500).json({ message: 'Error al eliminar el blog', error: error.message });
  }
});

module.exports = router;
