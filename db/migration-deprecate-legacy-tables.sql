-- ============================================
-- DEPRECAR TABLAS LEGACY
-- ============================================
-- Renombrar tablas legacy con prefijo _legacy_ para mantener backup
-- Ejecutar solo después de validar que el sistema funciona correctamente

-- ============================================
-- VERIFICACIÓN PREVIA
-- ============================================

DO $$
DECLARE
    appointments_count INTEGER := 0;
    schedules_count INTEGER := 0;
    exceptions_count INTEGER := 0;
    citas_count INTEGER;
    horarios_count INTEGER;
    appointments_exists BOOLEAN;
    schedules_exists BOOLEAN;
    exceptions_exists BOOLEAN;
BEGIN
    -- Verificar si las tablas legacy existen
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'appointments'
    ) INTO appointments_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'schedules'
    ) INTO schedules_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'schedule_exceptions'
    ) INTO exceptions_exists;
    
    -- Contar solo si las tablas existen
    IF appointments_exists THEN
        SELECT COUNT(*) INTO appointments_count FROM appointments;
    END IF;
    
    IF schedules_exists THEN
        SELECT COUNT(*) INTO schedules_count FROM schedules;
    END IF;
    
    IF exceptions_exists THEN
        SELECT COUNT(*) INTO exceptions_count FROM schedule_exceptions;
    END IF;
    
    SELECT COUNT(*) INTO citas_count FROM citas;
    SELECT COUNT(*) INTO horarios_count FROM horarios_disponibles;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN PREVIA A DEPRECACIÓN';
    RAISE NOTICE '========================================';
    
    IF appointments_exists THEN
        RAISE NOTICE 'Legacy appointments: % (EXISTE)', appointments_count;
    ELSE
        RAISE NOTICE 'Legacy appointments: NO EXISTE';
    END IF;
    
    IF schedules_exists THEN
        RAISE NOTICE 'Legacy schedules: % (EXISTE)', schedules_count;
    ELSE
        RAISE NOTICE 'Legacy schedules: NO EXISTE';
    END IF;
    
    IF exceptions_exists THEN
        RAISE NOTICE 'Legacy schedule_exceptions: % (EXISTE)', exceptions_count;
    ELSE
        RAISE NOTICE 'Legacy schedule_exceptions: NO EXISTE';
    END IF;
    
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Nuevas citas: %', citas_count;
    RAISE NOTICE 'Nuevos horarios_disponibles: %', horarios_count;
    RAISE NOTICE '========================================';
    
    IF NOT appointments_exists AND NOT schedules_exists AND NOT exceptions_exists THEN
        RAISE NOTICE '✅ No hay tablas legacy para deprecar. Sistema ya está limpio.';
    END IF;
END $$;

-- ============================================
-- OPCIÓN 1: RENOMBRAR TABLAS (BACKUP)
-- ============================================
-- Recomendado: Mantener como backup temporal

-- Renombrar tablas (ignorar si no existen)
DO $$
BEGIN
    -- Renombrar appointments si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
        ALTER TABLE appointments RENAME TO _legacy_appointments;
        RAISE NOTICE 'Tabla appointments renombrada a _legacy_appointments';
    END IF;
    
    -- Renombrar schedules si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedules') THEN
        ALTER TABLE schedules RENAME TO _legacy_schedules;
        RAISE NOTICE 'Tabla schedules renombrada a _legacy_schedules';
    END IF;
    
    -- Renombrar schedule_exceptions si existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_exceptions') THEN
        ALTER TABLE schedule_exceptions RENAME TO _legacy_schedule_exceptions;
        RAISE NOTICE 'Tabla schedule_exceptions renombrada a _legacy_schedule_exceptions';
    END IF;
    
    -- Renombrar appointment_details si es tabla, o eliminar si es vista
    IF EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'appointment_details') THEN
        DROP VIEW IF EXISTS appointment_details CASCADE;
        RAISE NOTICE 'Vista appointment_details eliminada';
    ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointment_details') THEN
        ALTER TABLE appointment_details RENAME TO _legacy_appointment_details;
        RAISE NOTICE 'Tabla appointment_details renombrada a _legacy_appointment_details';
    END IF;
END $$;

-- Mensaje de confirmación
SELECT '✅ Tablas legacy procesadas correctamente' as status;

-- ============================================
-- OPCIÓN 2: ELIMINAR TABLAS (DEFINITIVO)
-- ============================================
-- ⚠️ USAR CON PRECAUCIÓN - PÉRDIDA DE DATOS PERMANENTE
-- Descomentar solo después de validar extensivamente

/*
DO $$
BEGIN
    -- Eliminar vistas primero
    DROP VIEW IF EXISTS appointment_details CASCADE;
    
    -- Eliminar tablas
    DROP TABLE IF EXISTS appointments CASCADE;
    DROP TABLE IF EXISTS schedule_exceptions CASCADE;
    DROP TABLE IF EXISTS schedules CASCADE;
    
    RAISE NOTICE '✅ Tablas y vistas legacy eliminadas permanentemente';
END $$;
*/

-- ============================================
-- VERIFICACIÓN POST-DEPRECACIÓN
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TABLAS LEGACY DEPRECADAS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Sistema migrando completamente al nuevo esquema';
    RAISE NOTICE 'Tablas activas:';
    RAISE NOTICE '  - citas';
    RAISE NOTICE '  - paquetes';
    RAISE NOTICE '  - horarios_disponibles';
    RAISE NOTICE '  - excepciones_horarios';
    RAISE NOTICE '  - bloques_manuales';
    RAISE NOTICE '========================================';
END $$;
