# 03 - Endpoints, estructura backend, frontend y APK

## 1. Convenciones API

- Base URL monolitica sugerida: `http://localhost/api/`.
- En desarrollo: `http://localhost:8000/api/`.
- Autenticacion: JWT Bearer.
- Formato: JSON.
- Paginacion: `page`, `page_size`, `count`, `results`.
- Filtros: query params.
- Busqueda: `search`.
- Orden: `ordering`.
- Errores: formato centralizado.

Respuesta de error:

```json
{
  "error": {
    "code": "validation_error",
    "message": "No se pudo procesar la solicitud.",
    "details": {
      "plate": ["Ya existe un vehiculo con esa patente."]
    }
  }
}
```

## 2. Autenticacion y usuarios

Endpoints:

- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `POST /api/auth/password-reset/`
- `POST /api/auth/password-reset/confirm/`
- `POST /api/auth/change-password/`
- `GET /api/auth/me/`
- `GET /api/users/`
- `POST /api/users/`
- `GET /api/users/{id}/`
- `PATCH /api/users/{id}/`
- `POST /api/users/{id}/deactivate/`

Permisos:

- Admin: CRUD usuarios, permisos, auditoria.
- Usuario App: leer perfil propio, cambiar password, operar modulos permitidos.

## 3. Clientes

- `GET /api/clients/`
- `POST /api/clients/`
- `GET /api/clients/{id}/`
- `PATCH /api/clients/{id}/`
- `DELETE /api/clients/{id}/` baja logica
- `GET /api/clients/{id}/vehicles/`
- `GET /api/clients/{id}/history/`

Filtros:

- `search`
- `document`
- `city`
- `status`

## 4. Vehiculos

- `GET /api/vehicles/`
- `POST /api/vehicles/`
- `GET /api/vehicles/{id}/`
- `PATCH /api/vehicles/{id}/`
- `DELETE /api/vehicles/{id}/`
- `GET /api/vehicles/?plate={patente}`
- `POST /api/vehicles/quick-create/`
- `GET /api/vehicles/{id}/status/`
- `GET /api/vehicles/{id}/history/`

Reglas backend:

- Normalizar patente.
- Validar unicidad.
- Registrar usuario creador.
- Auditar alta rapida desde APK.

## 5. Turnos y comunicaciones

- `GET /api/appointments/`
- `POST /api/appointments/`
- `GET /api/appointments/{id}/`
- `PATCH /api/appointments/{id}/`
- `DELETE /api/appointments/{id}/` baja logica o cancelacion segun permisos
- `GET /api/appointments/availability/`
- `POST /api/appointments/{id}/confirm/`
- `POST /api/appointments/{id}/cancel/`
- `POST /api/appointments/{id}/reschedule/`
- `POST /api/appointments/{id}/send-email/`
- `POST /api/appointments/{id}/send-whatsapp/`
- `POST /api/appointments/{id}/send-notification/`
- `GET /api/appointments/{id}/communications/`

Payload envio:

```json
{
  "channels": ["email", "whatsapp"],
  "force": false
}
```

## 6. Ordenes de trabajo

- `GET /api/work-orders/`
- `POST /api/work-orders/`
- `GET /api/work-orders/{id}/`
- `PATCH /api/work-orders/{id}/`
- `DELETE /api/work-orders/{id}/`
- `POST /api/work-orders/{id}/change-status/`
- `GET /api/work-orders/{id}/status-history/`
- `GET /api/work-orders/{id}/progress/`
- `GET /api/work-orders/{id}/tasks/`
- `POST /api/work-orders/{id}/tasks/`
- `GET /api/work-orders/{id}/parts/`
- `POST /api/work-orders/{id}/parts/`
- `GET /api/work-orders/{id}/materials/`
- `POST /api/work-orders/{id}/materials/`
- `GET /api/work-orders/{id}/damages/`
- `POST /api/work-orders/{id}/damages/`

Filtros:

- `status`
- `priority`
- `client`
- `vehicle`
- `plate`
- `estimated_delivery_from`
- `estimated_delivery_to`
- `delayed=true`

## 7. Tareas

- `GET /api/work-order-tasks/`
- `GET /api/work-order-tasks/{id}/`
- `PATCH /api/work-order-tasks/{id}/`
- `DELETE /api/work-order-tasks/{id}/`
- `POST /api/work-order-tasks/{id}/start/`
- `POST /api/work-order-tasks/{id}/complete/`
- `POST /api/work-order-tasks/{id}/cancel/`

## 8. Danios y fotos

- `GET /api/damage-reports/`
- `POST /api/damage-reports/`
- `GET /api/damage-reports/{id}/`
- `PATCH /api/damage-reports/{id}/`
- `DELETE /api/damage-reports/{id}/`
- `POST /api/damage-reports/{id}/photos/`
- `DELETE /api/damage-photos/{id}/`

Uploads:

- `multipart/form-data`.
- Limite configurable.
- Validar extension y MIME.

## 9. Inventario

Repuestos:

- `GET /api/parts/`
- `POST /api/parts/`
- `GET /api/parts/{id}/`
- `PATCH /api/parts/{id}/`
- `DELETE /api/parts/{id}/`
- `GET /api/parts/critical-stock/`
- `POST /api/parts/{id}/stock-movement/`

Materiales:

- `GET /api/materials/`
- `POST /api/materials/`
- `GET /api/materials/{id}/`
- `PATCH /api/materials/{id}/`
- `DELETE /api/materials/{id}/`
- `GET /api/materials/critical-stock/`
- `POST /api/materials/{id}/stock-movement/`

## 10. Presupuestos, facturacion y pagos

- `GET /api/estimates/`
- `POST /api/estimates/`
- `GET /api/estimates/{id}/`
- `PATCH /api/estimates/{id}/`
- `POST /api/estimates/{id}/approve/`
- `POST /api/estimates/{id}/reject/`

- `GET /api/invoices/`
- `POST /api/invoices/`
- `GET /api/invoices/{id}/`
- `PATCH /api/invoices/{id}/`
- `POST /api/invoices/{id}/cancel/`
- `GET /api/invoices/{id}/payments/`
- `POST /api/invoices/{id}/payments/`

## 11. Recursos tecnologicos

Celulares:

- `GET /api/mobile-brands/`
- `POST /api/mobile-brands/`
- `GET /api/mobile-models/`
- `POST /api/mobile-models/`
- `GET /api/mobile-devices/`
- `POST /api/mobile-devices/`
- `GET /api/mobile-devices/{id}/`
- `PATCH /api/mobile-devices/{id}/`
- `DELETE /api/mobile-devices/{id}/`

Lineas:

- `GET /api/phone-lines/`
- `POST /api/phone-lines/`
- `GET /api/phone-lines/{id}/`
- `PATCH /api/phone-lines/{id}/`
- `DELETE /api/phone-lines/{id}/`

PC/notebook/tablet:

- `GET /api/computer-brands/`
- `POST /api/computer-brands/`
- `GET /api/computer-models/`
- `POST /api/computer-models/`
- `GET /api/computer-devices/`
- `POST /api/computer-devices/`
- `GET /api/computer-devices/{id}/`
- `PATCH /api/computer-devices/{id}/`
- `DELETE /api/computer-devices/{id}/`

## 12. Personas

- `GET /api/people/`
- `POST /api/people/`
- `GET /api/people/{id}/`
- `PATCH /api/people/{id}/`
- `DELETE /api/people/{id}/`
- `GET /api/drivers/` alias filtrado
- `GET /api/employees/` alias filtrado

## 13. Asignaciones

- `GET /api/mobile-assignments/`
- `POST /api/mobile-assignments/`
- `PATCH /api/mobile-assignments/{id}/`
- `POST /api/mobile-assignments/{id}/close/`

- `GET /api/line-assignments/`
- `POST /api/line-assignments/`
- `PATCH /api/line-assignments/{id}/`
- `POST /api/line-assignments/{id}/close/`

- `GET /api/computer-assignments/`
- `POST /api/computer-assignments/`
- `PATCH /api/computer-assignments/{id}/`
- `POST /api/computer-assignments/{id}/close/`

Reglas:

- Crear nueva asignacion cierra la activa anterior dentro de una transaccion.
- Endpoints devuelven historial completo por recurso y persona.

## 14. Reparaciones

- `GET /api/repairs/`
- `POST /api/repairs/`
- `GET /api/repairs/{id}/`
- `PATCH /api/repairs/{id}/`
- `DELETE /api/repairs/{id}/`
- `POST /api/repairs/{id}/start/`
- `POST /api/repairs/{id}/close/`
- `GET /api/repairs/indicators/`

## 15. Dashboard operativo

- `GET /api/dashboard/summary/`
- `GET /api/dashboard/work-orders/`
- `GET /api/dashboard/inventory/`
- `GET /api/dashboard/assets/`
- `GET /api/dashboard/repairs/monthly/`
- `GET /api/dashboard/repairs/yearly/`
- `GET /api/dashboard/ranking-breakages/`
- `GET /api/dashboard/assignment-times/`

## 16. Dashboard TV

- `GET /api/tv-dashboard/work-orders/`
- `GET /api/work-orders/{id}/tasks/`

Respuesta sugerida:

```json
{
  "refresh_seconds": 30,
  "results": [
    {
      "id": "uuid",
      "client": "Juan Perez",
      "vehicle": "Toyota Corolla",
      "plate": "AB123CD",
      "order_number": "OT-2026-0001",
      "status": "in_repair",
      "priority": "high",
      "estimated_delivery_date": "2026-06-01",
      "tasks_total": 8,
      "tasks_completed": 5,
      "tasks_pending": 3,
      "progress_percent": 62,
      "next_tasks": ["Pulido", "Control calidad"],
      "current_sector": "Mecanica"
    }
  ]
}
```

## 17. Mobile APK

Autenticacion:

- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`

Vehiculos:

- `GET /api/vehicles/?plate={patente}`
- `POST /api/vehicles/quick-create/`
- `GET /api/vehicles/{id}/status/`

OCR:

- `POST /api/mobile/plate-recognition/`

Turnos:

- `POST /api/appointments/`
- `GET /api/appointments/availability/`
- `POST /api/appointments/{id}/send-notification/`

## 18. Auditoria

- `GET /api/audit/logs/`
- `GET /api/audit/sessions/`
- `GET /api/audit/objects/{object_type}/{object_id}/`

Solo admin.

## 19. Estructura backend

```text
C:\AutoFlow\backend
  manage.py
  requirements.txt
  .env.example
  config\
    settings\
      base.py
      local.py
      production.py
    urls.py
    wsgi.py
    asgi.py
  apps\
    core\
      models.py
      pagination.py
      permissions.py
      exceptions.py
      audit_mixins.py
    accounts\
      models.py
      serializers.py
      views.py
      urls.py
      services.py
      permissions.py
    clients\
    vehicles\
    appointments\
    work_orders\
    inventory\
    billing\
    assets\
    people\
    assignments\
    repairs\
    dashboard\
    mobile\
    audit\
  media\
  staticfiles\
  logs\
  tests\
```

Patron por app:

```text
models.py
serializers.py
views.py
filters.py
permissions.py
services.py
urls.py
admin.py
tests\
```

## 20. Estructura frontend web

```text
C:\AutoFlow\frontend
  package.json
  .env.example
  src\
    main.jsx
    app\
      App.jsx
      router.jsx
      store.js
    api\
      axiosClient.js
      authApi.js
      clientsApi.js
      vehiclesApi.js
    auth\
      AuthProvider.jsx
      ProtectedRoute.jsx
      permissions.js
    theme\
      theme.js
      palette.js
    layout\
      DashboardLayout.jsx
      Sidebar.jsx
      Topbar.jsx
    components\
      DataTable.jsx
      FormField.jsx
      StatusChip.jsx
      ConfirmDialog.jsx
      StatCard.jsx
    pages\
      login\
      dashboard\
      clients\
      vehicles\
      appointments\
      workOrders\
      inventory\
      assets\
      assignments\
      repairs\
      billing\
      audit\
      tvDashboard\
```

Diseno visual:

- MUI Theme con Roboto.
- Sidebar tipo Material Dashboard.
- Login con imagen de fondo y card central.
- Cards KPI con iconos Material.
- Tablas reutilizables con filtros y paginacion server-side.

## 21. Estructura mobile APK

```text
C:\AutoFlow\mobile
  package.json
  android\
  src\
    app\
      App.tsx
      navigation.tsx
    api\
      client.ts
      auth.ts
      vehicles.ts
      appointments.ts
      ocr.ts
    auth\
      AuthContext.tsx
      secureStorage.ts
    screens\
      LoginScreen.tsx
      HomeScreen.tsx
      ScanPlateScreen.tsx
      ConfirmPlateScreen.tsx
      QuickVehicleCreateScreen.tsx
      VehicleStatusScreen.tsx
      CreateAppointmentScreen.tsx
      AppointmentConfirmationScreen.tsx
      VehicleHistoryScreen.tsx
      ProfileScreen.tsx
    services\
      plateOcrService.ts
      plateValidation.ts
      retryQueue.ts
    components\
      CameraPlateScanner.tsx
      StatusBadge.tsx
      LoadingState.tsx
      ErrorState.tsx
```

## 22. Documentacion API

Swagger/OpenAPI:

- `GET /api/schema/`
- `GET /api/docs/`

Uso:

- Contrato para frontend web.
- Contrato para APK.
- Base para pruebas de integracion.
