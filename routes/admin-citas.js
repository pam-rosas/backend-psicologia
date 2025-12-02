const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { verifyToken } = require('../middlewares/verifyToken');
const NotificationHelper = require('../helpers/notification.helper');

/**
 * Normalizar hora al formato HH:MM:SS
 * Maneja formatos: "HH:MM", "HH:MM:SS", "HH:MM:SS:SS" (error)
 */
function normalizarHora(hora) {
  if (!hora) return null;
  
  // Si ya tiene formato correcto HH:MM:SS, retornar
  if (/^\d{2}:\d{2}:\d{2}$/.test(hora)) {
    return hora;
  }
  
  // Si tiene formato HH:MM, agregar segundos
  if (/^\d{2}:\d{2}$/.test(hora)) {
    return hora + ':00';
  }
  
  // Si tiene formato erróneo (más de 2 partes con :), extraer solo HH:MM
  const partes = hora.split(':');
  if (partes.length >= 2) {
    return `${partes[0]}:${partes[1]}:00`;
  }
  
  return null;
}

/**
 * GET /api/admin/citas/:id
 * Obtener detalle completo de una cita (con datos del paciente)
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[ADMIN-CITAS] Obteniendo detalle de cita:', id);

    // Obtener cita primero
    const { data: cita, error: errorCita } = await supabase
      .from('citas')
      .select('*')
      .eq('id', id)
      .single();

    if (errorCita) {
      console.error('[ADMIN-CITAS] Error al obtener cita:', errorCita);
      return res.status(500).json({ error: 'Error al obtener la cita' });
    }

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Obtener datos del paciente si existe el RUT
    let paciente = null;
    if (cita.rut_paciente) {
      const { data: pacienteData } = await supabase
        .from('patients')
        .select('*')
        .eq('rut', cita.rut_paciente)
        .maybeSingle();
      
      paciente = pacienteData;
    }

    // Obtener datos del paquete si existe
    let paquete = null;
    if (cita.paquete_id) {
      const { data: paqueteData } = await supabase
        .from('paquetes')
        .select('*')
        .eq('id', cita.paquete_id)
        .maybeSingle();
      
      paquete = paqueteData;
    }

    // Transformar formato para el frontend
    const citaDetalle = {
      id: cita.id,
      fecha: cita.fecha,
      hora_inicio: cita.hora,
      hora_fin: cita.hora_fin,
      duracion: cita.duracion,
      estado: cita.estado,
      notas: cita.notas,
      precio_nacional: cita.monto, // citas usa 'monto' no 'precio_nacional'
      precio_internacional: null,
      created_at: cita.created_at,
      paciente: {
        rut: cita.rut_paciente,
        nombre: paciente?.full_name || cita.nombre_paciente,
        email: paciente?.email || cita.email_paciente,
        telefono: paciente?.phone || cita.telefono_paciente,
        direccion: paciente?.address || cita.direccion || '',
        comuna: paciente?.city || cita.comuna || '',
        notas_medicas: paciente?.medical_notes || ''
      },
      paquete: paquete ? {
        id: paquete.id,
        nombre: paquete.nombre,
        sesiones: paquete.sesiones,
        duracion: paquete.duracion
      } : null
    };

    console.log('[ADMIN-CITAS] Cita encontrada:', citaDetalle);
    res.json(citaDetalle);

  } catch (error) {
    console.error('[ADMIN-CITAS] Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/admin/citas
 * Crear cita manualmente (admin)
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      fecha,
      hora_inicio,
      hora_fin,
      rut_paciente,
      nombre_paciente,
      email_paciente,
      telefono_paciente,
      paquete_id,
      notas,
      direccion,
      comuna
    } = req.body;

    console.log('[ADMIN-CITAS] Creando cita manual:', req.body);

    // Validar campos requeridos
    if (!fecha || !hora_inicio || !hora_fin || !rut_paciente || !nombre_paciente || !email_paciente) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: fecha, hora_inicio, hora_fin, rut_paciente, nombre_paciente, email_paciente' 
      });
    }

    // Verificar disponibilidad del horario
    const { data: citasExistentes, error: errorVerificar } = await supabase
      .from('citas')
      .select('id')
      .eq('fecha', fecha)
      .eq('hora', hora_inicio + ':00')
      .neq('estado', 'cancelada');

    if (errorVerificar) {
      console.error('[ADMIN-CITAS] Error al verificar disponibilidad:', errorVerificar);
      return res.status(500).json({ error: 'Error al verificar disponibilidad' });
    }

    if (citasExistentes && citasExistentes.length > 0) {
      return res.status(409).json({ 
        error: 'Ya existe una cita en ese horario',
        code: 'HORARIO_OCUPADO'
      });
    }

    // ============================================================
    // PASO 1: Verificar/crear paciente en tabla patients
    // ============================================================
    let { data: paciente } = await supabase
      .from('patients')
      .select('*')
      .eq('rut', rut_paciente)
      .maybeSingle();

    if (!paciente) {
      // Crear nuevo paciente
      const { data: nuevoPaciente, error: errorCrearPaciente } = await supabase
        .from('patients')
        .insert({
          rut: rut_paciente,
          full_name: nombre_paciente,
          email: email_paciente,
          phone: telefono_paciente || null,
          address: direccion || null,
          city: comuna || null,
          medical_notes: notas || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (errorCrearPaciente) {
        console.error('[ADMIN-CITAS] Error al crear paciente:', errorCrearPaciente);
        return res.status(500).json({ error: 'Error al crear el paciente' });
      }

      paciente = nuevoPaciente;
      console.log('[ADMIN-CITAS] Paciente creado:', paciente.rut);
    } else {
      console.log('[ADMIN-CITAS] Paciente existente:', paciente.rut);
    }

    // Calcular duración
    const [h1, m1] = hora_inicio.split(':').map(Number);
    const [h2, m2] = hora_fin.split(':').map(Number);
    const duracion = (h2 * 60 + m2) - (h1 * 60 + m1);

    // Obtener precio del paquete si aplica
    let monto = null;

    if (paquete_id) {
      const { data: paquete } = await supabase
        .from('paquetes')
        .select('precio_nacional')
        .eq('id', paquete_id)
        .maybeSingle();

      if (paquete) {
        monto = paquete.precio_nacional;
      }
    }

    // ============================================================
    // PASO 2: Crear la cita (sin campos denormalizados)
    // ============================================================
    const { data: nuevaCita, error: errorCrear } = await supabase
      .from('citas')
      .insert({
        fecha,
        hora: hora_inicio + ':00',
        hora_fin: hora_fin + ':00',
        duracion,
        rut_paciente, // ✅ FK a patients
        paquete_id: paquete_id || null,
        estado: 'confirmada',
        notas: notas || null,
        monto,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (errorCrear) {
      console.error('[ADMIN-CITAS] Error al crear cita:', errorCrear);
      return res.status(500).json({ error: 'Error al crear la cita' });
    }

    console.log('[ADMIN-CITAS] Cita creada exitosamente:', nuevaCita.id);

    res.status(201).json({
      message: 'Cita creada correctamente',
      cita: {
        ...nuevaCita,
        paciente: {
          rut: paciente.rut,
          nombre: paciente.full_name,
          email: paciente.email,
          telefono: paciente.phone
        }
      }
    });

  } catch (error) {
    console.error('[ADMIN-CITAS] Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/admin/citas/:id/reagendar
 * Reagendar una cita existente
 */
router.put('/:id/reagendar', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nueva_fecha, nueva_hora_inicio, nueva_hora_fin } = req.body;

    console.log('[ADMIN-CITAS] Reagendando cita:', id, {
      nueva_fecha,
      nueva_hora_inicio,
      nueva_hora_fin
    });

    // ============================================================
    // VALIDACIÓN 0: Normalizar horas de entrada
    // ============================================================
    const horaInicioNormalizada = normalizarHora(nueva_hora_inicio);
    const horaFinNormalizada = normalizarHora(nueva_hora_fin);

    if (!nueva_fecha || !horaInicioNormalizada || !horaFinNormalizada) {
      return res.status(400).json({ 
        message: '❌ Faltan campos requeridos o tienen formato inválido',
        detalle: {
          nueva_fecha: !nueva_fecha ? 'requerido' : 'OK',
          nueva_hora_inicio: !horaInicioNormalizada ? 'formato inválido' : 'OK',
          nueva_hora_fin: !horaFinNormalizada ? 'formato inválido' : 'OK'
        }
      });
    }

    console.log('[ADMIN-CITAS] Horas normalizadas:', {
      inicio: horaInicioNormalizada,
      fin: horaFinNormalizada
    });

    // ============================================================
    // VALIDACIÓN 1: Verificar que la cita existe
    // ============================================================
    const { data: citaExistente, error: errorVerificar } = await supabase
      .from('citas')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (errorVerificar || !citaExistente) {
      console.error('[ADMIN-CITAS] Cita no encontrada:', { id, error: errorVerificar });
      return res.status(404).json({ 
        message: '❌ Cita no encontrada',
        detalle: 'La cita que intentas reagendar no existe o fue eliminada'
      });
    }

    // Obtener paquete si existe (para validar duración)
    let duracionRequerida = citaExistente.duracion;
    if (citaExistente.paquete_id) {
      const { data: paquete } = await supabase
        .from('paquetes')
        .select('duracion')
        .eq('id', citaExistente.paquete_id)
        .maybeSingle();
      
      if (paquete?.duracion) {
        duracionRequerida = paquete.duracion;
      }
    }

    // ============================================================
    // VALIDACIÓN 2: Calcular duración del nuevo rango horario
    // ============================================================
    const [h1, m1] = horaInicioNormalizada.split(':').map(Number);
    const [h2, m2] = horaFinNormalizada.split(':').map(Number);
    const nuevaDuracionMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);

    if (nuevaDuracionMinutos <= 0) {
      return res.status(400).json({
        message: '❌ La hora de fin debe ser posterior a la hora de inicio',
        detalle: {
          hora_inicio: nueva_hora_inicio,
          hora_fin: nueva_hora_fin,
          problema: 'El rango horario no es válido'
        }
      });
    }

    // Validar duración mínima
    if (duracionRequerida && nuevaDuracionMinutos < duracionRequerida) {
      return res.status(400).json({
        message: `❌ Rango horario insuficiente`,
        detalle: `Esta cita requiere ${duracionRequerida} minutos, pero el rango seleccionado (${nueva_hora_inicio} - ${nueva_hora_fin}) solo tiene ${nuevaDuracionMinutos} minutos.`,
        sugerencia: `Por favor selecciona un rango horario de al menos ${duracionRequerida} minutos.`,
        duracion_requerida: duracionRequerida,
        duracion_seleccionada: nuevaDuracionMinutos
      });
    }

    // ============================================================
    // VALIDACIÓN 3: Verificar disponibilidad del nuevo horario
    // ============================================================
    const { data: conflictos, error: errorConflicto } = await supabase
      .from('citas')
      .select('id, rut_paciente')
      .eq('fecha', nueva_fecha)
      .eq('hora', horaInicioNormalizada)
      .neq('id', id)
      .neq('estado', 'cancelada');

    if (errorConflicto) {
      console.error('[ADMIN-CITAS] Error al verificar conflictos:', errorConflicto);
      return res.status(500).json({ 
        message: '❌ Error al verificar disponibilidad',
        detalle: 'No se pudo verificar si el horario está disponible. Por favor intenta de nuevo.'
      });
    }

    if (conflictos && conflictos.length > 0) {
      // Obtener info del paciente que ocupa el horario
      const { data: pacienteConflicto } = await supabase
        .from('patients')
        .select('full_name')
        .eq('rut', conflictos[0].rut_paciente)
        .maybeSingle();

      const nombrePaciente = pacienteConflicto?.full_name || 'otro paciente';

      return res.status(409).json({ 
        message: `❌ Horario ocupado`,
        detalle: `El horario ${nueva_fecha} a las ${nueva_hora_inicio} ya está reservado por ${nombrePaciente}.`,
        sugerencia: 'Por favor elige otro horario disponible.'
      });
    }

    // ============================================================
    // VALIDACIÓN 4: Verificar superposición con otras citas
    // ============================================================
    // Convertir horas a minutos para comparar rangos
    const nuevoInicio = h1 * 60 + m1;
    const nuevoFin = h2 * 60 + m2;

    // Buscar TODAS las citas del mismo día (excepto la actual)
    const { data: citasDelDia } = await supabase
      .from('citas')
      .select('id, hora, hora_fin')
      .eq('fecha', nueva_fecha)
      .neq('id', id)
      .neq('estado', 'cancelada');

    if (citasDelDia && citasDelDia.length > 0) {
      for (const otraCita of citasDelDia) {
        const [oh, om] = otraCita.hora.substring(0, 5).split(':').map(Number);
        const [ofh, ofm] = otraCita.hora_fin.substring(0, 5).split(':').map(Number);
        const otroInicio = oh * 60 + om;
        const otroFin = ofh * 60 + ofm;

        // Detectar superposición: si el nuevo rango se cruza con otro
        if (nuevoInicio < otroFin && nuevoFin > otroInicio) {
          // Obtener info del paciente en conflicto
          const { data: citaConflicto } = await supabase
            .from('citas')
            .select('rut_paciente')
            .eq('id', otraCita.id)
            .single();

          const { data: pacienteConflicto } = await supabase
            .from('patients')
            .select('full_name')
            .eq('rut', citaConflicto?.rut_paciente)
            .maybeSingle();

          const nombrePaciente = pacienteConflicto?.full_name || 'otro paciente';

          return res.status(409).json({
            message: `❌ Conflicto de horarios`,
            detalle: `El rango horario ${nueva_hora_inicio} - ${nueva_hora_fin} se superpone con una cita existente de ${nombrePaciente}.`,
            sugerencia: `La cita existente es de ${otraCita.hora.substring(0, 5)} a ${otraCita.hora_fin.substring(0, 5)}. Por favor elige un horario sin conflictos.`,
            hora_inicio_conflicto: otraCita.hora.substring(0, 5),
            hora_fin_conflicto: otraCita.hora_fin.substring(0, 5)
          });
        }
      }
    }

    // ============================================================
    // PASO 4: Actualizar la cita (todas las validaciones pasaron)
    // ============================================================
    console.log('[ADMIN-CITAS] Actualizando cita con valores normalizados:', {
      fecha: nueva_fecha,
      hora: horaInicioNormalizada,
      hora_fin: horaFinNormalizada,
      duracion: nuevaDuracionMinutos
    });

    const { data: citaActualizada, error: errorActualizar } = await supabase
      .from('citas')
      .update({
        fecha: nueva_fecha,
        hora: horaInicioNormalizada,
        hora_fin: horaFinNormalizada,
        duracion: nuevaDuracionMinutos
      })
      .eq('id', id)
      .select()
      .single();

    if (errorActualizar) {
      console.error('[ADMIN-CITAS] Error al reagendar:', errorActualizar);
      
      // Mensajes de error más específicos según el código de error
      let mensaje = 'Error al actualizar la cita';
      let detalles = errorActualizar.message;
      
      if (errorActualizar.code === '22007') {
        mensaje = '❌ Error en el formato de hora';
        detalles = 'Las horas proporcionadas tienen un formato inválido. Por favor verifica los datos.';
      } else if (errorActualizar.code === '23505') {
        mensaje = '❌ Ya existe una cita en este horario';
        detalles = 'Otra cita ya ocupa este horario específico.';
      }
      
      return res.status(500).json({ 
        message: mensaje,
        detalle: detalles,
        error_tecnico: errorActualizar.message
      });
    }

    console.log('[ADMIN-CITAS] Cita reagendada exitosamente:', citaActualizada.id);

    // ========================================
    // ENVIAR NOTIFICACIONES POR EMAIL
    // ========================================
    try {
      // Obtener datos del paquete si existe
      let paquete = null;
      if (citaActualizada.paquete_id) {
        const { data: paqueteData } = await supabase
          .from('paquetes')
          .select('*')
          .eq('id', citaActualizada.paquete_id)
          .maybeSingle();
        paquete = paqueteData;
      }

      // Si no hay paquete, crear uno temporal con datos de la cita
      if (!paquete) {
        paquete = {
          nombre: 'Sesión de Psicoterapia',
          precio_nacional: 0
        };
      }

      await NotificationHelper.notifyReschedule(
        citaExistente, // Cita anterior
        citaActualizada, // Cita nueva
        paquete
      );
      
      console.log('✅ Notificaciones de reagendamiento enviadas');
    } catch (emailError) {
      console.error('⚠️ Error al enviar notificaciones (no crítico):', emailError.message);
    }

    res.json({
      message: `✅ Cita reagendada exitosamente`,
      detalle: `Nueva fecha: ${nueva_fecha} a las ${nueva_hora_inicio}`,
      cita: citaActualizada
    });

  } catch (error) {
    console.error('[ADMIN-CITAS] Error inesperado al reagendar:', error);
    
    // Mensaje de error más amigable para el usuario
    let mensajeUsuario = '❌ Error al reagendar la cita';
    let detalleError = 'Ocurrió un error inesperado. Por favor intenta de nuevo.';
    
    if (error.message) {
      if (error.message.includes('timeout')) {
        detalleError = 'La operación tardó demasiado tiempo. Por favor verifica tu conexión e intenta de nuevo.';
      } else if (error.message.includes('network')) {
        detalleError = 'Error de conexión con el servidor. Verifica tu conexión a internet.';
      }
    }
    
    res.status(500).json({ 
      message: mensajeUsuario, 
      detalle: detalleError,
      error_tecnico: error.message 
    });
  }
});

/**
 * DELETE /api/admin/citas/:id
 * Cancelar/eliminar una cita
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    console.log('[ADMIN-CITAS] Cancelando cita:', id, 'Motivo:', motivo);

    // Verificar que la cita existe
    const { data: cita, error: errorVerificar } = await supabase
      .from('citas')
      .select('*')
      .eq('id', id)
      .single();

    if (errorVerificar || !cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Eliminar la cita
    const { error: errorEliminar } = await supabase
      .from('citas')
      .delete()
      .eq('id', id);

    if (errorEliminar) {
      console.error('[ADMIN-CITAS] Error al eliminar:', errorEliminar);
      return res.status(500).json({ error: 'Error al eliminar la cita' });
    }

    console.log('[ADMIN-CITAS] Cita eliminada:', id);

    // Enviar notificaciones de cancelación
    try {
      let paquete = null;
      if (cita.paquete_id) {
        const { data: paqueteData } = await supabase
          .from('paquetes')
          .select('*')
          .eq('id', cita.paquete_id)
          .maybeSingle();
        paquete = paqueteData;
      }
      
      if (!paquete) {
        paquete = { nombre: 'Sesión de Psicoterapia', precio_nacional: 0 };
      }

      await NotificationHelper.notifyCancellation(cita, paquete, motivo);
      console.log('✅ Notificaciones de cancelación enviadas');
    } catch (emailError) {
      console.error('⚠️ Error al enviar notificaciones (no crítico):', emailError.message);
    }

    res.json({
      message: 'Cita cancelada correctamente',
      motivo: motivo || 'Sin motivo especificado'
    });

  } catch (error) {
    console.error('[ADMIN-CITAS] Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PATCH /api/admin/citas/:id/estado
 * Actualizar estado de una cita
 */
router.patch('/:id/estado', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    console.log('[ADMIN-CITAS] Actualizando estado:', id, 'Nuevo estado:', estado);

    if (!estado) {
      return res.status(400).json({ error: 'El campo estado es requerido' });
    }

    const estadosValidos = ['confirmada', 'pendiente', 'cancelada', 'completada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ 
        error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}` 
      });
    }

    const { data: cita, error } = await supabase
      .from('citas')
      .update({ estado })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN-CITAS] Error al actualizar estado:', error);
      return res.status(500).json({ error: 'Error al actualizar el estado' });
    }

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    console.log('[ADMIN-CITAS] Estado actualizado:', cita);

    res.json({
      message: 'Estado actualizado correctamente',
      cita
    });

  } catch (error) {
    console.error('[ADMIN-CITAS] Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PATCH /api/admin/citas/:id/notas
 * Actualizar notas de una cita
 */
router.patch('/:id/notas', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notas } = req.body;

    console.log('[ADMIN-CITAS] Actualizando notas:', id);

    const { data: cita, error } = await supabase
      .from('citas')
      .update({ notas: notas || null })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN-CITAS] Error al actualizar notas:', error);
      return res.status(500).json({ error: 'Error al actualizar las notas' });
    }

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    console.log('[ADMIN-CITAS] Notas actualizadas');

    res.json({
      message: 'Notas actualizadas correctamente',
      cita
    });

  } catch (error) {
    console.error('[ADMIN-CITAS] Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/admin/pacientes/buscar/:rut
 * Buscar paciente por RUT
 */
router.get('/pacientes/buscar/:rut', verifyToken, async (req, res) => {
  try {
    const { rut } = req.params;

    console.log('[ADMIN-CITAS] Buscando paciente:', rut);

    const { data: paciente, error } = await supabase
      .from('patients')
      .select('*')
      .eq('rut', rut)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no encontrado
      console.error('[ADMIN-CITAS] Error al buscar paciente:', error);
      return res.status(500).json({ error: 'Error al buscar el paciente' });
    }

    if (!paciente) {
      return res.status(404).json({ 
        error: 'Paciente no encontrado',
        code: 'NOT_FOUND'
      });
    }

    console.log('[ADMIN-CITAS] Paciente encontrado:', paciente);
    res.json(paciente);

  } catch (error) {
    console.error('[ADMIN-CITAS] Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
