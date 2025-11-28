-- ============================================
-- CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ============================================
-- Implementar políticas de seguridad para proteger datos sensibles

-- ============================================
-- 1. HABILITAR RLS EN TABLAS
-- ============================================

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_disponibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE excepciones_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloques_manuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE paquetes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. POLÍTICAS PARA PAQUETES
-- ============================================

-- Lectura pública solo de paquetes activos
DROP POLICY IF EXISTS "Public read paquetes activos" ON paquetes;
CREATE POLICY "Public read paquetes activos" ON paquetes
    FOR SELECT 
    USING (activo = true);

-- Admin full access
DROP POLICY IF EXISTS "Admin full access paquetes" ON paquetes;
CREATE POLICY "Admin full access paquetes" ON paquetes
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 3. POLÍTICAS PARA HORARIOS_DISPONIBLES
-- ============================================

-- Lectura pública de horarios activos
DROP POLICY IF EXISTS "Public read horarios activos" ON horarios_disponibles;
CREATE POLICY "Public read horarios activos" ON horarios_disponibles
    FOR SELECT 
    USING (activo = true);

-- Admin full access
DROP POLICY IF EXISTS "Admin full access horarios" ON horarios_disponibles;
CREATE POLICY "Admin full access horarios" ON horarios_disponibles
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 4. POLÍTICAS PARA EXCEPCIONES_HORARIOS
-- ============================================

-- Lectura pública para verificar disponibilidad
DROP POLICY IF EXISTS "Public read excepciones" ON excepciones_horarios;
CREATE POLICY "Public read excepciones" ON excepciones_horarios
    FOR SELECT 
    USING (true);

-- Admin full access
DROP POLICY IF EXISTS "Admin full access excepciones" ON excepciones_horarios;
CREATE POLICY "Admin full access excepciones" ON excepciones_horarios
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 5. POLÍTICAS PARA BLOQUES_MANUALES
-- ============================================

-- Lectura pública para verificar disponibilidad
DROP POLICY IF EXISTS "Public read bloques_manuales" ON bloques_manuales;
CREATE POLICY "Public read bloques_manuales" ON bloques_manuales
    FOR SELECT 
    USING (true);

-- Admin full access
DROP POLICY IF EXISTS "Admin full access bloques_manuales" ON bloques_manuales;
CREATE POLICY "Admin full access bloques_manuales" ON bloques_manuales
    USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- 6. POLÍTICAS PARA CITAS
-- ============================================

-- Admin puede ver todas las citas
DROP POLICY IF EXISTS "Admin read all citas" ON citas;
CREATE POLICY "Admin read all citas" ON citas
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Admin puede modificar todas las citas
DROP POLICY IF EXISTS "Admin modify all citas" ON citas;
CREATE POLICY "Admin modify all citas" ON citas
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Usuarios pueden crear citas (registro público)
DROP POLICY IF EXISTS "Public insert citas" ON citas;
CREATE POLICY "Public insert citas" ON citas
    FOR INSERT
    WITH CHECK (true);

-- Usuarios pueden ver sus propias citas (por email)
DROP POLICY IF EXISTS "Users read own citas" ON citas;
CREATE POLICY "Users read own citas" ON citas
    FOR SELECT
    USING (
        email_paciente = auth.jwt() ->> 'email' 
        OR 
        auth.jwt() ->> 'role' = 'admin'
    );

-- Resultado
SELECT '✅ Políticas RLS configuradas exitosamente' as status;
