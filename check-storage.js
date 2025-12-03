#!/usr/bin/env node
/**
 * Script para verificar archivos en Supabase Storage y actualizar URLs
 */

require('dotenv').config();
const { supabase } = require('./db/supabase');

async function checkAndListStorage() {
  console.log('\n📦 ============ VERIFICAR STORAGE ============\n');

  try {
    const folders = ['hero', 'inicio', 'servicios', 'general', 'sobremi'];
    const baseUrl = 'https://zeyvbwhzhobeiooqqrxp.supabase.co/storage/v1/object/public/images';

    for (const folder of folders) {
      console.log(`\n📁 Carpeta: ${folder}`);
      console.log('─'.repeat(50));

      const { data: files, error } = await supabase
        .storage
        .from('images')
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        console.error(`❌ Error al listar ${folder}:`, error.message);
        continue;
      }

      if (files && files.length > 0) {
        files.forEach((file, index) => {
          const url = `${baseUrl}/${folder}/${file.name}`;
          console.log(`  ${index + 1}. ${file.name}`);
          console.log(`     URL: ${url}`);
          console.log(`     Tamaño: ${(file.metadata?.size / 1024).toFixed(2)} KB`);
        });
        console.log(`\n  Total: ${files.length} archivos`);
      } else {
        console.log('  ⚠️  Carpeta vacía');
      }
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
checkAndListStorage()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
