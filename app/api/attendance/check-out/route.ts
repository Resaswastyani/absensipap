import { ApiError, audit, ok, parseBody, route } from '@/lib/server/api'
import { checkSchema, findActiveRecord, MAX_GPS_ACCURACY_M } from '@/lib/server/attendance'
import { execute } from '@/lib/server/db'
import { nearestOffice } from '@/lib/server/geo'
import { savePhoto } from '@/lib/server/photos'
import { nowJakarta } from '@/lib/server/time'

export const POST = route('attendee', async ({ req, user, ip }) => {
  const body = await parseBody(req, checkSchema)
  const now = nowJakarta()

  const active = await findActiveRecord(user.id)
  if (!active?.check_in_at) throw new ApiError(409, 'Anda belum melakukan check-in.')
  if (active.check_out_at) throw new ApiError(409, 'Anda sudah melakukan check-out.')
  if (body.accuracy != null && body.accuracy > MAX_GPS_ACCURACY_M) {
    throw new ApiError(422, `Akurasi GPS terlalu rendah (±${Math.round(body.accuracy)} m). Pindah ke area terbuka lalu coba lagi.`)
  }

  const office = await nearestOffice(body.latitude, body.longitude)
  if (!office) throw new ApiError(400, 'Lokasi kantor belum diatur oleh admin.')
  if (!office.inside) {
    throw new ApiError(403, `Anda berada ${office.distance} m dari ${office.name}. Check-out hanya dalam radius ${office.radius_m} m.`)
  }

  const photo = await savePhoto(body.photo, `out-${user.id}`)
  await execute(
    `UPDATE attendance SET check_out_at = ?, check_out_lat = ?, check_out_lng = ?, check_out_accuracy_m = ?,
        check_out_distance_m = ?, check_out_photo = ?
      WHERE id = ? AND user_id = ? AND check_out_at IS NULL`,
    [now.datetime, body.latitude, body.longitude, body.accuracy != null ? Math.round(body.accuracy) : null, office.distance, photo, active.id, user.id],
  )
  await audit(user.id, 'check_out', 'attendance', active.id, { distance: office.distance }, ip)
  return ok({ time: now.time, office: office.name })
})
