import 'server-only'
import { z } from 'zod'
import { query, queryOne } from './db'
import { nowJakarta, timeToMinutes } from './time'
import type { CurrentUser } from './auth'

export const checkSchema = z.object({
  photo: z.string().min(100, 'Foto verifikasi wajib diambil.').max(2_200_000, 'Ukuran foto terlalu besar.'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
})

export const MAX_GPS_ACCURACY_M = 300

export type AttendanceRow = {
  id: number
  user_id: number
  work_date: string
  status: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'cuti' | 'alpha'
  late_minutes: number
  check_in_at: string | null
  check_out_at: string | null
  check_in_distance_m: number | null
  check_out_distance_m: number | null
  check_in_photo: string | null
  check_out_photo: string | null
  location_name: string | null
  note: string | null
}

export const ATTENDANCE_COLUMNS = `a.id, a.user_id, a.work_date, a.status, a.late_minutes, a.check_in_at, a.check_out_at,
  a.check_in_distance_m, a.check_out_distance_m, (a.check_in_photo IS NOT NULL) AS has_in_photo,
  (a.check_out_photo IS NOT NULL) AS has_out_photo, l.name AS location_name, a.note`

export async function resolveShift(user: CurrentUser) {
  if (user.shift_start && user.shift_end) {
    return { name: user.shift_name ?? 'Shift', start: user.shift_start, end: user.shift_end, tolerance: user.late_tolerance_minutes ?? 0 }
  }
  const fallback = await queryOne<{ name: string; start_time: string; end_time: string; late_tolerance_minutes: number }>(
    'SELECT name, start_time, end_time, late_tolerance_minutes FROM shifts ORDER BY id LIMIT 1',
  )
  return {
    name: fallback?.name ?? 'Shift Pagi',
    start: fallback?.start_time ?? '08:00:00',
    end: fallback?.end_time ?? '17:00:00',
    tolerance: fallback?.late_tolerance_minutes ?? 0,
  }
}

/** Selisih menit terhadap jam mulai shift (mendukung shift lintas tengah malam). */
export function lateMinutes(nowMinutes: number, shiftStart: string) {
  let diff = nowMinutes - timeToMinutes(shiftStart)
  if (diff < -720) diff += 1440
  if (diff > 720) diff -= 1440
  return Math.max(0, diff)
}

/** Catatan absensi aktif: hari ini, atau catatan shift malam kemarin yang belum check-out. */
export async function findActiveRecord(userId: number) {
  const now = nowJakarta()
  const today = await queryOne<AttendanceRow>(
    `SELECT ${ATTENDANCE_COLUMNS} FROM attendance a LEFT JOIN office_locations l ON l.id = a.check_in_location_id
      WHERE a.user_id = ? AND a.work_date = ?`,
    [userId, now.date],
  )
  if (today) return today
  const open = await query<AttendanceRow>(
    `SELECT ${ATTENDANCE_COLUMNS} FROM attendance a LEFT JOIN office_locations l ON l.id = a.check_in_location_id
      WHERE a.user_id = ? AND a.check_in_at IS NOT NULL AND a.check_out_at IS NULL
        AND a.check_in_at > (? - INTERVAL 20 HOUR)
      ORDER BY a.check_in_at DESC LIMIT 1`,
    [userId, now.datetime],
  )
  return open[0] ?? null
}
