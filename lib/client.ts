'use client'

export class ApiClientError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal }

/** Pemanggil API terpusat: header anti-CSRF, parsing error, dan auto-redirect saat sesi habis. */
export async function api<T = unknown>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      signal,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'fetch', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new ApiClientError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
  }
  let json: { ok: boolean; data?: T; error?: string } | null = null
  try {
    json = await res.json()
  } catch {
    /* respons bukan JSON */
  }
  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    window.location.href = '/login'
    throw new ApiClientError(401, json?.error ?? 'Sesi berakhir.')
  }
  if (!res.ok || !json?.ok) throw new ApiClientError(res.status, json?.error ?? 'Terjadi kesalahan. Coba lagi.')
  return json.data as T
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan.'
}
