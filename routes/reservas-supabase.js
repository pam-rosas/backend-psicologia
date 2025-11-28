const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

/**
 * @route   POST /api/reservas/con-paquete
 * @desc    Crear reserva con paquete (múltiples sesiones)
 * @access  Public
 */
router.post('/con-paquete', async (req, res) => {
  try {
    const {
      paqueteId,
      sesiones, // Array de { fecha, horaInicio, horaFin }
      rutPaciente,
      nombrePaciente,
      emailPaciente,
      telefonoPaciente,
      notas,
      direccion,
      comuna,
      modalidad,
      metodoPago,
      monto
    } = req.body;

    console.log('[RESERVA] Datos recibidos:', {
      paqueteId,
      sesiones: sesiones?.length,
      paciente: nombrePaciente
    });

    // Validar campos requeridos
    if (!paqueteId || !sesiones || sesiones.length === 0 ||
        !rutPaciente || !nombrePaciente || !emailPaciente || !telefonoPaciente) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    // Obtener información del paquete
    const { data: paquete, error: paqueteError } = await supabase
      .from('paquetes')
      .select('*')
      .eq('id', paqueteId)
      .single();

    if (paqueteError || !paquete) {
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }

    // Validar que el número de sesiones coincida
    if (sesiones.length !== paquete.sesiones) {
      return res.status(400).json({
        success: false,
        message: `El paquete requiere ${paquete.sesiones} sesiones, pero se recibieron ${sesiones.length}`
      });
    }

    // ============================================================
    // PASO 1: Crear o actualizar paciente en tabla patients
    // ============================================================
    console.log('[RESERVA] Verificando/creando paciente:', rutPaciente);
    
    // Buscar si el paciente ya existe
    const { data: pacienteExistente } = await supabase
      .from('patients')
      .select('*')
      .eq('rut', rutPaciente)
      .maybeSingle();

    if (!pacienteExistente) {
      // Crear nuevo paciente
      const { data: nuevoPaciente, error: pacienteError } = await supabase
        .from('patients')
        .insert({
          rut: rutPaciente,
          full_name: nombrePaciente,
          email: emailPaciente,
          phone: telefonoPaciente,
          address: direccion || null,
          city: comuna || null,
          region: null,
          birth_date: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          medical_notes: notas || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (pacienteError) {
        console.error('[RESERVA] Error al crear paciente:', pacienteError);
        return res.status(500).json({
          success: false,
          message: 'Error al registrar el paciente',
          error: pacienteError.message
        });
      }
      
      console.log('[RESERVA] Paciente creado:', nuevoPaciente.rut);
    } else {
      console.log('[RESERVA] Paciente existente encontrado:', pacienteExistente.rut);
      
      // Opcionalmente actualizar datos si cambiaron
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          full_name: nombrePaciente,
          email: emailPaciente,
          phone: telefonoPaciente,
          address: direccion || pacienteExistente.address,
          city: comuna || pacienteExistente.city,
          medical_notes: notas || pacienteExistente.medical_notes
        })
        .eq('rut', rutPaciente);

      if (updateError) {
        console.warn('[RESERVA] No se pudieron actualizar datos del paciente:', updateError);
        // No bloqueamos la reserva por esto
      } else {
        console.log('[RESERVA] Datos del paciente actualizados');
      }
    }

    // ============================================================
    // PASO 2: Verificar disponibilidad de todas las sesiones
    // ============================================================
    for (const sesion of sesiones) {
      const { data: citasExistentes } = await supabase
        .from('citas')
        .select('id')
        .eq('fecha', sesion.fecha)
        .eq('hora', sesion.horaInicio)
        .neq('estado', 'cancelada');

      if (citasExistentes && citasExistentes.length > 0) {
        return res.status(409).json({
          success: false,
          message: `El horario ${sesion.fecha} a las ${sesion.horaInicio} ya no está disponible`
        });
      }

      // Verificar bloques manuales
      const { data: bloques } = await supabase
        .from('bloques_manuales')
        .select('*')
        .eq('fecha', sesion.fecha);

      if (bloques && bloques.length > 0) {
        // Convertir horas a minutos para comparar
        const [sH, sM] = sesion.horaInicio.split(':').map(Number);
        const [sFH, sFM] = sesion.horaFin.split(':').map(Number);
        const slotInicio = sH * 60 + sM;
        const slotFin = sFH * 60 + sFM;

        for (const bloque of bloques) {
          const [bH, bM] = bloque.hora_inicio.substring(0, 5).split(':').map(Number);
          const [bFH, bFM] = bloque.hora_fin.substring(0, 5).split(':').map(Number);
          const bloqueInicio = bH * 60 + bM;
          const bloqueFin = bFH * 60 + bFM;

          if (slotInicio < bloqueFin && slotFin > bloqueInicio) {
            return res.status(409).json({
              success: false,
              message: `El horario ${sesion.fecha} a las ${sesion.horaInicio} está bloqueado`
            });
          }
        }
      }
    }

    // ============================================================
    // PASO 3: Crear todas las citas
    // ============================================================
    const citasCreadas = [];
    
    for (const sesion of sesiones) {
      const citaData = {
        fecha: sesion.fecha,
        hora: sesion.horaInicio + ':00', // Agregar segundos
        hora_fin: sesion.horaFin + ':00',
        duracion: paquete.duracion,
        estado: 'confirmada',
        paquete_id: paqueteId,
        rut_paciente: rutPaciente, // ✅ FK a patients
        modalidad: modalidad || paquete.modalidad,
        metodo_pago: metodoPago || null,
        monto: monto || paquete.precio_nacional,
        notas: notas || null,
        created_at: new Date().toISOString()
      };

      const { data: cita, error: citaError } = await supabase
        .from('citas')
        .insert(citaData)
        .select()
        .single();

      if (citaError) {
        console.error('[RESERVA] Error al crear cita:', citaError);
        
        // Si falla una cita, cancelar las ya creadas
        if (citasCreadas.length > 0) {
          await supabase
            .from('citas')
            .update({ estado: 'cancelada' })
            .in('id', citasCreadas.map(c => c.id));
        }
        
        return res.status(500).json({
          success: false,
          message: 'Error al crear las citas',
          error: citaError.message
        });
      }

      citasCreadas.push(cita);
    }

    console.log(`[RESERVA] ${citasCreadas.length} citas creadas exitosamente`);

    // TODO: Enviar email de confirmación con todas las sesiones

    res.json({
      success: true,
      message: `Reserva confirmada: ${citasCreadas.length} sesiones agendadas`,
      citas: citasCreadas.map(c => ({
        id: c.id,
        fecha: c.fecha,
        hora: c.hora.substring(0, 5),
        duracion: c.duracion
      })),
      paquete: {
        nombre: paquete.nombre,
        sesiones: paquete.sesiones,
        precio: paquete.precio_nacional
      }
    });

  } catch (error) {
    console.error('[RESERVA] Error general:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la reserva',
      error: error.message
    });
  }
});

module.exports = router;
