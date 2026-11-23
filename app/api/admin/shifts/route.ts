import { audit, ok, parseBody, route } from '@/lib/server/api'
import { execute } from '@/lib/server/db'
import { shiftSchema } from '@/lib/server/schemas'

export const POST = route(['admin'], async ({ req, user, ip }) => {
  const b = await parseBody(req, shiftSchema)
  const r = await execute('INSERT INTO shifts (name, start_time, end_time, late_tolerance_minutes) VALUES (?, ?, ?, ?)', [b.name, b.start_time, b.end_time, b.late_tolerance_minutes])
  if (b.is_default) await execute('UPDATE shifts SET is_default = (id = ?)', [r.insertId])
  await audit(user.id, 'shift_create', 'shift', r.insertId, b, ip)
  return ok({ id: r.insertId }, { status: 201 })
})
