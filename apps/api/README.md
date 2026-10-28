# API de La Yeka

Esta API Hono es el único acceso a PostgreSQL. Tanto la tienda como el panel administrativo consumen los endpoints bajo /api.

## Endpoints principales

- GET /api/catalog: catálogo público.
- POST /api/auth/register y POST /api/auth/login: cuentas de clientes.
- POST /api/orders: crea pedidos y calcula el total desde la base de datos.
- POST /api/claims: registra hojas de reclamación.
- /api/admin/*: requiere una sesión con rol ADMIN.

## Seguridad

Las contraseñas se almacenan con Argon2. Los tokens están firmados con JWT_SECRET, tienen una vigencia de ocho horas y no incluyen hashes ni datos sensibles.

## Producción

En Vercel, el manejador es api/[...route].ts. Deben configurarse DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, ADMIN_ORIGIN, ADMIN_EMAIL y ADMIN_PASSWORD.
