-- ============================================
-- CONFIGURACIÓN: Bucket de Storage para imágenes y videos
-- Fecha: 2025-12-01
-- ============================================

-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'];

-- Habilitar RLS en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- Policy: Lectura pública de archivos en bucket 'images'
CREATE POLICY "Public Read Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'images');

-- Policy: Solo usuarios autenticados pueden subir archivos
CREATE POLICY "Authenticated Upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy: Solo usuarios autenticados pueden actualizar archivos
CREATE POLICY "Authenticated Update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

-- Policy: Solo usuarios autenticados pueden eliminar archivos
CREATE POLICY "Authenticated Delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- Comentarios
COMMENT ON TABLE storage.buckets IS 'Buckets de almacenamiento de archivos';
