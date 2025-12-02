// test-email-retry.js
// Script para probar el sistema de reintentos y cola asíncrona

require('dotenv').config();
const emailService = require('./services/email.service');

async function testRetryLogic() {
  console.log('\n🧪 === TEST: RETRY LOGIC Y TIMEOUT ===\n');

  // Test 1: Email con timeout simulado (debería reintentar)
  console.log('📧 Test 1: Enviando email con retry...');
  const result1 = await emailService.sendEmailWithRetry({
    to: 'test@example.com',
    subject: 'Test Retry Logic',
    html: '<p>Testing retry mechanism</p>'
  });
  
  console.log('Resultado:', result1);
  console.log('');

  // Test 2: Múltiples emails en cola
  console.log('📧 Test 2: Añadiendo múltiples emails a la cola...');
  
  for (let i = 1; i <= 5; i++) {
    await emailService.queueEmail({
      to: `paciente${i}@example.com`,
      subject: `Email de prueba ${i}`,
      html: `<p>Este es el email número ${i}</p>`
    });
  }

  console.log('⏳ Esperando procesamiento de cola...');
  
  // Esperar a que la cola se procese
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos
  
  console.log('\n✅ Test completado');
}

async function testAsyncQueue() {
  console.log('\n🧪 === TEST: COLA ASÍNCRONA ===\n');

  const startTime = Date.now();
  
  // Añadir 10 emails a la cola
  console.log('📬 Añadiendo 10 emails a la cola...');
  for (let i = 1; i <= 10; i++) {
    emailService.queueEmail({
      to: `test${i}@example.com`,
      subject: `Email Asíncrono ${i}`,
      html: `<h1>Email ${i}</h1><p>Procesado de forma asíncrona</p>`
    });
  }
  
  const endTime = Date.now();
  console.log(`✅ 10 emails añadidos en ${endTime - startTime}ms (sin bloquear)`);
  console.log('⏳ Los emails se están enviando en segundo plano...');
  
  // Esperar procesamiento
  await new Promise(resolve => setTimeout(resolve, 60000)); // 60 segundos
}

async function testConfiguration() {
  console.log('\n🧪 === TEST: CONFIGURACIÓN ===\n');
  
  console.log('Estado del servicio:');
  console.log('- isConfigured:', emailService.isConfigured);
  console.log('- maxRetries:', emailService.maxRetries);
  console.log('- retryDelay:', emailService.retryDelay, 'ms');
  console.log('- timeout:', emailService.timeout, 'ms');
  console.log('- emailQueue length:', emailService.emailQueue.length);
  console.log('- isProcessingQueue:', emailService.isProcessingQueue);
  
  if (emailService.isConfigured) {
    console.log('\n✅ Verificando conexión...');
    const connected = await emailService.verifyConnection();
    console.log('Conexión:', connected ? '✅ OK' : '❌ Falló');
  } else {
    console.log('\n⚠️  Email service no configurado (esto es normal sin .env)');
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  TEST: RETRY, TIMEOUT Y COLA ASÍNCRONA    ║');
  console.log('╚════════════════════════════════════════════╝');
  
  try {
    // Test de configuración
    await testConfiguration();
    
    // Solo ejecutar tests de envío si está configurado
    if (emailService.isConfigured) {
      await testRetryLogic();
      await testAsyncQueue();
    } else {
      console.log('\n⚠️  Saltando tests de envío (sin configuración SMTP)');
      console.log('   Para probar con emails reales, configura .env:');
      console.log('   - GMAIL_USER=tu-email@gmail.com');
      console.log('   - GMAIL_APP_PASSWORD=tu-app-password');
    }
    
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║           ✅ TESTS COMPLETADOS             ║');
    console.log('╚════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Error en tests:', error);
    process.exit(1);
  }
}

// Ejecutar tests
runAllTests();
