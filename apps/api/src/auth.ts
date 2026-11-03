import argon2 from 'argon2'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '../../../packages/database/src/client.js'

type Role = 'CUSTOMER' | 'ADMIN'
type PublicUser = { id: string; name: string | null; email: string; phone: string | null; deliveryAddress: string | null; district: string | null; role: Role }
const key = () => new TextEncoder().encode(process.env.JWT_SECRET || '')
const publicUser = (user: { id: string; name: string | null; email: string; phone: string | null; deliveryAddress: string | null; district: string | null; role: Role }): PublicUser => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, deliveryAddress: user.deliveryAddress, district: user.district, role: user.role })

export async function signSession(user: PublicUser) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no configurado')
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key())
}

export async function createGoogleState(returnTo: string) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no configurado')
  return new SignJWT({ returnTo, purpose: 'google_oauth' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(key())
}

export async function verifyGoogleState(state: string) {
  if (!process.env.JWT_SECRET) return null
  try {
    const verified = await jwtVerify(state, key())
    return verified.payload.purpose === 'google_oauth' && typeof verified.payload.returnTo === 'string' ? verified.payload.returnTo : null
  } catch {
    return null
  }
}

export async function requireUser(token?: string) {
  if (!token || !process.env.JWT_SECRET) return null
  try {
    const verified = await jwtVerify(token.replace(/^Bearer\s+/i, ''), key())
    if (!verified.payload.sub) return null
    const user = await db.user.findUnique({ where: { id: verified.payload.sub } })
    return user?.isActive ? publicUser(user) : null
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
  if (!user?.isActive || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) return null
  const publicProfile = publicUser(user)
  return { user: publicProfile, token: await signSession(publicProfile) }
}

export async function registerCustomer(name: string, email: string, password: string, phone?: string, deliveryAddress?: string, district?: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const exists = await db.user.findUnique({ where: { email: normalizedEmail } })
  if (exists) return { error: 'El correo ya está registrado.' as const }
  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      deliveryAddress: deliveryAddress?.trim() || null,
      district: district?.trim() || null,
      passwordHash: await argon2.hash(password),
      role: 'CUSTOMER',
    },
  })
  const publicProfile = publicUser(user)
  return { user: publicProfile, token: await signSession(publicProfile) }
}

export async function loginWithGoogle(profile: { sub: string; email: string; emailVerified: boolean; name?: string }) {
  if (!profile.emailVerified) return { error: 'Google no confirmó el correo de esta cuenta.' as const }
  const email = profile.email.trim().toLowerCase()
  const existing = await db.user.findFirst({ where: { OR: [{ googleId: profile.sub }, { email }] } })
  const user = existing
    ? await db.user.update({ where: { id: existing.id }, data: { googleId: profile.sub, name: existing.name || profile.name || null } })
    : await db.user.create({ data: { email, googleId: profile.sub, name: profile.name || null, role: 'CUSTOMER' } })
  const publicProfile = publicUser(user)
  return { user: publicProfile, token: await signSession(publicProfile) }
}
