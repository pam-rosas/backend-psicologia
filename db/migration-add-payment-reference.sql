-- ============================================
-- MIGRACIÓN: Agregar payment_reference a citas
-- Fecha: 2025-12-01
-- Descripción: Agregar columna para tracking de pagos Webpay
-- ============================================

-- Agregar columna payment_reference para tracking de transacciones
ALTER TABLE citas 
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);

-- Agregar columna payment_status si no existe
ALTER TABLE citas
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed'));

-- Índice para búsquedas por referencia de pago
CREATE INDEX IF NOT EXISTS idx_citas_payment_reference ON citas(payment_reference);

-- Comentarios
COMMENT ON COLUMN citas.payment_reference IS 'Referencia de pago Webpay (buy_order)';
COMMENT ON COLUMN citas.payment_status IS 'Estado del pago de la cita';

-- Actualizar citas existentes sin payment_status a 'pending'
UPDATE citas 
SET payment_status = 'pending' 
WHERE payment_status IS NULL;
