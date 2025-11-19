-- =====================================================
-- MIGRACIÓN: Agregar tabla patients y mejorar appointments
-- =====================================================

-- =====================================================
-- NUEVA TABLA: patients
-- =====================================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información personal
  full_name VARCHAR(255) NOT NULL,
  rut VARCHAR(12) UNIQUE, -- Formato: 12345678-9
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birth_date DATE,
  
  -- Dirección
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  
  -- Información médica básica
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  medical_notes TEXT, -- Alergias, condiciones previas, etc.
  
  -- Vinculación con usuario (opcional - si el paciente crea cuenta)
  user_id UUID REFERENCES users(id),
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_rut ON patients(rut) WHERE rut IS NOT NULL;
CREATE INDEX idx_patients_user_id ON patients(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_patients_deleted ON patients(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE patients IS 'Registro de pacientes con información personal y médica';
COMMENT ON COLUMN patients.rut IS 'RUT chileno formato 12345678-9';
COMMENT ON COLUMN patients.user_id IS 'Vinculación opcional si el paciente crea cuenta en el sistema';

-- =====================================================
-- MODIFICAR TABLA: appointments
-- =====================================================

-- Agregar columna patient_id
ALTER TABLE appointments 
ADD COLUMN patient_id UUID REFERENCES patients(id);

-- Agregar índice
CREATE INDEX idx_appointments_patient ON appointments(patient_id);

-- Agregar columna de notas (si no existe)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN appointments.patient_id IS 'Referencia al paciente que agendó la cita';
COMMENT ON COLUMN appointments.patient_name IS 'DEPRECATED: Usar patient_id -> patients.full_name';
COMMENT ON COLUMN appointments.patient_email IS 'DEPRECATED: Usar patient_id -> patients.email';

-- =====================================================
-- DATOS DE MIGRACIÓN
-- =====================================================

-- Migrar pacientes existentes de appointments a patients
-- (Ejecutar solo si ya hay datos en appointments)
INSERT INTO patients (full_name, email, created_at)
SELECT DISTINCT 
  patient_name, 
  patient_email,
  MIN(created_at)
FROM appointments
WHERE patient_name IS NOT NULL AND patient_email IS NOT NULL
GROUP BY patient_name, patient_email
ON CONFLICT (email) DO NOTHING;

-- Actualizar appointments con patient_id
UPDATE appointments a
SET patient_id = p.id
FROM patients p
WHERE a.patient_email = p.email
  AND a.patient_id IS NULL;

-- =====================================================
-- VISTA: appointment_details
-- =====================================================
-- Vista que combina appointments con información del paciente
CREATE OR REPLACE VIEW appointment_details AS
SELECT 
  a.id,
  a.appointment_datetime,
  a.status,
  a.notes,
  
  -- Información del paciente
  p.id as patient_id,
  p.full_name,
  p.email,
  p.phone,
  p.rut,
  
  -- Información del tratamiento
  t.id as treatment_id,
  t.name as treatment_name,
  t.description as treatment_description,
  t.price_national,
  t.price_international,
  
  -- Información de pago
  a.payment_status,
  a.payment_amount,
  a.payment_method,
  a.payment_date,
  
  -- Auditoría
  a.created_at,
  a.updated_at
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN treatments t ON a.treatment_id = t.id
WHERE a.deleted_at IS NULL;

COMMENT ON VIEW appointment_details IS 'Vista desnormalizada de citas con información completa del paciente y tratamiento';

-- =====================================================
-- FUNCIÓN: Obtener historial del paciente
-- =====================================================
CREATE OR REPLACE FUNCTION get_patient_history(patient_uuid UUID)
RETURNS TABLE (
  appointment_id UUID,
  appointment_date TIMESTAMP WITH TIME ZONE,
  treatment_name VARCHAR(255),
  status VARCHAR(50),
  payment_status VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.appointment_datetime,
    t.name,
    a.status,
    a.payment_status
  FROM appointments a
  JOIN treatments t ON a.treatment_id = t.id
  WHERE a.patient_id = patient_uuid
    AND a.deleted_at IS NULL
  ORDER BY a.appointment_datetime DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_patient_history IS 'Obtiene el historial completo de citas de un paciente';
