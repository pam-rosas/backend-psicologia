-- ============================================
-- MIGRACIÓN: Sistema de expiración automática de reservas pendientes
-- Fecha: 2025-12-01
-- Descripción: Trigger y función para liberar reservas no pagadas después de 30 minutos
-- ============================================

-- Función para expirar reservas pendientes
CREATE OR REPLACE FUNCTION expirar_reservas_pendientes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar reservas PENDIENTES que tienen más de 30 minutos
  UPDATE reservas_pendientes
  SET 
    estado = 'EXPIRADA',
    updated_at = NOW()
  WHERE 
    estado = 'PENDIENTE' 
    AND created_at < NOW() - INTERVAL '30 minutes';
    
  -- Log de reservas expiradas
  RAISE NOTICE 'Reservas pendientes expiradas: %', (
    SELECT COUNT(*) 
    FROM reservas_pendientes 
    WHERE estado = 'EXPIRADA' 
    AND updated_at > NOW() - INTERVAL '1 minute'
  );
END;
$$;

-- Comentario en la función
COMMENT ON FUNCTION expirar_reservas_pendientes() IS 'Expira reservas pendientes que no fueron pagadas después de 30 minutos';

-- ============================================
-- OPCIÓN 1: Trigger automático (ejecuta en cada INSERT/UPDATE)
-- ============================================
-- Este approach ejecuta la función cada vez que se modifica la tabla
-- Útil si no tienes pg_cron configurado

CREATE OR REPLACE FUNCTION trigger_expirar_reservas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ejecutar expiración solo ocasionalmente (10% de las veces para no sobrecargar)
  IF random() < 0.1 THEN
    PERFORM expirar_reservas_pendientes();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta después de INSERT en reservas_pendientes
DROP TRIGGER IF EXISTS trigger_auto_expirar_reservas ON reservas_pendientes;
CREATE TRIGGER trigger_auto_expirar_reservas
  AFTER INSERT OR UPDATE ON reservas_pendientes
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_expirar_reservas();

COMMENT ON TRIGGER trigger_auto_expirar_reservas ON reservas_pendientes IS 'Trigger que ejecuta la expiración de reservas pendientes ocasionalmente';

-- ============================================
-- OPCIÓN 2: Scheduled Job con pg_cron (si está disponible)
-- ============================================
-- Descomenta las siguientes líneas si tienes pg_cron instalado en Supabase
-- Este approach es más eficiente y recomendado

-- SELECT cron.schedule(
--   'expirar-reservas-pendientes',
--   '*/5 * * * *', -- Cada 5 minutos
--   $$SELECT expirar_reservas_pendientes()$$
-- );

-- COMMENT ON FUNCTION expirar_reservas_pendientes() IS 'Job programado: expira reservas pendientes cada 5 minutos';

-- ============================================
-- Agregar columna de auditoría si no existe
-- ============================================
ALTER TABLE reservas_pendientes
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN reservas_pendientes.expired_at IS 'Timestamp cuando la reserva fue marcada como expirada';

-- Actualizar expired_at cuando cambia a EXPIRADA
CREATE OR REPLACE FUNCTION set_expired_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado = 'EXPIRADA' AND OLD.estado != 'EXPIRADA' THEN
    NEW.expired_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_expired_timestamp ON reservas_pendientes;
CREATE TRIGGER set_expired_timestamp
  BEFORE UPDATE ON reservas_pendientes
  FOR EACH ROW
  EXECUTE FUNCTION set_expired_at();

-- ============================================
-- Índice para mejorar performance de la consulta de expiración
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reservas_pendientes_estado_created 
ON reservas_pendientes(estado, created_at)
WHERE estado = 'PENDIENTE';

COMMENT ON INDEX idx_reservas_pendientes_estado_created IS 'Índice para optimizar búsqueda de reservas pendientes a expirar';

-- ============================================
-- Vista para monitorear reservas por expirar
-- ============================================
CREATE OR REPLACE VIEW reservas_por_expirar AS
SELECT 
  id,
  buy_order,
  nombre_paciente,
  monto,
  estado,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS minutos_transcurridos,
  30 - EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS minutos_restantes
FROM reservas_pendientes
WHERE 
  estado = 'PENDIENTE'
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at ASC;

COMMENT ON VIEW reservas_por_expirar IS 'Vista de reservas pendientes con tiempo restante antes de expirar';
