-- ============================================
-- SEED DATA: Paquetes y Horarios Iniciales
-- Fecha: 2025-11-26
-- Descripción: Datos iniciales para el sistema de agendamiento
-- ============================================

-- 1. INSERTAR PAQUETES REALES
INSERT INTO paquetes (nombre, descripcion, duracion, modalidad, precio_nacional, precio_internacional, sesiones, icono, color, destacado, activo)
VALUES 
  (
    'Psicoterapia e Hipnoterapia',
    'Sesión individual de psicoterapia e hipnoterapia para trabajar estados depresivos, ansiosos, de angustia, duelos y crisis vitales. 22 años de experiencia profesional en el área clínica.',
    60,
    'online',
    40000,
    50,
    1,
    'fa-brain',
    '#667eea',
    true,
    true
  ),
  (
    'Taller de Duelo',
    'Taller grupal especializado en procesos de duelo. Incluye 4 sesiones con técnicas de hipnoterapia y acompañamiento personalizado en cada etapa del proceso.',
    120,
    'online',
    70000,
    85,
    4,
    'fa-heart-broken',
    '#f093fb',
    false,
    true
  );

-- 2. INSERTAR HORARIOS DISPONIBLES (Lunes a Viernes)
-- Lunes (1): 09:00-13:00 y 15:00-19:00
INSERT INTO horarios_disponibles (dia_semana, hora_inicio, hora_fin, modalidad, activo)
VALUES 
  (1, '09:00', '13:00', 'ambas', true),
  (1, '15:00', '19:00', 'ambas', true);

-- Martes (2): 09:00-13:00 y 15:00-19:00
INSERT INTO horarios_disponibles (dia_semana, hora_inicio, hora_fin, modalidad, activo)
VALUES 
  (2, '09:00', '13:00', 'ambas', true),
  (2, '15:00', '19:00', 'ambas', true);

-- Miércoles (3): 09:00-13:00 y 15:00-19:00
INSERT INTO horarios_disponibles (dia_semana, hora_inicio, hora_fin, modalidad, activo)
VALUES 
  (3, '09:00', '13:00', 'ambas', true),
  (3, '15:00', '19:00', 'ambas', true);

-- Jueves (4): 09:00-13:00 y 15:00-19:00
INSERT INTO horarios_disponibles (dia_semana, hora_inicio, hora_fin, modalidad, activo)
VALUES 
  (4, '09:00', '13:00', 'ambas', true),
  (4, '15:00', '19:00', 'ambas', true);

-- Viernes (5): 09:00-13:00 y 15:00-17:00
INSERT INTO horarios_disponibles (dia_semana, hora_inicio, hora_fin, modalidad, activo)
VALUES 
  (5, '09:00', '13:00', 'ambas', true),
  (5, '15:00', '17:00', 'ambas', true);

-- Sábado (6): 10:00-14:00 (solo online)
INSERT INTO horarios_disponibles (dia_semana, hora_inicio, hora_fin, modalidad, activo)
VALUES 
  (6, '10:00', '14:00', 'online', true);

-- 3. INSERTAR EXCEPCIONES DE EJEMPLO (Días festivos 2025-2026)
-- Navidad 2025
INSERT INTO excepciones_horarios (fecha, hora_inicio, hora_fin, motivo, bloqueado)
VALUES 
  ('2025-12-25', NULL, NULL, 'Navidad', true);

-- Año Nuevo 2026
INSERT INTO excepciones_horarios (fecha, hora_inicio, hora_fin, motivo, bloqueado)
VALUES 
  ('2026-01-01', NULL, NULL, 'Año Nuevo', true);

-- Ejemplo de día extra disponible (Sábado especial)
INSERT INTO excepciones_horarios (fecha, hora_inicio, hora_fin, motivo, bloqueado)
VALUES 
  ('2025-12-07', '10:00', '14:00', 'Día extra de atención', false);

-- 4. VERIFICACIÓN DE DATOS
-- Mostrar paquetes insertados
SELECT 
  nombre,
  duracion || ' min' as duracion,
  modalidad,
  '$' || precio_nacional as precio,
  sesiones || ' sesión(es)' as sesiones,
  CASE WHEN destacado THEN 'Sí' ELSE 'No' END as destacado
FROM paquetes
ORDER BY destacado DESC, nombre;

-- Mostrar horarios por día
SELECT 
  CASE dia_semana
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
  END as dia,
  hora_inicio || ' - ' || hora_fin as horario,
  modalidad
FROM horarios_disponibles
WHERE activo = true
ORDER BY dia_semana, hora_inicio;
