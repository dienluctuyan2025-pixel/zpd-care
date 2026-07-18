# ZPD Care — start backend + frontend-next
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend-next"

Write-Host "=== ZPD Care launcher ===" -ForegroundColor Cyan

# Backend deps check (light)
if (-not (Test-Path (Join-Path $Backend ".env"))) {
  if (Test-Path (Join-Path $Backend ".env.example")) {
    Copy-Item (Join-Path $Backend ".env.example") (Join-Path $Backend ".env")
    Write-Host "[!] Da tao backend\.env tu .env.example — hay dien GOOGLE_API_KEY" -ForegroundColor Yellow
  }
}

Write-Host "[1/2] Backend FastAPI :8000" -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location -LiteralPath '$Backend'; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
)

Start-Sleep -Seconds 2

Write-Host "[2/2] Frontend Next.js :3000" -ForegroundColor Green
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location -LiteralPath '$Frontend'; if (-not (Test-Path node_modules)) { npm install }; npm run dev"
)

Write-Host ""
Write-Host "Mo trinh duyet: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API docs:       http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Health:         http://localhost:8000/api/health" -ForegroundColor Cyan
