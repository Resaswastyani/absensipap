import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { queryOne } from './db'
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type Role } from '../session-token'

export type CurrentUser = {
  id: number
  nik: string
  name: string
  email: string | null
  role: Role
  position: string | null
  phone: string | null
  department_id: number | null
  department: string | null
  shift_id: number | null
  shift_name: string | null
  shift_start: string | null
  shift_end: string | null
  late_tolerance_minutes: number | null
  must_change_password: number
}

export async function createSessionCookie(user: { id: number; role: Role; token_version: number }) {
  const token = await signSession({ sub: String(user.id), role: user.role, tv: user.token_version })
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

/** Membaca sesi dan memastikan pengguna masih aktif & token belum dicabut. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies()
  const session = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!session) return null
  const user = await queryOne<CurrentUser & { token_version: number; is_active: number }>(
    `SELECT u.id, u.nik, u.name, u.email, u.role, u.position, u.phone, u.department_id, d.name AS department,
            u.shift_id, s.name AS shift_name, s.start_time AS shift_start, s.end_time AS shift_end,
            s.late_tolerance_minutes, u.must_change_password, u.token_version, u.is_active
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN shifts s ON s.id = u.shift_id
      WHERE u.id = ?`,
    [Number(session.sub)],
  )
  if (!user || !user.is_active || user.token_version !== session.tv || user.role !== session.role) return null
  const { token_version: _tv, is_active: _active, ...rest } = user
  return rest
}

/** Untuk server component/layout: alihkan ke login bila tidak berhak. */
export async function requirePageRole(role: Role) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== role) redirect(user.role === 'admin' ? '/admin' : '/karyawan')
  return user
}
