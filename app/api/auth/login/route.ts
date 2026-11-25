import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ApiError, audit, clientIp, ok, parseBody, publicRoute } from '@/lib/server/api'
import { createSessionCookie } from '@/lib/server/auth'
import { execute, queryOne } from '@/lib/server/db'
import { verifyRecaptcha } from '@/lib/server/recaptcha'

const schema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email wajib diisi.').max(150).email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.').max(200),
  recaptchaToken: z.string().max(4000).optional(),
})

// Hash tiruan agar waktu respons sama saat akun tidak ditemukan.
const DUMMY_HASH = bcrypt.hashSync('pap-dummy-password-for-timing', 12)

export const POST = publicRoute(async (req) => {
  const { email, password, recaptchaToken } = await parseBody(req, schema)
  const ip = clientIp(req)
  const id = email

  // Cek bot dulu sebelum menyentuh database / bcrypt.
  await verifyRecaptcha(recaptchaToken, 'login', ip)

  const attempts = await queryOne<{ byId: number; byIp: number }>(
    `SELECT
       SUM(identifier = ? AND success = 0) AS byId,
       SUM(ip = ? AND success = 0) AS byIp
     FROM login_attempts WHERE created_at > NOW() - INTERVAL 15 MINUTE`,
    [id, ip],
  )
  if (Number(attempts?.byId ?? 0) >= 5 || Number(attempts?.byIp ?? 0) >= 20) {
    throw new ApiError(429, 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.')
  }

  const user = await queryOne<{ id: number; role: 'admin' | 'employee'; password_hash: string; is_active: number; token_version: number; must_change_password: number }>(
    'SELECT id, role, password_hash, is_active, token_version, must_change_password FROM users WHERE email = ? LIMIT 1',
    [id],
  )
  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH)

  if (!user || !valid || !user.is_active) {
    await execute('INSERT INTO login_attempts (identifier, ip, success) VALUES (?, ?, 0)', [id, ip])
    throw new ApiError(401, user && valid && !user.is_active ? 'Akun Anda dinonaktifkan. Hubungi HR.' : 'Email atau kata sandi salah.')
  }

  await execute('INSERT INTO login_attempts (identifier, ip, success) VALUES (?, ?, 1)', [id, ip])
  await execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])
  await createSessionCookie(user)
  await audit(user.id, 'login', 'user', user.id, null, ip)

  return ok({ role: user.role, mustChangePassword: Boolean(user.must_change_password), redirect: user.role === 'admin' ? '/admin' : '/karyawan' })
})
