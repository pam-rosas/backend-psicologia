-- ============================================
-- MIGRACIÓN: Tabla de comentarios de pacientes
-- Fecha: 2025-12-01
-- Descripción: Sistema de comentarios con moderación
-- ============================================

-- Crear tabla de comentarios
CREATE TABLE IF NOT EXISTS comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name VARCHAR(255) NOT NULL,
  comment_text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comentarios_approved ON comentarios(is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_rating ON comentarios(rating);
CREATE INDEX IF NOT EXISTS idx_comentarios_created_at ON comentarios(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_comentarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comentarios_updated_at ON comentarios;
CREATE TRIGGER trigger_update_comentarios_updated_at
  BEFORE UPDATE ON comentarios
  FOR EACH ROW
  EXECUTE FUNCTION update_comentarios_updated_at();

-- Comentarios en la tabla
COMMENT ON TABLE comentarios IS 'Comentarios y testimonios de pacientes con sistema de moderación';
COMMENT ON COLUMN comentarios.author_name IS 'Nombre del autor del comentario';
COMMENT ON COLUMN comentarios.comment_text IS 'Texto del comentario o testimonio';
COMMENT ON COLUMN comentarios.rating IS 'Calificación de 1 a 5 estrellas';
COMMENT ON COLUMN comentarios.is_approved IS 'Si el comentario ha sido aprobado por un administrador';
COMMENT ON COLUMN comentarios.approved_at IS 'Fecha y hora de aprobación';
COMMENT ON COLUMN comentarios.approved_by IS 'Usuario administrador que aprobó el comentario';

-- RLS Policies
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- Policy: Cualquiera puede ver comentarios aprobados
CREATE POLICY "Comentarios aprobados son públicos"
  ON comentarios
  FOR SELECT
  USING (is_approved = true);

-- Policy: Cualquiera puede crear comentarios (pendientes de aprobación)
CREATE POLICY "Cualquiera puede crear comentarios"
  ON comentarios
  FOR INSERT
  WITH CHECK (true);

-- Policy: Solo admins pueden ver todos los comentarios
CREATE POLICY "Admins pueden ver todos los comentarios"
  ON comentarios
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Solo admins pueden aprobar/rechazar comentarios
CREATE POLICY "Admins pueden actualizar comentarios"
  ON comentarios
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Solo admins pueden eliminar comentarios
CREATE POLICY "Admins pueden eliminar comentarios"
  ON comentarios
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Vista para estadísticas de comentarios
CREATE OR REPLACE VIEW comentarios_stats AS
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_approved = true) as aprobados,
  COUNT(*) FILTER (WHERE is_approved = false) as pendientes,
  ROUND(AVG(rating), 2) as rating_promedio,
  ROUND(AVG(rating) FILTER (WHERE is_approved = true), 2) as rating_promedio_aprobados
FROM comentarios;

COMMENT ON VIEW comentarios_stats IS 'Estadísticas generales de comentarios';

-- Insertar algunos comentarios de ejemplo (pendientes de aprobación)
INSERT INTO comentarios (author_name, comment_text, rating, is_approved) VALUES
  ('María González', 'Excelente atención, el profesional fue muy empático y me ayudó mucho en mi proceso.', 5, true),
  ('Juan Pérez', 'Las sesiones online son muy convenientes y efectivas. Recomiendo totalmente.', 5, true),
  ('Ana Silva', 'Me sentí escuchada y comprendida. El espacio es muy acogedor.', 4, true);
