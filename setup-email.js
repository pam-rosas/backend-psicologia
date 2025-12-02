// setup-email.js
// Script interactivo para configurar las variables de email
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEmail() {
  console.log('\n' + '='.repeat(60));
  console.log('📧 CONFIGURACIÓN DE EMAIL - EMH Psicoterapia Online');
  console.log('='.repeat(60) + '\n');

  console.log('Este asistente te ayudará a configurar las notificaciones por email.\n');

  // Leer .env existente si existe
  const envPath = path.join(__dirname, '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
    console.log('✅ Archivo .env encontrado\n');
  } else {
    console.log('⚠️  No se encontró archivo .env, se creará uno nuevo\n');
    // Copiar desde .env.example
    const examplePath = path.join(__dirname, '.env.example');
    if (fs.existsSync(examplePath)) {
      envContent = fs.readFileSync(examplePath, 'utf-8');
    }
  }

  console.log('📝 Necesitarás los siguientes datos:\n');
  console.log('1. Tu email de Gmail (ej: miempresa@gmail.com)');
  console.log('2. Una contraseña de aplicación de Gmail (16 dígitos)');
  console.log('3. El email del administrador\n');

  console.log('💡 Para obtener la contraseña de aplicación:');
  console.log('   1. Ve a https://myaccount.google.com/security');
  console.log('   2. Activa la verificación en 2 pasos');
  console.log('   3. Ve a "Contraseñas de aplicaciones"');
  console.log('   4. Genera una nueva para "Correo"');
  console.log('   5. Copia los 16 dígitos (sin espacios)\n');

  const continuar = await question('¿Listo para continuar? (s/n): ');
  
  if (continuar.toLowerCase() !== 's') {
    console.log('\n❌ Configuración cancelada');
    rl.close();
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('Ingresa los siguientes datos:\n');

  // Solicitar datos
  const gmailUser = await question('1. Email de Gmail: ');
  const gmailPassword = await question('2. Contraseña de aplicación (16 dígitos): ');
  const adminEmail = await question('3. Email del administrador: ');

  // Validaciones básicas
  if (!gmailUser.includes('@gmail.com')) {
    console.log('\n⚠️  Advertencia: El email no parece ser de Gmail');
  }

  if (!gmailPassword || gmailPassword.replace(/\s/g, '').length !== 16) {
    console.log('\n⚠️  Advertencia: La contraseña de aplicación debe tener 16 caracteres');
  }

  if (!adminEmail.includes('@')) {
    console.log('\n⚠️  Advertencia: El email del admin no parece válido');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Resumen de configuración:\n');
  console.log(`Gmail User: ${gmailUser}`);
  console.log(`Gmail App Password: ${'*'.repeat(16)}`);
  console.log(`Admin Email: ${adminEmail}`);
  console.log('='.repeat(60) + '\n');

  const confirmar = await question('¿Guardar esta configuración? (s/n): ');
  
  if (confirmar.toLowerCase() !== 's') {
    console.log('\n❌ Configuración cancelada');
    rl.close();
    return;
  }

  // Actualizar o agregar variables en .env
  const gmailPasswordClean = gmailPassword.replace(/\s/g, '');
  
  // Función para actualizar o agregar variable
  const updateEnvVar = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    } else {
      // Buscar la sección de EMAIL
      const emailSectionRegex = /# EMAIL CONFIGURATION/i;
      if (emailSectionRegex.test(content)) {
        // Agregar después de la sección de email
        return content.replace(
          emailSectionRegex,
          `# EMAIL CONFIGURATION\n${key}=${value}`
        );
      } else {
        // Agregar al final
        return content + `\n${key}=${value}`;
      }
    }
  };

  envContent = updateEnvVar(envContent, 'GMAIL_USER', gmailUser);
  envContent = updateEnvVar(envContent, 'GMAIL_APP_PASSWORD', gmailPasswordClean);
  envContent = updateEnvVar(envContent, 'ADMIN_EMAIL', adminEmail);

  // Guardar archivo
  try {
    fs.writeFileSync(envPath, envContent, 'utf-8');
    console.log('\n✅ Configuración guardada en .env\n');

    // Sugerir siguiente paso
    console.log('='.repeat(60));
    console.log('🎉 ¡Configuración completada!\n');
    console.log('Próximos pasos:\n');
    console.log('1. Verifica la configuración:');
    console.log('   npm run check-env\n');
    console.log('2. Prueba el envío de emails:');
    console.log('   npm run test-email\n');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error guardando configuración:', error.message);
  }

  rl.close();
}

setupEmail().catch(error => {
  console.error('❌ Error en la configuración:', error);
  rl.close();
  process.exit(1);
});
