-- MIGRACIÓN: Remover campos legacy de appointments
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- 1. Backup: Verificar que todas las citas tienen patient_id
DO $$
DECLARE
  citas_sin_patient_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO citas_sin_patient_id
  FROM appointments
  WHERE patient_id IS NULL AND deleted_at IS NULL;
  
  IF citas_sin_patient_id > 0 THEN
    RAISE EXCEPTION 'ERROR: Hay % citas sin patient_id. Migrar datos primero.', citas_sin_patient_id;
  END IF;
  
  RAISE NOTICE '✅ Todas las citas tienen patient_id';
END $$;

-- 2. Hacer patient_id NOT NULL (ahora es requerido)
ALTER TABLE appointments 
ALTER COLUMN patient_id SET NOT NULL;

RAISE NOTICE '✅ patient_id es ahora NOT NULL';

-- 3. Remover índice de email (ya no existe la columna)
DROP INDEX IF EXISTS idx_appointments_email;

RAISE NOTICE '✅ Índice de email removido';

-- 4. Remover columnas legacy
ALTER TABLE appointments DROP COLUMN IF EXISTS patient_name;
ALTER TABLE appointments DROP COLUMN IF EXISTS patient_email;

RAISE NOTICE '✅ Columnas legacy removidas';

-- 5. Actualizar comentarios
COMMENT ON COLUMN appointments.patient_id IS 'ID del paciente (requerido). Ver tabla patients para datos completos.';

RAISE NOTICE '✅ Comentarios actualizados';

COMMIT;

-- Verificación final
SELECT 
  'appointments' as tabla,
  COUNT(*) as total_citas,
  COUNT(patient_id) as con_patient_id,
  COUNT(DISTINCT patient_id) as pacientes_unicos
FROM appointments
WHERE deleted_at IS NULL;
