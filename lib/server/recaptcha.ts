import 'server-only'
import { ApiError } from './api'

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
const MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5)

type VerifyResponse = {
  success: boolean
  score?: number
  action?: string
  hostname?: string
  'error-codes'?: string[]
}

export function recaptchaEnabled() {
  return Boolean(process.env.RECAPTCHA_SECRET_KEY && process.env.RECAPTCHA_SITE_KEY)
}

/**
 * Verifikasi token reCAPTCHA v3 ke Google.
 * Bila kunci belum diatur (mis. pengembangan lokal), verifikasi dilewati.
 * Bila Google tidak dapat dihubungi, login ditolak (fail-closed).
 */
export async function verifyRecaptcha(token: string | undefined, expectedAction: string, ip: string) {
  if (!recaptchaEnabled()) return
  if (!token) throw new ApiError(400, 'Verifikasi keamanan belum selesai. Muat ulang halaman lalu coba lagi.')

  let data: VerifyResponse
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY!, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    data = (await res.json()) as VerifyResponse
  } catch (error) {
    console.error('[recaptcha] gagal menghubungi Google', error)
    throw new ApiError(503, 'Layanan verifikasi keamanan sedang tidak tersedia. Coba lagi sebentar.')
  }

  const allowedHosts = (process.env.RECAPTCHA_ALLOWED_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean)
  const hostOk = allowedHosts.length === 0 || (data.hostname != null && allowedHosts.includes(data.hostname))

  if (!data.success || data.action !== expectedAction || !hostOk || (data.score ?? 0) < MIN_SCORE) {
    console.warn('[recaptcha] ditolak', JSON.stringify({ ip, score: data.score, action: data.action, hostname: data.hostname, errors: data['error-codes'] }))
    throw new ApiError(403, 'Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.')
  }
}
