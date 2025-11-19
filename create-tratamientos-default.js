// create-tratamientos-default.js - Crear tratamientos por defecto
require('dotenv').config();
const { supabase } = require('./db/supabase');

async function createDefaultTreatments() {
  console.log('🔄 Creando tratamientos por defecto...\n');

  const defaultTreatments = [
    {
      name: 'Psicoterapia e hipnoterapia',
      description: 'Sesión individual de psicoterapia con técnicas de hipnoterapia',
      price_national: 40000,
      price_international: 50,
      sessions: 1,
      duration: '60 min',
      is_active: true
    },
    {
      name: 'Taller de duelo',
      description: '4 sesiones grupales para el proceso de duelo',
      price_national: 70000,
      price_international: 85,
      sessions: 4,
      duration: '90 min',
      is_active: true
    }
  ];

  try {
    // Verificar si ya existen
    const { data: existing, error: checkError } = await supabase
      .from('treatments')
      .select('id, name')
      .is('deleted_at', null);

    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      console.log(`✅ Ya existen ${existing.length} tratamientos:`);
      existing.forEach(t => console.log(`   - ${t.name} (ID: ${t.id})`));
      return;
    }

    // Crear tratamientos
    console.log('Insertando tratamientos...');
    const { data: created, error: insertError } = await supabase
      .from('treatments')
      .insert(defaultTreatments)
      .select();

    if (insertError) throw insertError;

    console.log(`\n✅ ${created.length} tratamientos creados exitosamente:\n`);
    created.forEach(treatment => {
      console.log(`   ✓ ${treatment.name}`);
      console.log(`     - ID: ${treatment.id}`);
      console.log(`     - Precio Nacional: $${treatment.price_national} CLP`);
      console.log(`     - Precio Internacional: $${treatment.price_international} USD`);
      console.log(`     - Sesiones: ${treatment.sessions}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error al crear tratamientos:', error.message);
    process.exit(1);
  }
}

// Ejecutar
createDefaultTreatments()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
