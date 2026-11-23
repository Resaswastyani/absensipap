import { ok, route } from '@/lib/server/api'
import { query } from '@/lib/server/db'

export const GET = route(['admin'], async () => {
  const [departments, shifts] = await Promise.all([
    query('SELECT d.id, d.name, COUNT(u.id) AS members FROM departments d LEFT JOIN users u ON u.department_id = d.id AND u.is_active = 1 GROUP BY d.id, d.name ORDER BY d.name'),
    query('SELECT s.id, s.name, s.start_time, s.end_time, s.late_tolerance_minutes, COUNT(u.id) AS members FROM shifts s LEFT JOIN users u ON u.shift_id = s.id AND u.is_active = 1 GROUP BY s.id, s.name, s.start_time, s.end_time, s.late_tolerance_minutes ORDER BY s.start_time'),
  ])
  return ok({ departments, shifts })
})
