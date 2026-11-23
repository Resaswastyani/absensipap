import { ApiError, audit, ok, parseBody, parseId, route } from '@/lib/server/api'
import { execute } from '@/lib/server/db'
import { shiftSchema } from '@/lib/server/schemas'

export const PATCH = route<{ id: string }>(['admin'], async ({ req, user, params, ip }) => {
  const id = parseId(params.id)
  const b = await parseBody(req, shiftSchema)
  const r = await execute('UPDATE shifts SET name = ?, start_time = ?, end_time = ?, late_tolerance_minutes = ? WHERE id = ?', [b.name, b.start_time, b.end_time, b.late_tolerance_minutes, id])
  if (r.affectedRows === 0) throw new ApiError(404, 'Shift tidak ditemukan.')
  if (b.is_default) await execute('UPDATE shifts SET is_default = (id = ?)', [id])
  await audit(user.id, 'shift_update', 'shift', id, b, ip)
  return ok({ updated: true })
})

export const DELETE = route<{ id: string }>(['admin'], async ({ user, params, ip }) => {
  const id = parseId(params.id)
  const r = await execute('DELETE FROM shifts WHERE id = ?', [id])
  if (r.affectedRows === 0) throw new ApiError(404, 'Shift tidak ditemukan.')
  await audit(user.id, 'shift_delete', 'shift', id, null, ip)
  return ok({ deleted: true })
})
