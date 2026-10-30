import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './client'
import argon2 from 'argon2'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../')
const source = readFileSync(process.env.CATALOG_SOURCE || resolve(root, 'apps/client/src/main.tsx'), 'utf8')
// Admite también las entradas legibles que ocupan varias líneas en el catálogo.
const pattern = /\[\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*'([^']+)'(?:\s*,\s*'([^']+)')?\s*,?\s*\]/g
const entries = [...source.matchAll(pattern)].map(([, name, description, price, category, tag]) => ({ name, description, price: Number(price), category, tag }))
const categoryNames = [...new Set(entries.map((entry) => entry.category))]

for (const [position, name] of categoryNames.entries()) {
  const category = await db.category.upsert({ where: { name }, update: { position }, create: { name, position } })
  for (const [productPosition, entry] of entries.filter((entry) => entry.category === name).entries()) {
    const existing = await db.product.findFirst({ where: { categoryId: category.id, name: entry.name } })
    const data = { description: entry.description, price: entry.price, position: productPosition, isFeatured: Boolean(entry.tag), isAvailable: true }
    if (existing) await db.product.update({ where: { id: existing.id }, data })
    else await db.product.create({ data: { categoryId: category.id, name: entry.name, ...data } })
  }
}
console.log(`Catálogo cargado: ${entries.length} productos.`)
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  await db.user.upsert({ where: { email: process.env.ADMIN_EMAIL }, update: { role: 'ADMIN' }, create: { email: process.env.ADMIN_EMAIL, name: 'Administrador La Yeka', role: 'ADMIN', passwordHash: await argon2.hash(process.env.ADMIN_PASSWORD) } })
  console.log('Administrador configurado.')
}
await db.$disconnect()
