import { ApiError, audit, ok, parseBody, parseId, route } from '@/lib/server/api'
import { execute } from '@/lib/server/db'
import { locationSchema } from '@/lib/server/schemas'

export const PATCH = route<{ id: string }>(['admin'], async ({ req, user, params, ip }) => {
  const id = parseId(params.id)
  const b = await parseBody(req, locationSchema)
  const r = await execute('UPDATE office_locations SET name = ?, address = ?, latitude = ?, longitude = ?, radius_m = ?, is_active = ? WHERE id = ?', [
    b.name, b.address || null, b.latitude, b.longitude, b.radius_m, b.is_active === false ? 0 : 1, id,
  ])
  if (r.affectedRows === 0) throw new ApiError(404, 'Lokasi tidak ditemukan.')
  await audit(user.id, 'location_update', 'office_location', id, b, ip)
  return ok({ updated: true })
})

export const DELETE = route<{ id: string }>(['admin'], async ({ user, params, ip }) => {
  const id = parseId(params.id)
  const r = await execute('DELETE FROM office_locations WHERE id = ?', [id])
  if (r.affectedRows === 0) throw new ApiError(404, 'Lokasi tidak ditemukan.')
  await audit(user.id, 'location_delete', 'office_location', id, null, ip)
  return ok({ deleted: true })
})
