import { z } from 'zod'
import { ApiError, audit, ok, parseBody, route } from '@/lib/server/api'
import { execute, query, queryOne } from '@/lib/server/db'
import { nowJakarta } from '@/lib/server/time'
import { dateSchema, timeSchema } from '@/lib/validation'

export const GET = route(['admin'], async ({ req }) => {
  const sp = req.nextUrl.searchParams
  const date = sp.get('date') ?? nowJakarta().date
  if (!dateSchema.safeParse(date).success) throw new ApiError(400, 'Format tanggal tidak valid.')
  const q = `%${(sp.get('q') ?? '').trim().slice(0, 60)}%`
  const params: (string | number)[] = [date, q, q]
  let extra = ''
  const dept = Number(sp.get('department'))
  if (dept > 0) { extra += ' AND u.department_id = ?'; params.push(dept) }
  const status = sp.get('status')
  if (status === 'belum') extra += ' AND a.id IS NULL'
  else if (status && ['hadir', 'terlambat', 'izin', 'sakit', 'cuti', 'alpha'].includes(status)) { extra += ' AND a.status = ?'; params.push(status) }

  const rows = await query(
    `SELECT u.id AS user_id, u.nik, u.name, u.position, d.name AS department, s.name AS shift_name,
            a.id, a.status, a.late_minutes, a.check_in_at, a.check_out_at, a.check_in_distance_m, a.check_out_distance_m,
            (a.check_in_photo IS NOT NULL) AS has_in_photo, (a.check_out_photo IS NOT NULL) AS has_out_photo,
            l.name AS location_name, a.note
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id AND a.work_date = ?
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN shifts s ON s.id = u.shift_id
       LEFT JOIN office_locations l ON l.id = a.check_in_location_id
      WHERE (u.role = 'employee' OR u.can_attend = 1) AND u.is_active = 1 AND (u.name LIKE ? OR u.nik LIKE ?) ${extra}
      ORDER BY (a.check_in_at IS NULL), a.check_in_at, u.name LIMIT 2000`,
    params,
  )
  return ok({ date, rows })
})

const upsertSchema = z.object({
  user_id: z.number().int().positive(),
  work_date: dateSchema,
  status: z.enum(['hadir', 'terlambat', 'izin', 'sakit', 'cuti', 'alpha']),
  check_in_time: z.union([timeSchema, z.literal('')]).optional(),
  check_out_time: z.union([timeSchema, z.literal('')]).optional(),
  late_minutes: z.number().int().min(0).max(1440).optional(),
  note: z.string().trim().min(3, 'Catatan koreksi wajib diisi (min. 3 karakter).').max(255),
})

// Koreksi manual oleh admin (wajib menyertakan catatan, tercatat di audit log).
export const POST = route(['admin'], async ({ req, user, ip }) => {
  const body = await parseBody(req, upsertSchema)
  const emp = await queryOne("SELECT id FROM users WHERE id = ? AND (role = 'employee' OR can_attend = 1)", [body.user_id])
  if (!emp) throw new ApiError(404, 'Karyawan tidak ditemukan.')
  if (body.user_id === user.id) throw new ApiError(403, 'Koreksi absensi milik sendiri harus dilakukan oleh admin lain.')
  const toDateTime = (t?: string) => (t ? `${body.work_date} ${t.length === 5 ? `${t}:00` : t}` : null)
  const checkIn = toDateTime(body.check_in_time)
  let checkOut = toDateTime(body.check_out_time)
  if (checkIn && checkOut && checkOut < checkIn) {
    // Shift malam: jam pulang di hari berikutnya.
    const d = new Date(`${body.work_date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)
    checkOut = `${d.toISOString().slice(0, 10)} ${checkOut.slice(11)}`
  }
  const before = await queryOne('SELECT status, check_in_at, check_out_at, note FROM attendance WHERE user_id = ? AND work_date = ?', [body.user_id, body.work_date])
  await execute(
    `INSERT INTO attendance (user_id, work_date, status, late_minutes, check_in_at, check_out_at, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), late_minutes = VALUES(late_minutes),
       check_in_at = VALUES(check_in_at), check_out_at = VALUES(check_out_at), note = VALUES(note)`,
    [body.user_id, body.work_date, body.status, body.status === 'terlambat' ? body.late_minutes ?? 0 : 0, checkIn, checkOut, body.note],
  )
  await audit(user.id, 'attendance_correct', 'user', body.user_id, { before, after: body }, ip)
  return ok({ saved: true })
})
