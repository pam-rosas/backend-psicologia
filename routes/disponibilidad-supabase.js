const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Genera slots de horarios con incrementos fijos
 * @param {string} horaInicio - Hora de inicio (HH:mm)
 * @param {string} horaFin - Hora de fin (HH:mm)
 * @param {number} duracionMinutos - Duración del paquete en minutos
 * @param {number} incrementoMinutos - Incremento entre slots (default: 60 minutos)
 */
function generarSlots(horaInicio, horaFin, duracionMinutos, incrementoMinutos = 60) {
  const slots = [];
  const [horaInicioH, horaInicioM] = horaInicio.split(':').map(Number);
  const [horaFinH, horaFinM] = horaFin.split(':').map(Number);
  
  let currentMinutes = horaInicioH * 60 + horaInicioM;
  const endMinutes = horaFinH * 60 + horaFinM;
  
  // Generar slots cada 'incrementoMinutos' mientras haya espacio para la duración completa
  while (currentMinutes + duracionMinutos <= endMinutes) {
    const startH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
    const startM = (currentMinutes % 60).toString().padStart(2, '0');
    
    const endMinutesSlot = currentMinutes + duracionMinutos;
    const endH = Math.floor(endMinutesSlot / 60).toString().padStart(2, '0');
    const endM = (endMinutesSlot % 60).toString().padStart(2, '0');
    
    slots.push({
      inicio: `${startH}:${startM}`,
      fin: `${endH}:${endM}`
    });
    
    // Avanzar solo el incremento (no la duración completa)
    currentMinutes += incrementoMinutos;
  }
  
  return slots;
}

/**
 * Verifica si un horario se solapa con citas existentes, reservas pendientes o bloques manuales
 * Ahora considera la duración completa del slot
 */
async function verificarSolapamiento(fecha, horaInicio, horaFin) {
  // Convertir horas a minutos para comparaciones
  const [slotInicioH, slotInicioM] = horaInicio.split(':').map(Number);
  const slotInicioMinutos = slotInicioH * 60 + slotInicioM;
  
  const [slotFinH, slotFinM] = horaFin.split(':').map(Number);
  const slotFinMinutos = slotFinH * 60 + slotFinM;

  // 1. Verificar citas existentes (confirmadas o completadas)
  const { data: citas, error: citasError } = await supabase
    .from('citas')
    .select('hora, duracion')
    .eq('fecha', fecha)
    .neq('estado', 'cancelada');

  if (citasError) throw citasError;
  
  for (const cita of citas) {
    const citaHora = cita.hora.substring(0, 5); // Obtener solo HH:mm
    const citaDuracion = cita.duracion || 60;
    
    // Calcular inicio y fin de la cita en minutos
    const [citaH, citaM] = citaHora.split(':').map(Number);
    const citaInicioMinutos = citaH * 60 + citaM;
    const citaFinMinutos = citaInicioMinutos + citaDuracion;
    
    // Verificar solapamiento: dos rangos se solapan si uno empieza antes de que termine el otro
    if (slotInicioMinutos < citaFinMinutos && slotFinMinutos > citaInicioMinutos) {
      return true; // Hay solapamiento
    }
  }

  // 2. Verificar reservas pendientes (PENDIENTE o PAGADA en proceso)
  // Solo consideramos reservas de los últimos 30 minutos (tiempo límite para pagar)
  const treintaMinutosAtras = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: reservasPendientes, error: reservasError } = await supabase
    .from('reservas_pendientes')
    .select('sesiones')
    .in('estado', ['PENDIENTE', 'PAGADA'])
    .gte('created_at', treintaMinutosAtras);

  if (reservasError) throw reservasError;
  
  // Verificar cada sesión de las reservas pendientes
  for (const reserva of reservasPendientes || []) {
    const sesiones = reserva.sesiones || [];
    
    for (const sesion of sesiones) {
      // Verificar que la sesión sea de la misma fecha
      if (sesion.fecha === fecha) {
        const reservaHoraInicio = sesion.horaInicio;
        const reservaHoraFin = sesion.horaFin;
        
        const [resInicioH, resInicioM] = reservaHoraInicio.split(':').map(Number);
        const resInicioMinutos = resInicioH * 60 + resInicioM;
        
        const [resFinH, resFinM] = reservaHoraFin.split(':').map(Number);
        const resFinMinutos = resFinH * 60 + resFinM;
        
        // Verificar solapamiento con reserva pendiente
        if (slotInicioMinutos < resFinMinutos && slotFinMinutos > resInicioMinutos) {
          return true; // Hay solapamiento con reserva pendiente
        }
      }
    }
  }

  // 3. Verificar bloques manuales
  const { data: bloques, error: bloquesError } = await supabase
    .from('bloques_manuales')
    .select('hora_inicio, hora_fin')
    .eq('fecha', fecha);

  if (bloquesError) throw bloquesError;
  
  for (const bloque of bloques || []) {
    const [bloqueInicioH, bloqueInicioM] = bloque.hora_inicio.split(':').map(Number);
    const bloqueInicioMinutos = bloqueInicioH * 60 + bloqueInicioM;
    
    const [bloqueFinH, bloqueFinM] = bloque.hora_fin.split(':').map(Number);
    const bloqueFinMinutos = bloqueFinH * 60 + bloqueFinM;
    
    // Verificar solapamiento con bloque
    if (slotInicioMinutos < bloqueFinMinutos && slotFinMinutos > bloqueInicioMinutos) {
      return true; // Hay solapamiento
    }
  }
  
  return false; // No hay solapamiento
}

/**
 * Obtiene día de la semana (0=Domingo, 6=Sábado)
 */
function getDiaSemana(fecha) {
  return new Date(fecha + 'T00:00:00').getDay();
}

// ============================================
// ENDPOINTS DE DISPONIBILIDAD
// ============================================

/**
 * GET /api/disponibilidad/dia/:fecha/:paqueteId
 * Obtener horarios disponibles para un día específico
 */
router.get('/disponibilidad/dia/:fecha/:paqueteId', async (req, res) => {
  try {
    const { fecha, paqueteId } = req.params;
    console.log(`[DISPONIBILIDAD][DIA] Params recibidos: fecha=${fecha}, paqueteId=${paqueteId}`);
    
    // 1. Obtener información del paquete
    const { data: paquete, error: paqueteError } = await supabase
      .from('paquetes')
      .select('duracion, modalidad')
      .eq('id', paqueteId)
      .eq('activo', true)
      .single();
    
    if (paqueteError) throw paqueteError;
    
    if (!paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }
    
    // 2. Obtener día de la semana
    const diaSemana = getDiaSemana(fecha);
    
    // 3. Verificar si hay excepción para este día
    const { data: excepciones, error: excepcionError } = await supabase
      .from('excepciones_horarios')
      .select('*')
      .eq('fecha', fecha);
    
    if (excepcionError) throw excepcionError;
    
    // Si hay una excepción que bloquea todo el día
    const excepcionBloqueada = excepciones?.find(e => e.bloqueado && !e.hora_inicio && !e.hora_fin);
    if (excepcionBloqueada) {
      return res.json({
        success: true,
        fecha,
        horarios: [],
        mensaje: excepcionBloqueada.motivo || 'Día no disponible'
      });
    }
    
    // 4. Obtener horarios configurados para este día de la semana
    const { data: horariosConfig, error: horariosError } = await supabase
      .from('horarios_disponibles')
      .select('*')
      .eq('dia_semana', diaSemana)
      .eq('activo', true);
    
    if (horariosError) throw horariosError;
    
    if (!horariosConfig || horariosConfig.length === 0) {
      return res.json({
        success: true,
        fecha,
        horarios: [],
        mensaje: 'No hay horarios disponibles para este día'
      });
    }
    
    // 5. Generar todos los slots posibles con incrementos de 60 minutos
    // Ejemplo: Si paquete dura 120 min y horario es 09:00-13:00
    // Genera: 09:00-11:00, 10:00-12:00, 11:00-13:00
    // El usuario puede elegir cualquier hora de inicio
    // El sistema bloquea automáticamente todo el rango (ej: 10:00-12:00)
    let todosLosSlots = [];
    for (const horario of horariosConfig) {
      const slots = generarSlots(
        horario.hora_inicio,
        horario.hora_fin,
        paquete.duracion,
        60 // Incremento de 60 minutos entre slots
      );
      
      todosLosSlots = todosLosSlots.concat(
        slots.map(slot => ({
          ...slot,
          modalidad: horario.modalidad,
          disponible: true
        }))
      );
    }
    
    // 6. Filtrar slots basado en excepciones de horarios específicos
    const excepcionesHorarios = excepciones?.filter(e => e.hora_inicio && e.hora_fin) || [];
    todosLosSlots = todosLosSlots.filter(slot => {
      // Verificar si este slot está en una excepción bloqueada
      for (const exc of excepcionesHorarios) {
        if (exc.bloqueado && slot.inicio >= exc.hora_inicio && slot.fin <= exc.hora_fin) {
          return false; // Slot bloqueado por excepción
        }
      }
      return true;
    });
    
    // 7. Filtrar horarios que ya pasaron (solo para el día de hoy)
    const ahora = new Date();
    const fechaConsulta = new Date(fecha + 'T00:00:00');
    const esHoy = fechaConsulta.toDateString() === ahora.toDateString();
    
    if (esHoy) {
      const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();
      
      todosLosSlots = todosLosSlots.filter(slot => {
        const [slotH, slotM] = slot.inicio.split(':').map(Number);
        const slotInicioMinutos = slotH * 60 + slotM;
        // Solo mostrar slots que inicien al menos 15 minutos en el futuro
        return slotInicioMinutos > horaActualMinutos + 15;
      });
    }
    
    // 8. Verificar solapamiento con citas existentes y reservas pendientes
    for (const slot of todosLosSlots) {
      const tieneSolapamiento = await verificarSolapamiento(fecha, slot.inicio, slot.fin);
      if (tieneSolapamiento) {
        slot.disponible = false;
      }
    }
    
    // 9. Filtrar solo slots disponibles
    const slotsDisponibles = todosLosSlots.filter(s => s.disponible);
    
    res.json({
      success: true,
      fecha,
      horarios: slotsDisponibles,
      paquete: {
        duracion: paquete.duracion,
        modalidad: paquete.modalidad
      }
    });
    console.log(`[DISPONIBILIDAD][DIA] Respuesta enviada para fecha=${fecha}, paqueteId=${paqueteId}:`, { cantidadHorarios: slotsDisponibles.length });
    
  } catch (error) {
    console.error('Error al obtener disponibilidad del día:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener disponibilidad',
      error: error.message
    });
  }
});

/**
 * GET /api/disponibilidad/mes/:year/:month/:paqueteId
 * Obtener resumen de disponibilidad de un mes
 */
router.get('/disponibilidad/mes/:year/:month/:paqueteId', async (req, res) => {
  try {
    const { year, month, paqueteId } = req.params;
    console.log(`[DISPONIBILIDAD][MES][OPT] Params recibidos: year=${year}, month=${month}, paqueteId=${paqueteId}`);
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Validar paquete
    const { data: paquete, error: paqueteError } = await supabase
      .from('paquetes')
      .select('duracion')
      .eq('id', paqueteId)
      .eq('activo', true)
      .single();
    if (paqueteError || !paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // 1. Traer todos los horarios activos de la semana
    const { data: todosHorarios, error: horariosError } = await supabase
      .from('horarios_disponibles')
      .select('*')
      .eq('activo', true);
    if (horariosError) throw horariosError;

    // 2. Traer todas las excepciones del mes
    const primerDia = new Date(yearNum, monthNum - 1, 1);
    const ultimoDia = new Date(yearNum, monthNum, 0);
    const fechasMes = [];
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(yearNum, monthNum - 1, d);
      fechasMes.push(fecha.toISOString().split('T')[0]);
    }
    const { data: todasExcepciones, error: excepcionesError } = await supabase
      .from('excepciones_horarios')
      .select('*')
      .in('fecha', fechasMes);
    if (excepcionesError) throw excepcionesError;

    // 3. Procesar en memoria
    const diasDelMes = fechasMes.map(fechaStr => {
      const fecha = new Date(fechaStr);
      const diaSemana = fecha.getDay();
      const horariosConfig = todosHorarios.filter(h => h.dia_semana === diaSemana);
      const excepciones = todasExcepciones.filter(e => e.fecha === fechaStr);
      const excepcionBloqueada = excepciones.find(e => e.bloqueado && !e.hora_inicio && !e.hora_fin);
      let tieneDisponibilidad = false;
      if (horariosConfig.length > 0 && !excepcionBloqueada) {
        tieneDisponibilidad = true;
      }
      return {
        fecha: fechaStr,
        diaSemana,
        tieneDisponibilidad
      };
    });

    res.json({
      success: true,
      year: yearNum,
      month: monthNum,
      dias: diasDelMes
    });
    console.log(`[DISPONIBILIDAD][MES][OPT] Respuesta enviada para year=${year}, month=${month}, paqueteId=${paqueteId}:`, { dias: diasDelMes.length });
  } catch (error) {
    console.error('Error al obtener disponibilidad del mes [OPT]:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener disponibilidad del mes',
      error: error.message
    });
  }
});

/**
 * GET /api/disponibilidad/siguiente/:paqueteId
 * Obtener el próximo horario disponible
 */
router.get('/disponibilidad/siguiente/:paqueteId', async (req, res) => {
  try {
    const { paqueteId } = req.params;
    console.log(`[DISPONIBILIDAD][SIGUIENTE] Params recibidos: paqueteId=${paqueteId}`);
    
    // Obtener paquete
    const { data: paquete, error: paqueteError } = await supabase
      .from('paquetes')
      .select('duracion')
      .eq('id', paqueteId)
      .eq('activo', true)
      .single();
    
    if (paqueteError || !paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }
    
    // Buscar en los próximos 30 días
    const hoy = new Date();
    let proximoHorario = null;
    
    for (let i = 0; i < 30 && !proximoHorario; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split('T')[0];
      const diaSemana = fecha.getDay();
      
      // Obtener horarios del día
      const { data: horariosConfig } = await supabase
        .from('horarios_disponibles')
        .select('*')
        .eq('dia_semana', diaSemana)
        .eq('activo', true);
      
      if (horariosConfig && horariosConfig.length > 0) {
        // Verificar excepciones
        const { data: excepciones } = await supabase
          .from('excepciones_horarios')
          .select('*')
          .eq('fecha', fechaStr);
        
        const excepcionBloqueada = excepciones?.find(e => e.bloqueado && !e.hora_inicio && !e.hora_fin);
        
        if (!excepcionBloqueada) {
          // Generar slots
          for (const horario of horariosConfig) {
            const slots = generarSlots(horario.hora_inicio, horario.hora_fin, paquete.duracion);
            
            for (const slot of slots) {
              const tieneSolapamiento = await verificarSolapamiento(fechaStr, slot.inicio, slot.fin);
              
              if (!tieneSolapamiento) {
                proximoHorario = {
                  fecha: fechaStr,
                  horario: slot
                };
                break;
              }
            }
            
            if (proximoHorario) break;
          }
        }
      }
    }
    
    if (proximoHorario) {
      res.json({
        success: true,
        proximoDisponible: proximoHorario
      });
      console.log(`[DISPONIBILIDAD][SIGUIENTE] Respuesta enviada:`, proximoHorario);
    } else {
      res.json({
        success: true,
        proximoDisponible: null,
        mensaje: 'No hay horarios disponibles en los próximos 30 días'
      });
      console.log(`[DISPONIBILIDAD][SIGUIENTE] No hay horarios disponibles en los próximos 30 días para paqueteId=${paqueteId}`);
    }
    
  } catch (error) {
    console.error('Error al obtener próximo horario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener próximo horario',
      error: error.message
    });
  }
});

module.exports = router;
