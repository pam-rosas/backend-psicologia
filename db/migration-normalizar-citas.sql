-- =====================================================
-- MIGRACIÓN: NORMALIZAR TABLA CITAS
-- =====================================================
-- Objetivo: Eliminar campos denormalizados de citas y 
-- depender 100% de la relación FK con patients
-- =====================================================

-- PASO 1: Asegurar que todos los pacientes de citas existan en patients
-- (Crear pacientes faltantes con datos mínimos de citas)

INSERT INTO patients (
    rut,
    full_name,
    email,
    phone,
    birth_date,
    address,
    city,
    region,
    emergency_contact_name,
    emergency_contact_phone,
    medical_notes,
    created_at
)
SELECT DISTINCT
    c.rut_paciente,
    COALESCE(c.nombre_paciente, 'Paciente sin nombre'),
    COALESCE(c.email_paciente, 'sin-email@temp.com'),
    COALESCE(c.telefono_paciente, '000000000'),
    NULL::date, -- birth_date (cast explícito a date)
    NULL::text, -- address
    NULL::text, -- city
    NULL::text, -- region
    NULL::text, -- emergency_contact_name
    NULL::text, -- emergency_contact_phone
    'Paciente creado automáticamente desde migración de citas', -- medical_notes
    NOW()
FROM citas c
WHERE c.rut_paciente IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM patients p WHERE p.rut = c.rut_paciente
);

-- PASO 2: Verificar que NO hay citas huérfanas
-- (Este query debe devolver 0)

SELECT COUNT(*) as citas_sin_paciente
FROM citas c
WHERE c.rut_paciente IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM patients p WHERE p.rut = c.rut_paciente
);

-- Si el resultado es > 0, NO CONTINUAR. Revisar datos.

-- PASO 3: Eliminar políticas RLS que dependen de columnas denormalizadas
-- (Necesario antes de poder eliminar las columnas)

DROP POLICY IF EXISTS "Users read own citas" ON citas;
DROP POLICY IF EXISTS "Users can insert own citas" ON citas;
DROP POLICY IF EXISTS "Users can update own citas" ON citas;
DROP POLICY IF EXISTS "Users can delete own citas" ON citas;

-- PASO 4: Eliminar columnas denormalizadas de citas
-- (Solo si el paso 2 devuelve 0)

-- PASO 4: Eliminar columnas denormalizadas de citas
-- (Solo si el paso 2 devuelve 0)

ALTER TABLE citas 
    DROP COLUMN IF EXISTS nombre_paciente CASCADE,
    DROP COLUMN IF EXISTS email_paciente CASCADE,
    DROP COLUMN IF EXISTS telefono_paciente CASCADE;

-- PASO 5: Recrear políticas RLS usando JOIN con patients
-- (Ahora basadas en la relación FK)

-- Permitir a usuarios autenticados leer sus propias citas
CREATE POLICY "Users read own citas" ON citas
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM patients WHERE rut = citas.rut_paciente
        )
    );

-- Permitir a usuarios autenticados insertar citas (si existe endpoint público)
CREATE POLICY "Users can insert own citas" ON citas
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM patients WHERE rut = citas.rut_paciente
        )
    );

-- Permitir a usuarios autenticados actualizar sus propias citas
CREATE POLICY "Users can update own citas" ON citas
    FOR UPDATE
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM patients WHERE rut = citas.rut_paciente
        )
    );

-- Permitir a usuarios autenticados eliminar sus propias citas
CREATE POLICY "Users can delete own citas" ON citas
    FOR DELETE
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM patients WHERE rut = citas.rut_paciente
        )
    );

-- PASO 6: Hacer FK obligatoria (NOT NULL)
-- Esto garantiza que SIEMPRE haya un paciente

ALTER TABLE citas 
    ALTER COLUMN rut_paciente SET NOT NULL;

-- PASO 7: Verificación final

SELECT 
    'Total citas' as descripcion,
    COUNT(*) as cantidad
FROM citas
UNION ALL
SELECT 
    'Total patients' as descripcion,
    COUNT(*) as cantidad
FROM patients
UNION ALL
SELECT 
    'Citas con paciente válido' as descripcion,
    COUNT(*) as cantidad
FROM citas c
INNER JOIN patients p ON p.rut = c.rut_paciente;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- ✅ Columnas nombre_paciente, email_paciente, telefono_paciente eliminadas
-- ✅ rut_paciente es NOT NULL
-- ✅ Todos los pacientes de citas existen en patients
-- ✅ FK citas_rut_paciente_fkey activa y validando
-- =====================================================
