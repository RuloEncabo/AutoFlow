# AutoFlow Mobile APK

Aplicacion React Native/Expo para operar AutoFlow desde Android.

Funciones incluidas:
- Login JWT contra Django.
- Configuracion de URL API.
- Check de recepcion del vehiculo.
- Inspeccion multipunto.
- Registro de danos con fotos.
- Sincronizacion con la aplicacion web mediante `/api/mobile/*` y `/api/receptions/*`.

Comandos:

```bash
npm install
npm run start
npm run build:apk
```

Para que el telefono sincronice contra produccion, configurar en la app:

```text
https://autoflow-jl6p.onrender.com/api
```
