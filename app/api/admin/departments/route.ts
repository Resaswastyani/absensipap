import { audit, ok, parseBody, route } from '@/lib/server/api'
import { execute } from '@/lib/server/db'
import { departmentSchema } from '@/lib/server/schemas'

export const POST = route(['admin'], async ({ req, user, ip }) => {
  const b = await parseBody(req, departmentSchema)
  const r = await execute('INSERT INTO departments (name) VALUES (?)', [b.name])
  await audit(user.id, 'department_create', 'department', r.insertId, b, ip)
  return ok({ id: r.insertId }, { status: 201 })
})
