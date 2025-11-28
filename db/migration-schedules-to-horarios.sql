-- ============================================
-- MIGRAR SCHEDULES → HORARIOS_DISPONIBLES
-- ============================================

-- Verificar datos existentes
DO $$
DECLARE
    legacy_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO legacy_count FROM schedules WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO new_count FROM horarios_disponibles;
    
    RAISE NOTICE 'Schedules legacy: %', legacy_count;
    RAISE NOTICE 'Horarios disponibles actuales: %', new_count;
END $$;

-- Migración de datos
INSERT INTO horarios_disponibles (
    dia_semana,
    hora_inicio,
    hora_fin,
    modalidad,
    activo,
    created_at,
    updated_at
)
SELECT 
    s.day_of_week as dia_semana,
    s.start_time as hora_inicio,
    s.end_time as hora_fin,
    CASE 
        WHEN LOWER(s.modality) IN ('remoto', 'remote') THEN 'online'
        WHEN LOWER(s.modality) = 'presencial' THEN 'presencial'
        WHEN LOWER(s.modality) IN ('hybrid', 'ambos', 'ambas') THEN 'ambas'
        ELSE 'online'
    END as modalidad,
    s.is_active as activo,
    s.created_at,
    s.updated_at
FROM schedules s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM horarios_disponibles h
    WHERE h.dia_semana = s.day_of_week
      AND h.hora_inicio = s.start_time
      AND h.hora_fin = s.end_time
  );

-- Resultado
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM horarios_disponibles;
    RAISE NOTICE '✅ Migración completada. Total horarios: %', migrated_count;
END $$;
