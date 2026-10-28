import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { db } from '../../../packages/database/src/client.js'
import { login, registerCustomer, requireAdmin, requireUser } from './auth.js'

const app = new Hono().basePath('/api')
const sessionsEnabled = () => Boolean(process.env.JWT_SECRET)
const allowedOrigins = [process.env.CLIENT_ORIGIN, process.env.ADMIN_ORIGIN].filter(Boolean) as string[]
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return allowedOrigins[0] || '*'
    return allowedOrigins.length === 0 || allowedOrigins.includes(origin) ? origin : ''
  },
  allowMethods: ['GET', 'POST', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
app.get('/health', (c) => c.json({ ok: true }))
app.get('/catalog', async (c) => c.json(await db.category.findMany({ orderBy: { position: 'asc' }, include: { products: { where: { isAvailable: true }, orderBy: { position: 'asc' } } } })))
app.post('/auth/login', async (c) => { if (!sessionsEnabled()) return c.json({ error:'El acceso aún no está configurado.' },503); const data = z.object({ email:z.string().email(), password:z.string().min(10) }).safeParse(await c.req.json()); if (!data.success) return c.json({ error:'Credenciales inválidas' },400); const session=await login(data.data.email,data.data.password); return session ? c.json(session) : c.json({ error:'Correo o contraseña incorrectos' },401) })
app.post('/auth/register', async (c) => {
  if (!sessionsEnabled()) return c.json({ error:'El acceso aún no está configurado.' },503)
  const data = z.object({ name:z.string().trim().min(2).max(100), email:z.string().email(), password:z.string().min(10).max(128) }).safeParse(await c.req.json())
  if (!data.success) return c.json({ error:'Revisa los datos de registro. La contraseña debe tener al menos 10 caracteres.' },400)
  const session = await registerCustomer(data.data.name, data.data.email, data.data.password)
  return 'error' in session ? c.json(session,409) : c.json(session,201)
})
app.get('/auth/me', async (c) => { const user = await requireUser(c.req.header('authorization')); return user ? c.json({ user }) : c.json({ error:'No autorizado' },401) })
app.get('/orders/me', async (c) => {
  const user = await requireUser(c.req.header('authorization'))
  if (!user) return c.json({ error:'No autorizado' },401)
  return c.json(await db.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  }))
})
app.get('/admin/products', async (c) => { if (!await requireAdmin(c.req.header('authorization'))) return c.json({ error:'No autorizado' },401); return c.json(await db.product.findMany({ include:{category:true},orderBy:[{category:{position:'asc'}},{position:'asc'}] })) })
const productUpdate = z.object({ price:z.number().positive().max(999).optional(), isAvailable:z.boolean().optional(), name:z.string().min(2).max(100).optional(), description:z.string().max(500).optional() })
app.patch('/admin/products/:id', async (c) => { if (!await requireAdmin(c.req.header('authorization'))) return c.json({ error:'No autorizado' },401); const parsed=productUpdate.safeParse(await c.req.json()); if(!parsed.success) return c.json({ error:'Datos inválidos' },400); const product=await db.product.update({ where:{id:c.req.param('id')},data:parsed.data }); return c.json(product) })
app.get('/admin/orders', async (c) => { if (!await requireAdmin(c.req.header('authorization'))) return c.json({ error:'No autorizado' },401); return c.json(await db.order.findMany({ include:{items:true},orderBy:{createdAt:'desc'},take:100 })) })
app.get('/admin/claims', async (c) => { if (!await requireAdmin(c.req.header('authorization'))) return c.json({ error:'No autorizado' },401); return c.json(await db.claim.findMany({ orderBy:{createdAt:'desc'},take:100 })) })
const orderStatus = z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'CANCELLED']) })
app.patch('/admin/orders/:id', async (c) => { if (!await requireAdmin(c.req.header('authorization'))) return c.json({ error:'No autorizado' },401); const parsed = orderStatus.safeParse(await c.req.json()); if (!parsed.success) return c.json({ error:'Estado inválido' },400); return c.json(await db.order.update({ where:{ id:c.req.param('id') }, data:parsed.data })) })
const claimStatus = z.object({ status: z.enum(['RECEIVED', 'IN_REVIEW', 'RESOLVED']) })
app.patch('/admin/claims/:id', async (c) => { if (!await requireAdmin(c.req.header('authorization'))) return c.json({ error:'No autorizado' },401); const parsed = claimStatus.safeParse(await c.req.json()); if (!parsed.success) return c.json({ error:'Estado inválido' },400); return c.json(await db.claim.update({ where:{ id:c.req.param('id') }, data:parsed.data })) })

const orderInput = z.object({ customerName:z.string().min(2), customerPhone:z.string().min(6), notes:z.string().max(500).optional(), items:z.array(z.object({ productId:z.string().uuid(), quantity:z.number().int().min(1).max(20) })).min(1) })
app.post('/orders', async (c) => {
  const parsed = orderInput.safeParse(await c.req.json()); if (!parsed.success) return c.json({ error:'Datos inválidos' },400)
  const ids = parsed.data.items.map((item) => item.productId); const products = await db.product.findMany({ where:{ id:{ in:ids }, isAvailable:true } }); if (products.length !== ids.length) return c.json({ error:'Producto no disponible' },409)
  const byId = new Map(products.map((product) => [product.id, product])); const total = parsed.data.items.reduce((sum,item) => sum + Number(byId.get(item.productId)!.price) * item.quantity,0)
  const user = await requireUser(c.req.header('authorization'))
  const order = await db.order.create({ data:{ userId:user?.id, customerName:parsed.data.customerName, customerPhone:parsed.data.customerPhone, notes:parsed.data.notes, total, items:{ create:parsed.data.items.map((item) => { const p=byId.get(item.productId)!; return { productId:p.id, productName:p.name, unitPrice:p.price, quantity:item.quantity } }) } } })
  return c.json({ id:order.id, total },201)
})
const claimInput=z.object({ customerName:z.string().min(2),document:z.string().min(4),email:z.string().email(),phone:z.string().min(6),kind:z.enum(['COMPLAINT','SERVICE_ISSUE']),orderReference:z.string().optional(),detail:z.string().min(10),requestedSolution:z.string().min(5) })
app.post('/claims', async(c)=>{const parsed=claimInput.safeParse(await c.req.json());if(!parsed.success)return c.json({error:'Datos inválidos'},400);const claim=await db.claim.create({data:parsed.data});return c.json({id:claim.id},201)})
export default app
