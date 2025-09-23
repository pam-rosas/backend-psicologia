const express = require('express');
const router = express.Router();

// Verificar si el SDK está disponible
let WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes;

try {
  const transbankSdk = require('transbank-sdk');
  WebpayPlus = transbankSdk.WebpayPlus;
  Options = transbankSdk.Options;
  IntegrationApiKeys = transbankSdk.IntegrationApiKeys;
  Environment = transbankSdk.Environment;
  IntegrationCommerceCodes = transbankSdk.IntegrationCommerceCodes;
  
  console.log('SDK de Transbank cargado correctamente');
} catch (error) {
  console.error('Error al cargar SDK de Transbank:', error);
  console.log('Para instalar: npm install transbank-sdk');
}

// Configuración para desarrollo
let isConfigured = false;

if (WebpayPlus && IntegrationCommerceCodes && IntegrationApiKeys) {
  try {
    const commerceCode = IntegrationCommerceCodes.WEBPAY_PLUS;
    const apiKey = IntegrationApiKeys.WEBPAY;
    
    WebpayPlus.configureForIntegration(commerceCode, apiKey);
    isConfigured = true;
    console.log('Webpay configurado para integración');
  } catch (error) {
    console.error('Error al configurar Webpay:', error);
  }
}

// POST /api/webpay/create - Crear transacción
router.post('/create', async (req, res) => {
  try {
    console.log('=== CREAR TRANSACCIÓN WEBPAY ===');
    console.log('Headers:', req.headers);
    console.log('Body recibido:', req.body);
    
    if (!isConfigured || !WebpayPlus) {
      return res.status(500).json({ 
        error: 'SDK de Webpay no configurado correctamente',
        details: 'Instale transbank-sdk: npm install transbank-sdk'
      });
    }

    const { buyOrder, sessionId, amount, returnUrl } = req.body;

    // Validar parámetros
    if (!buyOrder || !sessionId || !amount || !returnUrl) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos',
        required: ['buyOrder', 'sessionId', 'amount', 'returnUrl'],
        received: { buyOrder, sessionId, amount, returnUrl }
      });
    }

    // Validar tipos
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'El monto debe ser un número mayor a 0',
        received: { amount, type: typeof amount }
      });
    }

    console.log('Parámetros validados correctamente');
    console.log('Creando transacción con:', {
      buyOrder,
      sessionId,
      amount,
      returnUrl
    });

    const createResponse = await WebpayPlus.Transaction.create(
      buyOrder,
      sessionId,
      amount,
      returnUrl
    );

    console.log('Respuesta exitosa de Webpay:', createResponse);

    res.status(200).json({
      token: createResponse.token,
      url: createResponse.url,
      success: true
    });

  } catch (error) {
    console.error('Error detallado al crear transacción:', error);
    
    let errorResponse = {
      error: 'Error interno al crear transacción',
      details: error.message,
      timestamp: new Date().toISOString()
    };

    // Agregar más detalles según el tipo de error
    if (error.code) {
      errorResponse.code = error.code;
    }
    
    if (error.response) {
      errorResponse.webpayResponse = error.response;
    }

    res.status(500).json(errorResponse);
  }
});

// POST /api/webpay/commit - Confirmar transacción
router.post('/commit', async (req, res) => {
  try {
    console.log('=== CONFIRMAR TRANSACCIÓN WEBPAY ===');
    console.log('Body recibido:', req.body);
    
    if (!isConfigured || !WebpayPlus) {
      return res.status(500).json({ 
        error: 'SDK de Webpay no configurado correctamente'
      });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: 'Token requerido',
        received: req.body
      });
    }

    console.log('Confirmando transacción con token:', token);

    const commitResponse = await WebpayPlus.Transaction.commit(token);

    console.log('Respuesta de confirmación exitosa:', commitResponse);

    // Aquí puedes actualizar el estado de la cita en la base de datos
    if (commitResponse.responseCode === 0) {
      console.log('✅ Pago aprobado para orden:', commitResponse.buyOrder);
      // TODO: Actualizar estado de la cita en Firestore
    } else {
      console.log('❌ Pago rechazado para orden:', commitResponse.buyOrder, 'Código:', commitResponse.responseCode);
      // TODO: Actualizar estado de la cita como pago fallido
    }

    res.status(200).json({
      ...commitResponse,
      success: true
    });

  } catch (error) {
    console.error('Error detallado al confirmar transacción:', error);
    
    res.status(500).json({ 
      error: 'Error interno al confirmar transacción',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/webpay/status/:token - Obtener estado de transacción
router.get('/status/:token', async (req, res) => {
  try {
    console.log('=== OBTENER ESTADO WEBPAY ===');
    
    if (!isConfigured || !WebpayPlus) {
      return res.status(500).json({ 
        error: 'SDK de Webpay no configurado correctamente'
      });
    }

    const { token } = req.params;
    console.log('Consultando estado para token:', token);

    const statusResponse = await WebpayPlus.Transaction.status(token);

    console.log('Estado obtenido:', statusResponse);
    res.status(200).json(statusResponse);

  } catch (error) {
    console.error('Error al obtener estado de transacción:', error);
    res.status(500).json({ 
      error: 'Error interno al obtener estado',
      details: error.message 
    });
  }
});

// GET /api/webpay/test - Endpoint de prueba
router.get('/test', (req, res) => {
  res.json({
    message: 'Webpay API funcionando',
    sdkLoaded: !!WebpayPlus,
    configured: isConfigured,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;