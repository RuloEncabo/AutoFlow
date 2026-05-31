# AutoFlow Backend

Backend Django REST Framework para AutoFlow.

## Stack

- Django
- Django REST Framework
- Simple JWT
- PostgreSQL
- django-filter
- drf-spectacular
- django-cors-headers

## Inicio rapido

```powershell
cd C:\AutoFlow\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py check
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

## Deploy backend en Render

Crear un **Web Service** en Render apuntando al repositorio y configurar:

- Root Directory: `backend`
- Runtime: `Python`
- Build Command:

```bash
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
```

- Start Command:

```bash
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

Variables de entorno minimas para Render:

```env
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=usar Generate en Render
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=TU_BACKEND.onrender.com
DJANGO_CORS_ALLOWED_ORIGINS=https://TU_FRONTEND.vercel.app
DJANGO_CSRF_TRUSTED_ORIGINS=https://TU_FRONTEND.vercel.app,https://TU_BACKEND.onrender.com

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require
DB_CONN_MAX_AGE=60
DB_SSL_REQUIRE=true

FRONTEND_BASE_URL=https://TU_FRONTEND.vercel.app
BACKEND_PUBLIC_URL=https://TU_BACKEND.onrender.com
MERCADOPAGO_NOTIFICATION_URL=https://TU_BACKEND.onrender.com/api/billing/mercadopago/webhook/
```

Variables opcionales segun integraciones:

```env
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=true
DEFAULT_FROM_EMAIL=no-reply@tudominio.com

WORKSHOP_NAME=AutoFlow Taller
WORKSHOP_ADDRESS=
WORKSHOP_CONTACT=

WHATSAPP_PROVIDER=disabled
WHATSAPP_API_URL=
WHATSAPP_TOKEN=

MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
```

Notas:

- `DATABASE_URL` puede salir de Neon, Supabase o Render Postgres. Si usas Neon, copia el connection string de PostgreSQL.
- El filesystem de Render Free es efimero: logos/media subidos desde la app pueden perderse en redeploy. Para produccion conviene Cloudinary/S3.
- Luego de publicar el backend, en el frontend configurar `VITE_API_BASE_URL=https://TU_BACKEND.onrender.com/api`.

Endpoints base:

- `GET /api/health/`
- `GET /api/schema/`
- `GET /api/docs/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `GET/POST /api/clients/`
- `GET/POST /api/vehicles/`
- `GET/POST /api/operators/`
- `GET/POST /api/tasks/`
- `GET/POST /api/appointments/`
- `GET/POST /api/work-orders/`
- `GET/POST /api/inventory/families/`
- `GET/POST /api/inventory/parts/`
- `GET/POST /api/inventory/materials/`
- `POST /api/inventory/parts/scan-lookup/`
- `POST /api/inventory/materials/scan-lookup/`
- `GET/POST /api/billing/estimates/`
- `GET/POST /api/billing/invoices/`
- `POST /api/billing/invoices/{id}/mercadopago/create-preference/`
- `POST /api/billing/mercadopago/webhook/`

## Mercado Pago

Variables requeridas:

```env
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_PUBLIC_URL=https://tu-dominio-api.com
MERCADOPAGO_ACCESS_TOKEN=APP_USR...
MERCADOPAGO_PUBLIC_KEY=APP_USR...
MERCADOPAGO_WEBHOOK_SECRET=...
MERCADOPAGO_NOTIFICATION_URL=https://tu-dominio-api.com/api/billing/mercadopago/webhook/
```

Flujo:

1. Desde Facturacion, usar "Cobrar con Mercado Pago" sobre una factura pendiente.
2. AutoFlow crea una preferencia Checkout Pro y abre el link de pago.
3. Mercado Pago llama al webhook configurado.
4. AutoFlow consulta el pago, registra un `Payment` interno si el estado es `approved` y actualiza la factura como parcial o pagada.

Para pruebas locales con webhook usar una URL publica temporal, por ejemplo ngrok, en `MERCADOPAGO_NOTIFICATION_URL`.
