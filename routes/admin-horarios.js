const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken, verifyRole } = require('../middlewares/verifyToken');

// Aplicar middleware de autenticación y rol admin a todas las rutas
router.use(verifyToken);
router.use(verifyRole('admin'));

// =============================
// CRUD Horarios Semanales
// =============================

// GET /api/admin/horarios - Listar todos los horarios semanales
router.get('/horarios', async (req, res) => {
  console.log('[DEBUG] Cargando horarios semanales para admin:', req.user.username);
  try {
    // Obtener horarios semanales (todos, no solo activos)
    const { data: horarios, error: horariosError } = await supabase
      .from('horarios_disponibles')
      .select('*')
      .order('dia_semana');
    if (horariosError) {
      console.error('[ERROR] Error al cargar horarios:', horariosError.message);
      throw horariosError;
    }

    // Obtener excepciones (todas, no solo futuras)
    const { data: excepciones, error: excError } = await supabase
      .from('excepciones_horarios')
      .select('*')
      .order('fecha');
    if (excError) {
      console.error('[ERROR] Error al cargar excepciones:', excError.message);
      throw excError;
    }

    // Formatear respuesta como la ruta pública
    const horarioSemanal = {};
    const diasMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    horarios.forEach(horario => {
      const dia = diasMap[horario.dia_semana];
      if (!horarioSemanal[dia]) {
        horarioSemanal[dia] = [];
      }
      horarioSemanal[dia].push({
        hora_inicio: horario.hora_inicio,
        hora_fin: horario.hora_fin,
        modalidad: horario.modalidad
      });
    });

    console.log('[DEBUG] Horarios formateados:', JSON.stringify(horarioSemanal, null, 2));

    const excepcionesMap = {};
    excepciones.forEach(exc => {
      excepcionesMap[exc.fecha] = [{
        hora_inicio: exc.hora_inicio,
        hora_fin: exc.hora_fin,
        motivo: exc.motivo,
        bloqueado: exc.bloqueado
      }];
    });

    console.log('[DEBUG] Horarios cargados:', Object.keys(horarioSemanal).length, 'días,', Object.keys(excepcionesMap).length, 'excepciones');
    res.json({
      horarioSemanal,
      excepciones: excepcionesMap
    });
  } catch (error) {
    console.error('[ERROR] Excepción al cargar datos:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/horarios - Actualizar todos los bloques horarios (reemplaza existentes)
router.post('/horarios', async (req, res) => {
  console.log('[DEBUG] Actualizando horarios:', req.body);
  try {
    let horarios = req.body;

    // Si no es array, convertir a array
    if (!Array.isArray(horarios)) {
      horarios = [horarios];
    }

    // Validar que todos tengan dia_semana
    for (const h of horarios) {
      if (h.dia_semana === null || h.dia_semana === undefined) {
        throw new Error('dia_semana es requerido para todos los horarios');
      }
    }

    // IMPORTANTE: Deduplicar horarios antes de insertar
    // Usar un Set con clave única: dia_semana + hora_inicio + hora_fin + modalidad
    const horariosUnicos = new Map();
    horarios.forEach(h => {
      const key = `${h.dia_semana}_${h.hora_inicio}_${h.hora_fin}_${h.modalidad}`;
      if (!horariosUnicos.has(key)) {
        horariosUnicos.set(key, h);
      } else {
        console.log('[WARN] Horario duplicado ignorado:', h);
      }
    });

    const horariosDeduplicados = Array.from(horariosUnicos.values());
    
    if (horariosDeduplicados.length !== horarios.length) {
      console.log(`[WARN] Se eliminaron ${horarios.length - horariosDeduplicados.length} duplicados`);
    }

    console.log('[DEBUG] Horarios deduplicados a insertar:', JSON.stringify(horariosDeduplicados, null, 2));

    // Eliminar todos los horarios existentes
    const { error: deleteError } = await supabase
      .from('horarios_disponibles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (deleteError) {
      console.error('[ERROR] Error al eliminar horarios existentes:', deleteError.message);
      throw deleteError;
    }

    // Insertar los nuevos (ya deduplicados)
    const { data, error } = await supabase
      .from('horarios_disponibles')
      .insert(horariosDeduplicados.map(h => ({
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        modalidad: h.modalidad,
        activo: h.activo !== undefined ? h.activo : true
      })))
      .select();

    if (error) {
      console.error('[ERROR] Error al insertar horarios:', error.message);
      
      // Detectar errores específicos de duplicados
      if (error.code === '23505') {
        return res.status(409).json({ 
          success: false, 
          message: 'Ya existe un horario con la misma configuración',
          code: 'DUPLICADO'
        });
      }
      
      if (error.message && error.message.includes('se solapa')) {
        return res.status(409).json({ 
          success: false, 
          message: error.message,
          code: 'SOLAPAMIENTO'
        });
      }
      
      throw error;
    }

    console.log('[DEBUG] Horarios actualizados:', data.length, 'registros');
    res.json({ success: true, horarios: data });
  } catch (error) {
    console.error('[ERROR] Excepción al actualizar horarios:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/horarios/:id - Editar bloque horario
router.put('/horarios/:id', async (req, res) => {
  console.log('[DEBUG] Editando horario ID:', req.params.id, req.body);
  try {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fin, modalidad, activo } = req.body;
    const { data, error } = await supabase
      .from('horarios_disponibles')
      .update({ dia_semana, hora_inicio, hora_fin, modalidad, activo })
      .eq('id', id)
      .select();
    if (error) {
      console.error('[ERROR] Error al editar horario:', error.message);
      throw error;
    }
    console.log('[DEBUG] Horario editado:', data[0]);
    res.json({ success: true, horario: data[0] });
  } catch (error) {
    console.error('[ERROR] Excepción al editar horario:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/horarios/:id - Eliminar bloque horario
router.delete('/horarios/:id', async (req, res) => {
  console.log('[DEBUG] Eliminando horario ID:', req.params.id);
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('horarios_disponibles')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[ERROR] Error al eliminar horario:', error.message);
      throw error;
    }
    console.log('[DEBUG] Horario eliminado');
    res.json({ success: true });
  } catch (error) {
    console.error('[ERROR] Excepción al eliminar horario:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================
// CRUD Excepciones
// =============================

// GET /api/admin/excepciones - Listar excepciones por mes (opcional: ?mes=YYYY-MM)
router.get('/excepciones', async (req, res) => {
  console.log('[DEBUG] Cargando excepciones para admin:', req.user.username);
  try {
    const { mes } = req.query; // formato YYYY-MM
    let query = supabase.from('excepciones_horarios').select('*');
    if (mes) {
      query = query.gte('fecha', `${mes}-01`).lte('fecha', `${mes}-31`);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[ERROR] Error al cargar excepciones:', error.message);
      throw error;
    }
    console.log('[DEBUG] Excepciones cargadas:', data.length, 'registros');
    res.json({ success: true, excepciones: data });
  } catch (error) {
    console.error('[ERROR] Excepción al cargar excepciones:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/excepciones - Crear excepción
router.post('/excepciones', async (req, res) => {
  console.log('[DEBUG] Creando excepción:', req.body);
  try {
    const { fecha, hora_inicio, hora_fin, motivo, bloqueado } = req.body;
    const { data, error } = await supabase
      .from('excepciones_horarios')
      .insert([{ fecha, hora_inicio, hora_fin, motivo, bloqueado }])
      .select();
    if (error) {
      console.error('[ERROR] Error al crear excepción:', error.message);
      throw error;
    }
    console.log('[DEBUG] Excepción creada:', data[0]);
    res.json({ success: true, excepcion: data[0] });
  } catch (error) {
    console.error('[ERROR] Excepción al crear excepción:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/excepciones/:id - Eliminar excepción
router.delete('/excepciones/:id', async (req, res) => {
  console.log('[DEBUG] Eliminando excepción ID:', req.params.id);
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('excepciones_horarios')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[ERROR] Error al eliminar excepción:', error.message);
      throw error;
    }
    console.log('[DEBUG] Excepción eliminada');
    res.json({ success: true });
  } catch (error) {
    console.error('[ERROR] Excepción al eliminar excepción:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
