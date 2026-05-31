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
