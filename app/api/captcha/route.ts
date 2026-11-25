import { createCaptcha } from '@/lib/server/captcha'

export const dynamic = 'force-dynamic'

// Gambar CAPTCHA (SVG). Dipanggil langsung oleh <img>, jadi tanpa header khusus.
export async function GET() {
  const svg = await createCaptcha()
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
    },
  })
}
