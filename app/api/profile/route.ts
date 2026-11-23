import { z } from 'zod'
import { audit, ok, parseBody, route } from '@/lib/server/api'
import { execute } from '@/lib/server/db'

const schema = z.object({
  phone: z.string().trim().max(30).regex(/^[0-9+\-\s]*$/, 'Nomor telepon tidak valid.').optional(),
  email: z.union([z.string().trim().toLowerCase().email('Email tidak valid.').max(150), z.literal('')]).optional(),
})

export const PATCH = route('any', async ({ req, user, ip }) => {
  const body = await parseBody(req, schema)
  await execute('UPDATE users SET phone = ?, email = ? WHERE id = ?', [
    body.phone ?? user.phone ?? null,
    body.email === '' ? null : body.email ?? user.email ?? null,
    user.id,
  ])
  await audit(user.id, 'profile_update', 'user', user.id, body, ip)
  return ok({ updated: true })
})
