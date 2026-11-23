import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { z, type ZodType } from 'zod'
import { getCurrentUser, type CurrentUser } from './auth'
import { execute } from './db'
import type { Role } from '../session-token'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { ...init, headers: { 'Cache-Control': 'no-store', ...init?.headers } })
}

export function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function clientIp(req: NextRequest) {
  return (req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim().slice(0, 64)
}

/** Proteksi CSRF: permintaan yang mengubah data wajib berasal dari origin yang sama. */
function assertSameOrigin(req: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return
  const origin = req.headers.get('origin')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!origin || !host) throw new ApiError(403, 'Permintaan ditolak.')
  try {
    if (new URL(origin).host !== host) throw new ApiError(403, 'Permintaan ditolak.')
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(403, 'Permintaan ditolak.')
  }
  if (req.headers.get('x-requested-with') !== 'fetch') throw new ApiError(403, 'Permintaan ditolak.')
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ApiError(400, 'Format data tidak valid.')
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new ApiError(422, issue?.message ?? 'Data tidak valid.')
  }
  return result.data
}

type Ctx<P> = { req: NextRequest; user: CurrentUser; params: P; ip: string }
type Handler<P> = (ctx: Ctx<P>) => Promise<Response>

/** Bungkus route handler: cek origin, sesi, peran, dan tangani error secara seragam. */
export function route<P = Record<string, string>>(roles: Role[] | 'any', handler: Handler<P>) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      assertSameOrigin(req)
      const user = await getCurrentUser()
      if (!user) return fail(401, 'Sesi berakhir. Silakan login kembali.')
      if (roles !== 'any' && !roles.includes(user.role)) return fail(403, 'Anda tidak memiliki akses.')
      const params = (await context?.params) ?? ({} as P)
      return await handler({ req, user, params, ip: clientIp(req) })
    } catch (error) {
      return handleError(error)
    }
  }
}

export function publicRoute(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      assertSameOrigin(req)
      return await handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}

function handleError(error: unknown) {
  if (error instanceof ApiError) return fail(error.status, error.message)
  const code = (error as { code?: string })?.code
  if (code === 'ER_DUP_ENTRY') return fail(409, 'Data sudah terdaftar.')
  console.error('[api]', error)
  return fail(500, 'Terjadi kesalahan pada server.')
}

export async function audit(userId: number | null, action: string, entity: string | null, entityId: number | null, detail: unknown, ip: string) {
  try {
    await execute('INSERT INTO audit_logs (user_id, action, entity, entity_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)', [
      userId, action, entity, entityId, detail == null ? null : JSON.stringify(detail).slice(0, 4000), ip,
    ])
  } catch (error) {
    console.error('[audit]', error)
  }
}

export const idParam = z.coerce.number().int().positive()
export function parseId(value: string) {
  const r = idParam.safeParse(value)
  if (!r.success) throw new ApiError(400, 'ID tidak valid.')
  return r.data
}
