import { audit, ok, parseBody, route } from '@/lib/server/api'
import { execute, query } from '@/lib/server/db'
import { locationSchema } from '@/lib/server/schemas'

export const GET = route(['admin'], async () => {
  const rows = await query('SELECT id, name, address, latitude, longitude, radius_m, is_active, created_at FROM office_locations ORDER BY id')
  return ok(rows)
})

export const POST = route(['admin'], async ({ req, user, ip }) => {
  const b = await parseBody(req, locationSchema)
  const r = await execute('INSERT INTO office_locations (name, address, latitude, longitude, radius_m, is_active) VALUES (?, ?, ?, ?, ?, ?)', [
    b.name, b.address || null, b.latitude, b.longitude, b.radius_m, b.is_active === false ? 0 : 1,
  ])
  await audit(user.id, 'location_create', 'office_location', r.insertId, b, ip)
  return ok({ id: r.insertId }, { status: 201 })
})
