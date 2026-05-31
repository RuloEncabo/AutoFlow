# AutoFlow Frontend

Frontend React para AutoFlow.

## Stack

- React
- Vite
- React Router
- Axios
- Redux Toolkit
- React Query
- Material UI

## Inicio rapido

```powershell
cd C:\AutoFlow\frontend
npm.cmd install
npm.cmd run dev -- --port 5173
```

URL local:

```text
http://localhost:5173
```

La API usada por defecto esta configurada en `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Pantallas implementadas:

- Login JWT.
- Dashboard operativo.
- Clientes.
- Vehiculos.
- Operarios.
- Tareas.
- Turnos.
- Ordenes de trabajo.
- Inventario con familias, codigos proveedor, lectura de barra/QR y generacion de codigos.
- Facturacion.
- TV taller.

## Build

```powershell
npm.cmd run build
```

La salida queda en:

```text
C:\AutoFlow\frontend\dist
```
