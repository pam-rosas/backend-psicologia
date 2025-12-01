-- ==========================================
-- MIGRACIÓN: Tabla para reservas pendientes de pago
-- Autor: Sistema de Webpay
-- Fecha: 2025-12-01
-- Propósito: Almacenar datos de reservas mientras el pago está en proceso
-- ==========================================

-- Crear tabla de reservas pendientes
CREATE TABLE IF NOT EXISTS reservas_pendientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificadores de Webpay
  buy_order VARCHAR(255) UNIQUE NOT NULL,
  webpay_token VARCHAR(500),
  
  -- Datos del paquete
  paquete_id UUID NOT NULL,
  
  -- Datos del paciente
  rut_paciente VARCHAR(12) NOT NULL,
  nombre_paciente VARCHAR(255) NOT NULL,
  email_paciente VARCHAR(255) NOT NULL,
  telefono_paciente VARCHAR(20) NOT NULL,
  notas TEXT,
  direccion TEXT,
  comuna VARCHAR(100),
  
  -- Datos de las sesiones (almacenado como JSON)
  sesiones JSONB NOT NULL,
  -- Ejemplo: [{"fecha": "2025-12-15", "horaInicio": "10:00", "horaFin": "11:00"}]
  
  -- Datos de la transacción
  modalidad VARCHAR(20) NOT NULL,
  monto INTEGER NOT NULL,
  
  -- Estado de la reserva
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  -- Valores: 'pendiente', 'pagada', 'fallida', 'expirada', 'cancelada'
  
  -- Respuesta de Webpay (almacenada cuando se confirma)
  webpay_response JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Relación con las citas creadas (si el pago fue exitoso)
  citas_ids UUID[],
  
  -- Constraints
  CONSTRAINT fk_paquete FOREIGN KEY (paquete_id) REFERENCES paquetes(id) ON DELETE CASCADE,
  CONSTRAINT check_estado CHECK (estado IN ('pendiente', 'pagada', 'fallida', 'expirada', 'cancelada')),
  CONSTRAINT check_modalidad CHECK (modalidad IN ('online', 'presencial', 'ambas'))
);

-- Índices para mejorar performance
CREATE INDEX idx_reservas_pendientes_buy_order ON reservas_pendientes(buy_order);
CREATE INDEX idx_reservas_pendientes_webpay_token ON reservas_pendientes(webpay_token);
CREATE INDEX idx_reservas_pendientes_estado ON reservas_pendientes(estado);
CREATE INDEX idx_reservas_pendientes_rut_paciente ON reservas_pendientes(rut_paciente);
CREATE INDEX idx_reservas_pendientes_created_at ON reservas_pendientes(created_at DESC);
CREATE INDEX idx_reservas_pendientes_expires_at ON reservas_pendientes(expires_at);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_reservas_pendientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reservas_pendientes_updated_at
  BEFORE UPDATE ON reservas_pendientes
  FOR EACH ROW
  EXECUTE FUNCTION update_reservas_pendientes_updated_at();

-- Función para limpiar reservas expiradas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION limpiar_reservas_expiradas()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Marcar como expiradas las reservas pendientes con más de 2 horas
  UPDATE reservas_pendientes
  SET estado = 'expirada',
      updated_at = NOW()
  WHERE estado = 'pendiente'
    AND created_at < NOW() - INTERVAL '2 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentarios en la tabla
COMMENT ON TABLE reservas_pendientes IS 'Almacena reservas mientras el pago está en proceso con Webpay';
COMMENT ON COLUMN reservas_pendientes.buy_order IS 'Orden de compra única generada para Transbank';
COMMENT ON COLUMN reservas_pendientes.webpay_token IS 'Token de transacción retornado por Webpay';
COMMENT ON COLUMN reservas_pendientes.sesiones IS 'Array JSON con las sesiones seleccionadas';
COMMENT ON COLUMN reservas_pendientes.estado IS 'Estado actual: pendiente, pagada, fallida, expirada, cancelada';
COMMENT ON COLUMN reservas_pendientes.webpay_response IS 'Respuesta completa de Transbank al confirmar el pago';
COMMENT ON COLUMN reservas_pendientes.citas_ids IS 'Array de UUIDs de las citas creadas tras pago exitoso';
COMMENT ON COLUMN reservas_pendientes.expires_at IS 'Fecha de expiración de la reserva (típicamente created_at + 2 horas)';

-- Configurar RLS (Row Level Security)
ALTER TABLE reservas_pendientes ENABLE ROW LEVEL SECURITY;

-- Policy: Admins pueden ver todas las reservas
CREATE POLICY "Admins pueden ver todas las reservas pendientes"
  ON reservas_pendientes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy: Sistema puede insertar y actualizar
CREATE POLICY "Sistema puede gestionar reservas pendientes"
  ON reservas_pendientes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON reservas_pendientes TO authenticated;
GRANT ALL ON reservas_pendientes TO service_role;

-- Log de migración
DO $$
BEGIN
  RAISE NOTICE 'Migración completada: Tabla reservas_pendientes creada exitosamente';
  RAISE NOTICE 'Índices creados: 6 índices para optimizar consultas';
  RAISE NOTICE 'Triggers configurados: update_updated_at';
  RAISE NOTICE 'Funciones creadas: limpiar_reservas_expiradas()';
END $$;
