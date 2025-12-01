const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');

// ==========================================
// CONFIGURACIÓN DE TRANSBANK SDK
// ==========================================
let WebpayPlus, Options, IntegrationApiKeys, IntegrationCommerceCodes, Environment;

try {
  const transbank = require('transbank-sdk');
  
  // Importar las clases necesarias
  WebpayPlus = transbank.WebpayPlus;
  Options = transbank.Options;
  IntegrationApiKeys = transbank.IntegrationApiKeys;
  IntegrationCommerceCodes = transbank.IntegrationCommerceCodes;
  Environment = transbank.Environment;
  
  console.log('✅ SDK de Transbank cargado correctamente');
  console.log('   Versión del SDK detectada');
} catch (error) {
  console.error('❌ Error al cargar SDK de Transbank:', error);
  console.log('Para instalar: npm install transbank-sdk');
}

// Configuración del SDK
let tx;
let isConfigured = false;

// Credenciales de Webpay Plus - Integración (Testing)
const WEBPAY_COMMERCE_CODE = process.env.WEBPAY_COMMERCE_CODE || '597055555532';
const WEBPAY_API_KEY = process.env.WEBPAY_API_KEY || '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';
const WEBPAY_ENVIRONMENT = process.env.WEBPAY_ENVIRONMENT || 'integration'; // 'integration' o 'production'

if (WebpayPlus && Options && Environment) {
  try {
    // Seleccionar ambiente según configuración
    const environment = WEBPAY_ENVIRONMENT === 'production' 
      ? Environment.Production 
      : Environment.Integration;
    
    // Crear instancia de transacción
    tx = new WebpayPlus.Transaction(
      new Options(
        WEBPAY_COMMERCE_CODE,
        WEBPAY_API_KEY,
        environment
      )
    );
    
    isConfigured = true;
    console.log(`✅ Webpay configurado para ambiente de ${WEBPAY_ENVIRONMENT.toUpperCase()}`);
    console.log('   Commerce Code:', WEBPAY_COMMERCE_CODE);
    if (WEBPAY_ENVIRONMENT === 'production') {
      console.log('   ⚠️  USANDO AMBIENTE DE PRODUCCIÓN - Se procesarán pagos reales');
    } else {
      console.log('   🧪 USANDO AMBIENTE DE INTEGRACIÓN - Pagos de prueba');
    }
  } catch (error) {
    console.error('❌ Error al configurar Webpay:', error);
    console.error('   Detalles:', error.message);
  }
} else {
  console.warn('⚠️  SDK de Webpay no disponible');
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Genera un buy_order único para Transbank
 */
function generateBuyOrder() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

/**
 * Genera un session_id único
 */
function generateSessionId() {
  return `SES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==========================================
// ENDPOINTS
// ==========================================

/**
 * POST /api/webpay/init
 * Inicia una transacción de pago con Webpay
 * 
 * 1. Valida los datos de la reserva
 * 2. Guarda la reserva como "pendiente" en la BD
 * 3. Crea la transacción en Webpay
 * 4. Retorna token y URL para redirección
 */
router.post('/init', async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🚀 INICIANDO TRANSACCIÓN WEBPAY');
    console.log('========================================');
    
    if (!isConfigured || !tx) {
      console.error('❌ SDK de Webpay no configurado');
      return res.status(500).json({ 
        success: false,
        error: 'SDK de Webpay no configurado correctamente',
        details: 'Instale transbank-sdk: npm install transbank-sdk'
      });
    }

    const {
      paqueteId,
      sesiones,
      rutPaciente,
      nombrePaciente,
      emailPaciente,
      telefonoPaciente,
      notas,
      direccion,
      comuna,
      modalidad,
      monto
    } = req.body;

    console.log('📦 Datos recibidos:', {
      paqueteId,
      sesiones: sesiones?.length,
      paciente: nombrePaciente,
      monto
    });

    // ========================================
    // VALIDACIONES
    // ========================================
    if (!paqueteId || !sesiones || sesiones.length === 0 ||
        !rutPaciente || !nombrePaciente || !emailPaciente || 
        !telefonoPaciente || !modalidad || !monto) {
      console.error('❌ Faltan datos requeridos');
      return res.status(400).json({ 
        success: false,
        error: 'Faltan datos requeridos',
        required: ['paqueteId', 'sesiones', 'rutPaciente', 'nombrePaciente', 
                  'emailPaciente', 'telefonoPaciente', 'modalidad', 'monto']
      });
    }

    if (typeof monto !== 'number' || monto <= 0) {
      console.error('❌ Monto inválido:', monto);
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser un número mayor a 0',
        received: { monto, type: typeof monto }
      });
    }

    // Verificar que el paquete existe
    const { data: paquete, error: paqueteError } = await supabase
      .from('paquetes')
      .select('*')
      .eq('id', paqueteId)
      .single();

    if (paqueteError || !paquete) {
      console.error('❌ Paquete no encontrado:', paqueteId);
      return res.status(404).json({
        success: false,
        error: 'Paquete no encontrado'
      });
    }

    console.log('✅ Paquete encontrado:', paquete.nombre);

    // ========================================
    // CREAR RESERVA PENDIENTE
    // ========================================
    const buyOrder = generateBuyOrder();
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    console.log('💾 Creando reserva pendiente...');
    console.log('   Buy Order:', buyOrder);
    console.log('   Session ID:', sessionId);

    const { data: reservaPendiente, error: reservaError } = await supabase
      .from('reservas_pendientes')
      .insert({
        buy_order: buyOrder,
        paquete_id: paqueteId,
        rut_paciente: rutPaciente,
        nombre_paciente: nombrePaciente,
        email_paciente: emailPaciente,
        telefono_paciente: telefonoPaciente,
        notas: notas || null,
        direccion: direccion || null,
        comuna: comuna || null,
        sesiones: sesiones,
        modalidad: modalidad,
        monto: monto,
        estado: 'pendiente',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (reservaError) {
      console.error('❌ Error al crear reserva pendiente:', reservaError);
      return res.status(500).json({
        success: false,
        error: 'Error al crear reserva pendiente',
        details: reservaError.message
      });
    }

    console.log('✅ Reserva pendiente creada:', reservaPendiente.id);

    // ========================================
    // CREAR TRANSACCIÓN EN WEBPAY
    // ========================================
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/webpay-return`;
    
    console.log('🌐 Creando transacción en Transbank...');
    console.log('   Monto:', monto);
    console.log('   Return URL:', returnUrl);

    const createResponse = await tx.create(
      buyOrder,
      sessionId,
      monto,
      returnUrl
    );

    console.log('✅ Transacción creada en Transbank');
    console.log('   Token:', createResponse.token);
    console.log('   URL:', createResponse.url);

    // Actualizar reserva pendiente con el token de Webpay
    await supabase
      .from('reservas_pendientes')
      .update({ webpay_token: createResponse.token })
      .eq('id', reservaPendiente.id);

    console.log('✅ Token guardado en reserva pendiente');
    console.log('========================================\n');

    res.status(200).json({
      success: true,
      token: createResponse.token,
      url: createResponse.url,
      buyOrder: buyOrder,
      message: 'Transacción iniciada correctamente'
    });

  } catch (error) {
    console.error('\n❌ ERROR AL INICIAR TRANSACCIÓN:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Error interno al iniciar transacción',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/webpay/verify
 * Verifica y confirma una transacción de Webpay
 * 
 * 1. Confirma la transacción con Transbank
 * 2. Si el pago fue exitoso, crea las citas
 * 3. Actualiza el estado de la reserva pendiente
 * 4. Retorna resultado
 */
router.post('/verify', async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('✅ VERIFICANDO TRANSACCIÓN WEBPAY');
    console.log('========================================');
    
    if (!isConfigured || !tx) {
      console.error('❌ SDK de Webpay no configurado');
      return res.status(500).json({ 
        success: false,
        error: 'SDK de Webpay no configurado correctamente'
      });
    }

    const { token } = req.body;

    if (!token) {
      console.error('❌ Token no proporcionado');
      return res.status(400).json({ 
        success: false,
        error: 'Token requerido'
      });
    }

    console.log('🔍 Token recibido:', token);

    // ========================================
    // VERIFICAR SI YA FUE PROCESADO (Race Condition Protection)
    // ========================================
    const { data: reservaExistente } = await supabase
      .from('reservas_pendientes')
      .select('*')
      .eq('webpay_token', token)
      .single();

    if (reservaExistente && reservaExistente.estado === 'pagada') {
      console.log('⚠️ Transacción ya fue procesada exitosamente');
      
      // Obtener citas ya creadas
      const { data: citas } = await supabase
        .from('citas')
        .select('*')
        .in('id', reservaExistente.citas_ids || []);

      const { data: paquete } = await supabase
        .from('paquetes')
        .select('*')
        .eq('id', reservaExistente.paquete_id)
        .single();

      return res.status(200).json({
        success: true,
        approved: true,
        message: 'Pago ya procesado anteriormente',
        alreadyProcessed: true,
        citas: citas?.map(c => ({
          id: c.id,
          fecha: c.fecha,
          hora: c.hora.substring(0, 5),
          duracion: c.duracion
        })) || [],
        paquete: paquete ? {
          nombre: paquete.nombre,
          sesiones: paquete.sesiones,
          precio: paquete.precio_nacional
        } : null
      });
    }

    if (reservaExistente && reservaExistente.estado === 'fallida') {
      console.log('⚠️ Transacción ya fue marcada como fallida');
      return res.status(200).json({
        success: true,
        approved: false,
        message: 'Pago fue rechazado anteriormente',
        alreadyProcessed: true
      });
    }

    console.log('🔍 Token recibido:', token);

    // ========================================
    // CONFIRMAR TRANSACCIÓN EN TRANSBANK (con retry)
    // ========================================
    console.log('🌐 Confirmando transacción en Transbank...');

    let commitResponse;
    let retries = 3;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`   Intento ${attempt}/${retries}...`);
        
        // Timeout de 30 segundos
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Transbank no respondió en 30s')), 30000)
        );
        
        const commitPromise = tx.commit(token);
        
        commitResponse = await Promise.race([commitPromise, timeoutPromise]);
        
        console.log('   ✅ Respuesta recibida de Transbank');
        break; // Éxito, salir del loop
        
      } catch (error) {
        lastError = error;
        console.error(`   ❌ Intento ${attempt} falló:`, error.message);
        
        if (attempt < retries) {
          const waitTime = attempt * 2000; // 2s, 4s, 6s
          console.log(`   ⏳ Esperando ${waitTime}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    if (!commitResponse) {
      console.error('❌ Todos los intentos fallaron');
      throw lastError || new Error('No se pudo confirmar transacción con Transbank');
    }

    // Log completo de la respuesta para debugging
    console.log('📄 Respuesta COMPLETA de Transbank:');
    console.log(JSON.stringify(commitResponse, null, 2));

    // Extraer datos de la respuesta (puede variar según versión del SDK)
    // IMPORTANTE: response_code es el indicador de aprobación (0 = aprobado)
    const responseCode = commitResponse.response_code ?? commitResponse.responseCode;
    const buyOrder = commitResponse.buy_order || commitResponse.buyOrder;
    const amount = commitResponse.amount;
    const authCode = commitResponse.authorization_code || commitResponse.authorizationCode;
    const transactionDate = commitResponse.transaction_date || commitResponse.transactionDate;
    const status = commitResponse.status; // "AUTHORIZED", "REJECTED", etc.

    console.log('📊 Datos extraídos:');
    console.log('   Response Code (numérico):', responseCode, typeof responseCode);
    console.log('   Status (texto):', status);
    console.log('   Buy Order:', buyOrder);
    console.log('   Amount:', amount);
    console.log('   Authorization Code:', authCode);

    // ========================================
    // BUSCAR RESERVA PENDIENTE
    // ========================================
    
    let reservaPendiente;
    
    if (!buyOrder) {
      console.error('❌ Buy Order no encontrado en respuesta de Transbank');
      console.error('   Respuesta completa:', commitResponse);
      
      // Intentar buscar por token como fallback
      console.log('⚠️ Intentando buscar reserva por token...');
      const { data: reservaPorToken, error: errorToken } = await supabase
        .from('reservas_pendientes')
        .select('*')
        .eq('webpay_token', token)
        .single();
      
      if (reservaPorToken && !errorToken) {
        console.log('✅ Reserva encontrada por token:', reservaPorToken.id);
        reservaPendiente = reservaPorToken;
      } else {
        return res.status(500).json({
          success: false,
          error: 'No se pudo obtener el buy_order de Transbank',
          details: 'La respuesta de Transbank no contiene buy_order y no se encontró reserva por token'
        });
      }
    } else {
      // Buscar por buy_order
      const { data, error: reservaError } = await supabase
        .from('reservas_pendientes')
        .select('*')
        .eq('buy_order', buyOrder)
        .single();

      if (reservaError || !data) {
        console.error('❌ Reserva pendiente no encontrada por buy_order:', buyOrder);
        console.error('   Error de Supabase:', reservaError);
        
        // Intentar buscar por token como fallback
        const { data: reservaPorToken, error: errorToken } = await supabase
          .from('reservas_pendientes')
          .select('*')
          .eq('webpay_token', token)
          .single();
        
        if (!errorToken && reservaPorToken) {
          console.log('✅ Reserva encontrada por token (fallback):', reservaPorToken.id);
          reservaPendiente = reservaPorToken;
        } else {
          return res.status(404).json({
            success: false,
            error: 'Reserva no encontrada',
            details: `No se encontró reserva con buy_order: ${buyOrder} ni con token: ${token}`
          });
        }
      } else {
        reservaPendiente = data;
      }
    }

    if (!reservaPendiente) {
      console.error('❌ No se pudo obtener reserva pendiente');
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }

    console.log('✅ Reserva pendiente encontrada:', reservaPendiente.id);

    // ========================================
    // VERIFICAR ESTADO DEL PAGO
    // ========================================
    // response_code === 0 significa APROBADO
    // Cualquier otro valor es RECHAZADO
    const pagoAprobado = responseCode === 0;
    
    console.log('🔍 Verificando estado del pago:');
    console.log('   Response Code:', responseCode);
    console.log('   Pago Aprobado:', pagoAprobado);

    if (!pagoAprobado) {
      console.log('❌ Pago RECHAZADO');
      console.log('   Código de respuesta:', responseCode);
      console.log('   Status:', status);

      // Actualizar estado a fallida
      await supabase
        .from('reservas_pendientes')
        .update({ 
          estado: 'fallida',
          webpay_response: commitResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', reservaPendiente.id);

      return res.status(200).json({
        success: true,
        approved: false,
        message: 'Pago rechazado por Transbank',
        responseCode: responseCode,
        buyOrder: buyOrder,
        amount: amount
      });
    }

    console.log('✅ Pago APROBADO');

    // ========================================
    // OBTENER INFORMACIÓN DEL PAQUETE
    // ========================================
    const { data: paquete, error: paqueteError } = await supabase
      .from('paquetes')
      .select('*')
      .eq('id', reservaPendiente.paquete_id)
      .single();

    if (paqueteError || !paquete) {
      console.error('❌ Paquete no encontrado');
      return res.status(404).json({
        success: false,
        error: 'Paquete no encontrado'
      });
    }

    // ========================================
    // CREAR O ACTUALIZAR PACIENTE
    // ========================================
    console.log('👤 Verificando/creando paciente...');

    const { data: pacienteExistente } = await supabase
      .from('patients')
      .select('*')
      .eq('rut', reservaPendiente.rut_paciente)
      .maybeSingle();

    if (!pacienteExistente) {
      const { error: pacienteError } = await supabase
        .from('patients')
        .insert({
          rut: reservaPendiente.rut_paciente,
          full_name: reservaPendiente.nombre_paciente,
          email: reservaPendiente.email_paciente,
          phone: reservaPendiente.telefono_paciente,
          address: reservaPendiente.direccion,
          city: reservaPendiente.comuna,
          medical_notes: reservaPendiente.notas,
          created_at: new Date().toISOString()
        });

      if (pacienteError) {
        console.error('❌ Error al crear paciente:', pacienteError);
        // No bloqueamos, continuamos
      } else {
        console.log('✅ Paciente creado');
      }
    } else {
      console.log('✅ Paciente existente encontrado');
    }

    // ========================================
    // CREAR LAS CITAS
    // ========================================
    console.log('📅 Creando citas...');

    const citasCreadas = [];
    const citasErrores = [];
    const sesiones = reservaPendiente.sesiones;

    for (let i = 0; i < sesiones.length; i++) {
      const sesion = sesiones[i];
      
      try {
        const citaData = {
          fecha: sesion.fecha,
          hora: sesion.horaInicio + ':00',
          hora_fin: sesion.horaFin + ':00',
          duracion: paquete.duracion,
          estado: 'confirmada',
          paquete_id: reservaPendiente.paquete_id,
          rut_paciente: reservaPendiente.rut_paciente,
          modalidad: reservaPendiente.modalidad,
          metodo_pago: 'webpay',
          monto: reservaPendiente.monto,
          notas: reservaPendiente.notas,
          payment_status: 'paid',
          payment_reference: buyOrder, // Usar la variable extraída
          created_at: new Date().toISOString()
        };

        const { data: cita, error: citaError } = await supabase
          .from('citas')
          .insert(citaData)
          .select()
          .single();

        if (citaError) {
          console.error(`❌ Error al crear cita ${i + 1}:`, citaError);
          citasErrores.push({ sesion, error: citaError.message });
        } else {
          citasCreadas.push(cita);
          console.log(`   ✅ Cita ${i + 1} creada:`, sesion.fecha, sesion.horaInicio);
        }
      } catch (error) {
        console.error(`❌ Excepción al crear cita ${i + 1}:`, error);
        citasErrores.push({ sesion, error: error.message });
      }
    }

    console.log(`✅ ${citasCreadas.length}/${sesiones.length} citas creadas exitosamente`);
    
    if (citasErrores.length > 0) {
      console.warn(`⚠️ ${citasErrores.length} citas NO pudieron ser creadas:`, citasErrores);
    }

    // ========================================
    // ACTUALIZAR RESERVA PENDIENTE
    // ========================================
    const citasIds = citasCreadas.map(c => c.id);

    await supabase
      .from('reservas_pendientes')
      .update({ 
        estado: 'pagada',
        webpay_response: commitResponse,
        citas_ids: citasIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservaPendiente.id);

    console.log('✅ Reserva pendiente actualizada a PAGADA');
    console.log('========================================\n');

    // TODO: Enviar email de confirmación

    res.status(200).json({
      success: true,
      approved: true,
      message: `Pago exitoso. ${citasCreadas.length} citas confirmadas.`,
      
      // Datos de la transacción (usar variables extraídas)
      vci: commitResponse.vci,
      amount: amount,
      status: commitResponse.status,
      buyOrder: buyOrder,
      sessionId: commitResponse.session_id || commitResponse.sessionId,
      authorizationCode: authCode,
      transactionDate: transactionDate,
      
      // Datos de las citas
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
    console.error('\n❌ ERROR AL VERIFICAR TRANSACCIÓN:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Error interno al verificar transacción',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/webpay/status/:token
 * Obtiene el estado de una transacción sin confirmarla
 */
router.get('/status/:token', async (req, res) => {
  try {
    console.log('📊 Consultando estado de transacción');
    
    if (!isConfigured || !tx) {
      return res.status(500).json({ 
        error: 'SDK de Webpay no configurado correctamente'
      });
    }

    const { token } = req.params;
    console.log('   Token:', token);

    const statusResponse = await tx.status(token);

    console.log('✅ Estado obtenido');
    res.status(200).json(statusResponse);

  } catch (error) {
    console.error('❌ Error al obtener estado:', error);
    res.status(500).json({ 
      error: 'Error interno al obtener estado',
      details: error.message 
    });
  }
});

/**
 * GET /api/webpay/test
 * Endpoint de prueba para verificar configuración
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'Webpay API funcionando correctamente',
    sdkLoaded: !!tx,
    configured: isConfigured,
    environment: 'integration',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
