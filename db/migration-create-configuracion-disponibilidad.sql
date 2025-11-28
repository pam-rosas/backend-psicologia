-- ============================================
-- CREAR TABLA CONFIGURACION_DISPONIBILIDAD
-- ============================================
-- Tabla para almacenar configuración global del sistema de citas

CREATE TABLE IF NOT EXISTS configuracion_disponibilidad (
    id INTEGER PRIMARY KEY DEFAULT 1,
    minimo_anticipacion_horas INTEGER NOT NULL DEFAULT 24,
    maximo_dias_adelante INTEGER NOT NULL DEFAULT 30,
    permitir_citas_domingos BOOLEAN DEFAULT false,
    permitir_citas_fines_semana BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT solo_una_configuracion CHECK (id = 1)
);

-- Insertar configuración por defecto si no existe
INSERT INTO configuracion_disponibilidad (id, minimo_anticipacion_horas, maximo_dias_adelante, permitir_citas_domingos, permitir_citas_fines_semana)
VALUES (1, 24, 30, false, true)
ON CONFLICT (id) DO NOTHING;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_configuracion_disponibilidad_updated_at ON configuracion_disponibilidad;
CREATE TRIGGER update_configuracion_disponibilidad_updated_at 
    BEFORE UPDATE ON configuracion_disponibilidad
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE configuracion_disponibilidad IS 'Configuración global del sistema de agendamiento';
COMMENT ON COLUMN configuracion_disponibilidad.minimo_anticipacion_horas IS 'Horas mínimas de anticipación para agendar';
COMMENT ON COLUMN configuracion_disponibilidad.maximo_dias_adelante IS 'Días máximos hacia el futuro para agendar';

SELECT '✅ Tabla configuracion_disponibilidad creada exitosamente' as status;
