import { ok, publicRoute } from '@/lib/server/api'
import { clearSessionCookie } from '@/lib/server/auth'

export const POST = publicRoute(async () => {
  await clearSessionCookie()
  return ok({ redirect: '/login' })
})
