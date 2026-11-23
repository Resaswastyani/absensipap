import { z } from 'zod'
import { ApiError, audit, ok, parseBody, route } from '@/lib/server/api'
import { execute, query } from '@/lib/server/db'
import { dateSchema } from '@/lib/validation'

const schema = z.object({
  type: z.enum(['izin', 'sakit', 'cuti', 'koreksi'], { message: 'Jenis pengajuan tidak valid.' }),
  start_date: dateSchema,
  end_date: dateSchema,
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(500, 'Alasan maksimal 500 karakter.'),
})

export const GET = route('attendee', async ({ user }) => {
  const rows = await query(
    `SELECT r.id, r.type, r.start_date, r.end_date, r.reason, r.status, r.review_note, r.reviewed_at, r.created_at,
            rv.name AS reviewer_name
       FROM leave_requests r LEFT JOIN users rv ON rv.id = r.reviewed_by
      WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 100`,
    [user.id],
  )
  return ok(rows)
})

export const POST = route('attendee', async ({ req, user, ip }) => {
  const body = await parseBody(req, schema)
  if (body.end_date < body.start_date) throw new ApiError(422, 'Tanggal selesai tidak boleh sebelum tanggal mulai.')
  const days = (Date.parse(body.end_date) - Date.parse(body.start_date)) / 86400000 + 1
  if (days > 30) throw new ApiError(422, 'Rentang pengajuan maksimal 30 hari.')
  const pending = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM leave_requests WHERE user_id = ? AND status = 'menunggu'",
    [user.id],
  )
  if (Number(pending[0]?.n ?? 0) >= 5) throw new ApiError(429, 'Masih ada 5 pengajuan menunggu. Tunggu peninjauan HR.')
  const result = await execute(
    'INSERT INTO leave_requests (user_id, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)',
    [user.id, body.type, body.start_date, body.end_date, body.reason],
  )
  await audit(user.id, 'leave_create', 'leave_request', result.insertId, body, ip)
  return ok({ id: result.insertId }, { status: 201 })
})
