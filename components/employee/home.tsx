'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarCheck2, Clock3, FileText, LogIn, LogOut, MapPin, Navigation, Timer } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { duration, greeting, hm, longDate, monthLabel } from '@/lib/format'
import { Alert, Card, Skeleton, StatCard, StatusBadge, useToast } from '../ui'
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

export function EmployeeHome({ firstName }: { firstName: string }) {
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
  const rec = data?.record
  const checkedIn = Boolean(rec?.check_in_at)
  const checkedOut = Boolean(rec?.check_out_at)
  const onLeave = rec && ['izin', 'sakit', 'cuti'].includes(rec.status) && !checkedIn

  // Progres hari kerja
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
    <div className="page">
      <div className="hero-head">
        <div>
          <span className="eyebrow">{data ? longDate(data.now.date).toUpperCase() : 'MEMUAT…'}</span>
          <h1>{greeting(now ? Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }).format(now)) : 8)}, {firstName}</h1>
          <p>{checkedOut ? 'Absensi hari ini sudah lengkap. Sampai jumpa besok!' : checkedIn ? 'Anda sudah check-in. Jangan lupa check-out saat pulang.' : 'Lakukan check-in saat tiba di area kerja.'}</p>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="grid-home">
        <section className="card attend-card">
          <div className="attend-top">
            <span className="chip"><Clock3 size={14} /> {data ? `${data.shift.name} · ${data.shift.start.slice(0, 5)}–${data.shift.end.slice(0, 5)}` : 'Memuat shift…'}</span>
            {rec ? <StatusBadge status={rec.status} /> : <StatusBadge status="belum" />}
          </div>
          <div className="clock" aria-live="off">{clock}<small>WIB</small></div>
          <div className="day-track" aria-label={`Progres jam kerja ${Math.round(progress)}%`}>
            <div className="day-track-bar"><span style={{ width: `${progress}%` }} /></div>
            <div className="day-track-labels"><span>Masuk <strong>{data?.shift.start.slice(0, 5) ?? '--:--'}</strong></span><span>Pulang <strong>{data?.shift.end.slice(0, 5) ?? '--:--'}</strong></span></div>
          </div>

          <div className="attend-times">
            <div><span className="attend-icon in"><LogIn size={17} /></span><span><small>Check-in</small><strong>{hm(rec?.check_in_at)}</strong></span></div>
            <div><span className="attend-icon out"><LogOut size={17} /></span><span><small>Check-out</small><strong>{hm(rec?.check_out_at)}</strong></span></div>
            <div><span className="attend-icon dur"><Timer size={17} /></span><span><small>Durasi</small><strong>{checkedOut ? duration(rec!.check_in_at, rec!.check_out_at) : checkedIn ? 'Berjalan' : '—'}</strong></span></div>
          </div>

          {!data ? (
            <div className="skeleton btn-skeleton" />
          ) : onLeave ? (
            <Alert tone="info">Hari ini Anda tercatat <strong>{rec!.status}</strong>. Tidak perlu absen.</Alert>
          ) : checkedOut ? (
            <button className="btn btn-success btn-lg btn-block" disabled><CalendarCheck2 size={18} /> Absensi hari ini selesai</button>
          ) : (
            <button className={`btn btn-lg btn-block ${checkedIn ? 'btn-warning' : 'btn-primary'}`} onClick={() => setMode(checkedIn ? 'out' : 'in')}>
              {checkedIn ? <LogOut size={18} /> : <LogIn size={18} />} {checkedIn ? 'Check-out sekarang' : 'Check-in sekarang'}
            </button>
          )}
          {rec?.status === 'terlambat' && rec.late_minutes > 0 && <p className="fine-print warn">Terlambat {rec.late_minutes} menit dari jadwal shift.</p>}
        </section>

        <Card title="Lokasi kerja" subtitle="AREA ABSENSI" className="location-card">
          {!data ? <Skeleton rows={3} /> : office ? (
            <>
              <div className="map-frame">
                <iframe
                  title={`Peta ${office.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(office.longitude) - 0.004}%2C${Number(office.latitude) - 0.0025}%2C${Number(office.longitude) + 0.004}%2C${Number(office.latitude) + 0.0025}&layer=mapnik&marker=${office.latitude}%2C${office.longitude}`}
                />
              </div>
              <div className="loc-foot">
                <span className="loc-icon"><MapPin size={16} /></span>
                <div><strong>{office.name}</strong><small>{office.address || `${Number(office.latitude).toFixed(5)}, ${Number(office.longitude).toFixed(5)}`} · radius {office.radius_m} m</small></div>
                <a className="link" href={`https://www.google.com/maps/search/?api=1&query=${office.latitude},${office.longitude}`} target="_blank" rel="noopener noreferrer"><Navigation size={14} /> Rute</a>
              </div>
              {data.offices.length > 1 && <p className="fine-print">+{data.offices.length - 1} lokasi absensi lain tersedia.</p>}
            </>
          ) : (
            <Alert tone="warning">Lokasi kantor belum diatur oleh admin, sehingga absensi belum dapat dilakukan.</Alert>
          )}
        </Card>
      </div>

      <div className="section-head">
        <div><span className="card-subtitle">RINGKASAN</span><h2>{history ? monthLabel(history.month) : 'Bulan ini'}</h2></div>
        <Link href="/karyawan/riwayat" className="link">Lihat riwayat <ArrowRight size={15} /></Link>
      </div>
      <div className="stat-grid">
        <StatCard label="Hadir tepat waktu" value={stats?.hadir ?? '–'} unit="hari" tone="success" icon={<CalendarCheck2 size={18} />} />
        <StatCard label="Terlambat" value={stats?.terlambat ?? '–'} unit="kali" tone="warning" icon={<Clock3 size={18} />} hint={stats?.totalLateMinutes ? `Total ${stats.totalLateMinutes} menit` : undefined} />
        <StatCard label="Izin / sakit / cuti" value={stats ? stats.izin + stats.sakit + stats.cuti : '–'} unit="hari" tone="info" icon={<FileText size={18} />} />
        <StatCard label="Alpha" value={stats?.alpha ?? '–'} unit="hari" tone="danger" icon={<Clock3 size={18} />} />
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
