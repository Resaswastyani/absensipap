'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck2, CalendarX2, ChevronLeft, ChevronRight, Clock3, FileText, Image as ImageIcon } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { currentMonth, dayName, duration, hm, monthLabel, shortDate } from '@/lib/format'
import { Alert, Button, Card, EmptyState, Modal, PageHeader, Skeleton, StatCard, StatusBadge } from '../kit'

type Row = { id: number; work_date: string; status: string; late_minutes: number; check_in_at: string | null; check_out_at: string | null; location_name: string | null; has_in_photo: number; has_out_photo: number; note: string | null }
type Data = { month: string; rows: Row[]; stats: Record<string, number> }

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function EmployeeHistory({ nav }: { nav?: React.ReactNode } = {}) {
  const [month, setMonth] = useState(currentMonth())
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<{ id: number; kind: 'in' | 'out'; date: string } | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setData(null)
    api<Data>(`/api/attendance/history?month=${month}`, { signal: ctrl.signal }).then(setData).catch((e) => { if (e.name !== 'AbortError') setError(errorMessage(e)) })
    return () => ctrl.abort()
  }, [month])

  const isCurrent = month >= currentMonth()
  const s = data?.stats

  return (
    <div className="grid grid-cols-1 gap-6">
      {nav}
      <PageHeader
        title="Riwayat absensi"
        description="Jam masuk, pulang, dan status kehadiran Anda setiap bulan."
        actions={
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-xs">
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya"><ChevronLeft /></Button>
            <span className="min-w-36 text-center text-sm font-medium">{monthLabel(month)}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Bulan berikutnya"><ChevronRight /></Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Hadir" value={s ? s.hadir + s.terlambat : '–'} unit="hari" tone="success" icon={<CalendarCheck2 />} />
        <StatCard label="Terlambat" value={s?.terlambat ?? '–'} unit="kali" tone="warning" icon={<Clock3 />} hint={s?.totalLateMinutes ? `${s.totalLateMinutes} menit total` : undefined} />
        <StatCard label="Izin / sakit / cuti" value={s ? s.izin + s.sakit + s.cuti : '–'} unit="hari" tone="info" icon={<FileText />} />
        <StatCard label="Alpha" value={s?.alpha ?? '–'} unit="hari" tone="danger" icon={<CalendarX2 />} />
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <Card title="Rincian kehadiran" description={monthLabel(month)} flush>
        {!data ? <div className="p-5"><Skeleton rows={6} /></div> : data.rows.length === 0 ? (
          <EmptyState title="Belum ada catatan" description="Belum ada data absensi pada bulan ini." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="rtable">
              <thead><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Durasi</th><th>Status</th><th>Lokasi</th><th className="text-right">Foto</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td data-primary><span className="font-medium">{shortDate(r.work_date)}</span><span className="sub">{dayName(r.work_date)}</span></td>
                    <td data-label="Masuk" className="tabular-nums">{hm(r.check_in_at)}</td>
                    <td data-label="Pulang" className="tabular-nums">{hm(r.check_out_at)}</td>
                    <td data-label="Durasi" className="tabular-nums">{r.check_in_at && !r.check_out_at ? 'Berjalan' : duration(r.check_in_at, r.check_out_at)}</td>
                    <td data-label="Status"><span className="inline-flex items-center gap-2"><StatusBadge status={r.status} />{r.late_minutes > 0 && <span className="text-xs text-muted-foreground">{r.late_minutes} mnt</span>}</span></td>
                    <td data-label="Lokasi" className="text-muted-foreground">{r.location_name ?? r.note ?? '—'}</td>
                    <td data-label="Foto" className="text-right">
                      <div className="inline-flex gap-1">
                        {Boolean(r.has_in_photo) && <Button variant="ghost" size="sm" onClick={() => setPhoto({ id: r.id, kind: 'in', date: r.work_date })}><ImageIcon /> Masuk</Button>}
                        {Boolean(r.has_out_photo) && <Button variant="ghost" size="sm" onClick={() => setPhoto({ id: r.id, kind: 'out', date: r.work_date })}><ImageIcon /> Pulang</Button>}
                        {!r.has_in_photo && !r.has_out_photo && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={photo !== null} onClose={() => setPhoto(null)} title={photo?.kind === 'out' ? 'Foto check-out' : 'Foto check-in'} description={photo ? shortDate(photo.date) : undefined} size="sm">
        {photo && <img className="aspect-square w-full rounded-lg bg-muted object-cover" src={`/api/attendance/${photo.id}/photo?kind=${photo.kind}`} alt="Foto verifikasi absensi" />}
      </Modal>
    </div>
  )
}
