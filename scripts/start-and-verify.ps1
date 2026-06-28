$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"
$PostgresName = "pdm-postgres"
$AppUrl = "http://127.0.0.1:3000/"
$ApiHealthUrl = "http://localhost:3001/health"

$env:NODE_ENV = "development"
$env:AUTH_RATE_LIMIT_MAX = "1000"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Wait-HttpOk($Url, $Name, $TimeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        Write-Host "$Name is ready: $Url" -ForegroundColor Green
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  } while ((Get-Date) -lt $deadline)

  throw "$Name did not become ready at $Url"
}

function Ensure-Command($Command, $Help) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "$Command was not found. $Help"
  }
}

Set-Location $Root

Write-Step "Checking required tools"
Ensure-Command "node" "Install Node.js 20+."
Ensure-Command "npm" "Install npm with Node.js."
Ensure-Command "docker" "Install and start Docker Desktop."

Write-Step "Checking Docker engine"
try {
  docker ps | Out-Null
} catch {
  $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerDesktop) {
    Write-Host "Docker engine is not ready. Starting Docker Desktop..."
    Start-Process -FilePath $dockerDesktop -WindowStyle Hidden
    Start-Sleep -Seconds 30
  }
  docker ps | Out-Null
}

Write-Step "Starting PostgreSQL"
$container = docker ps -a --filter "name=^/$PostgresName$" --format "{{.Names}}"
if (-not $container) {
  docker run -d --name $PostgresName `
    -e POSTGRES_USER=pdm_user `
    -e POSTGRES_PASSWORD=pdm_password `
    -e POSTGRES_DB=pdm_db `
    -p 5600:5432 `
    postgres:15 | Out-Null
} else {
  docker start $PostgresName | Out-Null
}

Write-Step "Waiting for PostgreSQL"
$dbReady = $false
for ($i = 0; $i -lt 30; $i++) {
  $tcp = Test-NetConnection localhost -Port 5600 -WarningAction SilentlyContinue
  if ($tcp.TcpTestSucceeded) {
    $dbReady = $true
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $dbReady) {
  throw "PostgreSQL did not open port 5600."
}
Write-Host "PostgreSQL is ready on localhost:5600" -ForegroundColor Green

Write-Step "Installing dependencies if needed"
if (-not (Test-Path (Join-Path $Root "node_modules"))) {
  npm install
}
if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
  Push-Location $Frontend
  npm install
  Pop-Location
}

Write-Step "Syncing database schema and seed data"
npm run prisma:generate
npm run prisma:push
npm run seed

Write-Step "Starting backend"
$backendLog = Join-Path $Root "backend-dev.out.log"
$backendErr = Join-Path $Root "backend-dev.err.log"
Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev") `
  -WorkingDirectory $Root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $backendLog `
  -RedirectStandardError $backendErr | Out-Null

Write-Step "Starting frontend"
$frontendLog = Join-Path $Frontend "frontend-dev.out.log"
$frontendErr = Join-Path $Frontend "frontend-dev.err.log"
Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "3000") `
  -WorkingDirectory $Frontend `
  -WindowStyle Hidden `
  -RedirectStandardOutput $frontendLog `
  -RedirectStandardError $frontendErr | Out-Null

Write-Step "Verifying application"
Wait-HttpOk $ApiHealthUrl "Backend API" 60
Wait-HttpOk $AppUrl "Frontend" 90

Write-Step "Verifying login through frontend proxy"
$loginBody = @{ email = "gf@avis.com"; password = "Test1234!" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
if (-not $login.success) {
  throw "Login verification failed."
}
Write-Host "Login verified as $($login.data.user.email)" -ForegroundColor Green

Write-Host ""
Write-Host "Application is running." -ForegroundColor Green
Write-Host "Frontend: $AppUrl"
Write-Host "Backend:  http://localhost:3001"
Write-Host "Logs:"
Write-Host "  Backend:  $backendLog"
Write-Host "  Frontend: $frontendLog"
