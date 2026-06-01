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
cd C:\GitHub\AutoFlow\frontend
npm.cmd install
npm.cmd run dev -- --port 5173
```

URL local:

```text
http://localhost:5173
```

La API usada por defecto esta configurada en `.env`:

```env
VITE_API_BASE_URL=https://autoflow-jl6p.onrender.com/api
```

## Cloudflare Workers

Configurar el proyecto con:

```text
Root directory: frontend
Build command: npm run build
Deploy command: npx wrangler deploy
Build output directory: dist
```

Variable de entorno en Cloudflare:

```env
VITE_API_BASE_URL=https://autoflow-jl6p.onrender.com/api
```

El archivo `wrangler.toml` publica `dist` como assets y usa `not_found_handling = "single-page-application"` para que rutas de React Router como `/login`, `/dashboard`, `/clients` o `/billing` funcionen al refrescar o abrir directo desde celular.

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
C:\GitHub\AutoFlow\frontend\dist
```
