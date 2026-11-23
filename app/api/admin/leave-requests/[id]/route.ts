import { z } from 'zod'
import { ApiError, audit, ok, parseBody, parseId, route } from '@/lib/server/api'
import { execute, pool, queryOne } from '@/lib/server/db'
import { addDays } from '@/lib/server/time'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(255).optional(),
})

export const PATCH = route<{ id: string }>(['admin'], async ({ req, user, params, ip }) => {
  const id = parseId(params.id)
  const { action, note } = await parseBody(req, schema)
  const request = await queryOne<{ id: number; user_id: number; type: string; start_date: string; end_date: string; status: string }>(
    'SELECT id, user_id, type, start_date, end_date, status FROM leave_requests WHERE id = ?',
    [id],
  )
  if (!request) throw new ApiError(404, 'Pengajuan tidak ditemukan.')
  if (request.status !== 'menunggu') throw new ApiError(409, 'Pengajuan ini sudah ditinjau.')
  if (request.user_id === user.id) throw new ApiError(403, 'Pengajuan milik sendiri harus ditinjau oleh admin lain.')
  if (action === 'reject' && !note) throw new ApiError(422, 'Sertakan alasan penolakan.')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(
      'UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ? WHERE id = ? AND status = \'menunggu\'',
      [action === 'approve' ? 'disetujui' : 'ditolak', user.id, note ?? null, id],
    )
    // Izin/sakit/cuti yang disetujui otomatis tercatat di absensi (tanpa menimpa hari yang sudah check-in).
    if (action === 'approve' && request.type !== 'koreksi') {
      for (let d = request.start_date; d <= request.end_date; d = addDays(d, 1)) {
        await conn.execute(
          `INSERT INTO attendance (user_id, work_date, status, note) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = IF(check_in_at IS NULL, VALUES(status), status), note = IF(check_in_at IS NULL, VALUES(note), note)`,
          [request.user_id, d, request.type, `Pengajuan #${id} disetujui`],
        )
      }
    }
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
  await audit(user.id, `leave_${action}`, 'leave_request', id, { note }, ip)
  return ok({ status: action === 'approve' ? 'disetujui' : 'ditolak' })
})

