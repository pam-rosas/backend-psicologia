-- ============================================
-- CREAR TABLA BLOQUES_MANUALES
-- ============================================
-- Esta tabla permite al admin bloquear horas específicas
-- o agregar disponibilidad ad-hoc en el calendario

CREATE TABLE IF NOT EXISTS bloques_manuales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    tipo VARCHAR NOT NULL CHECK (tipo IN ('bloqueo', 'disponible')),
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_bloques_manuales_fecha ON bloques_manuales(fecha);

-- Índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_bloques_manuales_tipo ON bloques_manuales(tipo);

-- Comentarios
COMMENT ON TABLE bloques_manuales IS 'Bloques manuales de disponibilidad y bloqueos específicos';
COMMENT ON COLUMN bloques_manuales.tipo IS 'bloqueo: hora no disponible, disponible: hora extra disponible';
COMMENT ON COLUMN bloques_manuales.fecha IS 'Fecha específica para el bloqueo o disponibilidad';

-- Habilitar RLS
ALTER TABLE bloques_manuales ENABLE ROW LEVEL SECURITY;

-- Política: Admin full access
CREATE POLICY "Admin full access bloques_manuales" ON bloques_manuales
    USING (auth.jwt() ->> 'role' = 'admin');

-- Política: Lectura pública para verificar disponibilidad
CREATE POLICY "Public read bloques_manuales" ON bloques_manuales
    FOR SELECT USING (true);

SELECT 'Tabla bloques_manuales creada exitosamente' as status;
