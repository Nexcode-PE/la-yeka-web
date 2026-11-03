import { db } from './client'

const MARKER = 'DEMO · PRESENTACIÓN'
const DEMO_EMAIL = 'demo.cliente@yeka.invalid'

async function main() {
  const orders = await db.order.deleteMany({ where: { notes: { startsWith: MARKER } } })
  const claims = await db.claim.deleteMany({ where: { customerName: { startsWith: 'DEMO ·' } } })
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } })
  console.log(`Datos DEMO eliminados: ${orders.count} pedidos y ${claims.count} reclamos.`)
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(() => db.$disconnect())
