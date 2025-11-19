-- Ejecutar este script en Supabase SQL Editor
-- https://supabase.com/dashboard/project/zeyvbwhzhobeiooqqrxp/sql

-- Crear tabla patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información personal
  full_name VARCHAR(255) NOT NULL,
  rut VARCHAR(12) UNIQUE,
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
  medical_notes TEXT,
  
  -- Vinculación con usuario (opcional)
  user_id UUID REFERENCES users(id),
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_rut ON patients(rut) WHERE rut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_deleted ON patients(deleted_at) WHERE deleted_at IS NULL;

-- Agregar columna patient_id a appointments si no existe (NOT NULL)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN patient_id UUID REFERENCES patients(id);
    CREATE INDEX idx_appointments_patient ON appointments(patient_id);
  END IF;
END $$;

-- Agregar columna notes a appointments si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'notes'
  ) THEN
    ALTER TABLE appointments ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Remover vistas que dependen de columnas legacy
DROP VIEW IF EXISTS appointments_with_treatment CASCADE;
DROP VIEW IF EXISTS appointment_details CASCADE;

-- Remover columnas legacy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'patient_name'
  ) THEN
    ALTER TABLE appointments DROP COLUMN patient_name CASCADE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'patient_email'
  ) THEN
    ALTER TABLE appointments DROP COLUMN patient_email CASCADE;
    DROP INDEX IF EXISTS idx_appointments_email;
  END IF;
END $$;

-- Recrear vista appointment_details sin columnas legacy
CREATE OR REPLACE VIEW appointment_details AS
SELECT 
  a.id,
  a.appointment_datetime,
  a.status,
  a.notes,
  a.price_national,
  a.price_international,
  a.sessions,
  a.created_at,
  p.id as patient_id,
  p.full_name as patient_name,
  p.email as patient_email,
  p.rut as patient_rut,
  p.phone as patient_phone,
  p.city as patient_city,
  p.emergency_contact_name,
  p.emergency_contact_phone,
  p.medical_notes,
  t.id as treatment_id,
  t.name as treatment_name,
  t.description as treatment_description,
  t.price_national as treatment_price_national,
  t.price_international as treatment_price_international
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN treatments t ON a.treatment_id = t.id
WHERE a.deleted_at IS NULL;
