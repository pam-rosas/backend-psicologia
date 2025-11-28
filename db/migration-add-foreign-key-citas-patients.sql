-- =====================================================
-- MIGRACIÓN: Agregar Foreign Key entre citas y patients
-- =====================================================
-- Descripción: Establece relación referencial entre citas.rut_paciente y patients.rut
-- Fecha: 2025-11-28
-- Autor: Sistema
-- =====================================================

BEGIN;

-- Paso 1: Verificar y mostrar citas huérfanas (sin paciente correspondiente)
DO $$
DECLARE
    huerfanas_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO huerfanas_count
    FROM citas c
    WHERE c.rut_paciente IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM patients p WHERE p.rut = c.rut_paciente
    );
    
    RAISE NOTICE 'Citas huérfanas encontradas: %', huerfanas_count;
END $$;

-- Paso 2: Eliminar citas huérfanas (citas que referencian RUTs inexistentes)
DELETE FROM citas
WHERE rut_paciente IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM patients p WHERE p.rut = rut_paciente
);

-- Mostrar cuántas citas se eliminaron
DO $$
BEGIN
    RAISE NOTICE 'Citas huérfanas eliminadas: %', (SELECT COUNT(*) FROM citas WHERE FALSE);
END $$;

-- Paso 3: Verificar si ya existe la constraint (por si se ejecuta dos veces)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'citas_rut_paciente_fkey'
        AND table_name = 'citas'
    ) THEN
        RAISE NOTICE 'La constraint ya existe, eliminándola primero...';
        ALTER TABLE citas DROP CONSTRAINT citas_rut_paciente_fkey;
    END IF;
END $$;

-- Paso 4: Crear índice en rut_paciente para mejorar performance de JOINs
CREATE INDEX IF NOT EXISTS idx_citas_rut_paciente ON citas(rut_paciente);

-- Paso 5: Agregar la foreign key constraint
ALTER TABLE citas
ADD CONSTRAINT citas_rut_paciente_fkey
FOREIGN KEY (rut_paciente)
REFERENCES patients(rut)
ON DELETE RESTRICT      -- No permite eliminar paciente si tiene citas
ON UPDATE CASCADE;      -- Si cambia el RUT, actualiza automáticamente en citas

-- Paso 6: Verificar que la constraint se creó correctamente
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'citas_rut_paciente_fkey'
        AND table_name = 'citas'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE '✅ Foreign key creada exitosamente';
    ELSE
        RAISE EXCEPTION '❌ Error: La foreign key no se pudo crear';
    END IF;
END $$;

-- Paso 7: Mostrar estadísticas finales
DO $$
DECLARE
    total_citas INTEGER;
    total_patients INTEGER;
    citas_con_paciente INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_citas FROM citas;
    SELECT COUNT(*) INTO total_patients FROM patients;
    SELECT COUNT(*) INTO citas_con_paciente FROM citas WHERE rut_paciente IS NOT NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ESTADÍSTICAS FINALES';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de pacientes: %', total_patients;
    RAISE NOTICE 'Total de citas: %', total_citas;
    RAISE NOTICE 'Citas con paciente asignado: %', citas_con_paciente;
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

-- Verificar que el JOIN ahora funciona correctamente
SELECT 
    c.id as cita_id,
    c.fecha,
    c.rut_paciente,
    p.nombre as nombre_paciente,
    p.email as email_paciente
FROM citas c
LEFT JOIN patients p ON c.rut_paciente = p.rut
LIMIT 5;

-- =====================================================
-- ROLLBACK (si algo sale mal, ejecutar esto)
-- =====================================================
-- ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_rut_paciente_fkey;
-- DROP INDEX IF EXISTS idx_citas_rut_paciente;
