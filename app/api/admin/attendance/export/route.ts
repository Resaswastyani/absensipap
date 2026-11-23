import { ApiError, audit, route } from '@/lib/server/api'
import { query } from '@/lib/server/db'
import { monthRange, nowJakarta } from '@/lib/server/time'
import { monthSchema } from '@/lib/validation'

function csvCell(value: unknown) {
  let s = value == null ? '' : String(value)
  // Cegah CSV/formula injection saat dibuka di Excel.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export const GET = route(['admin'], async ({ req, user, ip }) => {
  const month = req.nextUrl.searchParams.get('month') ?? nowJakarta().date.slice(0, 7)
  if (!monthSchema.safeParse(month).success) throw new ApiError(400, 'Format bulan tidak valid.')
  const { start, end } = monthRange(month)
  const rows = await query<Record<string, unknown>>(
    `SELECT a.work_date, u.nik, u.name, d.name AS department, u.position, a.status, a.late_minutes,
            TIME(a.check_in_at) AS jam_masuk, TIME(a.check_out_at) AS jam_pulang,
            TIMESTAMPDIFF(MINUTE, a.check_in_at, a.check_out_at) AS durasi_menit,
            a.check_in_distance_m, l.name AS lokasi, a.note
       FROM attendance a JOIN users u ON u.id = a.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN office_locations l ON l.id = a.check_in_location_id
      WHERE a.work_date BETWEEN ? AND ?
      ORDER BY a.work_date, u.name`,
    [start, end],
  )
  const header = ['Tanggal', 'NIK', 'Nama', 'Divisi', 'Jabatan', 'Status', 'Terlambat (menit)', 'Jam Masuk', 'Jam Pulang', 'Durasi (menit)', 'Jarak Check-in (m)', 'Lokasi', 'Catatan']
  const lines = [header.map(csvCell).join(',')]
  for (const r of rows) {
    lines.push([r.work_date, r.nik, r.name, r.department, r.position, r.status, r.late_minutes, r.jam_masuk, r.jam_pulang, r.durasi_menit, r.check_in_distance_m, r.lokasi, r.note].map(csvCell).join(','))
  }
  await audit(user.id, 'attendance_export', null, null, { month }, ip)
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rekap-absensi-${month}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
})
