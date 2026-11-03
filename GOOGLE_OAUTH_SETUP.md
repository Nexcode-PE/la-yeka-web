# Inicio de sesión con Google

## 1. Crear las credenciales

En [Google Cloud Console](https://console.cloud.google.com/), crea o selecciona el proyecto de La Yeka, configura la pantalla de consentimiento OAuth y crea un **ID de cliente OAuth 2.0** de tipo **Aplicación web**.

Agrega estas URI de redirección autorizadas:

```text
https://la-yeka-web.vercel.app/api/auth/google/callback
http://localhost:3001/api/auth/google/callback
```

En los orígenes JavaScript autorizados agrega:

```text
https://la-yeka-web.vercel.app
http://localhost:5173
```

## 2. Configurar secretos

En las variables de entorno del proyecto de Vercel agrega, para **Production** y **Preview**:

```text
GOOGLE_CLIENT_ID=<ID de cliente de Google>
GOOGLE_CLIENT_SECRET=<secreto de cliente de Google>
GOOGLE_REDIRECT_URI=https://la-yeka-web.vercel.app/api/auth/google/callback
```

Para desarrollo local, agrega las mismas variables a `.env`, usando:

```text
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

No subas estos valores a GitHub. Tras guardar las variables en Vercel, realiza un nuevo despliegue.
