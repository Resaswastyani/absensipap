import { ok, route } from '@/lib/server/api'

export const GET = route('any', async ({ user }) => ok(user))
