import { ok, route } from '@/lib/server/api'
import { findActiveRecord, resolveShift } from '@/lib/server/attendance'
import { query } from '@/lib/server/db'
import { nowJakarta } from '@/lib/server/time'

export const GET = route(['employee'], async ({ user }) => {
  const [record, shift, offices] = await Promise.all([
    findActiveRecord(user.id),
    resolveShift(user),
    query('SELECT id, name, address, latitude, longitude, radius_m FROM office_locations WHERE is_active = 1 ORDER BY id'),
  ])
  return ok({ now: nowJakarta(), serverTime: Date.now(), shift, record, offices })
})
