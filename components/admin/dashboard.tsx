'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarCheck2, Clock3, FileText, UserX, Users } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { dayName, hm, longDate } from '@/lib/format'
import { Alert, Avatar, Card, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge } from '../kit'
import { Button } from '../ui/button'

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
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={`Halo, ${adminName.split(' ')[0]}`}
        description={data ? `Ringkasan kehadiran karyawan · ${longDate(data.date)}` : 'Ringkasan kehadiran karyawan hari ini.'}
        actions={<Button asChild><Link href="/admin/absensi"><CalendarCheck2 /> Rekap absensi</Link></Button>}
      />

      {error && <Alert tone="danger">{error}</Alert>}
      {data && !data.hasLocation && (
        <Alert tone="warning">Lokasi kantor belum diatur, karyawan belum dapat check-in. <Link href="/admin/pengaturan" className="font-medium underline underline-offset-2">Atur lokasi</Link></Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total karyawan" value={t?.total ?? '–'} unit="orang" tone="primary" icon={<Users />} />
        <StatCard label="Hadir" value={t ? present : '–'} unit="orang" tone="success" icon={<CalendarCheck2 />} hint={t ? `${rate}% kehadiran` : undefined} />
        <StatCard label="Terlambat" value={t?.terlambat ?? '–'} unit="orang" tone="warning" icon={<Clock3 />} />
        <StatCard label="Izin / sakit / cuti" value={t?.izin ?? '–'} unit="orang" tone="info" icon={<FileText />} />
        <StatCard label="Belum hadir" value={t?.belum ?? '–'} unit="orang" tone="danger" icon={<UserX />} className="col-span-2 md:col-span-1" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Tren 7 hari" description="Jumlah karyawan hadir per hari" className="xl:col-span-2">
          {!data ? <Skeleton rows={5} /> : (
            <>
              <div className="grid h-52 grid-cols-7 items-end gap-2 sm:gap-4" role="img" aria-label="Grafik kehadiran 7 hari terakhir">
                {days.map((d) => {
                  const row = data.trend.find((x) => x.work_date === d)
                  const h = Number(row?.hadir ?? 0), l = Number(row?.terlambat ?? 0), z = Number(row?.izin ?? 0)
                  return (
                    <div key={d} className="grid h-full grid-rows-[auto_1fr_auto] justify-items-center gap-1.5" title={`${dayName(d)}: tepat waktu ${h}, terlambat ${l}, izin ${z}`}>
                      <span className="text-xs font-medium tabular-nums">{h + l}</span>
                      <div className="flex h-full w-full max-w-10 flex-col justify-end overflow-hidden rounded-md bg-muted">
                        <span className="block w-full bg-info/80 transition-[height] duration-500" style={{ height: `${(z / maxTrend) * 100}%` }} />
                        <span className="block w-full bg-warning/80 transition-[height] duration-500" style={{ height: `${(l / maxTrend) * 100}%` }} />
                        <span className="block w-full bg-success transition-[height] duration-500" style={{ height: `${(h / maxTrend) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{dayName(d).slice(0, 3)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-success" /> Tepat waktu</span>
                <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-warning/80" /> Terlambat</span>
                <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-info/80" /> Izin/sakit/cuti</span>
              </div>
            </>
          )}
        </Card>

        <Card title="Per divisi" description="Kehadiran hari ini">
          {!data ? <Skeleton rows={5} /> : data.departments.length === 0 ? <EmptyState title="Belum ada karyawan" /> : (
            <ul className="grid gap-4">
              {data.departments.map((d) => {
                const p = Number(d.present ?? 0)
                const pct = d.total ? (p / Number(d.total)) * 100 : 0
                return (
                  <li key={d.name}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span className="truncate">{d.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground"><span className="font-medium text-foreground">{p}</span>/{d.total}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Aktivitas terbaru" description="Check-in dan check-out hari ini" flush actions={<Button variant="ghost" size="sm" asChild><Link href="/admin/absensi">Lihat semua <ArrowRight /></Link></Button>}>
        {!data ? <div className="p-5"><Skeleton rows={5} /></div> : data.recent.length === 0 ? (
          <EmptyState title="Belum ada check-in" description="Aktivitas check-in hari ini akan tampil di sini." />
        ) : (
          <ul className="divide-y">
            {data.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <Avatar name={r.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.department ?? 'Tanpa divisi'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">{hm(r.check_out_at ?? r.check_in_at)}</p>
                  <p className="text-xs text-muted-foreground">{r.check_out_at ? 'Check-out' : 'Check-in'}</p>
                </div>
                <div className="hidden w-24 justify-end sm:flex"><StatusBadge status={r.status} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
