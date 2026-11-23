'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck2, ChevronLeft, ChevronRight, Clock3, FileText, Image as ImageIcon, XCircle } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { currentMonth, dayName, duration, hm, monthLabel, shortDate } from '@/lib/format'
import { Alert, Card, EmptyState, Modal, PageHeader, Skeleton, StatCard, StatusBadge } from '../ui'

type Row = { id: number; work_date: string; status: string; late_minutes: number; check_in_at: string | null; check_out_at: string | null; location_name: string | null; has_in_photo: number; has_out_photo: number; note: string | null }
type Data = { month: string; rows: Row[]; stats: Record<string, number> }

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function EmployeeHistory() {
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
    <div className="page">
      <PageHeader eyebrow="CATATAN KEHADIRAN" title="Riwayat absensi" description="Pantau jam masuk, pulang, dan status kehadiran Anda setiap bulan." />
      <div className="month-nav">
        <button className="icon-btn bordered" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Bulan sebelumnya"><ChevronLeft size={18} /></button>
        <strong>{monthLabel(month)}</strong>
        <button className="icon-btn bordered" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Bulan berikutnya"><ChevronRight size={18} /></button>
      </div>

      <div className="stat-grid">
        <StatCard label="Hadir" value={s ? s.hadir + s.terlambat : '–'} unit="hari" tone="success" icon={<CalendarCheck2 size={18} />} />
        <StatCard label="Terlambat" value={s?.terlambat ?? '–'} unit="kali" tone="warning" icon={<Clock3 size={18} />} hint={s?.totalLateMinutes ? `${s.totalLateMinutes} menit total` : undefined} />
        <StatCard label="Izin / sakit / cuti" value={s ? s.izin + s.sakit + s.cuti : '–'} unit="hari" tone="info" icon={<FileText size={18} />} />
        <StatCard label="Alpha" value={s?.alpha ?? '–'} unit="hari" tone="danger" icon={<XCircle size={18} />} />
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <Card title="Rincian kehadiran" subtitle={monthLabel(month).toUpperCase()} flush>
        {!data ? <div className="pad"><Skeleton rows={6} /></div> : data.rows.length === 0 ? (
          <EmptyState title="Belum ada catatan" description="Belum ada data absensi pada bulan ini." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Tanggal</th><th>Check-in</th><th>Check-out</th><th>Durasi</th><th>Status</th><th>Lokasi</th><th className="ta-right">Foto</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Tanggal"><strong>{shortDate(r.work_date)}</strong><small>{dayName(r.work_date)}</small></td>
                    <td data-label="Check-in">{hm(r.check_in_at)}</td>
                    <td data-label="Check-out">{hm(r.check_out_at)}</td>
                    <td data-label="Durasi">{r.check_in_at && !r.check_out_at ? 'Berjalan' : duration(r.check_in_at, r.check_out_at)}</td>
                    <td data-label="Status"><StatusBadge status={r.status} />{r.late_minutes > 0 && <small>{r.late_minutes} mnt</small>}</td>
                    <td data-label="Lokasi">{r.location_name ?? (r.note ? <small>{r.note}</small> : '—')}</td>
                    <td data-label="Foto" className="ta-right">
                      <div className="row-actions">
                        {Boolean(r.has_in_photo) && <button className="btn btn-ghost btn-sm" onClick={() => setPhoto({ id: r.id, kind: 'in', date: r.work_date })}><ImageIcon size={14} /> Masuk</button>}
                        {Boolean(r.has_out_photo) && <button className="btn btn-ghost btn-sm" onClick={() => setPhoto({ id: r.id, kind: 'out', date: r.work_date })}><ImageIcon size={14} /> Pulang</button>}
                        {!r.has_in_photo && !r.has_out_photo && '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={photo !== null} onClose={() => setPhoto(null)} title={photo?.kind === 'out' ? 'Foto check-out' : 'Foto check-in'} subtitle={photo ? shortDate(photo.date) : ''} size="sm">
        {photo && <img className="photo-preview" src={`/api/attendance/${photo.id}/photo?kind=${photo.kind}`} alt="Foto verifikasi absensi" />}
      </Modal>
    </div>
  )
}
