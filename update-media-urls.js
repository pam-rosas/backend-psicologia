#!/usr/bin/env node
/**
 * Script para actualizar URLs de multimedia con archivos que SÍ existen en Storage
 */

require('dotenv').config();
const { supabase } = require('./db/supabase');

async function updateMediaUrls() {
  console.log('\n🔄 ============ ACTUALIZAR URLS MULTIMEDIA ============\n');

  try {
    // 1. Obtener contenido actual de inicio
    const { data: inicio, error: inicioError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_id', 'inicio')
      .single();

    if (inicioError) throw inicioError;

    // URLs que SÍ existen en Storage
    const updatedInicioContent = {
      ...inicio.content,
      'hero-image': 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764700147878_lt0hx32nj.jpeg',
      'hero-video': 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764700183657_509d7h07m.jpeg',
      'tarot-image': 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764706588114_7ebv9b2k3.jpeg',
      'contact-video': 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/hero/hero_1764705232967_00va6yqf7.jpeg'
    };

    console.log('📝 Actualizando URLs de inicio...');
    console.log('   - hero-image: ✅');
    console.log('   - hero-video: ✅');
    console.log('   - tarot-image: ✅');
    console.log('   - contact-video: ✅');

    const { error: updateInicioError } = await supabase
      .from('page_content')
      .update({
        content: updatedInicioContent,
        updated_at: new Date().toISOString()
      })
      .eq('page_id', 'inicio');

    if (updateInicioError) throw updateInicioError;

    console.log('✅ URLs de inicio actualizadas\n');

    // 2. Actualizar sobremi
    const { data: sobremi, error: sobremiError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_id', 'sobremi')
      .single();

    if (sobremiError) throw sobremiError;

    const updatedSobremiContent = {
      ...sobremi.content,
      'profile-image': 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images/sobremi/sobremi_1764708258112_ayn60ns7e.jpeg'
    };

    console.log('📝 Actualizando URLs de sobremi...');
    console.log('   - profile-image: ✅');

    const { error: updateSobremiError } = await supabase
      .from('page_content')
      .update({
        content: updatedSobremiContent,
        updated_at: new Date().toISOString()
      })
      .eq('page_id', 'sobremi');

    if (updateSobremiError) throw updateSobremiError;

    console.log('✅ URLs de sobremi actualizadas\n');

    // 3. Verificar actualización
    console.log('🔍 Verificando URLs finales...\n');

    const { data: verificacionInicio } = await supabase
      .from('page_content')
      .select('content')
      .eq('page_id', 'inicio')
      .single();

    const { data: verificacionSobremi } = await supabase
      .from('page_content')
      .select('content')
      .eq('page_id', 'sobremi')
      .single();

    console.log('📄 inicio:');
    console.log('   hero-image:', verificacionInicio.content['hero-image'].substring(0, 80) + '...');
    console.log('   hero-video:', verificacionInicio.content['hero-video'].substring(0, 80) + '...');
    console.log('   tarot-image:', verificacionInicio.content['tarot-image'].substring(0, 80) + '...');
    console.log('   contact-video:', verificacionInicio.content['contact-video'].substring(0, 80) + '...');

    console.log('\n📄 sobremi:');
    console.log('   profile-image:', verificacionSobremi.content['profile-image'].substring(0, 80) + '...');

    console.log('\n✅ ¡Actualización completada!\n');
    console.log('🎉 Ahora recarga el frontend y verás todas las imágenes.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
updateMediaUrls()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
