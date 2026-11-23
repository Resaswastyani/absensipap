import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { ApiError, audit, ok, parseBody, parseId, route } from '@/lib/server/api'
import { execute, queryOne } from '@/lib/server/db'
import { passwordSchema } from '@/lib/validation'

function generatePassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += letters[randomInt(letters.length)]
  for (let i = 0; i < 4; i++) out += digits[randomInt(digits.length)]
  return out
}

const schema = z.object({ password: passwordSchema.optional() })

// Hanya admin/IT yang dapat mengatur kata sandi. Bila kosong, sistem membuat kata sandi acak.
export const POST = route<{ id: string }>(['admin'], async ({ req, user, params, ip }) => {
  const id = parseId(params.id)
  const body = await parseBody(req, schema)
  const target = await queryOne<{ role: 'admin' | 'employee' }>('SELECT role FROM users WHERE id = ?', [id])
  if (!target) throw new ApiError(404, 'Karyawan tidak ditemukan.')

  const password = body.password ?? generatePassword()
  const hash = await bcrypt.hash(password, 12)
  await execute('UPDATE users SET password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?', [hash, id])
  await execute('DELETE FROM login_attempts WHERE identifier IN (SELECT LOWER(nik) FROM users WHERE id = ?)', [id])
  await audit(user.id, 'password_reset', 'user', id, { custom: Boolean(body.password) }, ip)
  return ok({ password, generated: !body.password })
})
