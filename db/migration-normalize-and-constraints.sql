-- ============================================
-- NORMALIZACIÓN DE VALORES Y CONSTRAINTS
-- ============================================
-- Estandarizar valores en toda la base de datos

-- ============================================
-- 1. NORMALIZAR MODALIDADES
-- ============================================

-- Normalizar en tabla 'citas'
UPDATE citas 
SET modalidad = CASE 
    WHEN LOWER(modalidad) IN ('remoto', 'remote') THEN 'online'
    WHEN LOWER(modalidad) IN ('hybrid', 'ambos') THEN 'ambas'
    WHEN LOWER(modalidad) = 'presencial' THEN 'presencial'
    ELSE 'online'
END
WHERE modalidad IS NOT NULL;

-- Normalizar en tabla 'horarios_disponibles'
UPDATE horarios_disponibles 
SET modalidad = CASE 
    WHEN LOWER(modalidad) IN ('remoto', 'remote') THEN 'online'
    WHEN LOWER(modalidad) IN ('hybrid', 'ambos') THEN 'ambas'
    WHEN LOWER(modalidad) = 'presencial' THEN 'presencial'
    ELSE 'online'
END
WHERE modalidad IS NOT NULL;

-- Normalizar en tabla 'paquetes'
UPDATE paquetes 
SET modalidad = CASE 
    WHEN LOWER(modalidad) IN ('remoto', 'remote') THEN 'online'
    WHEN LOWER(modalidad) IN ('hybrid', 'ambos') THEN 'ambas'
    WHEN LOWER(modalidad) = 'presencial' THEN 'presencial'
    ELSE 'online'
END
WHERE modalidad IS NOT NULL;

-- ============================================
-- 2. NORMALIZAR ESTADOS DE CITAS
-- ============================================

UPDATE citas 
SET estado = CASE 
    WHEN LOWER(estado) IN ('confirmed', 'confirmado') THEN 'confirmada'
    WHEN LOWER(estado) IN ('cancelled', 'cancelado') THEN 'cancelada'
    WHEN LOWER(estado) IN ('completed', 'completado') THEN 'completada'
    WHEN LOWER(estado) IN ('pending', 'pendiente') THEN 'pendiente'
    ELSE 'pendiente'
END
WHERE estado IS NOT NULL;

-- ============================================
-- 3. AGREGAR CONSTRAINTS
-- ============================================

-- Constraint para modalidad en citas
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_modalidad_check;
ALTER TABLE citas 
ADD CONSTRAINT citas_modalidad_check 
CHECK (modalidad IN ('presencial', 'online', 'ambas'));

-- Constraint para estado en citas
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;
ALTER TABLE citas 
ADD CONSTRAINT citas_estado_check 
CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada'));

-- Constraint para modalidad en horarios_disponibles
ALTER TABLE horarios_disponibles DROP CONSTRAINT IF EXISTS horarios_modalidad_check;
ALTER TABLE horarios_disponibles 
ADD CONSTRAINT horarios_modalidad_check 
CHECK (modalidad IN ('presencial', 'online', 'ambas'));

-- Constraint para modalidad en paquetes
ALTER TABLE paquetes DROP CONSTRAINT IF EXISTS paquetes_modalidad_check;
ALTER TABLE paquetes 
ADD CONSTRAINT paquetes_modalidad_check 
CHECK (modalidad IN ('presencial', 'online', 'ambas'));

-- Constraint para tipo en bloques_manuales (si no existe)
ALTER TABLE bloques_manuales DROP CONSTRAINT IF EXISTS bloques_manuales_tipo_check;
ALTER TABLE bloques_manuales 
ADD CONSTRAINT bloques_manuales_tipo_check 
CHECK (tipo IN ('bloqueo', 'disponible'));

-- ============================================
-- 4. AGREGAR FOREIGN KEYS
-- ============================================

-- citas → paquetes
ALTER TABLE citas DROP CONSTRAINT IF EXISTS fk_citas_paquetes;
ALTER TABLE citas 
ADD CONSTRAINT fk_citas_paquetes 
FOREIGN KEY (paquete_id) REFERENCES paquetes(id) ON DELETE SET NULL;

-- ============================================
-- 5. CREAR ÍNDICES PARA RENDIMIENTO
-- ============================================

-- Índices en citas
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_paquete_id ON citas(paquete_id);
CREATE INDEX IF NOT EXISTS idx_citas_email ON citas(email_paciente);
CREATE INDEX IF NOT EXISTS idx_citas_fecha_hora ON citas(fecha, hora);

-- Índices en horarios_disponibles
CREATE INDEX IF NOT EXISTS idx_horarios_dia_semana ON horarios_disponibles(dia_semana);
CREATE INDEX IF NOT EXISTS idx_horarios_activo ON horarios_disponibles(activo);

-- Índices en excepciones_horarios
CREATE INDEX IF NOT EXISTS idx_excepciones_fecha ON excepciones_horarios(fecha);
CREATE INDEX IF NOT EXISTS idx_excepciones_bloqueado ON excepciones_horarios(bloqueado);

-- Índices en paquetes
CREATE INDEX IF NOT EXISTS idx_paquetes_activo ON paquetes(activo);
CREATE INDEX IF NOT EXISTS idx_paquetes_destacado ON paquetes(destacado);

-- ============================================
-- 6. ACTUALIZAR TIMESTAMPS
-- ============================================

-- Trigger para updated_at en citas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_citas_updated_at ON citas;
CREATE TRIGGER update_citas_updated_at 
    BEFORE UPDATE ON citas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_horarios_updated_at ON horarios_disponibles;
CREATE TRIGGER update_horarios_updated_at 
    BEFORE UPDATE ON horarios_disponibles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_paquetes_updated_at ON paquetes;
CREATE TRIGGER update_paquetes_updated_at 
    BEFORE UPDATE ON paquetes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bloques_updated_at ON bloques_manuales;
CREATE TRIGGER update_bloques_updated_at 
    BEFORE UPDATE ON bloques_manuales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Resultado
SELECT '✅ Normalización y constraints aplicados exitosamente' as status;
