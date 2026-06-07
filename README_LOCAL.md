# AutoFlow local

Esta copia esta configurada para ejecutarse en `C:\GitHub\AutoFlow`.

## Requisitos

- PostgreSQL local con:
  - Base: `autoflow_db`
  - Usuario: `postgres`
  - Password: `lucia`
- Node.js y npm.
- Python 3.

## Ejecutar todo

Desde PowerShell:

```powershell
cd C:\GitHub\AutoFlow
.\start-local.ps1
```

## Ejecutar por separado

Backend:

```powershell
cd C:\GitHub\AutoFlow
.\start-backend-local.ps1
```

Frontend:

```powershell
cd C:\GitHub\AutoFlow
.\start-frontend-local.ps1
```

## URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api`
- Healthcheck: `http://localhost:8000/api/health/`

## Configuracion local

- Backend: `C:\GitHub\AutoFlow\backend\.env`
- Frontend: `C:\GitHub\AutoFlow\frontend\.env`
