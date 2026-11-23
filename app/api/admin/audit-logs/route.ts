import { ok, route } from '@/lib/server/api'
import { query } from '@/lib/server/db'

export const GET = route(['admin'], async () => {
  const rows = await query(
    `SELECT l.id, l.action, l.entity, l.entity_id, l.ip, l.created_at, u.name AS user_name, u.nik
       FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
      ORDER BY l.id DESC LIMIT 200`,
  )
  return ok(rows)
})
