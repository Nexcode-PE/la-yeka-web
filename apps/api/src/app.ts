import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { put } from '@vercel/blob';
import { z } from 'zod';
import argon2 from 'argon2';
import { db } from '../../../packages/database/src/client.js';
import {
  createGoogleState,
  login,
  loginWithGoogle,
  registerCustomer,
  requireAdmin,
  requireUser,
  verifyGoogleState,
} from './auth.js';

const app = new Hono().basePath('/api');
const writeAudit = async (
  admin: { id: string },
  action: string,
  entityType: string,
  entityId?: string,
  detail?: string,
) => {
  await db.auditLog.create({ data: { adminId: admin.id, action, entityType, entityId, detail } });
};
const sessionsEnabled = () => Boolean(process.env.JWT_SECRET);
const allowedOrigins = [process.env.CLIENT_ORIGIN, process.env.ADMIN_ORIGIN].filter(
  Boolean,
) as string[];
const clientOrigin = () => process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const validReturnTo = (candidate?: string) => {
  try {
    const url = new URL(candidate || clientOrigin());
    return url.origin === clientOrigin() ? url.origin : clientOrigin();
  } catch {
    return clientOrigin();
  }
};
const googleConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI,
  );
type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();
const enforceRateLimit = (
  c: { req: { header: (name: string) => string | undefined } },
  scope: string,
  max: number,
  windowMs: number,
) => {
  const address = (c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown')
    .split(',')[0]
    .trim();
  const key = `${scope}:${address}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
};
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] || '*';
      return allowedOrigins.length === 0 || allowedOrigins.includes(origin) ? origin : '';
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});
app.get('/health', (c) => c.json({ ok: true }));
const defaultStoreSettings = {
  id: 'main',
  businessName: 'La Yeka',
  whatsapp: '51974121550',
  address: 'Calle Mariscal Benavides 150, Chincha Alta',
  district: 'Chincha Alta',
  openingHours: 'Todos los días · 6:00 p. m. a 11:00 p. m.',
  deliveryNote: 'Confirma cobertura y tiempo de entrega por WhatsApp.',
};
app.get('/settings', async (c) =>
  c.json(
    await db.storeSettings.upsert({
      where: { id: 'main' },
      update: {},
      create: defaultStoreSettings,
    }),
  ),
);
app.get('/catalog', async (c) =>
  c.json(
    await db.category.findMany({
      where: { isAvailable: true },
      orderBy: { position: 'asc' },
      include: { products: { where: { isAvailable: true }, orderBy: { position: 'asc' } } },
    }),
  ),
);
app.post('/auth/login', async (c) => {
  if (enforceRateLimit(c, 'login', 5, 15 * 60 * 1000))
    return c.json(
      { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' },
      429,
    );
  if (!sessionsEnabled()) return c.json({ error: 'El acceso aún no está configurado.' }, 503);
  const data = z
    .object({ email: z.string().email(), password: z.string().min(10) })
    .safeParse(await c.req.json());
  if (!data.success) return c.json({ error: 'Credenciales inválidas' }, 400);
  const session = await login(data.data.email, data.data.password);
  return session ? c.json(session) : c.json({ error: 'Correo o contraseña incorrectos' }, 401);
});
app.post('/auth/register', async (c) => {
  if (enforceRateLimit(c, 'register', 5, 60 * 60 * 1000))
    return c.json({ error: 'Demasiados registros desde esta conexión. Inténtalo más tarde.' }, 429);
  if (!sessionsEnabled()) return c.json({ error: 'El acceso aún no está configurado.' }, 503);
  const data = z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z.string().email(),
      password: z.string().min(10).max(128),
      phone: z.string().trim().min(7).max(25).optional(),
      deliveryAddress: z.string().trim().min(5).max(200).optional(),
      district: z.string().trim().min(2).max(100).optional(),
    })
    .safeParse(await c.req.json());
  if (!data.success)
    return c.json(
      { error: 'Revisa los datos de registro. La contraseña debe tener al menos 10 caracteres.' },
      400,
    );
  const session = await registerCustomer(
    data.data.name,
    data.data.email,
    data.data.password,
    data.data.phone,
    data.data.deliveryAddress,
    data.data.district,
  );
  return 'error' in session ? c.json(session, 409) : c.json(session, 201);
});
app.get('/auth/google', async (c) => {
  if (!sessionsEnabled() || !googleConfigured())
    return c.json({ error: 'El acceso con Google aún no está configurado.' }, 503);
  const returnTo = validReturnTo(c.req.query('returnTo'));
  const state = await createGoogleState(returnTo);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString();
  return c.redirect(url.toString());
});
app.get('/auth/google/callback', async (c) => {
  const state = c.req.query('state') || '';
  const returnTo = await verifyGoogleState(state);
  const destination = validReturnTo(returnTo || undefined);
  const fail = (reason: string) =>
    c.redirect(`${destination}#google_error=${encodeURIComponent(reason)}`);
  const code = c.req.query('code');
  if (!code || !returnTo || !googleConfigured())
    return fail('No se pudo completar el acceso con Google.');
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });
    const token = (await tokenResponse.json().catch(() => null)) as {
      access_token?: string;
    } | null;
    if (!tokenResponse.ok || !token?.access_token) return fail('Google no autorizó el acceso.');
    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = (await userResponse.json().catch(() => null)) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    } | null;
    if (!userResponse.ok || !profile?.sub || !profile.email)
      return fail('No se pudo leer el perfil de Google.');
    const session = await loginWithGoogle({
      sub: profile.sub,
      email: profile.email,
      emailVerified: Boolean(profile.email_verified),
      name: profile.name,
    });
    if ('error' in session && session.error) return fail(session.error);
    return c.redirect(`${destination}#google_token=${encodeURIComponent(session.token)}`);
  } catch {
    return fail('No se pudo conectar con Google. Inténtalo nuevamente.');
  }
});
app.get('/auth/me', async (c) => {
  const user = await requireUser(c.req.header('authorization'));
  return user ? c.json({ user }) : c.json({ error: 'No autorizado' }, 401);
});
app.patch('/auth/profile', async (c) => {
  const user = await requireUser(c.req.header('authorization'));
  if (!user) return c.json({ error: 'No autorizado' }, 401);
  const data = z
    .object({
      name: z.string().trim().min(2).max(100),
      phone: z.string().trim().min(7).max(25),
      deliveryAddress: z.string().trim().min(5).max(200),
      district: z.string().trim().min(2).max(100),
    })
    .safeParse(await c.req.json());
  if (!data.success) return c.json({ error: 'Completa los datos de contacto y entrega.' }, 400);
  const updated = await db.user.update({ where: { id: user.id }, data: data.data });
  return c.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      deliveryAddress: updated.deliveryAddress,
      district: updated.district,
      role: updated.role,
    },
  });
});
app.get('/orders/me', async (c) => {
  const user = await requireUser(c.req.header('authorization'));
  if (!user) return c.json({ error: 'No autorizado' }, 401);
  return c.json(
    await db.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  );
});
app.get('/admin/products', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  return c.json(
    await db.product.findMany({
      include: { category: true },
      orderBy: [{ category: { position: 'asc' } }, { position: 'asc' }],
    }),
  );
});
app.get('/admin/team', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  return c.json(
    await db.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  );
});
app.get('/admin/audit', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  return c.json(
    await db.auditLog.findMany({
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  );
});
app.get('/admin/alerts', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const [orders, claims, pausedProducts] = await Promise.all([
    db.order.findMany({
      where: { status: 'PENDING' },
      select: { id: true, customerName: true, total: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.claim.findMany({
      where: { status: { in: ['RECEIVED', 'IN_REVIEW'] } },
      select: { id: true, customerName: true, kind: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.product.count({ where: { isAvailable: false } }),
  ]);
  const alerts = [
    ...orders.map((order) => ({
      id: `order-${order.id}`,
      kind: 'ORDER',
      title: 'Pedido por confirmar',
      description: `${order.customerName || 'Cliente'} · S/ ${Number(order.total).toFixed(2)}`,
      createdAt: order.createdAt,
      view: 'orders',
    })),
    ...claims.map((claim) => ({
      id: `claim-${claim.id}`,
      kind: 'CLAIM',
      title: 'Reclamo pendiente',
      description: `${claim.customerName} · ${claim.kind === 'COMPLAINT' ? 'Reclamo' : 'Queja'}`,
      createdAt: claim.createdAt,
      view: 'claims',
    })),
    ...(pausedProducts
      ? [
          {
            id: 'paused-products',
            kind: 'CATALOG',
            title: 'Productos pausados',
            description: `Hay ${pausedProducts} producto${pausedProducts === 1 ? '' : 's'} fuera de la carta.`,
            createdAt: new Date(),
            view: 'products',
          },
        ]
      : []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return c.json({ count: alerts.length, alerts });
});
app.get('/admin/settings', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  return c.json(
    await db.storeSettings.upsert({
      where: { id: 'main' },
      update: {},
      create: defaultStoreSettings,
    }),
  );
});
app.get('/admin/categories', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  return c.json(
    await db.category.findMany({
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  );
});
app.get('/admin/dashboard', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const range =
    c.req.query('range') === 'week' ? 'week' : c.req.query('range') === 'month' ? 'month' : 'today';
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (range === 'month') start.setDate(1);
  const [rangeOrders, pending, totalProducts, availableProducts, recentOrders] = await Promise.all([
    db.order.findMany({
      where: { createdAt: { gte: start }, status: { not: 'CANCELLED' } },
      include: { items: true },
    }),
    db.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] } } }),
    db.product.count(),
    db.product.count({ where: { isAvailable: true } }),
    db.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  const sales = rangeOrders.reduce((total, order) => total + Number(order.total), 0);
  const productSales = new Map<string, { quantity: number; revenue: number }>();
  for (const order of rangeOrders)
    for (const item of order.items) {
      const current = productSales.get(item.productName) || { quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += Number(item.unitPrice) * item.quantity;
      productSales.set(item.productName, current);
    }
  const topProducts = [...productSales.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);
  return c.json({
    range,
    sales,
    orders: rangeOrders.length,
    averageTicket: rangeOrders.length ? sales / rangeOrders.length : 0,
    pending,
    totalProducts,
    availableProducts,
    recentOrders,
    topProducts,
    paymentBreakdown: Object.fromEntries(
      ['CASH', 'YAPE'].map((method) => [
        method,
        rangeOrders
          .filter((order) => order.paymentMethod === method)
          .reduce((total, order) => total + Number(order.total), 0),
      ]),
    ),
    statusBreakdown: Object.fromEntries(
      ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'].map((status) => [
        status,
        rangeOrders.filter((order) => order.status === status).length,
      ]),
    ),
  });
});
const productInput = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  price: z.number().positive().max(999),
  categoryId: z.string().uuid().nullable().optional(),
  imagePath: z.string().url().nullable().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});
const adminUserInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(10).max(128),
});
const adminUserUpdate = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  password: z.string().min(10).max(128).optional(),
  isActive: z.boolean().optional(),
});
app.post('/admin/team', async (c) => {
  const admin = await requireAdmin(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'No autorizado' }, 401);
  const parsed = adminUserInput.safeParse(await c.req.json());
  if (!parsed.success)
    return c.json({ error: 'Revisa nombre, correo y contraseña (mínimo 10 caracteres).' }, 400);
  try {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.trim().toLowerCase(),
        passwordHash: await argon2.hash(parsed.data.password),
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await writeAudit(admin, 'CREATE', 'TEAM_MEMBER', user.id, `Creó el acceso de ${user.email}`);
    return c.json(user, 201);
  } catch {
    return c.json({ error: 'Ya existe una cuenta con este correo.' }, 409);
  }
});
app.patch('/admin/team/:id', async (c) => {
  const admin = await requireAdmin(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'No autorizado' }, 401);
  const parsed = adminUserUpdate.safeParse(await c.req.json());
  if (!parsed.success || Object.keys(parsed.data).length === 0)
    return c.json(
      { error: 'Datos inválidos. La contraseña debe tener al menos 10 caracteres.' },
      400,
    );
  const id = c.req.param('id');
  if (id === admin.id && parsed.data.isActive === false)
    return c.json({ error: 'No puedes desactivar tu propia cuenta.' }, 400);
  try {
    const { password, ...data } = parsed.data;
    const member = await db.user.update({
      where: { id },
      data: { ...data, ...(password ? { passwordHash: await argon2.hash(password) } : {}) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await writeAudit(admin, 'UPDATE', 'TEAM_MEMBER', id, `Actualizó el acceso de ${member.email}`);
    return c.json(member);
  } catch {
    return c.json({ error: 'Cuenta administrativa no encontrada.' }, 404);
  }
});
const storeSettingsInput = z.object({
  businessName: z.string().trim().min(2).max(80),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,20}$/),
  address: z.string().trim().min(8).max(200),
  district: z.string().trim().min(2).max(80),
  openingHours: z.string().trim().min(5).max(160),
  deliveryNote: z.string().trim().min(5).max(240),
});
app.patch('/admin/settings', async (c) => {
  const admin = await requireAdmin(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'No autorizado' }, 401);
  const parsed = storeSettingsInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Revisa los datos de operación.' }, 400);
  const settings = await db.storeSettings.upsert({
    where: { id: 'main' },
    update: parsed.data,
    create: { id: 'main', ...parsed.data },
  });
  await writeAudit(
    admin,
    'UPDATE',
    'STORE_SETTINGS',
    'main',
    'Actualizó la configuración del negocio',
  );
  return c.json(settings);
});
const productUpdate = productInput.partial();
app.post('/admin/products', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const parsed = productInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Revisa los datos del producto.' }, 400);
  return c.json(await db.product.create({ data: parsed.data, include: { category: true } }), 201);
});
app.patch('/admin/products/:id', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const parsed = productUpdate.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Datos inválidos' }, 400);
  const product = await db.product.update({ where: { id: c.req.param('id') }, data: parsed.data });
  return c.json(product);
});
app.delete('/admin/products/:id', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  await db.product.delete({ where: { id: c.req.param('id') } });
  return c.body(null, 204);
});
app.post('/admin/uploads', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN)
    return c.json({ error: 'El almacenamiento de imágenes aún no está configurado.' }, 503);
  const form = await c.req.parseBody();
  const image = form.image;
  if (!(image instanceof File))
    return c.json({ error: 'Selecciona una imagen para continuar.' }, 400);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type))
    return c.json({ error: 'Usa una imagen JPG, PNG o WEBP.' }, 400);
  if (image.size > 4 * 1024 * 1024)
    return c.json({ error: 'La imagen no puede superar los 4 MB.' }, 400);
  const safeName = image.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'producto';
  const blob = await put(`products/${safeName}`, image, {
    access: 'public',
    addRandomSuffix: true,
  });
  return c.json({ url: blob.url }, 201);
});
const categoryInput = z.object({
  name: z.string().trim().min(2).max(50),
  position: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
});
const categoryUpdate = categoryInput.partial();
app.post('/admin/categories', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const parsed = categoryInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Nombre de categoría inválido' }, 400);
  const position = parsed.data.position ?? (await db.category.count());
  try {
    return c.json(
      await db.category.create({
        data: { ...parsed.data, position },
        include: { _count: { select: { products: true } } },
      }),
      201,
    );
  } catch {
    return c.json({ error: 'La categoría ya existe.' }, 409);
  }
});
app.patch('/admin/categories/:id', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const parsed = categoryUpdate.safeParse(await c.req.json());
  if (!parsed.success || Object.keys(parsed.data).length === 0)
    return c.json({ error: 'Datos inválidos' }, 400);
  try {
    const id = c.req.param('id');
    const current = await db.category.findUniqueOrThrow({ where: { id } });
    const { position, ...changes } = parsed.data;
    if (position === undefined || position === current.position) {
      return c.json(
        await db.category.update({
          where: { id },
          data: changes,
          include: { _count: { select: { products: true } } },
        }),
      );
    }
    const lastPosition = Math.max(0, (await db.category.count()) - 1);
    const nextPosition = Math.min(position, lastPosition);
    await db.$transaction([
      db.category.updateMany({
        where:
          nextPosition < current.position
            ? { position: { gte: nextPosition, lt: current.position } }
            : { position: { gt: current.position, lte: nextPosition } },
        data: { position: nextPosition < current.position ? { increment: 1 } : { decrement: 1 } },
      }),
      db.category.update({ where: { id }, data: { ...changes, position: nextPosition } }),
    ]);
    return c.json(
      await db.category.findUnique({
        where: { id },
        include: { _count: { select: { products: true } } },
      }),
    );
  } catch {
    return c.json({ error: 'Categoría no encontrada o nombre duplicado.' }, 404);
  }
});
app.delete('/admin/categories/:id', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const id = c.req.param('id');
  if ((await db.product.count({ where: { categoryId: id } })) > 0)
    return c.json(
      {
        error:
          'No se puede eliminar una categoría que aún tiene productos. Mueve o elimina esos productos primero.',
      },
      409,
    );
  try {
    await db.category.delete({ where: { id } });
    return c.body(null, 204);
  } catch {
    return c.json({ error: 'Categoría no encontrada.' }, 404);
  }
});
app.get('/admin/orders', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  return c.json(
    await db.order.findMany({
      include: {
        items: true,
        statusEvents: {
          include: { changedBy: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  );
});
const deliveryAssignmentInput = z.object({
  deliveryDriver: z.string().trim().min(2).max(100).nullable().optional(),
  deliveryFee: z.number().min(0).max(100).optional(),
  estimatedMinutes: z.number().int().min(1).max(240).nullable().optional(),
});
app.patch('/admin/orders/:id/delivery', async (c) => {
  const admin = await requireAdmin(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'No autorizado' }, 401);
  const parsed = deliveryAssignmentInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Revisa los datos de reparto.' }, 400);
  try {
    const current = await db.order.findUniqueOrThrow({ where: { id: c.req.param('id') } });
    if (current.fulfillment !== 'DELIVERY')
      return c.json({ error: 'Este pedido es para recojo en local.' }, 400);
    const order = await db.order.update({
      where: { id: current.id },
      data: parsed.data,
    });
    await writeAudit(
      admin,
      'UPDATE',
      'ORDER_DELIVERY',
      order.id,
      `Pedido #${order.orderNumber}: reparto ${order.deliveryDriver || 'sin asignar'}`,
    );
    return c.json(order);
  } catch {
    return c.json({ error: 'Pedido no encontrado.' }, 404);
  }
});
const cashShiftOpenInput = z.object({
  openingAmount: z.number().min(0).max(10000),
  notes: z.string().trim().max(500).optional(),
});
const cashShiftCloseInput = z.object({
  closingAmount: z.number().min(0).max(10000),
  notes: z.string().trim().max(500).optional(),
});
const cashSummaryForShift = async (openedAt: Date, closedAt?: Date | null) => {
  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: openedAt, ...(closedAt ? { lte: closedAt } : {}) },
      status: { not: 'CANCELLED' },
    },
    select: { paymentMethod: true, paymentStatus: true, status: true, total: true },
  });
  return orders.reduce(
    (summary, order) => {
      if (order.status !== 'DELIVERED') return summary;
      const amount = Number(order.total);
      summary.completedOrders += 1;
      if (order.paymentMethod === 'CASH') summary.cash += amount;
      if (order.paymentMethod === 'YAPE' && order.paymentStatus === 'VERIFIED') summary.yape += amount;
      return summary;
    },
    { cash: 0, yape: 0, completedOrders: 0 },
  );
};
app.get('/admin/cash-shifts', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const [openShift, recent] = await Promise.all([
    db.cashShift.findFirst({ where: { closedAt: null }, orderBy: { openedAt: 'desc' } }),
    db.cashShift.findMany({ where: { closedAt: { not: null } }, orderBy: { closedAt: 'desc' }, take: 10 }),
  ]);
  return c.json({
    openShift: openShift
      ? { ...openShift, summary: await cashSummaryForShift(openShift.openedAt) }
      : null,
    recent,
  });
});
app.post('/admin/cash-shifts', async (c) => {
  const admin = await requireAdmin(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'No autorizado' }, 401);
  const parsed = cashShiftOpenInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Monto de apertura inválido.' }, 400);
  if (await db.cashShift.findFirst({ where: { closedAt: null } }))
    return c.json({ error: 'Ya hay una caja abierta. Ciérrala antes de iniciar otro turno.' }, 409);
  const shift = await db.cashShift.create({
    data: { openedById: admin.id, openingAmount: parsed.data.openingAmount, notes: parsed.data.notes },
  });
  await writeAudit(admin, 'CREATE', 'CASH_SHIFT', shift.id, 'Abrió turno de caja');
  return c.json(shift, 201);
});
app.patch('/admin/cash-shifts/:id/close', async (c) => {
  const admin = await requireAdmin(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'No autorizado' }, 401);
  const parsed = cashShiftCloseInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Monto de cierre inválido.' }, 400);
  try {
    const current = await db.cashShift.findUniqueOrThrow({ where: { id: c.req.param('id') } });
    if (current.closedAt) return c.json({ error: 'Este turno ya fue cerrado.' }, 409);
    const shift = await db.cashShift.update({
      where: { id: current.id },
      data: { closingAmount: parsed.data.closingAmount, notes: parsed.data.notes ?? current.notes, closedAt: new Date() },
    });
    await writeAudit(admin, 'UPDATE', 'CASH_SHIFT', shift.id, 'Cerró turno de caja');
    return c.json({ ...shift, summary: await cashSummaryForShift(shift.openedAt, shift.closedAt) });
  } catch {
    return c.json({ error: 'Turno de caja no encontrado.' }, 404);
  }
});
app.get('/admin/claims', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  return c.json(await db.claim.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }));
});
const orderStatus = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']),
  reason: z.string().trim().max(300).optional(),
});
app.patch('/admin/orders/:id', async (c) => {
  const admin = await requireAdmin(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'No autorizado' }, 401);
  const parsed = orderStatus.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Estado inválido' }, 400);
  if (parsed.data.status === 'CANCELLED' && (!parsed.data.reason || parsed.data.reason.length < 5))
    return c.json(
      { error: 'Indica un motivo de al menos 5 caracteres para cancelar el pedido.' },
      400,
    );
  try {
    const current = await db.order.findUniqueOrThrow({ where: { id: c.req.param('id') } });
    if (current.status === parsed.data.status) return c.json(current);
    const order = await db.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: current.id },
        data: { status: parsed.data.status },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: current.id,
          fromStatus: current.status,
          toStatus: parsed.data.status,
          changedById: admin.id,
          reason: parsed.data.reason || `Estado actualizado a ${parsed.data.status}`,
        },
      });
      return updated;
    });
    await writeAudit(
      admin,
      'UPDATE',
      'ORDER',
      order.id,
      `Pedido #${order.orderNumber}: ${current.status} → ${order.status}`,
    );
    return c.json(order);
  } catch {
    return c.json({ error: 'Pedido no encontrado.' }, 404);
  }
});
const paymentUpdate = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
  reference: z.string().trim().max(120).nullable().optional(),
});
app.patch('/admin/orders/:id/payment', async (c) => {
  const admin = await requireAdmin(c.req.header('authorization'));
  if (!admin) return c.json({ error: 'No autorizado' }, 401);
  const parsed = paymentUpdate.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Datos de pago inválidos.' }, 400);
  try {
    const current = await db.order.findUniqueOrThrow({ where: { id: c.req.param('id') } });
    const reference =
      parsed.data.reference === undefined ? current.paymentReference : parsed.data.reference;
    if (
      current.paymentMethod === 'YAPE' &&
      parsed.data.status === 'VERIFIED' &&
      (!reference || !current.paymentProofUrl)
    )
      return c.json({ error: 'Para validar Yape se requiere código de operación y voucher.' }, 400);
    const order = await db.order.update({
      where: { id: current.id },
      data: {
        paymentStatus: parsed.data.status,
        paymentReference: reference,
        paymentReviewedAt: parsed.data.status === 'PENDING' ? null : new Date(),
      },
    });
    await writeAudit(
      admin,
      'UPDATE',
      'ORDER_PAYMENT',
      order.id,
      `Pedido #${order.orderNumber}: pago ${order.paymentStatus}`,
    );
    return c.json(order);
  } catch {
    return c.json({ error: 'Pedido no encontrado.' }, 404);
  }
});
app.post('/orders/:id/payment-proof', async (c) => {
  const token = c.req.header('x-payment-token');
  if (!token) return c.json({ error: 'No autorizado para subir este voucher.' }, 401);
  const order = await db.order.findUnique({ where: { id: c.req.param('id') } });
  if (!order || order.paymentToken !== token || order.paymentMethod !== 'YAPE')
    return c.json({ error: 'Pedido no válido para voucher.' }, 403);
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN)
    return c.json({ error: 'El almacenamiento de comprobantes aún no está configurado.' }, 503);
  const form = await c.req.parseBody();
  const proof = form.proof;
  if (!(proof instanceof File))
    return c.json({ error: 'Selecciona el voucher para continuar.' }, 400);
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(proof.type) ||
    proof.size > 4 * 1024 * 1024
  )
    return c.json({ error: 'El voucher debe ser JPG, PNG o WEBP y no superar 4 MB.' }, 400);
  const extension =
    proof.type === 'image/png' ? 'png' : proof.type === 'image/webp' ? 'webp' : 'jpg';
  const blob = await put(`payment-proofs/YEKA-${order.orderNumber}.${extension}`, proof, {
    access: 'public',
    addRandomSuffix: true,
  });
  await db.order.update({
    where: { id: order.id },
    data: { paymentProofUrl: blob.url, paymentStatus: 'PENDING' },
  });
  return c.json({ url: blob.url }, 201);
});
const claimUpdate = z.object({
  status: z.enum(['RECEIVED', 'IN_REVIEW', 'RESOLVED']).optional(),
  adminResponse: z.string().trim().min(10).max(2000).nullable().optional(),
});
app.patch('/admin/claims/:id', async (c) => {
  if (!(await requireAdmin(c.req.header('authorization'))))
    return c.json({ error: 'No autorizado' }, 401);
  const parsed = claimUpdate.safeParse(await c.req.json());
  if (!parsed.success || Object.keys(parsed.data).length === 0)
    return c.json(
      { error: 'Datos inválidos. La respuesta debe tener al menos 10 caracteres.' },
      400,
    );
  try {
    const current = await db.claim.findUniqueOrThrow({ where: { id: c.req.param('id') } });
    const nextStatus = parsed.data.status ?? current.status;
    const nextResponse =
      parsed.data.adminResponse === undefined ? current.adminResponse : parsed.data.adminResponse;
    if (nextStatus === 'RESOLVED' && !nextResponse)
      return c.json({ error: 'Registra una respuesta antes de cerrar el caso.' }, 400);
    const responseChanged =
      parsed.data.adminResponse !== undefined &&
      parsed.data.adminResponse !== current.adminResponse;
    return c.json(
      await db.claim.update({
        where: { id: current.id },
        data: {
          ...parsed.data,
          ...(responseChanged && parsed.data.adminResponse ? { respondedAt: new Date() } : {}),
          ...(nextStatus === 'RESOLVED' && current.status !== 'RESOLVED'
            ? { resolvedAt: new Date() }
            : {}),
        },
      }),
    );
  } catch {
    return c.json({ error: 'Reclamo no encontrado.' }, 404);
  }
});

const orderInput = z
  .object({
    customerName: z.string().min(2),
    customerPhone: z.string().min(6),
    notes: z.string().max(500).optional(),
    fulfillment: z.enum(['DELIVERY', 'PICKUP']).default('DELIVERY'),
    paymentMethod: z.enum(['CASH', 'YAPE']).default('CASH'),
    paymentReference: z.string().trim().max(120).optional(),
    address: z.string().trim().min(5).max(250).optional(),
    district: z.string().trim().min(2).max(80).optional(),
    items: z
      .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
      .min(1),
  })
  .superRefine((data, context) => {
    if (data.fulfillment === 'DELIVERY' && (!data.address || !data.district))
      context.addIssue({
        code: 'custom',
        message: 'Indica dirección y distrito para el delivery.',
      });
    if (data.paymentMethod === 'YAPE' && !data.paymentReference)
      context.addIssue({ code: 'custom', message: 'Indica el código de operación Yape.' });
  });
app.post('/orders', async (c) => {
  if (enforceRateLimit(c, 'orders', 20, 10 * 60 * 1000))
    return c.json({ error: 'Demasiados pedidos en poco tiempo. Espera unos minutos.' }, 429);
  const parsed = orderInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Datos inválidos' }, 400);
  const ids = parsed.data.items.map((item) => item.productId);
  const products = await db.product.findMany({ where: { id: { in: ids }, isAvailable: true } });
  if (products.length !== ids.length) return c.json({ error: 'Producto no disponible' }, 409);
  const byId = new Map(products.map((product) => [product.id, product]));
  const total = parsed.data.items.reduce(
    (sum, item) => sum + Number(byId.get(item.productId)!.price) * item.quantity,
    0,
  );
  const user = await requireUser(c.req.header('authorization'));
  const order = await db.order.create({
    data: {
      userId: user?.id,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      notes: parsed.data.notes,
      fulfillment: parsed.data.fulfillment,
      paymentMethod: parsed.data.paymentMethod,
      paymentReference: parsed.data.paymentReference,
      address: parsed.data.address,
      district: parsed.data.district,
      total,
      items: {
        create: parsed.data.items.map((item) => {
          const p = byId.get(item.productId)!;
          return {
            productId: p.id,
            productName: p.name,
            unitPrice: p.price,
            quantity: item.quantity,
          };
        }),
      },
      statusEvents: { create: { toStatus: 'PENDING', reason: 'Pedido creado' } },
    },
  });
  return c.json(
    { id: order.id, orderNumber: order.orderNumber, paymentToken: order.paymentToken, total },
    201,
  );
});
const claimInput = z.object({
  customerName: z.string().min(2),
  document: z.string().min(4),
  email: z.string().email(),
  phone: z.string().min(6),
  kind: z.enum(['COMPLAINT', 'SERVICE_ISSUE']),
  orderReference: z.string().optional(),
  detail: z.string().min(10),
  requestedSolution: z.string().min(5),
});
app.post('/claims', async (c) => {
  if (enforceRateLimit(c, 'claims', 5, 60 * 60 * 1000))
    return c.json({ error: 'Demasiados registros desde esta conexión. Inténtalo más tarde.' }, 429);
  const parsed = claimInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: 'Datos inválidos' }, 400);
  const claim = await db.claim.create({ data: parsed.data });
  return c.json({ id: claim.id }, 201);
});
export default app;
