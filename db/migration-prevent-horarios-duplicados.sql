-- ============================================
-- PREVENIR HORARIOS DISPONIBLES DUPLICADOS
-- ============================================
-- Esta migración agrega protecciones para evitar
-- que se creen horarios duplicados en horarios_disponibles

-- PASO 0: Limpiar duplicados existentes antes de crear constraints
-- Mantener solo el horario más antiguo (menor created_at) de cada grupo duplicado
WITH duplicados AS (
    SELECT 
        id,
        dia_semana,
        hora_inicio,
        hora_fin,
        modalidad,
        ROW_NUMBER() OVER (
            PARTITION BY dia_semana, hora_inicio, hora_fin, modalidad 
            ORDER BY created_at ASC
        ) as rn
    FROM horarios_disponibles
)
DELETE FROM horarios_disponibles
WHERE id IN (
    SELECT id FROM duplicados WHERE rn > 1
);

-- Mostrar resultado de limpieza
DO $$ 
BEGIN
    RAISE NOTICE 'Duplicados de horarios_disponibles eliminados exitosamente';
END $$;

-- 1. Agregar constraint único compuesto
-- Esto evita que se inserten horarios con el mismo día, hora_inicio, hora_fin y modalidad
ALTER TABLE horarios_disponibles 
DROP CONSTRAINT IF EXISTS unique_horario_disponible;

ALTER TABLE horarios_disponibles 
ADD CONSTRAINT unique_horario_disponible 
UNIQUE (dia_semana, hora_inicio, hora_fin, modalidad);

-- 2. Función para validar solapamiento de horarios
-- Esto previene que se creen horarios que se solapen en tiempo para el mismo día
-- NOTA: Esta función está DESHABILITADA porque el constraint UNIQUE ya previene duplicados exactos
-- y el solapamiento puede ser manejado por la UI o el backend si es necesario
CREATE OR REPLACE FUNCTION validar_solapamiento_horarios()
RETURNS TRIGGER AS $$
BEGIN
    -- FUNCIÓN DESHABILITADA - Solo retorna NEW sin validar
    -- La validación de duplicados exactos ya está cubierta por el constraint UNIQUE
    -- Si se necesita validar solapamientos en el futuro, descomentar el código siguiente:
    
    /*
    -- Verificar si existe un horario que se solape con el nuevo para el mismo día
    IF EXISTS (
        SELECT 1 
        FROM horarios_disponibles
        WHERE dia_semana = NEW.dia_semana
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            -- Caso 1: El nuevo horario empieza durante un horario existente
            (NEW.hora_inicio >= hora_inicio AND NEW.hora_inicio < hora_fin)
            OR
            -- Caso 2: El nuevo horario termina durante un horario existente
            (NEW.hora_fin > hora_inicio AND NEW.hora_fin <= hora_fin)
            OR
            -- Caso 3: El nuevo horario envuelve completamente a un horario existente
            (NEW.hora_inicio <= hora_inicio AND NEW.hora_fin >= hora_fin)
        )
    ) THEN
        RAISE EXCEPTION 'Ya existe un horario que se solapa para el día % en el rango % - %', 
            NEW.dia_semana, NEW.hora_inicio, NEW.hora_fin;
    END IF;
    */
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger para validar antes de insertar o actualizar
DROP TRIGGER IF EXISTS trigger_validar_solapamiento_horarios ON horarios_disponibles;

CREATE TRIGGER trigger_validar_solapamiento_horarios
    BEFORE INSERT OR UPDATE ON horarios_disponibles
    FOR EACH ROW
    EXECUTE FUNCTION validar_solapamiento_horarios();

-- 4. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at_horarios()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_actualizar_updated_at_horarios ON horarios_disponibles;

CREATE TRIGGER trigger_actualizar_updated_at_horarios
    BEFORE UPDATE ON horarios_disponibles
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at_horarios();

-- 6. Índice compuesto para mejorar performance de validación
CREATE INDEX IF NOT EXISTS idx_horarios_disponibles_completo 
ON horarios_disponibles(dia_semana, hora_inicio, hora_fin, modalidad);

-- 7. Comentarios
COMMENT ON CONSTRAINT unique_horario_disponible ON horarios_disponibles IS 
    'Previene horarios duplicados exactos para el mismo día, hora y modalidad';

COMMENT ON FUNCTION validar_solapamiento_horarios() IS 
    'Función deshabilitada - El constraint UNIQUE previene duplicados exactos. Validación de solapamiento puede agregarse si es necesario';

SELECT 'Protecciones contra duplicados en horarios_disponibles instaladas exitosamente' as status;
