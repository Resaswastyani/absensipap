import { ApiError, route } from '@/lib/server/api'
import { parseId } from '@/lib/server/api'
import { queryOne } from '@/lib/server/db'
import { readPhoto } from '@/lib/server/photos'

// Foto hanya dapat dilihat oleh pemilik absensi atau admin.
export const GET = route<{ id: string }>('any', async ({ req, user, params }) => {
  const id = parseId(params.id)
  const kind = req.nextUrl.searchParams.get('kind') === 'out' ? 'out' : 'in'
  const row = await queryOne<{ user_id: number; check_in_photo: string | null; check_out_photo: string | null }>(
    'SELECT user_id, check_in_photo, check_out_photo FROM attendance WHERE id = ?',
    [id],
  )
  if (!row || (user.role !== 'admin' && row.user_id !== user.id)) throw new ApiError(404, 'Foto tidak ditemukan.')
  const file = kind === 'out' ? row.check_out_photo : row.check_in_photo
  if (!file) throw new ApiError(404, 'Foto tidak ditemukan.')
  const buffer = await readPhoto(file)
  return new Response(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
  })
})
