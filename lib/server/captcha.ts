import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import svgCaptcha from 'svg-captcha'
import { ApiError } from './api'

export const CAPTCHA_COOKIE = 'pap_captcha'
const TTL_SECONDS = 5 * 60
// Tanpa karakter yang mudah tertukar (0/O, 1/I/l, dst).
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// Nonce yang sudah dipakai, agar satu jawaban tidak bisa diputar ulang (aplikasi berjalan 1 proses).
const used = new Map<string, number>()
function markUsed(nonce: string) {
  const now = Date.now()
  for (const [k, exp] of used) if (exp < now) used.delete(k)
  used.set(nonce, now + TTL_SECONDS * 1000)
}

function key() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET belum diatur.')
  return new TextEncoder().encode(`captcha:${secret}`)
}

const digest = (answer: string, nonce: string) => createHash('sha256').update(`${nonce}:${answer.trim().toUpperCase()}`).digest()

/** Buat gambar CAPTCHA baru; jawabannya disimpan ter-hash di cookie bertanda tangan. */
export async function createCaptcha() {
  const c = svgCaptcha.create({ size: 5, charPreset: CHARSET, noise: 1, color: true, width: 200, height: 60, fontSize: 60, background: '#ffffff' })
  const nonce = randomBytes(16).toString('hex')
  const token = await new SignJWT({ h: digest(c.text, nonce).toString('base64url'), n: nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key())
  const store = await cookies()
  store.set(CAPTCHA_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/', maxAge: TTL_SECONDS })
  return c.data
}

/** Cocokkan jawaban pengguna. Sekali pakai: cookie dihapus apa pun hasilnya. */
export async function verifyCaptcha(answer: string | undefined) {
  const store = await cookies()
  const token = store.get(CAPTCHA_COOKIE)?.value
  store.delete({ name: CAPTCHA_COOKIE, path: '/api/' })
  if (!answer?.trim()) throw new ApiError(400, 'Kode CAPTCHA wajib diisi.')
  if (!token) throw new ApiError(400, 'Kode CAPTCHA kedaluwarsa. Muat ulang gambar lalu coba lagi.')
  let payload: { h?: string; n?: string }
  try {
    payload = (await jwtVerify<{ h?: string; n?: string }>(token, key(), { algorithms: ['HS256'] })).payload
  } catch {
    throw new ApiError(400, 'Kode CAPTCHA kedaluwarsa. Muat ulang gambar lalu coba lagi.')
  }
  if (!payload.h || !payload.n || used.has(payload.n)) throw new ApiError(400, 'Kode CAPTCHA kedaluwarsa. Muat ulang gambar lalu coba lagi.')
  markUsed(payload.n)
  const expected = Buffer.from(payload.h, 'base64url')
  const actual = digest(answer, payload.n)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new ApiError(400, 'Kode CAPTCHA salah. Silakan coba lagi.')
}
