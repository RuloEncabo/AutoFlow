$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$env:DJANGO_SETTINGS_MODULE = "config.settings.local"

if (-not (Test-Path ".\backend\.venv\Scripts\python.exe")) {
  python -m venv ".\backend\.venv"
}

& ".\backend\.venv\Scripts\python.exe" -m pip install -r ".\backend\requirements.txt"
& ".\backend\.venv\Scripts\python.exe" ".\backend\manage.py" migrate
& ".\backend\.venv\Scripts\python.exe" ".\backend\manage.py" runserver 0.0.0.0:8000
