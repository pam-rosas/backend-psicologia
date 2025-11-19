# Script de Testing - Backend Psicología
# Ejecutar: .\test-endpoints.ps1

$baseUrl = "http://localhost:3000"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "TEST: $Name" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Method: $Method" -ForegroundColor Gray
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
            Write-Host "Body: $Body" -ForegroundColor Gray
        }
        
        $response = Invoke-RestMethod @params
        $statusCode = 200 # Si llega aquí, fue exitoso
        
        Write-Host "`n✅ SUCCESS (Status: $statusCode)" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10 | Write-Host
        
        $script:testResults += @{
            Name = $Name
            Status = "✅ PASS"
            StatusCode = $statusCode
            Response = $response
        }
        
        return $response
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        $errorBody = $_.ErrorDetails.Message
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "`n✅ SUCCESS (Expected Status: $statusCode)" -ForegroundColor Green
            Write-Host "Error Response: $errorBody" -ForegroundColor Yellow
            
            $script:testResults += @{
                Name = $Name
                Status = "✅ PASS"
                StatusCode = $statusCode
            }
        } else {
            Write-Host "`n❌ FAILED (Status: $statusCode, Expected: $ExpectedStatus)" -ForegroundColor Red
            Write-Host "Error: $errorBody" -ForegroundColor Red
            
            $script:testResults += @{
                Name = $Name
                Status = "❌ FAIL"
                StatusCode = $statusCode
                Error = $errorBody
            }
        }
        
        return $null
    }
}

# ==============================================
# CONFIGURACIÓN INICIAL
# ==============================================

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   TESTING - BACKEND PSICOLOGÍA SUPABASE  ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Magenta

# Verificar que el servidor está corriendo
Write-Host "`n🔍 Verificando conexión al servidor..." -ForegroundColor Yellow
try {
    $testConnection = Invoke-RestMethod -Uri "$baseUrl/api/test" -Method GET
    Write-Host "✅ Servidor conectado" -ForegroundColor Green
    Write-Host ($testConnection | ConvertTo-Json -Depth 5) -ForegroundColor Gray
} catch {
    Write-Host "❌ ERROR: El servidor no está corriendo en $baseUrl" -ForegroundColor Red
    Write-Host "Ejecuta: npm run start:supabase" -ForegroundColor Yellow
    exit 1
}

# ==============================================
# TESTS DE AUTENTICACIÓN
# ==============================================

Write-Host "`n`n🔐 FASE 1: AUTENTICACIÓN" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Test 1: Login Admin
$bodyLoginAdmin = @'
{"username":"admin","contrasena":"admin123"}
'@
$loginAdmin = Test-Endpoint `
    -Name "Login Admin" `
    -Method "POST" `
    -Url "$baseUrl/api/login" `
    -Body $bodyLoginAdmin

$adminToken = $loginAdmin.token
if ($adminToken) {
    Write-Host "`n🔑 Token Admin guardado" -ForegroundColor Green
} else {
    Write-Host "`n❌ No se pudo obtener el token del admin" -ForegroundColor Red
    exit 1
}

# Test 2: Login Usuario
$bodyLoginUser = @'
{"username":"usuario","contrasena":"usuario123"}
'@
$loginUser = Test-Endpoint `
    -Name "Login Usuario Regular" `
    -Method "POST" `
    -Url "$baseUrl/api/login" `
    -Body $bodyLoginUser

$userToken = $loginUser.token

# Test 3: Login Inválido
$bodyLoginInvalid = @'
{"username":"admin","contrasena":"wrongpassword"}
'@
Test-Endpoint `
    -Name "Login Invalido (debe fallar)" `
    -Method "POST" `
    -Url "$baseUrl/api/login" `
    -Body $bodyLoginInvalid `
    -ExpectedStatus 401

# ==============================================
# TESTS DE TRATAMIENTOS
# ==============================================

Write-Host "`n`n💊 FASE 2: TRATAMIENTOS" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Test 4: Obtener Tratamientos (público)
$tratamientos = Test-Endpoint `
    -Name "Obtener Tratamientos Activos" `
    -Method "GET" `
    -Url "$baseUrl/api/tratamientos"

$tratamientoId = $tratamientos[0].id
Write-Host "`n📝 ID del primer tratamiento: $tratamientoId" -ForegroundColor Green

# Test 5: Crear Tratamiento (admin)
$bodyNuevoTratamiento = @'
{"nombre":"Terapia de Pareja","descripcion":"Sesion de 90 minutos","precioNacional":60000,"precioInternacional":75,"numeroSesiones":1,"duracionMinutos":90}
'@
$nuevoTratamiento = Test-Endpoint `
    -Name "Crear Tratamiento (Admin)" `
    -Method "POST" `
    -Url "$baseUrl/api/tratamientos" `
    -Headers @{"Authorization" = "Bearer $adminToken"} `
    -Body $bodyNuevoTratamiento

# Test 6: Crear Tratamiento sin Token (debe fallar)
$bodyTratamientoSinToken = @'
{"nombre":"Test","precioNacional":1000,"precioInternacional":10,"numeroSesiones":1}
'@
Test-Endpoint `
    -Name "Crear Tratamiento sin Token (debe fallar)" `
    -Method "POST" `
    -Url "$baseUrl/api/tratamientos" `
    -Body $bodyTratamientoSinToken `
    -ExpectedStatus 401

# ==============================================
# TESTS DE HORARIOS
# ==============================================

Write-Host "`n`n🗓️ FASE 3: HORARIOS" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Test 7: Configurar Horario Semanal
$bodyHorarioSemanal = @'
{"horarioSemanal":{"lunes":[{"inicio":"09:00","fin":"17:00"}],"martes":[{"inicio":"09:00","fin":"17:00"}],"miercoles":[{"inicio":"09:00","fin":"17:00"}],"jueves":[{"inicio":"09:00","fin":"17:00"}],"viernes":[{"inicio":"09:00","fin":"14:00"}]}}
'@
Test-Endpoint `
    -Name "Configurar Horario Semanal" `
    -Method "POST" `
    -Url "$baseUrl/api/horarios/semanal" `
    -Headers @{"Authorization" = "Bearer $adminToken"} `
    -Body $bodyHorarioSemanal

# Test 8: Obtener Horarios Disponibles
$fechaTest = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
Write-Host "`n📅 Fecha de prueba: $fechaTest" -ForegroundColor Cyan

$horariosDisponibles = Test-Endpoint `
    -Name "Obtener Horarios Disponibles" `
    -Method "GET" `
    -Url "$baseUrl/api/horarios/disponibles/$fechaTest"

# Test 9: Crear Excepción (día bloqueado)
$fechaNavidad = "2025-12-25"
$bodyExcepcion = "{""fecha"":""$fechaNavidad"",""disponible"":false,""razon"":""Navidad""}"
Test-Endpoint `
    -Name "Crear Excepcion - Dia Bloqueado" `
    -Method "POST" `
    -Url "$baseUrl/api/horarios/excepcion" `
    -Headers @{"Authorization" = "Bearer $adminToken"} `
    -Body $bodyExcepcion

# Test 10: Verificar Día Bloqueado
Test-Endpoint `
    -Name "Verificar Día Bloqueado (debe estar vacío)" `
    -Method "GET" `
    -Url "$baseUrl/api/horarios/disponibles/$fechaNavidad"

# ==============================================
# TESTS DE CITAS
# ==============================================

Write-Host "`n`n📅 FASE 4: CITAS" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Test 11: Crear Cita
$primeraHora = $horariosDisponibles.horasDisponibles[0]
Write-Host "`n⏰ Usando hora disponible: $primeraHora" -ForegroundColor Cyan

$bodyCita = "{""nombreCliente"":""Maria Gonzalez"",""emailCliente"":""maria@example.com"",""telefonoCliente"":""+56912345678"",""tratamientoId"":""$tratamientoId"",""fecha"":""$fechaTest"",""hora"":""$primeraHora"",""esInternacional"":false,""notas"":""Primera consulta""}"
$nuevaCita = Test-Endpoint `
    -Name "Crear Cita" `
    -Method "POST" `
    -Url "$baseUrl/api/citas" `
    -Body $bodyCita

$citaId = $nuevaCita.cita.id
Write-Host "`n📝 ID de la cita creada: $citaId" -ForegroundColor Green

# Test 12: Horario Ocupado (debe fallar)
$bodyCitaDuplicada = "{""nombreCliente"":""Pedro Lopez"",""emailCliente"":""pedro@example.com"",""telefonoCliente"":""+56987654321"",""tratamientoId"":""$tratamientoId"",""fecha"":""$fechaTest"",""hora"":""$primeraHora"",""esInternacional"":false}"
Test-Endpoint `
    -Name "Intentar Reservar Hora Ocupada (debe fallar)" `
    -Method "POST" `
    -Url "$baseUrl/api/citas" `
    -Body $bodyCitaDuplicada `
    -ExpectedStatus 409

# Test 13: Obtener Citas (admin)
Test-Endpoint `
    -Name "Obtener Todas las Citas (Admin)" `
    -Method "GET" `
    -Url "$baseUrl/api/citas" `
    -Headers @{"Authorization" = "Bearer $adminToken"}

# Test 14: Actualizar Status de Cita
$bodyStatusCita = @'
{"status":"confirmada"}
'@
Test-Endpoint `
    -Name "Confirmar Cita" `
    -Method "PATCH" `
    -Url "$baseUrl/api/citas/$citaId/status" `
    -Headers @{"Authorization" = "Bearer $adminToken"} `
    -Body $bodyStatusCita

# Test 15: Estadísticas
Test-Endpoint `
    -Name "Obtener Estadísticas de Citas" `
    -Method "GET" `
    -Url "$baseUrl/api/citas/estadisticas/resumen" `
    -Headers @{"Authorization" = "Bearer $adminToken"}

# ==============================================
# RESUMEN DE TESTS
# ==============================================

Write-Host "`n`n╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║          RESUMEN DE TESTS                ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Magenta

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Status -eq "✅ PASS" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "❌ FAIL" }).Count

Write-Host "`nTotal de tests ejecutados: $totalTests" -ForegroundColor Cyan
Write-Host "✅ Exitosos: $passedTests" -ForegroundColor Green
Write-Host "❌ Fallidos: $failedTests" -ForegroundColor Red

Write-Host "`n`nDetalle de tests:" -ForegroundColor Yellow
foreach ($result in $testResults) {
    $statusColor = if ($result.Status -eq "✅ PASS") { "Green" } else { "Red" }
    Write-Host "$($result.Status) $($result.Name) (Status: $($result.StatusCode))" -ForegroundColor $statusColor
}

if ($failedTests -eq 0) {
    Write-Host "`n`n🎉 ¡TODOS LOS TESTS PASARON!" -ForegroundColor Green
} else {
    Write-Host "`n`n⚠️  Algunos tests fallaron. Revisa los detalles arriba." -ForegroundColor Yellow
}

Write-Host "`nTesting completado" -ForegroundColor Cyan
