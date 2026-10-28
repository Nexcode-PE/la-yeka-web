import argon2 from 'argon2'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '../../../packages/database/src/client.js'

type Role = 'CUSTOMER' | 'ADMIN'
type PublicUser = { id: string; name: string | null; email: string; role: Role }
const key = () => new TextEncoder().encode(process.env.JWT_SECRET || '')
const publicUser = (user: { id: string; name: string | null; email: string; role: Role }): PublicUser => ({ id: user.id, name: user.name, email: user.email, role: user.role })

export async function signSession(user: PublicUser) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no configurado')
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key())
}

export async function requireUser(token?: string) {
  if (!token || !process.env.JWT_SECRET) return null
  try {
    const verified = await jwtVerify(token.replace(/^Bearer\s+/i, ''), key())
    if (!verified.payload.sub) return null
    const user = await db.user.findUnique({ where: { id: verified.payload.sub } })
    return user ? publicUser(user) : null
  } catch {
    return null
  }
}

export async function requireAdmin(token?: string) {
  const user = await requireUser(token)
  return user?.role === 'ADMIN' ? user : null
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) return null
  const publicProfile = publicUser(user)
  return { user: publicProfile, token: await signSession(publicProfile) }
}

export async function registerCustomer(name: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const exists = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (exists) return { error: 'El correo ya está registrado.' as const }
  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await argon2.hash(password),
      role: 'CUSTOMER',
    },
  })
  const publicProfile = publicUser(user)
  return { user: publicProfile, token: await signSession(publicProfile) }
}
