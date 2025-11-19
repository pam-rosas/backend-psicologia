// db/supabase.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: Faltan credenciales de Supabase en .env');
  console.error('   Asegúrate de tener SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY configurados');
  process.exit(1);
}

// Cliente con service role key (bypass Row Level Security)
// Usar en el backend para operaciones administrativas
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Función auxiliar para verificar conexión
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = tabla no existe (ok en primera ejecución)
      throw error;
    }
    
    console.log('✅ Conexión a Supabase establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error.message);
    return false;
  }
};

// Ejecutar test de conexión al cargar el módulo
testConnection().catch(err => {
  console.warn('⚠️  No se pudo verificar la conexión a Supabase:', err.message);
});

module.exports = { supabase };
