import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ApiError, audit, ok, parseBody, route } from '@/lib/server/api'
import { createSessionCookie } from '@/lib/server/auth'
import { execute, queryOne } from '@/lib/server/db'
import { passwordSchema } from '@/lib/validation'

const schema = z.object({
  currentPassword: z.string().min(1, 'Kata sandi lama wajib diisi.').max(200),
  newPassword: passwordSchema,
})

// Karyawan tidak dapat mengganti kata sandi sendiri — hanya melalui IT/admin.
export const POST = route(['admin'], async ({ req, user, ip }) => {
  const { currentPassword, newPassword } = await parseBody(req, schema)
  const row = await queryOne<{ password_hash: string; token_version: number }>('SELECT password_hash, token_version FROM users WHERE id = ?', [user.id])
  if (!row || !(await bcrypt.compare(currentPassword, row.password_hash))) throw new ApiError(400, 'Kata sandi lama tidak sesuai.')
  if (currentPassword === newPassword) throw new ApiError(400, 'Kata sandi baru harus berbeda.')
  const hash = await bcrypt.hash(newPassword, 12)
  const tv = row.token_version + 1
  // Naikkan token_version agar sesi di perangkat lain otomatis keluar.
  await execute('UPDATE users SET password_hash = ?, must_change_password = 0, token_version = ? WHERE id = ?', [hash, tv, user.id])
  await createSessionCookie({ id: user.id, role: user.role, token_version: tv })
  await audit(user.id, 'change_password', 'user', user.id, null, ip)
  return ok({ changed: true })
})
