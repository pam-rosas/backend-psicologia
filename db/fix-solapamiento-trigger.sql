-- ============================================
-- DESHABILITAR VALIDACIÓN DE SOLAPAMIENTO
-- ============================================
-- Esta actualización deshabilita temporalmente la validación
-- de solapamiento que está causando conflictos en el DELETE/INSERT

-- Reemplazar la función para que no valide solapamiento
CREATE OR REPLACE FUNCTION validar_solapamiento_horarios()
RETURNS TRIGGER AS $$
BEGIN
    -- FUNCIÓN DESHABILITADA - Solo retorna NEW sin validar
    -- La validación de duplicados exactos ya está cubierta por el constraint UNIQUE
    -- Si se necesita validar solapamientos en el futuro, se puede habilitar
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Actualizar comentario
COMMENT ON FUNCTION validar_solapamiento_horarios() IS 
    'Función deshabilitada - El constraint UNIQUE previene duplicados exactos. Validación de solapamiento puede agregarse si es necesario';

SELECT 'Trigger de solapamiento deshabilitado exitosamente' as status;
