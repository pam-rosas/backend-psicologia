-- ============================================
-- MIGRACIÓN: Sistema de Paquetes y Disponibilidad
-- Fecha: 2025-11-26
-- Descripción: Crear tablas para el nuevo sistema de agendamiento
-- ============================================

-- 1. TABLA DE PAQUETES/TRATAMIENTOS
CREATE TABLE IF NOT EXISTS paquetes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  duracion INTEGER NOT NULL, -- en minutos
  modalidad VARCHAR(50) DEFAULT 'Remoto',
  precio_nacional DECIMAL(10,2) NOT NULL,
  precio_internacional DECIMAL(10,2),
  sesiones INTEGER DEFAULT 1,
  icono VARCHAR(100), -- ej: 'fa-brain', 'fa-heart'
  color VARCHAR(50), -- color hexadecimal para personalización
  destacado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para paquetes
CREATE INDEX IF NOT EXISTS idx_paquetes_activo ON paquetes(activo);
CREATE INDEX IF NOT EXISTS idx_paquetes_destacado ON paquetes(destacado);

-- 2. TABLA DE HORARIOS DISPONIBLES (Configuración general)
CREATE TABLE IF NOT EXISTS horarios_disponibles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 6=Sábado
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  modalidad VARCHAR(50) CHECK (modalidad IN ('presencial', 'online', 'ambas')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para horarios
CREATE INDEX IF NOT EXISTS idx_horarios_dia_semana ON horarios_disponibles(dia_semana);
CREATE INDEX IF NOT EXISTS idx_horarios_activo ON horarios_disponibles(activo);

-- 3. TABLA DE EXCEPCIONES DE HORARIOS
CREATE TABLE IF NOT EXISTS excepciones_horarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  hora_inicio TIME,
  hora_fin TIME,
  motivo TEXT,
  bloqueado BOOLEAN DEFAULT TRUE, -- TRUE = no disponible, FALSE = disponible extra
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para excepciones
CREATE INDEX IF NOT EXISTS idx_excepciones_fecha ON excepciones_horarios(fecha);
CREATE INDEX IF NOT EXISTS idx_excepciones_bloqueado ON excepciones_horarios(bloqueado);

-- 4. TABLA DE CITAS (CREAR SI NO EXISTE)
CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paquete_id UUID REFERENCES paquetes(id),
  rut_paciente VARCHAR(20) NOT NULL,
  nombre_paciente VARCHAR(255) NOT NULL,
  email_paciente VARCHAR(255) NOT NULL,
  telefono_paciente VARCHAR(50) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  hora_fin TIME,
  modalidad VARCHAR(50) CHECK (modalidad IN ('presencial', 'online')),
  duracion INTEGER, -- duración en minutos
  notas TEXT,
  direccion VARCHAR(500),
  comuna VARCHAR(100),
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  metodo_pago VARCHAR(50),
  monto DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para citas
CREATE INDEX IF NOT EXISTS idx_citas_paquete_id ON citas(paquete_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha_hora ON citas(fecha, hora);
CREATE INDEX IF NOT EXISTS idx_citas_rut_paciente ON citas(rut_paciente);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_email ON citas(email_paciente);

-- 5. COMENTARIOS EN LAS TABLAS
COMMENT ON TABLE paquetes IS 'Paquetes o tratamientos que ofrece el psicólogo';
COMMENT ON TABLE horarios_disponibles IS 'Configuración de horarios disponibles por día de la semana';
COMMENT ON TABLE excepciones_horarios IS 'Excepciones a los horarios (días bloqueados o disponibilidad extra)';

COMMENT ON COLUMN paquetes.duracion IS 'Duración de cada sesión en minutos';
COMMENT ON COLUMN paquetes.modalidad IS 'Modalidad de atención: presencial, online o ambas';
COMMENT ON COLUMN paquetes.precio_nacional IS 'Precio en pesos chilenos';
COMMENT ON COLUMN paquetes.precio_internacional IS 'Precio en dólares americanos';

COMMENT ON COLUMN horarios_disponibles.dia_semana IS '0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado';

COMMENT ON COLUMN excepciones_horarios.bloqueado IS 'TRUE = horario no disponible (vacaciones, bloqueo), FALSE = horario extra disponible';
