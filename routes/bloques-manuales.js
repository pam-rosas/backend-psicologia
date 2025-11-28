const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken, verifyRole } = require('../middlewares/verifyToken');

// GET /api/bloques-manuales - Obtener bloques manuales en un rango de fechas
router.get('/', verifyToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    let query = supabase
      .from('bloques_manuales')
      .select('*')
      .order('fecha, hora_inicio');

    if (fecha_inicio && fecha_fin) {
      query = query.gte('fecha', fecha_inicio).lte('fecha', fecha_fin);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error al obtener bloques manuales:', error);
    res.status(500).json({ error: 'Error al obtener bloques manuales' });
  }
});

// POST /api/bloques-manuales - Crear bloque manual
router.post('/', verifyToken, async (req, res) => {
  try {
    const { fecha, hora_inicio, hora_fin, tipo, descripcion } = req.body;

    console.log('[CREATE-BLOQUEO] Creando bloqueo:', { fecha, hora_inicio, hora_fin, tipo });

    const { data, error } = await supabase
      .from('bloques_manuales')
      .insert([{
        fecha,
        hora_inicio,
        hora_fin,
        tipo,
        descripcion
      }])
      .select()
      .single();

    if (error) {
      console.error('[CREATE-BLOQUEO] Error de Supabase:', error);
      
      // Detectar errores específicos
      if (error.code === '23505') {
        // Violación de constraint único
        return res.status(409).json({ 
          error: 'Ya existe un bloque con la misma fecha y horario',
          code: 'DUPLICADO'
        });
      }
      
      if (error.message && error.message.includes('se solapa')) {
        // Error de trigger de solapamiento
        return res.status(409).json({ 
          error: error.message,
          code: 'SOLAPAMIENTO'
        });
      }
      
      throw error;
    }

    console.log('[CREATE-BLOQUEO] Bloqueo creado exitosamente:', data.id);
    res.status(201).json(data);
  } catch (error) {
    console.error('[CREATE-BLOQUEO] Error al crear bloque manual:', error);
    res.status(500).json({ error: 'Error al crear bloque manual' });
  }
});

// PUT /api/bloques-manuales/:id - Actualizar bloque manual
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, hora_inicio, hora_fin, tipo, descripcion } = req.body;

    console.log('[UPDATE-BLOQUEO] Actualizando bloqueo:', { id, fecha, hora_inicio, hora_fin });

    const { data, error } = await supabase
      .from('bloques_manuales')
      .update({
        fecha,
        hora_inicio,
        hora_fin,
        tipo,
        descripcion
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[UPDATE-BLOQUEO] Error de Supabase:', error);
      
      // Detectar errores específicos
      if (error.code === '23505') {
        return res.status(409).json({ 
          error: 'Ya existe un bloque con la misma fecha y horario',
          code: 'DUPLICADO'
        });
      }
      
      if (error.message && error.message.includes('se solapa')) {
        return res.status(409).json({ 
          error: error.message,
          code: 'SOLAPAMIENTO'
        });
      }
      
      throw error;
    }

    console.log('[UPDATE-BLOQUEO] Bloqueo actualizado exitosamente');
    res.json(data);
  } catch (error) {
    console.error('[UPDATE-BLOQUEO] Error al actualizar bloque manual:', error);
    res.status(500).json({ error: 'Error al actualizar bloque manual' });
  }
});

// DELETE /api/bloques-manuales/:id - Eliminar bloque manual
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[DELETE-BLOQUEO] Intentando eliminar bloqueo con ID:', id);
    console.log('[DELETE-BLOQUEO] Tipo de ID:', typeof id);

    const { data, error } = await supabase
      .from('bloques_manuales')
      .delete()
      .eq('id', id)
      .select();

    console.log('[DELETE-BLOQUEO] Resultado de eliminación:', { data, error });

    if (error) {
      console.error('[DELETE-BLOQUEO] Error de Supabase:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('[DELETE-BLOQUEO] No se encontró ningún registro con ese ID');
    } else {
      console.log('[DELETE-BLOQUEO] Eliminado exitosamente:', data[0]);
    }

    res.status(204).send();
  } catch (error) {
    console.error('[DELETE-BLOQUEO] Error al eliminar bloque manual:', error);
    res.status(500).json({ error: 'Error al eliminar bloque manual' });
  }
});

module.exports = router;