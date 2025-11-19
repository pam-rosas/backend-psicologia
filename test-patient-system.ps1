# Test completo del sistema de pacientes
Write-Host "`n========== TEST SISTEMA DE PACIENTES ==========`n" -ForegroundColor Cyan

# 1. Login
Write-Host "[1] Login admin..." -NoNewline
$loginBody = @{
    username = "admin"
    contrasena = "admin123"
} | ConvertTo-Json

try {
    $loginResult = Invoke-RestMethod -Uri "http://localhost:3000/api/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody
    $token = $loginResult.token
    Write-Host " OK" -ForegroundColor Green
    Write-Host "    Token obtenido" -ForegroundColor Gray
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "    Error: $_" -ForegroundColor Red
    exit
}

# 2. Formato LEGACY - debe RECHAZAR (ya no soportado)
Write-Host "`n[2] Formato LEGACY (debe rechazar)..." -NoNewline
$legacyBody = @{
    patient_name = "Test Legacy"
    patient_email = "legacy@test.com"
    treatment_id = "43d6b776-0430-4848-a142-a44c17534e00"
    fecha = "2025-12-01"
    hora = "09:00"
} | ConvertTo-Json

try {
    $legacy = Invoke-RestMethod -Uri "http://localhost:3000/api/citas" -Method POST -Headers @{"Content-Type"="application/json"} -Body $legacyBody -ErrorAction Stop
    Write-Host " FAILED - no rechazó formato legacy" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host " OK - rechazó correctamente" -ForegroundColor Green
        Write-Host "    Formato legacy ya no soportado ✅" -ForegroundColor Gray
    } else {
        Write-Host " ERROR inesperado" -ForegroundColor Yellow
        Write-Host "    $_" -ForegroundColor Yellow
    }
}

# 3. Crear cita con FORMATO NUEVO MÍNIMO (sin RUT)
Write-Host "`n[3] Formato NUEVO sin RUT..." -NoNewline
$simpleBody = @{
    patient = @{
        full_name = "Test Simple"
        email = "simple@test.com"
        phone = "+56912345678"
    }
    treatment_id = "43d6b776-0430-4848-a142-a44c17534e00"
    fecha = "2025-12-01"
    hora = "10:00"
} | ConvertTo-Json -Depth 10

try {
    $simple = Invoke-RestMethod -Uri "http://localhost:3000/api/citas" -Method POST -Headers @{"Content-Type"="application/json"} -Body $simpleBody
    Write-Host " OK" -ForegroundColor Green
    Write-Host "    Cita ID: $($simple.cita.id)" -ForegroundColor Gray
    Write-Host "    Patient ID: $($simple.cita.patient_id)" -ForegroundColor Gray
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Crear cita con RUT VÁLIDO
Write-Host "`n[4] Formato NUEVO con RUT válido (11111111-1)..." -NoNewline
$rutBody = @{
    patient = @{
        full_name = "Test Con RUT"
        email = "conrut@test.com"
        rut = "11111111-1"
        phone = "+56923456789"
    }
    treatment_id = "43d6b776-0430-4848-a142-a44c17534e00"
    fecha = "2025-12-01"
    hora = "11:00"
} | ConvertTo-Json -Depth 10

try {
    $rut = Invoke-RestMethod -Uri "http://localhost:3000/api/citas" -Method POST -Headers @{"Content-Type"="application/json"} -Body $rutBody
    Write-Host " OK" -ForegroundColor Green
    Write-Host "    Cita ID: $($rut.cita.id)" -ForegroundColor Gray
    Write-Host "    Patient ID: $($rut.cita.patient_id)" -ForegroundColor Gray
    Write-Host "    RUT guardado: $($rut.paciente.rut)" -ForegroundColor Gray
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Crear cita con RUT INVÁLIDO (debe rechazar)
Write-Host "`n[5] RUT INVÁLIDO (12345678-9) - debe rechazar..." -NoNewline
$badRutBody = @{
    patient = @{
        full_name = "Test RUT Malo"
        email = "malrut@test.com"
        rut = "12345678-9"
        phone = "+56934567890"
    }
    treatment_id = "43d6b776-0430-4848-a142-a44c17534e00"
    fecha = "2025-12-01"
    hora = "12:00"
} | ConvertTo-Json -Depth 10

try {
    $badRut = Invoke-RestMethod -Uri "http://localhost:3000/api/citas" -Method POST -Headers @{"Content-Type"="application/json"} -Body $badRutBody -ErrorAction Stop
    Write-Host " FAILED - no rechazó RUT inválido" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host " OK - rechazó correctamente" -ForegroundColor Green
        Write-Host "    Mensaje: RUT inválido esperado" -ForegroundColor Gray
    } else {
        Write-Host " ERROR inesperado" -ForegroundColor Yellow
        Write-Host "    $_" -ForegroundColor Yellow
    }
}

# 6. Crear cita con DATOS COMPLETOS
Write-Host "`n[6] Formato COMPLETO con emergencia y notas..." -NoNewline
$fullBody = @{
    patient = @{
        full_name = "Test Completo"
        email = "completo@test.com"
        rut = "22222222-2"
        phone = "+56945678901"
        birth_date = "1990-05-20"
        city = "Santiago"
        region = "Metropolitana"
        emergency_contact_name = "Maria Test"
        emergency_contact_phone = "+56987654321"
        medical_notes = "Alergia a la penicilina"
    }
    treatment_id = "43d6b776-0430-4848-a142-a44c17534e00"
    fecha = "2025-12-01"
    hora = "14:00"
    notas = "Primera sesión"
} | ConvertTo-Json -Depth 10

try {
    $full = Invoke-RestMethod -Uri "http://localhost:3000/api/citas" -Method POST -Headers @{"Content-Type"="application/json"} -Body $fullBody
    Write-Host " OK" -ForegroundColor Green
    Write-Host "    Cita ID: $($full.cita.id)" -ForegroundColor Gray
    Write-Host "    Patient ID: $($full.cita.patient_id)" -ForegroundColor Gray
    if ($full.paciente) {
        Write-Host "    Ciudad: $($full.paciente.city)" -ForegroundColor Gray
        Write-Host "    Emergencia: $($full.paciente.emergency_contact_name)" -ForegroundColor Gray
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Actualizar paciente existente (mismo email)
Write-Host "`n[7] Actualizar paciente (mismo email, nuevo RUT)..." -NoNewline
$updateBody = @{
    patient = @{
        full_name = "Test Completo ACTUALIZADO"
        email = "completo@test.com"
        rut = "33333333-3"
        phone = "+56956789012"
        city = "Valparaíso"
    }
    treatment_id = "43d6b776-0430-4848-a142-a44c17534e00"
    fecha = "2025-12-01"
    hora = "15:00"
} | ConvertTo-Json -Depth 10

try {
    $update = Invoke-RestMethod -Uri "http://localhost:3000/api/citas" -Method POST -Headers @{"Content-Type"="application/json"} -Body $updateBody
    Write-Host " OK" -ForegroundColor Green
    Write-Host "    Cita ID: $($update.cita.id)" -ForegroundColor Gray
    Write-Host "    Patient ID (mismo): $($update.cita.patient_id)" -ForegroundColor Gray
    Write-Host "    Nuevo RUT: $($update.paciente.rut)" -ForegroundColor Gray
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Listar todas las citas creadas
Write-Host "`n[8] Listar todas las citas..." -NoNewline
try {
    $citas = Invoke-RestMethod -Uri "http://localhost:3000/api/citas" -Headers @{Authorization="Bearer $token"}
    Write-Host " OK" -ForegroundColor Green
    Write-Host "    Total: $($citas.Count) citas" -ForegroundColor Gray
    $citas | ForEach-Object {
        Write-Host "    - $($_.cliente) | Email: $($_.patient_email) | Patient_ID: $(if($_.patient_id) {'✅'} else {'❌'})" -ForegroundColor Gray
    }
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========== FIN TEST ==========`n" -ForegroundColor Cyan
