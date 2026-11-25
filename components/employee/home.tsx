'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarCheck2, CalendarX2, Clock3, FileText, LogIn, LogOut, MapPin, Navigation, Timer } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { duration, greeting, hm, longDate, monthLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Alert, Card, Skeleton, StatCard, StatusBadge, useToast } from '../kit'
import { Button } from '../ui/button'
import { Card as UICard } from '../ui/card'
import { Skeleton as Bone } from '../ui/misc'
import { CameraCheck, type Office } from './camera-check'

type Today = {
  now: { date: string; time: string }
  serverTime: number
  shift: { name: string; start: string; end: string; tolerance: number }
  record: null | { id: number; work_date: string; status: string; late_minutes: number; check_in_at: string | null; check_out_at: string | null; location_name: string | null; check_in_distance_m: number | null }
  offices: Office[]
}
type History = { month: string; stats: Record<string, number> }

function useClock(offset: number) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + offset))
    tick()
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [offset])
  return now
}

export function EmployeeHome({ firstName, basePath = '/karyawan', nav }: { firstName: string; basePath?: string; nav?: React.ReactNode }) {
  const toast = useToast()
  const [data, setData] = useState<Today | null>(null)
  const [history, setHistory] = useState<History | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'in' | 'out' | null>(null)
  const [offset, setOffset] = useState(0)
  const now = useClock(offset)

  const load = useCallback(async () => {
    try {
      const [today, hist] = await Promise.all([api<Today>('/api/attendance/today'), api<History>('/api/attendance/history')])
      setData(today)
      setHistory(hist)
      setOffset(today.serverTime - Date.now())
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => { load() }, [load])

  const clock = now ? new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now).replace(/\./g, ':') : '--:--:--'
  const hour = now ? Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }).format(now)) : 8
  const rec = data?.record
  const checkedIn = Boolean(rec?.check_in_at)
  const checkedOut = Boolean(rec?.check_out_at)
  const onLeave = rec && ['izin', 'sakit', 'cuti'].includes(rec.status) && !checkedIn

  // Progres jam kerja hari ini
  let progress = 0
  if (data && now) {
    const [sh, sm] = data.shift.start.split(':').map(Number)
    const [eh, em] = data.shift.end.split(':').map(Number)
    const jkt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    let cur = jkt.getHours() * 60 + jkt.getMinutes()
    const start = sh * 60 + sm
    let end = eh * 60 + em
    if (end <= start) { end += 1440; if (cur < start) cur += 1440 }
    progress = Math.max(0, Math.min(100, ((cur - start) / (end - start)) * 100))
  }

  const office = data?.offices[0]
  const stats = history?.stats

  return (
    <div className="grid grid-cols-1 gap-6">
      {nav}
      <div>
        <p className="text-sm text-muted-foreground">{data ? longDate(data.now.date) : ' '}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.01em] sm:text-[1.65rem]">{greeting(hour)}, {firstName}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {checkedOut ? 'Absensi hari ini sudah lengkap. Sampai jumpa besok.' : checkedIn ? 'Anda sudah check-in. Jangan lupa check-out saat pulang.' : 'Lakukan check-in saat tiba di area kerja.'}
        </p>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Kartu absensi */}
        <UICard className="gap-5 p-5 sm:p-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock3 className="size-4" />
              {data ? `${data.shift.name} · ${data.shift.start.slice(0, 5)}–${data.shift.end.slice(0, 5)}` : 'Memuat shift…'}
            </span>
            {rec ? <StatusBadge status={rec.status} /> : <StatusBadge status="belum" />}
          </div>

          <div>
            <div className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl" aria-live="off">
              {clock}<span className="ml-2 text-base font-medium text-muted-foreground">WIB</span>
            </div>
            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progres jam kerja">
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Masuk <span className="font-medium text-foreground">{data?.shift.start.slice(0, 5) ?? '--:--'}</span></span>
                <span>Pulang <span className="font-medium text-foreground">{data?.shift.end.slice(0, 5) ?? '--:--'}</span></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x rounded-lg border">
            {[
              { icon: LogIn, label: 'Masuk', value: hm(rec?.check_in_at), cls: 'text-success' },
              { icon: LogOut, label: 'Pulang', value: hm(rec?.check_out_at), cls: 'text-info' },
              { icon: Timer, label: 'Durasi', value: checkedOut ? duration(rec!.check_in_at, rec!.check_out_at) : checkedIn ? 'Berjalan' : '—', cls: 'text-primary' },
            ].map(({ icon: Icon, label, value, cls }) => (
              <div key={label} className="min-w-0 px-3 py-3 sm:px-4">
                <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground"><Icon className={cn('size-3.5', cls)} />{label}</div>
                <div className="mt-1 truncate text-base font-semibold tabular-nums sm:text-lg">{value}</div>
              </div>
            ))}
          </div>

          {!data ? (
            <Bone className="h-11 w-full" />
          ) : onLeave ? (
            <Alert tone="info">Hari ini Anda tercatat <strong>{rec!.status}</strong>. Tidak perlu absen.</Alert>
          ) : checkedOut ? (
            <Button size="lg" variant="secondary" className="h-11 w-full" disabled><CalendarCheck2 /> Absensi hari ini selesai</Button>
          ) : (
            <Button size="lg" className="h-11 w-full" onClick={() => setMode(checkedIn ? 'out' : 'in')}>
              {checkedIn ? <LogOut /> : <LogIn />} {checkedIn ? 'Check-out sekarang' : 'Check-in sekarang'}
            </Button>
          )}
          {rec?.status === 'terlambat' && rec.late_minutes > 0 && <p className="-mt-2 text-center text-xs text-warning">Terlambat {rec.late_minutes} menit dari jadwal shift.</p>}
        </UICard>

        {/* Lokasi kerja */}
        <Card title="Lokasi kerja" description={office ? `Radius absensi ${office.radius_m} m` : undefined} className="lg:col-span-2">
          {!data ? <Skeleton rows={3} /> : office ? (
            <div className="grid grid-cols-1 gap-4">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted sm:aspect-[16/9] lg:aspect-[4/3]">
                <iframe
                  title={`Peta ${office.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="map-dark absolute inset-0 size-full border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(office.longitude) - 0.004}%2C${Number(office.latitude) - 0.0025}%2C${Number(office.longitude) + 0.004}%2C${Number(office.latitude) + 0.0025}&layer=mapnik&marker=${office.latitude}%2C${office.longitude}`}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{office.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{office.address || `${Number(office.latitude).toFixed(5)}, ${Number(office.longitude).toFixed(5)}`}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${office.latitude},${office.longitude}`} target="_blank" rel="noopener noreferrer"><Navigation /> Rute</a>
                </Button>
              </div>
            </div>
          ) : (
            <Alert tone="warning">Lokasi kantor belum diatur oleh admin, sehingga absensi belum dapat dilakukan.</Alert>
          )}
        </Card>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Ringkasan {history ? monthLabel(history.month) : 'bulan ini'}</h2>
          <p className="text-sm text-muted-foreground">Rekap kehadiran Anda bulan berjalan.</p>
        </div>
        <Button variant="ghost" size="sm" asChild><Link href={`${basePath}/riwayat`}>Lihat riwayat <ArrowRight /></Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Tepat waktu" value={stats?.hadir ?? '–'} unit="hari" tone="success" icon={<CalendarCheck2 />} />
        <StatCard label="Terlambat" value={stats?.terlambat ?? '–'} unit="kali" tone="warning" icon={<Clock3 />} hint={stats?.totalLateMinutes ? `Total ${stats.totalLateMinutes} menit` : undefined} />
        <StatCard label="Izin / sakit / cuti" value={stats ? stats.izin + stats.sakit + stats.cuti : '–'} unit="hari" tone="info" icon={<FileText />} />
        <StatCard label="Alpha" value={stats?.alpha ?? '–'} unit="hari" tone="danger" icon={<CalendarX2 />} />
      </div>

      {data && (
        <CameraCheck
          mode={mode ?? 'in'}
          open={mode !== null}
          offices={data.offices}
          onClose={() => setMode(null)}
          onSuccess={(msg) => { setMode(null); toast(msg, 'success'); load() }}
        />
      )}
    </div>
  )
}
