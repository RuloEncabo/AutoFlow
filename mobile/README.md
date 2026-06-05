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

Antes de generar la APK con EAS se requiere una cuenta de Expo:

```bash
npx eas-cli@20.0.0 login
npm run build:apk
```

En entornos no interactivos se puede usar un token:

```bash
set EXPO_TOKEN=tu_token_de_expo
npm run build:apk
```

El perfil `preview` definido en `eas.json` genera un APK instalable para Android.

Para que el telefono sincronice contra produccion, configurar en la app:

```text
https://autoflow-jl6p.onrender.com/api
```
