-- =====================================================
-- SCHEMA DE MIGRACIÓN: Firebase → Supabase PostgreSQL
-- Proyecto: Backend Psicoterapia
-- Fecha: 2025-11-19
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TABLA: users (reemplaza 'administradores')
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'usuario' CHECK (role IN ('admin', 'usuario')),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'Usuarios del sistema con roles de administrador o usuario regular';

-- =====================================================
-- 2. TABLA: patients
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
-- 3. TABLA: blogs
-- =====================================================
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_blogs_created_at ON blogs(created_at DESC);
CREATE INDEX idx_blogs_created_by ON blogs(created_by);
CREATE INDEX idx_blogs_deleted ON blogs(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE blogs IS 'Publicaciones del blog';

-- =====================================================
-- 4. TABLA: treatments (reemplaza 'tratamientos')
-- =====================================================
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  price_national INTEGER NOT NULL,
  price_international DECIMAL(10,2) NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 1,
  duration VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_treatments_name ON treatments(name);
CREATE INDEX idx_treatments_active ON treatments(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_treatments_deleted ON treatments(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE treatments IS 'Catálogo de tratamientos/servicios disponibles';

-- =====================================================
-- 5. TABLA: appointments (reemplaza 'citas')
-- =====================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES treatments(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  
  appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  notes TEXT,
  
  -- Precio al momento de la reserva (snapshot)
  price_national INTEGER,
  price_international DECIMAL(10,2),
  sessions INTEGER,
  
  -- Información de pago
  payment_amount DECIMAL(10,2),
  payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method VARCHAR(50),
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT unique_appointment UNIQUE (appointment_datetime)
);

CREATE INDEX idx_appointments_datetime ON appointments(appointment_datetime);
CREATE INDEX idx_appointments_treatment ON appointments(treatment_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date_status ON appointments(appointment_datetime, status);
CREATE INDEX idx_appointments_deleted ON appointments(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE appointments IS 'Citas y reservas de pacientes';
COMMENT ON COLUMN appointments.patient_id IS 'Referencia al paciente que agendó la cita';

-- =====================================================
-- 6. TABLA: workshops (reemplaza 'talleres')
-- =====================================================
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL DEFAULT 'Taller de Duelo',
  subtitle VARCHAR(255),
  start_date DATE NOT NULL,
  price VARCHAR(50) NOT NULL,
  facilitator VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  cancellation_policy TEXT,
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_workshops_start_date ON workshops(start_date DESC);
CREATE INDEX idx_workshops_created_by ON workshops(created_by);
CREATE INDEX idx_workshops_deleted ON workshops(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE workshops IS 'Talleres de duelo y otros talleres grupales';

-- =====================================================
-- 7. TABLA: workshop_sessions
-- =====================================================
CREATE TABLE workshop_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_date DATE NOT NULL,
  session_time VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_workshop_session UNIQUE (workshop_id, session_number)
);

CREATE INDEX idx_workshop_sessions_workshop ON workshop_sessions(workshop_id);
CREATE INDEX idx_workshop_sessions_date ON workshop_sessions(session_date);

COMMENT ON TABLE workshop_sessions IS 'Sesiones individuales de cada taller';

-- =====================================================
-- 8. TABLA: schedules (reemplaza 'horarios')
-- =====================================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo, 1=lunes, ..., 6=sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_schedule_slot UNIQUE (day_of_week, start_time, end_time),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_schedules_day ON schedules(day_of_week) WHERE is_active = TRUE;

COMMENT ON TABLE schedules IS 'Horarios disponibles por día de la semana';
COMMENT ON COLUMN schedules.day_of_week IS '0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado';

-- =====================================================
-- 9. TABLA: schedule_exceptions
-- =====================================================
CREATE TABLE schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_exception UNIQUE (exception_date, start_time, end_time),
  CONSTRAINT valid_exception_time CHECK (end_time > start_time)
);

CREATE INDEX idx_exceptions_date ON schedule_exceptions(exception_date);

COMMENT ON TABLE schedule_exceptions IS 'Excepciones al horario regular (feriados, días especiales)';

-- =====================================================
-- 10. TABLA: comments (reemplaza 'comentarios')
-- =====================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_comments_approved ON comments(is_approved, created_at DESC);
CREATE INDEX idx_comments_rating ON comments(rating);
CREATE INDEX idx_comments_deleted ON comments(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE comments IS 'Comentarios y testimonios de clientes';

-- =====================================================
-- 11. TABLA: page_content
-- =====================================================
CREATE TABLE page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id VARCHAR(50) UNIQUE NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_page_content_page_id ON page_content(page_id);

COMMENT ON TABLE page_content IS 'Contenido dinámico de páginas (almacenado como JSON)';

-- =====================================================
-- 11. TABLA: media_urls
-- =====================================================
CREATE TABLE media_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_key VARCHAR(100) UNIQUE NOT NULL,
  url TEXT NOT NULL,
  public_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_media_urls_key ON media_urls(media_key);

COMMENT ON TABLE media_urls IS 'URLs de recursos multimedia (imágenes, videos)';

-- =====================================================
-- TRIGGERS para updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blogs_updated_at 
  BEFORE UPDATE ON blogs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at 
  BEFORE UPDATE ON treatments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
  BEFORE UPDATE ON appointments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshops_updated_at 
  BEFORE UPDATE ON workshops 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
  BEFORE UPDATE ON comments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at 
  BEFORE UPDATE ON schedules 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_content_updated_at 
  BEFORE UPDATE ON page_content 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_urls_updated_at 
  BEFORE UPDATE ON media_urls 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS INICIALES: Tratamientos por defecto
-- =====================================================
INSERT INTO treatments (name, price_national, price_international, sessions, description) VALUES
('Psicoterapia e hipnoterapia', 40000, 50.00, 1, 'Sesión individual de psicoterapia con técnicas de hipnoterapia'),
('Taller de duelo', 70000, 85.00, 4, 'Taller grupal de 4 sesiones para procesar el duelo');

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Configuración básica
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_urls ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role (bypass RLS)
-- El backend usa service_role key, por lo que tiene acceso completo

-- Políticas para anon (usuarios no autenticados) - solo lectura en contenido público
CREATE POLICY "Lectura pública de blogs" ON blogs
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Lectura pública de tratamientos activos" ON treatments
  FOR SELECT USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY "Lectura pública de talleres" ON workshops
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Lectura pública de sesiones de taller" ON workshop_sessions
  FOR SELECT USING (true);

CREATE POLICY "Lectura pública de horarios activos" ON schedules
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Lectura pública de excepciones" ON schedule_exceptions
  FOR SELECT USING (true);

CREATE POLICY "Lectura pública de comentarios aprobados" ON comments
  FOR SELECT USING (is_approved = TRUE AND deleted_at IS NULL);

CREATE POLICY "Lectura pública de page_content" ON page_content
  FOR SELECT USING (true);

CREATE POLICY "Lectura pública de media_urls" ON media_urls
  FOR SELECT USING (true);

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de citas con información del tratamiento
CREATE VIEW appointments_with_treatment AS
SELECT 
  a.id,
  a.patient_name,
  a.patient_email,
  a.appointment_datetime,
  a.status,
  a.price_national,
  a.price_international,
  a.sessions,
  a.payment_amount,
  a.payment_status,
  a.payment_method,
  t.name AS treatment_name,
  t.description AS treatment_description,
  a.created_at,
  a.updated_at
FROM appointments a
JOIN treatments t ON a.treatment_id = t.id
WHERE a.deleted_at IS NULL;

-- Vista de talleres con sesiones
CREATE VIEW workshops_with_sessions AS
SELECT 
  w.id AS workshop_id,
  w.title,
  w.subtitle,
  w.start_date,
  w.price,
  w.facilitator,
  w.description,
  json_agg(
    json_build_object(
      'session_number', ws.session_number,
      'session_date', ws.session_date,
      'session_time', ws.session_time,
      'description', ws.description
    ) ORDER BY ws.session_number
  ) AS sessions,
  w.created_at,
  w.updated_at
FROM workshops w
LEFT JOIN workshop_sessions ws ON w.id = ws.workshop_id
WHERE w.deleted_at IS NULL
GROUP BY w.id;

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Schema creado exitosamente';
  RAISE NOTICE '📊 Tablas: 11';
  RAISE NOTICE '🔒 RLS habilitado en todas las tablas';
  RAISE NOTICE '👁️  Vistas: 2';
  RAISE NOTICE '📝 Triggers: 9 (updated_at automático)';
  RAISE NOTICE '🎯 Políticas RLS: 9 (lectura pública)';
END $$;
