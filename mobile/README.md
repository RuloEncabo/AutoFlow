# AutoFlow Mobile APK

Aplicacion React Native/Expo para operar AutoFlow desde Android.

## Estado actual

La APK instalable disponible quedo preparada en:

```text
C:\GitHub\AutoFlow\mobile\dist\AutoFlow-Mobile-0.1.1-release.apk
```

SHA256:

```text
3F915B24D2BF220EE97DF989E60EDCB6BE60840651435614D5FB95766A676D8C
```

Es una APK release firmada con la keystore de desarrollo y contiene el bundle JavaScript embebido (`assets/index.android.bundle`). Se puede copiar al telefono por cable, WhatsApp, Drive, correo o cualquier medio interno, y abrirla desde Android para instalar. Si Android lo solicita, habilitar la instalacion desde origenes desconocidos para la app desde donde se abre el archivo.

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

El comando `npm run build:apk` usa EAS cloud. Antes de generar la APK con EAS se requiere una cuenta de Expo:

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

Para compilar localmente sin EAS, el script usa las herramientas locales guardadas en `C:\GitHub\AutoFlow\.local-tools`. Ejecutar:

```bash
npm run build:apk:local
```

La salida local se genera en:

```text
android\app\build\outputs\apk\release\app-release.apk
```

Para que el telefono sincronice contra produccion, configurar en la app:

```text
https://autoflow-jl6p.onrender.com/api
```
