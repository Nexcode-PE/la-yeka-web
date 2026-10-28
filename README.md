# La Yeka Platform

Monorepo de la tienda La Yeka. El cliente, la administración y la API son aplicaciones separadas que utilizan una sola base PostgreSQL mediante Prisma.

## Estructura

- apps/client: tienda pública React + Tailwind.
- apps/admin: operación interna React + Tailwind.
- apps/api: API Hono para catálogo, cuentas, pedidos y reclamos.
- packages/database: esquema, migraciones, cliente Prisma y semilla del catálogo.

## Desarrollo

1. Copia .env.example como .env y completa sus valores.
2. Instala dependencias con pnpm install.
3. Ejecuta pnpm db:generate, pnpm db:migrate y pnpm db:seed.
4. Inicia los tres servicios en terminales separadas: pnpm dev:api, pnpm dev:cliente, pnpm dev:admin.

## Publicación

La configuración raíz de Vercel publica la tienda y expone la API bajo /api. Antes de desplegar, configura en Vercel DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN, ADMIN_ORIGIN, VITE_API_URL, ADMIN_EMAIL y ADMIN_PASSWORD. Ejecuta las migraciones pendientes con pnpm db:migrate:deploy.

No incluyas valores secretos en Git ni en variables VITE_* distintas de la URL pública de la API.
