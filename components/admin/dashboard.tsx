'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, CalendarCheck2, Clock3, FileText, UserX, Users } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { dayName, hm, longDate } from '@/lib/format'
import { Alert, Avatar, Card, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge } from '../ui'

type Dashboard = {
  date: string
  totals: { total: number; hadir: number; terlambat: number; izin: number; belum: number }
  departments: { name: string; total: number; present: number }[]
  recent: { id: number; name: string; nik: string; department: string | null; check_in_at: string; check_out_at: string | null; status: string; late_minutes: number }[]
  trend: { work_date: string; hadir: number; terlambat: number; izin: number }[]
  weekStart: string
  hasLocation: boolean
}

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function AdminDashboard({ adminName }: { adminName: string }) {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = () => api<Dashboard>('/api/admin/dashboard').then(setData).catch((e) => setError(errorMessage(e)))
    load()
    const t = window.setInterval(load, 60000)
    return () => window.clearInterval(t)
  }, [])

  const t = data?.totals
  const present = t ? t.hadir + t.terlambat : 0
  const rate = t && t.total ? Math.round((present / t.total) * 100) : 0
  const days = data ? Array.from({ length: 7 }, (_, i) => addDays(data.weekStart, i)) : []
  const maxTrend = Math.max(1, t?.total ?? 1, ...(data?.trend.map((d) => Number(d.hadir) + Number(d.terlambat) + Number(d.izin)) ?? [1]))

  return (
    <div className="page">
      <PageHeader eyebrow={data ? longDate(data.date).toUpperCase() : 'PANEL ADMIN'} title={`Halo, ${adminName.split(' ')[0]}`} description="Ringkasan kehadiran karyawan PT Pandawa Amerta Packindo hari ini."
        actions={<Link href="/admin/absensi" className="btn btn-primary"><CalendarCheck2 size={16} /> Rekap absensi</Link>} />

      {error && <Alert tone="danger">{error}</Alert>}
      {data && !data.hasLocation && (
        <Alert tone="warning">Lokasi kantor belum diatur — karyawan belum dapat melakukan check-in. <Link href="/admin/pengaturan" className="link-inline">Atur lokasi sekarang</Link></Alert>
      )}

      <div className="stat-grid stat-grid-5">
        <StatCard label="Total karyawan" value={t?.total ?? '–'} unit="orang" tone="primary" icon={<Users size={18} />} />
        <StatCard label="Hadir" value={t ? present : '–'} unit="orang" tone="success" icon={<CalendarCheck2 size={18} />} hint={t ? `${rate}% kehadiran` : undefined} />
        <StatCard label="Terlambat" value={t?.terlambat ?? '–'} unit="orang" tone="warning" icon={<Clock3 size={18} />} />
        <StatCard label="Izin / sakit / cuti" value={t?.izin ?? '–'} unit="orang" tone="info" icon={<FileText size={18} />} />
        <StatCard label="Belum hadir" value={t?.belum ?? '–'} unit="orang" tone="danger" icon={<UserX size={18} />} />
      </div>

      <div className="grid-2-1">
        <Card title="Tren 7 hari" subtitle="KEHADIRAN MINGGUAN">
          {!data ? <Skeleton rows={4} /> : (
            <>
              <div className="bar-chart" role="img" aria-label="Grafik kehadiran 7 hari terakhir">
                {days.map((d) => {
                  const row = data.trend.find((x) => x.work_date === d)
                  const h = Number(row?.hadir ?? 0), l = Number(row?.terlambat ?? 0), z = Number(row?.izin ?? 0)
                  return (
                    <div key={d} className="bar-col" title={`${dayName(d)}: hadir ${h}, terlambat ${l}, izin ${z}`}>
                      <div className="bar-stack">
                        <span className="seg seg-info" style={{ height: `${(z / maxTrend) * 100}%` }} />
                        <span className="seg seg-warning" style={{ height: `${(l / maxTrend) * 100}%` }} />
                        <span className="seg seg-success" style={{ height: `${(h / maxTrend) * 100}%` }} />
                      </div>
                      <span className="bar-label">{dayName(d).slice(0, 3)}</span>
                      <span className="bar-value">{h + l}</span>
                    </div>
                  )
                })}
              </div>
              <div className="legend"><span><i className="seg-success" /> Tepat waktu</span><span><i className="seg-warning" /> Terlambat</span><span><i className="seg-info" /> Izin/sakit/cuti</span></div>
            </>
          )}
        </Card>

        <Card title="Kehadiran per divisi" subtitle="HARI INI">
          {!data ? <Skeleton rows={4} /> : data.departments.length === 0 ? <EmptyState title="Belum ada karyawan" /> : (
            <ul className="progress-list">
              {data.departments.map((d) => {
                const pct = d.total ? (Number(d.present ?? 0) / Number(d.total)) * 100 : 0
                return (
                  <li key={d.name}>
                    <div><span>{d.name}</span><strong>{Number(d.present ?? 0)}<small>/{d.total}</small></strong></div>
                    <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

      </div>


      <Card title="Aktivitas terbaru" subtitle="CHECK-IN HARI INI" flush actions={<Link href="/admin/absensi" className="link">Lihat semua <ArrowRight size={14} /></Link>}>
          {!data ? <div className="pad"><Skeleton rows={5} /></div> : data.recent.length === 0 ? (
            <EmptyState icon={<AlertTriangle size={22} />} title="Belum ada check-in" description="Aktivitas check-in hari ini akan tampil di sini." />
          ) : (
            <ul className="activity-list">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <Avatar name={r.name} size={36} />
                  <div className="activity-main"><strong>{r.name}</strong><small>{r.department ?? 'Tanpa divisi'} · NIK {r.nik}</small></div>
                  <div className="activity-time"><strong>{hm(r.check_out_at ?? r.check_in_at)}</strong><small>{r.check_out_at ? 'Check-out' : 'Check-in'}</small></div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
    </div>
  )
}
