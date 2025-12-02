// test-without-email.js
// Script para verificar que el sistema funciona sin configuración de email
console.log('🧪 Testing sistema sin configuración de email...\n');

// Simular que no hay variables de entorno de email
delete process.env.GMAIL_USER;
delete process.env.GMAIL_APP_PASSWORD;

const emailService = require('./services/email.service');
const NotificationHelper = require('./helpers/notification.helper');

console.log('📧 Estado del servicio de email:');
console.log(`   Configurado: ${emailService.isConfigured ? '✅' : '❌'}`);

if (!emailService.isConfigured) {
  console.log('   ⚠️  Email no configurado (esperado en este test)\n');
}

// Simular envío de notificaciones
console.log('🧪 Test 1: Intentar enviar notificación sin email configurado...');

const mockCita = {
  email_paciente: 'test@example.com',
  nombre_paciente: 'Juan Pérez',
  telefono_paciente: '+56 9 1234 5678',
  fecha: '2025-12-15',
  hora: '14:00:00'
};

const mockPaquete = {
  nombre: 'Sesión de Psicoterapia Individual',
  precio_nacional: 25000
};

NotificationHelper.notifyAppointmentConfirmation(
  mockCita,
  mockPaquete,
  'PAYMENT_123'
).then(result => {
  console.log('\n📊 Resultado:');
  console.log(`   Success: ${result.success}`);
  console.log(`   Message: ${result.message || result.error}`);
  
  console.log('\n✅ TEST COMPLETADO');
  console.log('   La app puede funcionar sin email configurado.');
  console.log('   Las operaciones continúan normalmente.');
  console.log('   Solo se registran warnings en lugar de errores.\n');
}).catch(error => {
  console.error('\n❌ ERROR INESPERADO:', error);
  console.log('   El sistema NO debería fallar sin email configurado.\n');
  process.exit(1);
});
