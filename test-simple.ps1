# Script de Testing Simplificado - Backend Psicologia
# Encoding: UTF-8
# Ejecutar: .\test-simple.ps1

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000"

Write-Host "===========================================
" -ForegroundColor Cyan
Write-Host "   TESTING BACKEND PSICOLOGIA - SUPABASE   " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Test 1: Verificar servidor
Write-Host "`n[1] Verificando servidor..." -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod -Uri "$baseUrl/api/test" -Method GET
    Write-Host "OK - Servidor funcionando" -ForegroundColor Green
    Write-Host "Rutas migradas: $($test.routes.migrated.Count)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR - Servidor no responde" -ForegroundColor Red
    exit 1
}

# Test 2: Login Admin
Write-Host "`n[2] Login Admin..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    contrasena = "admin123"
} | ConvertTo-Json

try {
    $loginResult = Invoke-RestMethod -Uri "$baseUrl/api/login" -Method POST -ContentType "application/json" -Body $loginBody
    $adminToken = $loginResult.token
    Write-Host "OK - Token obtenido" -ForegroundColor Green
    Write-Host "Usuario: $($loginResult.user.username), Role: $($loginResult.user.role)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR - Login fallido" -ForegroundColor Red
    exit 1
}

# Test 3: Obtener Tratamientos
Write-Host "`n[3] Obtener Tratamientos..." -ForegroundColor Yellow
try {
    $tratamientos = Invoke-RestMethod -Uri "$baseUrl/api/tratamientos" -Method GET
    $tratamientoId = $tratamientos[0].id
    Write-Host "OK - $($tratamientos.Count) tratamientos encontrados" -ForegroundColor Green
    Write-Host "Primer tratamiento: $($tratamientos[0].name)" -ForegroundColor Gray
    Write-Host "ID: $tratamientoId" -ForegroundColor Gray
} catch {
    Write-Host "ERROR - No se pudieron obtener tratamientos" -ForegroundColor Red
    exit 1
}

# Test 4: Configurar Horario Semanal
Write-Host "`n[4] Configurar Horario Semanal..." -ForegroundColor Yellow
$horarioBody = @{
    horarioSemanal = @{
        lunes = @(@{ inicio = "09:00"; fin = "17:00" })
        martes = @(@{ inicio = "09:00"; fin = "17:00" })
        miercoles = @(@{ inicio = "09:00"; fin = "17:00" })
        jueves = @(@{ inicio = "09:00"; fin = "17:00" })
        viernes = @(@{ inicio = "09:00"; fin = "14:00" })
    }
} | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    $horarioResult = Invoke-RestMethod -Uri "$baseUrl/api/horarios/semanal" -Method POST -Headers $headers -Body $horarioBody
    Write-Host "OK - Horario configurado" -ForegroundColor Green
    Write-Host "$($horarioResult.message)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Obtener Horarios Disponibles
Write-Host "`n[5] Obtener Horarios Disponibles..." -ForegroundColor Yellow
$fechaTest = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
Write-Host "Fecha de prueba: $fechaTest" -ForegroundColor Gray

try {
    $horariosDisp = Invoke-RestMethod -Uri "$baseUrl/api/horarios/disponibles/$fechaTest" -Method GET
    $primeraHora = $horariosDisp.horasDisponibles[0]
    Write-Host "OK - $($horariosDisp.horasDisponibles.Count) horas disponibles" -ForegroundColor Green
    Write-Host "Primera hora: $primeraHora" -ForegroundColor Gray
} catch {
    Write-Host "ERROR - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 6: Crear Cita
Write-Host "`n[6] Crear Cita..." -ForegroundColor Yellow
$citaBody = @{
    patient = @{
        full_name = "Maria Gonzalez"
        email = "maria@example.com"
        phone = "+56912345678"
    }
    treatment_id = $tratamientoId
    fecha = $fechaTest
    hora = $primeraHora
    notas = "Primera consulta de prueba"
} | ConvertTo-Json -Depth 10

try {
    $citaResult = Invoke-RestMethod -Uri "$baseUrl/api/citas" -Method POST -ContentType "application/json" -Body $citaBody
    $global:citaId = $citaResult.cita.id
    $global:patientId = $citaResult.paciente.id
    Write-Host "OK - Cita creada" -ForegroundColor Green
    Write-Host "ID: $global:citaId" -ForegroundColor Gray
    Write-Host "Paciente: $($citaResult.paciente.full_name)" -ForegroundColor Gray
    Write-Host "Patient ID: $global:patientId" -ForegroundColor Gray
} catch {
    Write-Host "ERROR - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 7: Intentar crear cita duplicada (debe fallar)
Write-Host "`n[7] Intentar reservar hora ocupada (debe fallar)..." -ForegroundColor Yellow
$citaDupBody = @{
    patient = @{
        full_name = "Pedro Perez"
        email = "pedro@example.com"
        phone = "+56923456789"
    }
    treatment_id = $tratamientoId
    fecha = $fechaTest
    hora = $primeraHora
} | ConvertTo-Json -Depth 10

try {
    $citaDup = Invoke-RestMethod -Uri "$baseUrl/api/citas" -Method POST -ContentType "application/json" -Body $citaDupBody
    Write-Host "ERROR - No deberia haber creado la cita" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 409) {
        Write-Host "OK - Correctamente rechazada (409 Conflict)" -ForegroundColor Green
    } else {
        Write-Host "ERROR - Status inesperado: $($_.Exception.Response.StatusCode.Value__)" -ForegroundColor Red
    }
}

# Test 8: Obtener Citas (Admin)
Write-Host "`n[8] Obtener todas las citas..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $todasCitas = Invoke-RestMethod -Uri "$baseUrl/api/citas" -Method GET -Headers $headers
    Write-Host "OK - $($todasCitas.Count) citas encontradas" -ForegroundColor Green
    foreach ($cita in $todasCitas) {
        Write-Host "  - $($cita.patients.full_name): $($cita.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Actualizar Status de Cita
Write-Host "`n[9] Confirmar cita..." -ForegroundColor Yellow
$statusBody = @{
    status = "confirmed"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    $statusResult = Invoke-RestMethod -Uri "$baseUrl/api/citas/$citaId/status" -Method PATCH -Headers $headers -Body $statusBody
    Write-Host "OK - Cita confirmada" -ForegroundColor Green
    Write-Host "$($statusResult.message)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Estadisticas
Write-Host "`n[10] Obtener estadisticas..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $stats = Invoke-RestMethod -Uri "$baseUrl/api/citas/estadisticas/resumen" -Method GET -Headers $headers
    Write-Host "OK - Estadisticas obtenidas" -ForegroundColor Green
    Write-Host "Total citas: $($stats.totalCitas)" -ForegroundColor Gray
    Write-Host "Confirmadas: $($stats.confirmadas)" -ForegroundColor Gray
    Write-Host "Pendientes: $($stats.pendientes)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Resumen
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   TESTING COMPLETADO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "10 tests ejecutados" -ForegroundColor Green
Write-Host "`nToken Admin guardado en variable:" -ForegroundColor Yellow
Write-Host "`$adminToken = '$adminToken'" -ForegroundColor Gray
