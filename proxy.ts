import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from './lib/session-token'

// Pemeriksaan cepat di tepi: arahkan pengguna ke area sesuai perannya.
// Validasi penuh (status akun & pencabutan token) tetap dilakukan di server/API.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  const home = session?.role === 'admin' ? '/admin' : '/karyawan'

  if (pathname === '/' || pathname === '/login') {
    if (session) return NextResponse.redirect(new URL(home, request.url))
    if (pathname === '/') return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  if (!session) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete(SESSION_COOKIE)
    return res
  }
  if (pathname.startsWith('/admin') && session.role !== 'admin') return NextResponse.redirect(new URL('/karyawan', request.url))
  if (pathname.startsWith('/karyawan') && session.role !== 'employee') return NextResponse.redirect(new URL('/admin', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/karyawan/:path*'],
}
