import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { audit, ok, parseBody, route } from '@/lib/server/api'
import { execute, query } from '@/lib/server/db'
import { employeeFields } from '@/lib/server/schemas'
import { passwordSchema } from '@/lib/validation'

const createSchema = z.object({ ...employeeFields, password: passwordSchema })

export const GET = route(['admin'], async ({ req }) => {
  const sp = req.nextUrl.searchParams
  const q = `%${(sp.get('q') ?? '').trim().slice(0, 60)}%`
  const role = sp.get('role')
  const status = sp.get('status')
  const where = ['(u.name LIKE ? OR u.nik LIKE ? OR COALESCE(u.email, \'\') LIKE ? OR COALESCE(u.position, \'\') LIKE ?)']
  const params: (string | number)[] = [q, q, q, q]
  if (role === 'admin' || role === 'employee') { where.push('u.role = ?'); params.push(role) }
  if (status === 'active') where.push('u.is_active = 1')
  if (status === 'inactive') where.push('u.is_active = 0')
  const dept = Number(sp.get('department'))
  if (dept > 0) { where.push('u.department_id = ?'); params.push(dept) }

  const rows = await query(
    `SELECT u.id, u.nik, u.name, u.email, u.role, u.position, u.phone, u.is_active, u.must_change_password,
            u.department_id, d.name AS department, u.shift_id, s.name AS shift_name, u.last_login_at, u.created_at
       FROM users u LEFT JOIN departments d ON d.id = u.department_id LEFT JOIN shifts s ON s.id = u.shift_id
      WHERE ${where.join(' AND ')}
      ORDER BY u.is_active DESC, u.name ASC LIMIT 1000`,
    params,
  )
  return ok(rows)
})

export const POST = route(['admin'], async ({ req, user, ip }) => {
  const body = await parseBody(req, createSchema)
  const hash = await bcrypt.hash(body.password, 12)
  const result = await execute(
    `INSERT INTO users (nik, name, email, role, department_id, shift_id, position, phone, password_hash, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.nik, body.name, body.email || null, body.role, body.department_id ?? null, body.shift_id ?? null,
      body.position || null, body.phone || null, hash, body.role === 'admin' ? 1 : 0],
  )
  const { password: _pw, ...logged } = body
  await audit(user.id, 'employee_create', 'user', result.insertId, logged, ip)
  return ok({ id: result.insertId }, { status: 201 })
})
