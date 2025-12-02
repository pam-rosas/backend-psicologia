// test-email.js
// Script para probar el servicio de email
require('dotenv').config();
const emailService = require('./services/email.service');

async function testEmailService() {
  console.log('🧪 INICIANDO PRUEBAS DEL SERVICIO DE EMAIL\n');
  console.log('=' . repeat(60));
  
  // Verificar configuración
  console.log('\n📋 Configuración:');
  console.log(`   Gmail User: ${process.env.GMAIL_USER || '❌ NO CONFIGURADO'}`);
  console.log(`   Admin Email: ${process.env.ADMIN_EMAIL || '❌ NO CONFIGURADO'}`);
  console.log(`   Gmail App Password: ${process.env.GMAIL_APP_PASSWORD ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !process.env.ADMIN_EMAIL) {
    console.log('\n❌ ERROR: Faltan variables de entorno requeridas');
    console.log('\n📝 Asegúrate de configurar en tu .env:');
    console.log('   GMAIL_USER=tu-email@gmail.com');
    console.log('   GMAIL_APP_PASSWORD=tu-contraseña-de-app');
    console.log('   ADMIN_EMAIL=admin@emhpsicoterapiaonline.com');
    console.log('\n💡 Para obtener la contraseña de aplicación de Gmail:');
    console.log('   1. Ve a tu cuenta de Google > Seguridad');
    console.log('   2. Activa la verificación en 2 pasos');
    console.log('   3. Ve a "Contraseñas de aplicaciones"');
    console.log('   4. Genera una nueva contraseña para "Correo"');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));

  try {
    // Test 1: Verificar conexión
    console.log('\n📡 Test 1: Verificando conexión con Gmail...');
    const isConnected = await emailService.verifyConnection();
    
    if (!isConnected) {
      throw new Error('No se pudo conectar con el servidor de Gmail');
    }
    console.log('✅ Conexión exitosa con Gmail');

    // Test 2: Email de confirmación de cita (paciente)
    console.log('\n📧 Test 2: Enviando email de confirmación de cita...');
    const appointmentResult = await emailService.sendAppointmentConfirmation({
      patientEmail: process.env.GMAIL_USER, // Enviar a ti mismo para testing
      patientName: 'Juan Pérez',
      date: '15 de Diciembre, 2025',
      time: '14:00',
      treatmentName: 'Sesión de Psicoterapia Individual',
      price: 25000
    });
    console.log('✅ Email de confirmación enviado:', appointmentResult.messageId);

    // Test 3: Email de confirmación al admin
    console.log('\n📧 Test 3: Enviando email al admin...');
    const adminResult = await emailService.sendAppointmentConfirmationToAdmin({
      patientEmail: 'paciente@example.com',
      patientName: 'Juan Pérez',
      patientPhone: '+56 9 1234 5678',
      date: '15 de Diciembre, 2025',
      time: '14:00',
      treatmentName: 'Sesión de Psicoterapia Individual',
      price: 25000,
      paymentId: 'TBK-123456789'
    });
    console.log('✅ Email al admin enviado:', adminResult.messageId);

    // Test 4: Email de reagendamiento
    console.log('\n📧 Test 4: Enviando email de reagendamiento...');
    const rescheduleResult = await emailService.sendRescheduleConfirmation({
      patientEmail: process.env.GMAIL_USER,
      patientName: 'Juan Pérez',
      oldDate: '15 de Diciembre, 2025',
      oldTime: '14:00',
      newDate: '20 de Diciembre, 2025',
      newTime: '16:00',
      treatmentName: 'Sesión de Psicoterapia Individual'
    });
    console.log('✅ Email de reagendamiento enviado:', rescheduleResult.messageId);

    // Test 5: Email de cancelación
    console.log('\n📧 Test 5: Enviando email de cancelación...');
    const cancellationResult = await emailService.sendCancellationConfirmation({
      patientEmail: process.env.GMAIL_USER,
      patientName: 'Juan Pérez',
      date: '15 de Diciembre, 2025',
      time: '14:00',
      treatmentName: 'Sesión de Psicoterapia Individual',
      reason: 'Motivos personales'
    });
    console.log('✅ Email de cancelación enviado:', cancellationResult.messageId);

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('\n📬 Revisa tu bandeja de entrada en:', process.env.GMAIL_USER);
    console.log('   También revisa la carpeta de spam si no los ves.');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
    console.error('\n📋 Detalles del error:');
    console.error(error);
    console.log('\n💡 Posibles soluciones:');
    console.log('   1. Verifica que GMAIL_USER y GMAIL_APP_PASSWORD sean correctos');
    console.log('   2. Asegúrate de haber generado una contraseña de aplicación (no tu contraseña normal)');
    console.log('   3. Verifica que la verificación en 2 pasos esté activada en tu cuenta de Gmail');
    console.log('   4. Intenta generar una nueva contraseña de aplicación');
    console.log('\n' + '='.repeat(60));
    process.exit(1);
  }
}

// Ejecutar pruebas
testEmailService();
