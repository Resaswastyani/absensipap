import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { ApiError, audit, ok, parseId, route } from '@/lib/server/api'
import { execute } from '@/lib/server/db'

function temporaryPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += letters[randomInt(letters.length)]
  for (let i = 0; i < 4; i++) out += digits[randomInt(digits.length)]
  return out
}

export const POST = route<{ id: string }>(['admin'], async ({ user, params, ip }) => {
  const id = parseId(params.id)
  const password = temporaryPassword()
  const hash = await bcrypt.hash(password, 12)
  const result = await execute(
    'UPDATE users SET password_hash = ?, must_change_password = 1, token_version = token_version + 1 WHERE id = ?',
    [hash, id],
  )
  if (result.affectedRows === 0) throw new ApiError(404, 'Karyawan tidak ditemukan.')
  await execute('DELETE FROM login_attempts WHERE identifier IN (SELECT LOWER(nik) FROM users WHERE id = ?)', [id])
  await audit(user.id, 'password_reset', 'user', id, null, ip)
  // Kata sandi sementara hanya ditampilkan sekali ke admin.
  return ok({ temporaryPassword: password })
})
