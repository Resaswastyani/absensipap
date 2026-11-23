import { ApiError, ok, route } from '@/lib/server/api'
import { ATTENDANCE_COLUMNS } from '@/lib/server/attendance'
import { query } from '@/lib/server/db'
import { monthRange, nowJakarta } from '@/lib/server/time'
import { monthSchema } from '@/lib/validation'

export const GET = route('attendee', async ({ req, user }) => {
  const month = req.nextUrl.searchParams.get('month') ?? nowJakarta().date.slice(0, 7)
  if (!monthSchema.safeParse(month).success) throw new ApiError(400, 'Format bulan tidak valid.')
  const { start, end } = monthRange(month)
  const rows = await query(
    `SELECT ${ATTENDANCE_COLUMNS} FROM attendance a LEFT JOIN office_locations l ON l.id = a.check_in_location_id
      WHERE a.user_id = ? AND a.work_date BETWEEN ? AND ? ORDER BY a.work_date DESC`,
    [user.id, start, end],
  )
  const stats = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, cuti: 0, alpha: 0, totalLateMinutes: 0 }
  for (const r of rows as { status: keyof typeof stats; late_minutes: number }[]) {
    stats[r.status] += 1
    stats.totalLateMinutes += Number(r.late_minutes || 0)
  }
  return ok({ month, rows, stats })
})
