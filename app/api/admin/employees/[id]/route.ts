import { z } from 'zod'
import { ApiError, audit, ok, parseBody, parseId, route } from '@/lib/server/api'
import { execute, queryOne } from '@/lib/server/db'
import { employeeFields } from '@/lib/server/schemas'

const updateSchema = z.object({ ...employeeFields, role: z.enum(['admin', 'employee']), is_active: z.boolean() }).partial()

export const PATCH = route<{ id: string }>(['admin'], async ({ req, user, params, ip }) => {
  const id = parseId(params.id)
  const body = await parseBody(req, updateSchema)
  const target = await queryOne<{ id: number; role: string; is_active: number; token_version: number }>(
    'SELECT id, role, is_active, token_version FROM users WHERE id = ?',
    [id],
  )
  if (!target) throw new ApiError(404, 'Karyawan tidak ditemukan.')
  if (id === user.id && (body.is_active === false || body.role === 'employee')) {
    throw new ApiError(400, 'Anda tidak dapat menonaktifkan atau menurunkan peran akun sendiri.')
  }

  const sets: string[] = []
  const values: (string | number | null)[] = []
  const map: Record<string, unknown> = {
    nik: body.nik, name: body.name, email: body.email === '' ? null : body.email, role: body.role,
    department_id: body.department_id, shift_id: body.shift_id, position: body.position === '' ? null : body.position,
    phone: body.phone === '' ? null : body.phone,
    is_active: body.is_active === undefined ? undefined : body.is_active ? 1 : 0,
    can_attend: body.can_attend === undefined ? undefined : body.can_attend ? 1 : 0,
  }
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) { sets.push(`${key} = ?`); values.push(value as string | number | null) }
  }
  // Perubahan peran atau status aktif mencabut sesi yang sedang berjalan.
  if ((body.role && body.role !== target.role) || body.is_active === false) sets.push('token_version = token_version + 1')
  if (sets.length === 0) return ok({ updated: false })

  await execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...values, id])
  await audit(user.id, 'employee_update', 'user', id, body, ip)
  return ok({ updated: true })
})

export const DELETE = route<{ id: string }>(['admin'], async ({ user, params, ip }) => {
  const id = parseId(params.id)
  if (id === user.id) throw new ApiError(400, 'Anda tidak dapat menghapus akun sendiri.')
  const target = await queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM attendance WHERE user_id = ?', [id])
  if (Number(target?.n ?? 0) > 0) {
    // Riwayat absensi dipertahankan: akun hanya dinonaktifkan.
    await execute('UPDATE users SET is_active = 0, token_version = token_version + 1 WHERE id = ?', [id])
    await audit(user.id, 'employee_deactivate', 'user', id, null, ip)
    return ok({ deleted: false, deactivated: true })
  }
  const result = await execute('DELETE FROM users WHERE id = ?', [id])
  if (result.affectedRows === 0) throw new ApiError(404, 'Karyawan tidak ditemukan.')
  await audit(user.id, 'employee_delete', 'user', id, null, ip)
  return ok({ deleted: true })
})
