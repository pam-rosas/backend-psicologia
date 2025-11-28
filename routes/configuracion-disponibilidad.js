const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken, verifyRole } = require('../middlewares/verifyToken');

// Aplicar middleware de autenticación a todas las rutas
router.use(verifyToken);

// GET /api/configuracion/disponibilidad - Obtener configuración global
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('configuracion_disponibilidad')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    // Si no existe configuración, devolver valores por defecto
    if (!data) {
      const defaultConfig = {
        minimo_anticipacion_horas: 24,
        maximo_dias_adelante: 30,
        permitir_citas_domingos: false,
        permitir_citas_fines_semana: true
      };
      res.json(defaultConfig);
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// POST /api/configuracion/disponibilidad - Crear/actualizar configuración global
router.post('/', verifyToken, async (req, res) => {
  try {
    const { minimo_anticipacion_horas, maximo_dias_adelante, permitir_citas_domingos, permitir_citas_fines_semana } = req.body;

    // Primero intentar actualizar
    const { data: updateData, error: updateError } = await supabase
      .from('configuracion_disponibilidad')
      .update({
        minimo_anticipacion_horas,
        maximo_dias_adelante,
        permitir_citas_domingos,
        permitir_citas_fines_semana
      })
      .eq('id', 1) // Asumiendo que hay una fila con id=1
      .select()
      .single();

    if (updateError && updateError.code === 'PGRST116') {
      // Si no existe, crear nueva
      const { data: insertData, error: insertError } = await supabase
        .from('configuracion_disponibilidad')
        .insert([{
          minimo_anticipacion_horas,
          maximo_dias_adelante,
          permitir_citas_domingos,
          permitir_citas_fines_semana
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      res.json(insertData);
    } else if (updateError) {
      throw updateError;
    } else {
      res.json(updateData);
    }
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

module.exports = router;