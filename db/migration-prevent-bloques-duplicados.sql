-- ============================================
-- PREVENIR BLOQUES MANUALES DUPLICADOS
-- ============================================
-- Esta migración agrega protecciones para evitar
-- que se creen bloques duplicados en la misma fecha/hora

-- PASO 0: Limpiar duplicados existentes antes de crear constraints
-- Mantener solo el bloque más antiguo (menor created_at) de cada grupo duplicado
WITH duplicados AS (
    SELECT 
        id,
        fecha,
        hora_inicio,
        hora_fin,
        ROW_NUMBER() OVER (
            PARTITION BY fecha, hora_inicio, hora_fin 
            ORDER BY created_at ASC
        ) as rn
    FROM bloques_manuales
)
DELETE FROM bloques_manuales
WHERE id IN (
    SELECT id FROM duplicados WHERE rn > 1
);

-- Mostrar resultado de limpieza
DO $$ 
BEGIN
    RAISE NOTICE 'Duplicados eliminados exitosamente';
END $$;

-- 1. Agregar constraint único compuesto
-- Esto evita que se inserten bloques con la misma fecha, hora_inicio y hora_fin
ALTER TABLE bloques_manuales 
DROP CONSTRAINT IF EXISTS unique_bloque_fecha_hora;

ALTER TABLE bloques_manuales 
ADD CONSTRAINT unique_bloque_fecha_hora 
UNIQUE (fecha, hora_inicio, hora_fin);

-- 2. Función para validar solapamiento de bloques
-- Esto previene que se creen bloques que se solapen en tiempo
CREATE OR REPLACE FUNCTION validar_solapamiento_bloques()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si existe un bloqueo que se solape con el nuevo
    IF EXISTS (
        SELECT 1 
        FROM bloques_manuales
        WHERE fecha = NEW.fecha
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            -- Caso 1: El nuevo bloque empieza durante un bloque existente
            (NEW.hora_inicio >= hora_inicio AND NEW.hora_inicio < hora_fin)
            OR
            -- Caso 2: El nuevo bloque termina durante un bloque existente
            (NEW.hora_fin > hora_inicio AND NEW.hora_fin <= hora_fin)
            OR
            -- Caso 3: El nuevo bloque envuelve completamente a un bloque existente
            (NEW.hora_inicio <= hora_inicio AND NEW.hora_fin >= hora_fin)
        )
    ) THEN
        RAISE EXCEPTION 'Ya existe un bloque que se solapa con el horario especificado para la fecha %', NEW.fecha;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger para validar antes de insertar o actualizar
DROP TRIGGER IF EXISTS trigger_validar_solapamiento ON bloques_manuales;

CREATE TRIGGER trigger_validar_solapamiento
    BEFORE INSERT OR UPDATE ON bloques_manuales
    FOR EACH ROW
    EXECUTE FUNCTION validar_solapamiento_bloques();

-- 4. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_actualizar_updated_at ON bloques_manuales;

CREATE TRIGGER trigger_actualizar_updated_at
    BEFORE UPDATE ON bloques_manuales
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

-- 6. Índice compuesto para mejorar performance de validación
CREATE INDEX IF NOT EXISTS idx_bloques_manuales_fecha_horas 
ON bloques_manuales(fecha, hora_inicio, hora_fin);

-- 7. Comentarios
COMMENT ON CONSTRAINT unique_bloque_fecha_hora ON bloques_manuales IS 
    'Previene bloques duplicados exactos en la misma fecha y hora';

COMMENT ON FUNCTION validar_solapamiento_bloques() IS 
    'Valida que no existan bloques solapados en la misma fecha';

SELECT 'Protecciones contra duplicados instaladas exitosamente' as status;
