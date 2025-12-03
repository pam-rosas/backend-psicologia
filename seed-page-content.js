#!/usr/bin/env node
/**
 * Script para poblar la tabla page_content con contenido inicial
 * Uso: node seed-page-content.js
 */

require('dotenv').config();
const { supabase } = require('./db/supabase');
const fs = require('fs');
const path = require('path');

async function seedPageContent() {
  console.log('\n🌱 ============ SEED PAGE CONTENT ============\n');

  try {
    // 1. Obtener contenido existente de inicio
    console.log('🔍 Verificando contenido existente de inicio...');
    const { data: existingInicio, error: getInicioError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_id', 'inicio')
      .maybeSingle();

    if (getInicioError && getInicioError.code !== 'PGRST116') {
      console.error('❌ Error al obtener contenido existente:', getInicioError);
      throw getInicioError;
    }

    // Datos para la página de inicio (combinando existente + nuevos)
    const inicioContent = {
      // Mantener valores existentes del cliente (PRIORIDAD)
      ...(existingInicio?.content || {}),
      
      // Agregar valores faltantes (solo si no existen)
      'hero-title': existingInicio?.content?.['hero-title'] || 'Psicoterapia e Hipnoterapia Clínica Online',
      'hero-subtitle': existingInicio?.content?.['hero-subtitle'] || 'Tu bienestar emocional es lo más importante',
      'hero-description': existingInicio?.content?.['hero-description'] || 'Agenda una cita con nuestro especialista y comienza tu camino hacia el equilibrio mental.',
      'hero-background': existingInicio?.content?.['hero-background'] || 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764707533904_wk0jusszf.jpeg',
      'hero-image': existingInicio?.content?.['hero-image'] || 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764700147878_lt0hx32nj.jpeg',
      'hero-video': existingInicio?.content?.['hero-video'] || 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764700183657_509d7h07m.jpeg',
      
      // Blog Section
      'blog-section-title': existingInicio?.content?.['blog-section-title'] || 'Últimas Publicaciones',
      'blog-section-subtitle': existingInicio?.content?.['blog-section-subtitle'] || 'Explora nuestros artículos más recientes sobre salud mental y bienestar',
      
      // Paquetes Section
      'paquetes-section-title': existingInicio?.content?.['paquetes-section-title'] || 'Nuestros Tratamientos',
      'paquetes-section-subtitle': existingInicio?.content?.['paquetes-section-subtitle'] || 'Elige el paquete que mejor se adapte a tus necesidades',
      
      // Convenios Section
      'convenios-title': existingInicio?.content?.['convenios-title'] || 'Convenios: Fonasa, reembolso de boleta en ISAPRES',
      'convenios-description': existingInicio?.content?.['convenios-description'] || 'Atención profesional con opciones de pago flexibles',
      
      // Tarot Section
      'tarot-title': existingInicio?.content?.['tarot-title'] || 'Tarot',
      'tarot-text': existingInicio?.content?.['tarot-text'] || 'Descubre tu camino con nuestras lecturas de tarot profesionales',
      'tarot-image': existingInicio?.content?.['tarot-image'] || 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764706588114_7ebv9b2k3.jpeg',
      
      // Contact Section
      'contact-video': existingInicio?.content?.['contact-video'] || 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764705232967_00va6yqf7.jpeg',
      'contact-email': existingInicio?.content?.['contact-email'] || 'mailto:eduardo@emhpsicoterapia.cl',
      
      // Footer
      'footer-description': existingInicio?.content?.['footer-description'] || 'Apoyo psicológico profesional para tu bienestar emocional y mental. SESIONES ONLINE NACIONAL E INTERNACIONAL',
      
      // Social Links
      'social-linkedin': existingInicio?.content?.['social-linkedin'] || 'https://www.linkedin.com/in/eduardo-márquez-huerta-7a840915/',
      
      // Contact Info (legacy)
      'contactInfo': existingInicio?.content?.['contactInfo'] || {
        title: 'Contacto',
        items: [
          '📧 Email: eduardo@emhpsicoterapia.cl',
          '📱 Teléfono: +56 9 9473 9587',
          '📍 Atención Online - Chile'
        ]
      },
      
      // Tarot Text (legacy)
      'tarotText': existingInicio?.content?.['tarotText'] || {
        content: 'Descubre tu camino con nuestras lecturas de tarot profesionales'
      },
      
      // Convenios Info (legacy)
      'conveniosInfo': existingInicio?.content?.['conveniosInfo'] || {
        title: 'Convenios',
        description: 'Atención profesional con opciones de pago flexibles'
      }
    };

    console.log('📦 Contenido de inicio preparado:', {
      existente: existingInicio ? 'Sí' : 'No',
      clavesExistentes: existingInicio?.content ? Object.keys(existingInicio.content).length : 0,
      clavesTotales: Object.keys(inicioContent).length
    });

    // 2. Obtener contenido existente de sobremi
    console.log('\n🔍 Verificando contenido existente de sobremi...');
    const { data: existingSobremi, error: getSobremiError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_id', 'sobremi')
      .maybeSingle();

    if (getSobremiError && getSobremiError.code !== 'PGRST116') {
      console.error('❌ Error al obtener contenido existente:', getSobremiError);
      throw getSobremiError;
    }

    // Datos para la página sobre mí (combinando existente + nuevos)
    const sobremiContent = {
      // Mantener valores existentes del cliente (PRIORIDAD)
      ...(existingSobremi?.content || {}),
      
      // Agregar valores faltantes (solo si no existen)
      'profile-image': existingSobremi?.content?.['profile-image'] || 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/sobremi/sobremi_1764708258112_ayn60ns7e.jpeg',
      'profile-name': existingSobremi?.content?.['profile-name'] || 'Eduardo Cristián Márquez Huerta',
      'profile-title': existingSobremi?.content?.['profile-title'] || 'Psicólogo e Hipnoterapeuta Clínico, Universidad Santo Tomás, Santiago de Chile, año 2002',
      'profile-subtitle': existingSobremi?.content?.['profile-subtitle'] || 'Atención niños (8 a 10 años), adolescentes y adultos',
      
      // About Section
      'about-title': existingSobremi?.content?.['about-title'] || 'Sobre mí',
      'about-description': existingSobremi?.content?.['about-description'] || '22 años de experiencia profesional en el área clínica, educacional y en relatorías avalan mi trabajo. Especialista en Hipnoterapia para trabajar estados depresivos, ansiosos, de angustia, duelos y crisis vitales.',
      
      // Cards
      'card-0-title': existingSobremi?.content?.['card-0-title'] || 'Confidencialidad',
      'card-0-description': existingSobremi?.content?.['card-0-description'] || 'Todo lo compartido en las sesiones se mantiene en total confidencialidad, garantizando un espacio seguro para tu desarrollo personal.',
      
      'card-1-title': existingSobremi?.content?.['card-1-title'] || 'Profesionalismo',
      'card-1-description': existingSobremi?.content?.['card-1-description'] || 'Cuento con la formación y experiencia necesarias para ofrecer un servicio de calidad, basado en el respeto y la ética profesional.',
      
      'card-2-title': existingSobremi?.content?.['card-2-title'] || 'Responsabilidad',
      'card-2-description': existingSobremi?.content?.['card-2-description'] || 'Me comprometo a ofrecerte la mejor atención, siguiendo los estándares más altos de profesionalismo y dedicación.',
      
      // Social Links
      'social-whatsapp': existingSobremi?.content?.['social-whatsapp'] || 'https://wa.me/56994739587?text=¡Hola!%20Me%20interesa%20tu%20servicio',
      'social-instagram': existingSobremi?.content?.['social-instagram'] || 'https://www.instagram.com/emhpsicoterapiaonline/',
      'social-facebook': existingSobremi?.content?.['social-facebook'] || 'https://www.facebook.com/tuapoyopsicologico2.0',
      'social-linkedin': existingSobremi?.content?.['social-linkedin'] || 'https://www.linkedin.com/in/eduardo-márquez-huerta-7a840915/',
      'social-tiktok': existingSobremi?.content?.['social-tiktok'] || 'https://www.tiktok.com/@emhpsicoterapiaonline'
    };

    console.log('📦 Contenido de sobremi preparado:', {
      existente: existingSobremi ? 'Sí' : 'No',
      clavesExistentes: existingSobremi?.content ? Object.keys(existingSobremi.content).length : 0,
      clavesTotales: Object.keys(sobremiContent).length
    });

    // 3. Insertar/actualizar contenido de inicio
    console.log('\n📝 Insertando/actualizando contenido de inicio...');
    const { data: inicioData, error: inicioError } = await supabase
      .from('page_content')
      .upsert({
        page_id: 'inicio',
        content: inicioContent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'page_id'
      })
      .select();

    if (inicioError) {
      console.error('❌ Error al insertar contenido de inicio:', inicioError);
      throw inicioError;
    }
    console.log('✅ Contenido de inicio insertado correctamente');
    console.log('   Claves:', Object.keys(inicioContent).length);

    // 4. Insertar/actualizar contenido de sobremi
    console.log('\n📝 Insertando/actualizando contenido de sobremi...');
    const { data: sobremiData, error: sobremiError } = await supabase
      .from('page_content')
      .upsert({
        page_id: 'sobremi',
        content: sobremiContent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'page_id'
      })
      .select();

    if (sobremiError) {
      console.error('❌ Error al insertar contenido de sobremi:', sobremiError);
      throw sobremiError;
    }
    console.log('✅ Contenido de sobremi insertado correctamente');
    console.log('   Claves:', Object.keys(sobremiContent).length);

    // 5. Verificar datos insertados
    console.log('\n🔍 Verificando datos finales...\n');
    const { data: verificacion, error: verError } = await supabase
      .from('page_content')
      .select('*')
      .in('page_id', ['inicio', 'sobremi']);

    if (verError) {
      console.error('❌ Error al verificar:', verError);
      throw verError;
    }

    verificacion.forEach(page => {
      console.log(`📄 ${page.page_id}:`);
      console.log(`   - ID: ${page.id}`);
      console.log(`   - Claves en content: ${Object.keys(page.content).length}`);
      console.log(`   - Created: ${page.created_at}`);
      console.log(`   - Updated: ${page.updated_at}`);
      console.log(`   - Muestra de claves:`, Object.keys(page.content).slice(0, 5).join(', '));
      console.log('');
    });

    console.log('✅ ¡Seed completado exitosamente!\n');
    console.log('🎉 Ahora puedes refrescar la aplicación frontend y verás todo el contenido.\n');

  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    process.exit(1);
  }
}

// Ejecutar
seedPageContent()
  .then(() => {
    console.log('👋 Proceso finalizado');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
