import argon2 from 'argon2'
import { db } from './client'

const MARKER = 'DEMO · PRESENTACIÓN'
const DEMO_EMAIL = 'demo.cliente@yeka.invalid'
const VOUCHER_URL = 'https://placehold.co/600x800/png?text=Voucher+Yape+Demo'

const now = Date.now()
const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000)

async function removePreviousDemoData() {
  await db.order.deleteMany({ where: { notes: { startsWith: MARKER } } })
  await db.claim.deleteMany({ where: { customerName: { startsWith: 'DEMO ·' } } })
}

async function createOrder(input: {
  name: string
  phone: string
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  paymentMethod: 'CASH' | 'YAPE'
  paymentStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
  paymentReference?: string
  createdAt: Date
  productIndexes: number[]
  cancellationReason?: string
}) {
  const products = await db.product.findMany({
    where: { isAvailable: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  })
  const selected = input.productIndexes.map((index) => products[index]).filter(Boolean)
  if (!selected.length) throw new Error('No hay productos disponibles para generar pedidos DEMO.')

  const total = selected.reduce((sum, product) => sum + Number(product.price), 0)
  const order = await db.order.create({
    data: {
      customerName: input.name,
      customerPhone: input.phone,
      fulfillment: 'DELIVERY',
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentStatus,
      paymentReference: input.paymentReference,
      paymentProofUrl: input.paymentMethod === 'YAPE' ? VOUCHER_URL : null,
      paymentReviewedAt: input.paymentStatus !== 'PENDING' ? input.createdAt : null,
      address: 'Calle Demo 123',
      district: 'Chincha Alta',
      notes: `${MARKER} · Pedido creado para mostrar el flujo operativo.`,
      total,
      status: input.status,
      createdAt: input.createdAt,
      items: {
        create: selected.map((product) => ({
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
        })),
      },
    },
  })

  await db.orderStatusEvent.create({
    data: { orderId: order.id, toStatus: 'PENDING', createdAt: input.createdAt },
  })
  if (input.status !== 'PENDING') {
    const admin = await db.user.findFirst({ where: { role: 'ADMIN', isActive: true }, select: { id: true } })
    await db.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: 'PENDING',
        toStatus: input.status,
        reason: input.cancellationReason,
        changedById: admin?.id,
        createdAt: new Date(input.createdAt.getTime() + 15 * 60 * 1000),
      },
    })
  }
}

async function main() {
  const products = await db.product.count({ where: { isAvailable: true } })
  if (products < 2) throw new Error('Primero carga el catálogo real con el comando de seed.')

  await removePreviousDemoData()
  await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: 'DEMO · Cliente La Yeka', role: 'CUSTOMER', isActive: true },
    create: {
      email: DEMO_EMAIL,
      name: 'DEMO · Cliente La Yeka',
      role: 'CUSTOMER',
      passwordHash: await argon2.hash('DemoYeka2026!'),
    },
  })

  await createOrder({ name: 'DEMO · Ana Torres', phone: '999 000 101', status: 'PENDING', paymentMethod: 'YAPE', paymentStatus: 'PENDING', paymentReference: 'YAPE-DEMO-001', createdAt: hoursAgo(4), productIndexes: [0, 1] })
  await createOrder({ name: 'DEMO · Bruno Rojas', phone: '999 000 102', status: 'CONFIRMED', paymentMethod: 'YAPE', paymentStatus: 'VERIFIED', paymentReference: 'YAPE-DEMO-002', createdAt: hoursAgo(3), productIndexes: [1] })
  await createOrder({ name: 'DEMO · Carla Vega', phone: '999 000 103', status: 'PREPARING', paymentMethod: 'CASH', paymentStatus: 'PENDING', createdAt: hoursAgo(2), productIndexes: [0, 2] })
  await createOrder({ name: 'DEMO · Diego Cruz', phone: '999 000 104', status: 'READY', paymentMethod: 'YAPE', paymentStatus: 'VERIFIED', paymentReference: 'YAPE-DEMO-003', createdAt: hoursAgo(1), productIndexes: [2] })
  await createOrder({ name: 'DEMO · Elena Ruiz', phone: '999 000 105', status: 'DELIVERED', paymentMethod: 'CASH', paymentStatus: 'VERIFIED', createdAt: hoursAgo(24), productIndexes: [0] })
  await createOrder({ name: 'DEMO · Fabio León', phone: '999 000 106', status: 'CANCELLED', paymentMethod: 'YAPE', paymentStatus: 'REJECTED', paymentReference: 'YAPE-DEMO-004', createdAt: hoursAgo(6), productIndexes: [1], cancellationReason: 'Cliente solicitó anulación durante la demostración.' })

  await db.claim.createMany({
    data: [
      { customerName: 'DEMO · Laura Mendoza', document: '70000001', email: 'laura.demo@example.com', phone: '999 000 201', kind: 'COMPLAINT', detail: 'Pedido de demostración pendiente de revisión.', requestedSolution: 'Contactar al cliente.', status: 'RECEIVED' },
      { customerName: 'DEMO · Marco Salas', document: '70000002', email: 'marco.demo@example.com', phone: '999 000 202', kind: 'SERVICE_ISSUE', detail: 'Demora simulada en la entrega.', requestedSolution: 'Revisar el caso.', status: 'IN_REVIEW', adminResponse: 'Caso en evaluación por el equipo.', respondedAt: hoursAgo(2) },
      { customerName: 'DEMO · Sofía Paredes', document: '70000003', email: 'sofia.demo@example.com', phone: '999 000 203', kind: 'COMPLAINT', detail: 'Caso demostrativo resuelto.', requestedSolution: 'Respuesta formal.', status: 'RESOLVED', adminResponse: 'Se atendió la solicitud y se confirmó la solución.', respondedAt: hoursAgo(20), resolvedAt: hoursAgo(18) },
    ],
  })

  console.log('Datos DEMO cargados: 6 pedidos y 3 reclamos.')
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(() => db.$disconnect())
