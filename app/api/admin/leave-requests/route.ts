import { ok, route } from '@/lib/server/api'
import { query } from '@/lib/server/db'

export const GET = route(['admin'], async ({ req }) => {
  const status = req.nextUrl.searchParams.get('status')
  const params: string[] = []
  let where = '1 = 1'
  if (status && ['menunggu', 'disetujui', 'ditolak', 'dibatalkan'].includes(status)) { where = 'r.status = ?'; params.push(status) }
  const rows = await query(
    `SELECT r.id, r.type, r.start_date, r.end_date, r.reason, r.status, r.review_note, r.reviewed_at, r.created_at,
            u.id AS user_id, u.name, u.nik, d.name AS department, rv.name AS reviewer_name
       FROM leave_requests r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN users rv ON rv.id = r.reviewed_by
      WHERE ${where}
      ORDER BY (r.status = 'menunggu') DESC, r.created_at DESC LIMIT 500`,
    params,
  )
  return ok(rows)
})
