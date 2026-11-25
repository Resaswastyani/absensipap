'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarCheck2 } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { hm, longDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Alert, Avatar, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../kit'
import { Button } from '../ui/button'
import { Card as UICard } from '../ui/card'
import { Skeleton as Bone } from '../ui/misc'
import { AttendanceTrend } from './attendance-trend'

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

type Totals = Dashboard['totals']

/** Ringkasan kehadiran hari ini: persentase utama, bar komposisi, dan status yang bisa diklik. */
function TodaySummary({ totals, present, rate }: { totals?: Totals; present: number; rate: number }) {
  const total = totals?.total ?? 0
  const items = [
    { key: 'hadir', label: 'Tepat waktu', value: totals?.hadir ?? 0, bar: 'bg-chart-1', dot: 'bg-chart-1' },
    { key: 'terlambat', label: 'Terlambat', value: totals?.terlambat ?? 0, bar: 'bg-chart-2', dot: 'bg-chart-2' },
    { key: 'izin', label: 'Izin / sakit / cuti', value: totals?.izin ?? 0, bar: 'bg-chart-3', dot: 'bg-chart-3' },
    { key: 'belum', label: 'Belum hadir', value: totals?.belum ?? 0, bar: 'bg-muted-foreground/25', dot: 'bg-muted-foreground/50' },
  ]
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0)

  return (
    <UICard className="p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="shrink-0 lg:w-60 lg:border-r lg:pr-8">
          <p className="text-sm text-muted-foreground">Kehadiran hari ini</p>
          {totals ? (
            <>
              <p className="mt-1 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">{rate}<span className="ml-1 text-2xl font-medium text-muted-foreground sm:text-3xl">%</span></p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">{present}</span> dari <span className="tabular-nums">{total}</span> karyawan sudah hadir
              </p>
            </>
          ) : (
            <div className="mt-2 grid gap-2"><Bone className="h-11 w-24" /><Bone className="h-4 w-40" /></div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={items.map((i) => `${i.label} ${i.value}`).join(', ')}>
            {totals && total > 0 && items.map((i) => i.value > 0 && (
              <span key={i.key} className={cn('h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full', i.bar)} style={{ width: `${(i.value / total) * 100}%` }} />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            {items.map((i) => (
              <Link key={i.key} href={`/admin/absensi?status=${i.key}`}
                className="group rounded-lg border px-3.5 py-3 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none">
                <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <span className={cn('size-2 shrink-0 rounded-full', i.dot)} />
                  <span className="truncate">{i.label}</span>
                </span>
                <span className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-semibold">{totals ? i.value : '–'}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{totals ? `${pct(i.value)}%` : ''}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </UICard>
  )
}

const DEPT_LIMIT = 6

/** Daftar meter per divisi: nama, bar, dan angka sejajar; 6 teratas lalu bisa diperluas. */
function DepartmentList({ departments }: { departments?: Dashboard['departments'] }) {
  const [expanded, setExpanded] = useState(false)
  const list = departments ?? []
  const shown = expanded ? list : list.slice(0, DEPT_LIMIT)
  return (
    <Card title="Per divisi" description="Hadir hari ini dibanding jumlah karyawan">
      {!departments ? <Skeleton rows={5} /> : list.length === 0 ? <EmptyState title="Belum ada karyawan" /> : (
        <>
          <ul className="grid gap-3">
            {shown.map((d) => {
              const p = Number(d.present ?? 0)
              const total = Number(d.total)
              const pct = total ? (p / total) * 100 : 0
              return (
                <li key={d.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_2.5rem]">
                  <span className="truncate text-sm" title={d.name}>{d.name}</span>
                  <span className="col-span-2 row-start-2 h-1.5 overflow-hidden rounded-full bg-primary/15 sm:col-span-1 sm:row-start-auto" role="img" aria-label={`${d.name}: ${p} dari ${total} hadir`}>
                    <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="text-right text-sm text-muted-foreground tabular-nums"><span className="font-medium text-foreground">{p}</span>/{total}</span>
                </li>
              )
            })}
          </ul>
          {list.length > DEPT_LIMIT && (
            <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${list.length})`}
            </Button>
          )}
        </>
      )}
    </Card>
  )
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

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={`Halo, ${adminName.split(' ')[0]}`}
        description={data ? longDate(data.date) : ' '}
        actions={<Button asChild><Link href="/admin/absensi"><CalendarCheck2 /> Rekap absensi</Link></Button>}
      />

      {error && <Alert tone="danger">{error}</Alert>}
      {data && !data.hasLocation && (
        <Alert tone="warning">Lokasi kantor belum diatur, karyawan belum dapat check-in. <Link href="/admin/pengaturan" className="font-medium underline underline-offset-2">Atur lokasi</Link></Alert>
      )}

      <TodaySummary totals={t} present={present} rate={rate} />

      {/* items-start: kartu tidak saling meregangkan tinggi */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <AttendanceTrend days={days} rows={data?.trend ?? []} today={data?.date} loading={!data} className="xl:col-span-2" />
        <DepartmentList departments={data?.departments} />
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
