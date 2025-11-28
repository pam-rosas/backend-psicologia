-- ============================================
-- MIGRAR APPOINTMENTS → CITAS
-- ============================================
-- Migra datos del sistema legacy (appointments) al nuevo (citas)

-- Verificar datos existentes
DO $$
DECLARE
    legacy_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO legacy_count FROM appointments WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO new_count FROM citas;
    
    RAISE NOTICE 'Appointments legacy: %', legacy_count;
    RAISE NOTICE 'Citas actuales: %', new_count;
END $$;

-- Migración de datos
INSERT INTO citas (
    fecha,
    hora,
    hora_fin,
    rut_paciente,
    nombre_paciente,
    email_paciente,
    telefono_paciente,
    modalidad,
    duracion,
    estado,
    notas,
    monto,
    created_at,
    updated_at
)
SELECT 
    DATE(a.appointment_datetime) as fecha,
    TIME(a.appointment_datetime) as hora,
    TIME(a.appointment_datetime + INTERVAL '1 hour') as hora_fin,
    COALESCE(p.rut, 'SIN-RUT') as rut_paciente,
    p.full_name as nombre_paciente,
    p.email as email_paciente,
    COALESCE(p.phone, 'SIN-TELEFONO') as telefono_paciente,
    CASE 
        WHEN LOWER(a.modality) IN ('remoto', 'remote') THEN 'online'
        WHEN LOWER(a.modality) = 'presencial' THEN 'presencial'
        WHEN LOWER(a.modality) IN ('hybrid', 'ambos', 'ambas') THEN 'ambas'
        ELSE 'online'
    END as modalidad,
    t.duration as duracion,
    CASE 
        WHEN a.status = 'confirmed' THEN 'confirmada'
        WHEN a.status = 'cancelled' THEN 'cancelada'
        WHEN a.status = 'completed' THEN 'completada'
        ELSE 'pendiente'
    END as estado,
    a.notes as notas,
    t.price_national as monto,
    a.created_at,
    a.updated_at
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN treatments t ON a.treatment_id = t.id
WHERE a.deleted_at IS NULL
  AND p.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM citas c 
    WHERE c.email_paciente = p.email 
      AND c.fecha = DATE(a.appointment_datetime)
      AND c.hora = TIME(a.appointment_datetime)
  );

-- Resultado
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM citas;
    RAISE NOTICE '✅ Migración completada. Total citas: %', migrated_count;
END $$;
