import { ApiError, audit, ok, parseBody, route } from '@/lib/server/api'
import { checkSchema, findActiveRecord, lateMinutes, MAX_GPS_ACCURACY_M, resolveShift } from '@/lib/server/attendance'
import { execute, queryOne } from '@/lib/server/db'
import { nearestOffice } from '@/lib/server/geo'
import { savePhoto } from '@/lib/server/photos'
import { nowJakarta } from '@/lib/server/time'

export const POST = route('attendee', async ({ req, user, ip }) => {
  const body = await parseBody(req, checkSchema)
  const now = nowJakarta()

  const active = await findActiveRecord(user.id)
  if (active?.check_in_at) throw new ApiError(409, 'Anda sudah melakukan check-in.')
  if (active && ['izin', 'sakit', 'cuti'].includes(active.status)) {
    throw new ApiError(409, `Hari ini tercatat ${active.status}. Hubungi HR bila perlu koreksi.`)
  }
  if (body.accuracy != null && body.accuracy > MAX_GPS_ACCURACY_M) {
    throw new ApiError(422, `Akurasi GPS terlalu rendah (±${Math.round(body.accuracy)} m). Pindah ke area terbuka lalu coba lagi.`)
  }

  const office = await nearestOffice(body.latitude, body.longitude)
  if (!office) throw new ApiError(400, 'Lokasi kantor belum diatur oleh admin.')
  if (!office.inside) {
    throw new ApiError(403, `Anda berada ${office.distance} m dari ${office.name}. Check-in hanya dalam radius ${office.radius_m} m.`)
  }

  const shift = await resolveShift(user)
  const late = lateMinutes(now.minutes, shift.start)
  const status = late > shift.tolerance ? 'terlambat' : 'hadir'
  const photo = await savePhoto(body.photo, `in-${user.id}`)

  await execute(
    `INSERT INTO attendance (user_id, work_date, status, late_minutes, check_in_at, check_in_lat, check_in_lng,
        check_in_accuracy_m, check_in_distance_m, check_in_location_id, check_in_photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), late_minutes = VALUES(late_minutes), check_in_at = VALUES(check_in_at),
        check_in_lat = VALUES(check_in_lat), check_in_lng = VALUES(check_in_lng), check_in_accuracy_m = VALUES(check_in_accuracy_m),
        check_in_distance_m = VALUES(check_in_distance_m), check_in_location_id = VALUES(check_in_location_id),
        check_in_photo = VALUES(check_in_photo)`,
    [user.id, now.date, status, status === 'terlambat' ? late : 0, now.datetime, body.latitude, body.longitude,
      body.accuracy != null ? Math.round(body.accuracy) : null, office.distance, office.id, photo],
  )
  const row = await queryOne<{ id: number }>('SELECT id FROM attendance WHERE user_id = ? AND work_date = ?', [user.id, now.date])
  await audit(user.id, 'check_in', 'attendance', row?.id ?? null, { status, late, distance: office.distance }, ip)

  return ok({ status, lateMinutes: status === 'terlambat' ? late : 0, time: now.time, office: office.name, distance: office.distance })
})
