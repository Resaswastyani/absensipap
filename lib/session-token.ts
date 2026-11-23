// Penandatanganan & verifikasi token sesi (dipakai oleh proxy dan server).
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'pap_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 jam

export type Role = 'admin' | 'employee'
export type SessionPayload = { sub: string; role: Role; tv: number }

function secretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET minimal 32 karakter wajib diatur.')
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, tv: payload.tv })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer('pap-attendance')
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey())
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: 'pap-attendance', algorithms: ['HS256'] })
    if (typeof payload.sub !== 'string') return null
    const role = payload.role
    if (role !== 'admin' && role !== 'employee') return null
    return { sub: payload.sub, role, tv: Number(payload.tv ?? 0) }
  } catch {
    return null
  }
}
