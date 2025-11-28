-- =====================================================
-- SCRIPT DE VERIFICACIÓN DE ESTRUCTURA DE TABLAS
-- =====================================================
-- Este script muestra la estructura real de las tablas
-- para poder crear la migración correcta
-- =====================================================

-- 1. Verificar estructura de la tabla CITAS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'citas'
ORDER BY ordinal_position;

-- 2. Verificar estructura de la tabla PATIENTS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla PAQUETES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'paquetes'
ORDER BY ordinal_position;

-- 4. Verificar foreign keys existentes en CITAS
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'citas';

-- 5. Mostrar algunos registros de ejemplo de CITAS
SELECT * FROM citas LIMIT 3;

-- 6. Mostrar algunos registros de ejemplo de PATIENTS
SELECT * FROM patients LIMIT 3;

-- 7. Verificar si hay citas sin paciente correspondiente
SELECT COUNT(*) as citas_huerfanas
FROM citas c
WHERE c.rut_paciente IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM patients p WHERE p.rut = c.rut_paciente
);
