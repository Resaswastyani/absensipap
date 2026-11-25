// Penerima mesin absensi (protokol ADMS/iclock "push").
// TAHAP DIAGNOSTIK: hanya mencatat request dari mesin ke log server dan membalas sesuai
// protokol ADMS agar mesin mau mengirim data. Belum ada data absensi yang ditulis ke database.
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_LOG_BODY = 4000

function log(req: NextRequest, path: string, body: string) {
  const entry = {
    t: new Date().toISOString(),
    ip: req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown',
    method: req.method,
    path: `/iclock/${path}`,
    query: Object.fromEntries(req.nextUrl.searchParams),
    ua: req.headers.get('user-agent'),
    contentType: req.headers.get('content-type'),
    body: body.slice(0, MAX_LOG_BODY),
    bodyLength: body.length,
  }
  console.log('[device]', JSON.stringify(entry))
}

function text(body: string, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } })
}

/** Nomor seri mesin: hanya huruf/angka agar aman ditulis ke log & balasan. */
function serial(req: NextRequest) {
  return (req.nextUrl.searchParams.get('SN') ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 40)
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const route = path.join('/').slice(0, 100)
  let body = ''
  if (req.method === 'POST') {
    const raw = await req.text()
    body = raw.length > 200_000 ? raw.slice(0, 200_000) : raw
  }
  log(req, route, body)

  const sn = serial(req)
  // Jabat tangan awal ADMS: mesin meminta konfigurasi.
  if (req.method === 'GET' && route === 'cdata' && sn) {
    return text([
      `GET OPTION FROM: ${sn}`,
      'ATTLOGStamp=None',
      'OPERLOGStamp=9999',
      'ATTPHOTOStamp=None',
      'ErrorDelay=60',
      'Delay=30',
      'TransTimes=00:00;14:05',
      'TransInterval=1',
      'TransFlag=TransData AttLog',
      'TimeZone=7',
      'Realtime=1',
      'Encrypt=None',
    ].join('\n'))
  }
  // Polling perintah (getrequest) dan unggahan data (cdata POST) cukup dibalas OK.
  return text('OK')
}

export const GET = handle
export const POST = handle
