import { ok, route } from '@/lib/server/api'
import { query, queryOne } from '@/lib/server/db'
import { addDays, nowJakarta } from '@/lib/server/time'

export const GET = route(['admin'], async () => {
  const now = nowJakarta()
  const weekStart = addDays(now.date, -6)

  const [totals, departments, recent, pending, trend, locations] = await Promise.all([
    queryOne<Record<string, number>>(
      `SELECT COUNT(*) AS total,
              SUM(a.status = 'hadir') AS hadir,
              SUM(a.status = 'terlambat') AS terlambat,
              SUM(a.status IN ('izin','sakit','cuti')) AS izin,
              SUM(a.id IS NULL OR a.status = 'alpha') AS belum
         FROM users u LEFT JOIN attendance a ON a.user_id = u.id AND a.work_date = ?
        WHERE u.role = 'employee' AND u.is_active = 1`,
      [now.date],
    ),
    query(
      `SELECT COALESCE(d.name, 'Tanpa divisi') AS name, COUNT(u.id) AS total,
              SUM(a.status IN ('hadir','terlambat')) AS present
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         LEFT JOIN attendance a ON a.user_id = u.id AND a.work_date = ?
        WHERE u.role = 'employee' AND u.is_active = 1
        GROUP BY d.id, d.name ORDER BY total DESC`,
      [now.date],
    ),
    query(
      `SELECT a.id, u.name, u.nik, d.name AS department, a.check_in_at, a.check_out_at, a.status, a.late_minutes
         FROM attendance a JOIN users u ON u.id = a.user_id LEFT JOIN departments d ON d.id = u.department_id
        WHERE a.work_date = ? AND a.check_in_at IS NOT NULL
        ORDER BY GREATEST(a.check_in_at, COALESCE(a.check_out_at, a.check_in_at)) DESC LIMIT 8`,
      [now.date],
    ),
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM leave_requests WHERE status = 'menunggu'"),
    query(
      `SELECT work_date, SUM(status = 'hadir') AS hadir, SUM(status = 'terlambat') AS terlambat,
              SUM(status IN ('izin','sakit','cuti')) AS izin
         FROM attendance WHERE work_date BETWEEN ? AND ? GROUP BY work_date ORDER BY work_date`,
      [weekStart, now.date],
    ),
    queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM office_locations WHERE is_active = 1'),
  ])

  return ok({
    date: now.date,
    totals: {
      total: Number(totals?.total ?? 0),
      hadir: Number(totals?.hadir ?? 0),
      terlambat: Number(totals?.terlambat ?? 0),
      izin: Number(totals?.izin ?? 0),
      belum: Number(totals?.belum ?? 0),
    },
    departments,
    recent,
    pendingRequests: Number(pending?.n ?? 0),
    trend,
    weekStart,
    hasLocation: Number(locations?.n ?? 0) > 0,
  })
})
