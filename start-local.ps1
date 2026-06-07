$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start-backend-local.ps1"
Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start-frontend-local.ps1"

Write-Host "AutoFlow local iniciado."
Write-Host "Backend:  http://localhost:8000/api/health/"
Write-Host "Frontend: http://localhost:5173"
