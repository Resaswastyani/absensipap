import { ApiError, audit, ok, parseBody, parseId, route } from '@/lib/server/api'
import { execute } from '@/lib/server/db'
import { departmentSchema } from '@/lib/server/schemas'

export const PATCH = route<{ id: string }>(['admin'], async ({ req, user, params, ip }) => {
  const id = parseId(params.id)
  const b = await parseBody(req, departmentSchema)
  const r = await execute('UPDATE departments SET name = ? WHERE id = ?', [b.name, id])
  if (r.affectedRows === 0) throw new ApiError(404, 'Divisi tidak ditemukan.')
  await audit(user.id, 'department_update', 'department', id, b, ip)
  return ok({ updated: true })
})

export const DELETE = route<{ id: string }>(['admin'], async ({ user, params, ip }) => {
  const id = parseId(params.id)
  const r = await execute('DELETE FROM departments WHERE id = ?', [id])
  if (r.affectedRows === 0) throw new ApiError(404, 'Divisi tidak ditemukan.')
  await audit(user.id, 'department_delete', 'department', id, null, ip)
  return ok({ deleted: true })
})
