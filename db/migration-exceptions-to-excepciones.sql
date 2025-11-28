-- ============================================
-- MIGRAR SCHEDULE_EXCEPTIONS → EXCEPCIONES_HORARIOS
-- ============================================

-- Verificar datos existentes
DO $$
DECLARE
    legacy_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO legacy_count FROM schedule_exceptions WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO new_count FROM excepciones_horarios;
    
    RAISE NOTICE 'Schedule exceptions legacy: %', legacy_count;
    RAISE NOTICE 'Excepciones horarios actuales: %', new_count;
END $$;

-- Migración de datos
INSERT INTO excepciones_horarios (
    fecha,
    hora_inicio,
    hora_fin,
    motivo,
    bloqueado,
    created_at
)
SELECT 
    se.date as fecha,
    se.start_time as hora_inicio,
    se.end_time as hora_fin,
    se.reason as motivo,
    NOT se.is_available as bloqueado,
    se.created_at
FROM schedule_exceptions se
WHERE se.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM excepciones_horarios e
    WHERE e.fecha = se.date
      AND COALESCE(e.hora_inicio, '00:00:00'::time) = COALESCE(se.start_time, '00:00:00'::time)
  );

-- Resultado
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM excepciones_horarios;
    RAISE NOTICE '✅ Migración completada. Total excepciones: %', migrated_count;
END $$;
