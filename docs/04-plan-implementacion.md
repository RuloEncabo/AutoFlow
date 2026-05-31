# 04 - Plan de implementacion por etapas

## Enfoque

El proyecto se implementa por etapas para evitar generar un sistema grande, fragil y dificil de validar. Cada etapa debe cerrar con:

- Decision tecnica documentada.
- Riesgos identificados.
- Codigo o artefacto verificable.
- Pruebas minimas.
- Revision funcional antes de avanzar.

## Etapa 1 - Analisis funcional

Estado: completada en documentacion inicial.

Entregables:

- Lectura de `Taller.zip` como referencia funcional.
- Lectura de `Template.zip` como referencia visual.
- Alcance consolidado.
- Riesgos iniciales.

Validacion:

- Confirmar MVP y reglas principales.
- Confirmar formato de patente.
- Confirmar si facturacion sera interna o fiscal.

## Etapa 2 - Arquitectura

Estado: completada en propuesta inicial.

Decisiones:

- Monolito modular.
- API REST central.
- React web y React Native APK consumen la misma API.
- PostgreSQL local.
- MUI como sistema visual.

Riesgos:

- Alcance amplio.
- Dependencias externas para WhatsApp/OCR.

Validacion:

- Aprobar estructura de apps Django.
- Aprobar estrategia de despliegue monolitico.

## Etapa 3 - Modelo de datos

Estado: completada en propuesta inicial.

Entregables:

- ER conceptual.
- Tablas.
- Relaciones.
- Indices.
- Reglas de negocio.

Validacion:

- Revisar campos obligatorios.
- Definir datos fiscales si aplica.
- Definir personas asignables: choferes, empleados o ambos.

## Etapa 4 - Backend Django base

Objetivo:

- Crear proyecto Django en `C:\AutoFlow\backend`.
- Configurar DRF, PostgreSQL, JWT, CORS, variables de entorno, logs y settings por ambiente.

Entregables:

- Proyecto Django modular.
- Apps base.
- Healthcheck.
- Swagger/OpenAPI.
- Docker opcional o scripts de instalacion local.

Riesgos:

- Configuracion local de PostgreSQL.
- Diferencias entre Windows dev y produccion.

Validacion:

- `GET /api/health/`.
- Swagger disponible.
- Conexion a PostgreSQL.

## Etapa 5 - Autenticacion

Objetivo:

- Login, refresh, logout, perfiles, roles y permisos.

Entregables:

- Usuario custom.
- JWT access/refresh.
- Auditoria de sesiones.
- Permisos `Admin` y `Usuario App`.

Riesgos:

- Manejo seguro de refresh token.
- Bloqueo de usuarios inactivos.

Validacion:

- Login correcto.
- Token refresh correcto.
- Usuario inactivo no accede.
- Audit log de sesiones.

## Etapa 6 - Modulos base

Objetivo:

- Clientes, vehiculos, turnos, comunicaciones, ordenes y tareas.

Entregables:

- Modelos Django.
- Serializers.
- ViewSets.
- Filtros.
- Validaciones.
- Baja logica.
- Tests.

Riesgos:

- Reglas de estado incompletas.
- Duplicidad de patentes.

Validacion:

- CRUD completo.
- Patente unica.
- Avance de orden calculado por tareas.
- Comunicaciones registradas.

## Etapa 7 - Frontend React

Objetivo:

- App web enterprise con login, layout, rutas protegidas, dashboard y CRUD base.

Entregables:

- React Router.
- Axios interceptors.
- Redux Toolkit y React Query.
- Material UI theme basado en Template.
- Login, sidebar, tablas, formularios y manejo loading/error.

Riesgos:

- UX inconsistente si se mezclan patrones.
- Exceso de estado global.

Validacion:

- Login real contra API.
- CRUD base end to end.
- Refresh token transparente.

## Etapa 8 - APK Android

Objetivo:

- App movil con login, escaneo/carga de patente, consulta de estado y creacion de turno.

Entregables:

- React Native.
- Navegacion.
- Secure token storage.
- Camara.
- Servicio OCR con interfaz preparada.
- APK debug/release.

Riesgos:

- Permisos de camara.
- OCR de baja precision.
- Certificados y API base URL.

Validacion:

- Login movil.
- Buscar vehiculo por patente.
- Alta rapida sin duplicar.
- Crear turno y enviar notificacion.

## Etapa 9 - Dashboard operativo

Objetivo:

- Indicadores de taller y recursos tecnologicos.

Entregables:

- Endpoints agregados.
- Cards KPI.
- Graficos.
- Filtros de periodo.

Riesgos:

- Consultas pesadas.

Validacion:

- Resultados consistentes con datos transaccionales.
- Respuesta rapida con volumen medio.

## Etapa 10 - Dashboard TV

Objetivo:

- Vista kiosk para pantalla grande.

Entregables:

- Ruta `/tv-dashboard`.
- Endpoint agregado.
- Auto refresh configurable.
- Cards grandes, progreso y proximas tareas.

Riesgos:

- Legibilidad a distancia.
- Refresco excesivo.

Validacion:

- Maximo 10 ordenes activas.
- Progreso correcto.
- Pantalla responsive para TV.

## Etapa 11 - Indicadores avanzados

Objetivo:

- Reparaciones por mes/anio, rankings, cambios de equipo y tiempos de asignacion.

Entregables:

- Endpoints historicos.
- Graficos anuales.
- Ranking de roturas.
- Exportacion opcional.

Riesgos:

- Definiciones ambiguas de "rotura" o "cambio".

Validacion:

- Reglas de calculo documentadas.
- Comparacion con casos manuales.

## Etapa 12 - Testing

Objetivo:

- Asegurar regresion minima.

Entregables:

- Pytest o Django TestCase.
- Tests API.
- Tests permisos.
- Tests frontend basicos.
- Pruebas mobile criticas.

Riesgos:

- Tests lentos si usan DB real sin control.

Validacion:

- Suite ejecutable local.
- Cobertura en reglas criticas.

## Etapa 13 - Optimizacion

Objetivo:

- Mejorar tiempos de respuesta, queries y build.

Entregables:

- `select_related`/`prefetch_related`.
- Indices revisados.
- Cache corta para dashboards.
- Bundle frontend revisado.

Riesgos:

- Optimizar antes de medir.

Validacion:

- Medicion antes/despues.

## Etapa 14 - Seguridad

Objetivo:

- Endurecer produccion.

Entregables:

- HTTPS.
- CORS/CSRF correctos.
- Headers seguros.
- Rotacion refresh.
- Variables secretas.
- Backups.
- Auditoria completa.

Riesgos:

- Deploy local sin HTTPS para APK.

Validacion:

- Checklist de seguridad.
- Pruebas de permisos por rol.

## Etapa 15 - Despliegue

Objetivo:

- Instalar en ambiente monolitico en la misma PC.

Entregables:

- Backend como servicio.
- Frontend servido localmente.
- PostgreSQL local.
- Logs.
- Backups.
- Guia paso a paso.

Riesgos:

- Puertos ocupados.
- Firewall Windows.
- IP cambiante para APK.

Validacion:

- Web abre desde navegador.
- API responde.
- APK conecta a API.
- Reinicio de PC levanta servicios.

## Orden recomendado de implementacion tecnica

1. Crear backend base.
2. Crear modelo `accounts`, `core` y auditoria.
3. Implementar clientes/vehiculos.
4. Implementar turnos/comunicaciones.
5. Implementar ordenes/tareas/danios.
6. Implementar inventario y facturacion basica.
7. Crear frontend base y conectar auth.
8. Crear CRUDs web.
9. Crear dashboard y TV.
10. Crear recursos tecnologicos, asignaciones y reparaciones.
11. Crear APK MVP.
12. Completar indicadores, seguridad y despliegue.

## Criterio de listo para avanzar a codigo

Se puede iniciar la etapa 4 cuando esten aceptadas estas decisiones:

- React Native como tecnologia APK.
- Material UI como UI web.
- Modelo `people_person` unificado para choferes y empleados.
- PostgreSQL local.
- Baja logica obligatoria.
- Auditoria global.
- Endpoint exacto para dashboard TV.
