import { ApiError, audit, ok, parseId, route } from '@/lib/server/api'
import { execute } from '@/lib/server/db'

// Karyawan membatalkan pengajuan miliknya yang masih menunggu.
export const DELETE = route<{ id: string }>(['employee'], async ({ user, params, ip }) => {
  const id = parseId(params.id)
  const result = await execute(
    "UPDATE leave_requests SET status = 'dibatalkan' WHERE id = ? AND user_id = ? AND status = 'menunggu'",
    [id, user.id],
  )
  if (result.affectedRows === 0) throw new ApiError(404, 'Pengajuan tidak ditemukan atau sudah ditinjau.')
  await audit(user.id, 'leave_cancel', 'leave_request', id, null, ip)
  return ok({ cancelled: true })
})
