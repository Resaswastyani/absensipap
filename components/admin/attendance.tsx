'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, Pencil, Search } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { currentMonth, duration, hm, longDate, STATUS_LABEL, todayLocal } from '@/lib/format'
import { Alert, Avatar, Button, Card, EmptyState, Field, Modal, PageHeader, Skeleton, StatusBadge, useToast } from '../ui'
import { useOptions } from './use-options'

type Row = {
  user_id: number; nik: string; name: string; position: string | null; department: string | null; shift_name: string | null
  id: number | null; status: string | null; late_minutes: number | null; check_in_at: string | null; check_out_at: string | null
  check_in_distance_m: number | null; has_in_photo: number | null; has_out_photo: number | null; location_name: string | null; note: string | null
}

function shift(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function AdminAttendance() {
  const toast = useToast()
  const { departments } = useOptions()
  const [date, setDate] = useState(todayLocal())
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [photo, setPhoto] = useState<{ id: number; kind: 'in' | 'out'; name: string } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportMonth, setExportMonth] = useState(currentMonth())

  const load = useCallback(async () => {
    const p = new URLSearchParams({ date, q })
    if (dept) p.set('department', dept)
    if (status) p.set('status', status)
    try { setRows((await api<{ rows: Row[] }>(`/api/admin/attendance?${p}`)).rows); setError('') } catch (e) { setError(errorMessage(e)) }
  }, [date, q, dept, status])

  useEffect(() => { setRows(null); const t = window.setTimeout(load, 250); return () => window.clearTimeout(t) }, [load])

  const count = (s: string) => rows?.filter((r) => (s === 'belum' ? !r.status : r.status === s)).length ?? 0
  const counts = rows ? { hadir: count('hadir'), terlambat: count('terlambat'), izin: count('izin') + count('sakit') + count('cuti'), belum: count('belum'), alpha: count('alpha') } : null

  return (
    <div className="page">
      <PageHeader eyebrow="MONITORING" title="Rekap absensi" description="Pantau kehadiran harian seluruh karyawan, lihat foto verifikasi, dan lakukan koreksi."
        actions={<Button variant="secondary" icon={<Download size={16} />} onClick={() => setExportOpen(true)}>Ekspor CSV</Button>} />

      <div className="date-bar">
        <button className="icon-btn bordered" aria-label="Hari sebelumnya" onClick={() => setDate(shift(date, -1))}><ChevronLeft size={18} /></button>
        <input type="date" className="input date-input" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Pilih tanggal" />
        <button className="icon-btn bordered" aria-label="Hari berikutnya" disabled={date >= todayLocal()} onClick={() => setDate(shift(date, 1))}><ChevronRight size={18} /></button>
        <strong className="date-label">{longDate(date)}</strong>
      </div>

      {counts && (
        <div className="pill-stats">
          <button className={status === '' ? 'active' : ''} onClick={() => setStatus('')}>Semua <b>{rows?.length}</b></button>
          <button className={status === 'hadir' ? 'active' : ''} onClick={() => setStatus('hadir')}><i className="dot tone-success" />Hadir <b>{counts.hadir}</b></button>
          <button className={status === 'terlambat' ? 'active' : ''} onClick={() => setStatus('terlambat')}><i className="dot tone-warning" />Terlambat <b>{counts.terlambat}</b></button>
          <button className={status === 'izin' ? 'active' : ''} onClick={() => setStatus('izin')}><i className="dot tone-info" />Izin/sakit/cuti <b>{counts.izin}</b></button>
          <button className={status === 'belum' ? 'active' : ''} onClick={() => setStatus('belum')}><i className="dot tone-neutral" />Belum hadir <b>{counts.belum}</b></button>
        </div>
      )}

      <Card flush>
        <div className="toolbar">
          <label className="search"><Search size={16} /><input aria-label="Cari karyawan" placeholder="Cari nama atau NIK" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <select className="input select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter divisi">
            <option value="">Semua divisi</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {error && <div className="pad"><Alert tone="danger">{error}</Alert></div>}
        {!rows ? <div className="pad"><Skeleton rows={6} /></div> : rows.length === 0 ? (
          <EmptyState title="Tidak ada data" description="Tidak ada karyawan yang cocok dengan filter." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Karyawan</th><th>Divisi</th><th>Masuk</th><th>Pulang</th><th>Durasi</th><th>Status</th><th>Lokasi</th><th className="ta-right">Aksi</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id}>
                    <td data-label="Karyawan"><div className="person"><Avatar name={r.name} size={34} /><div><strong>{r.name}</strong><small>NIK {r.nik}</small></div></div></td>
                    <td data-label="Divisi"><span>{r.department ?? '—'}</span><small>{r.shift_name ?? ''}</small></td>
                    <td data-label="Masuk">{hm(r.check_in_at)}</td>
                    <td data-label="Pulang">{hm(r.check_out_at)}</td>
                    <td data-label="Durasi">{r.check_in_at && !r.check_out_at ? 'Berjalan' : duration(r.check_in_at, r.check_out_at)}</td>
                    <td data-label="Status">{r.status ? <StatusBadge status={r.status} /> : <StatusBadge status="belum" />}{Number(r.late_minutes) > 0 && <small>{r.late_minutes} mnt</small>}</td>
                    <td data-label="Lokasi">{r.location_name ? <><span>{r.location_name}</span><small>{r.check_in_distance_m} m dari titik</small></> : r.note ? <small>{r.note}</small> : '—'}</td>
                    <td data-label="Aksi" className="ta-right">
                      <div className="row-actions">
                        {r.id && Boolean(r.has_in_photo) && <button className="icon-btn" title="Foto masuk" aria-label={`Foto masuk ${r.name}`} onClick={() => setPhoto({ id: r.id!, kind: 'in', name: r.name })}><ImageIcon size={16} /></button>}
                        {r.id && Boolean(r.has_out_photo) && <button className="icon-btn" title="Foto pulang" aria-label={`Foto pulang ${r.name}`} onClick={() => setPhoto({ id: r.id!, kind: 'out', name: r.name })}><ImageIcon size={16} className="flip" /></button>}
                        <button className="icon-btn" title="Koreksi" aria-label={`Koreksi absensi ${r.name}`} onClick={() => setEditing(r)}><Pencil size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CorrectionForm row={editing} date={date} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); toast('Koreksi absensi tersimpan.'); load() }} />

      <Modal open={photo !== null} onClose={() => setPhoto(null)} title={photo?.kind === 'out' ? 'Foto check-out' : 'Foto check-in'} subtitle={photo?.name} size="sm">
        {photo && <img className="photo-preview" src={`/api/attendance/${photo.id}/photo?kind=${photo.kind}`} alt={`Foto verifikasi ${photo.name}`} />}
      </Modal>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Ekspor rekap bulanan" subtitle="FILE CSV (EXCEL)" size="sm"
        footer={<><Button variant="secondary" onClick={() => setExportOpen(false)}>Batal</Button><a className="btn btn-primary" href={`/api/admin/attendance/export?month=${exportMonth}`} onClick={() => setExportOpen(false)}><Download size={16} /> Unduh</a></>}>
        <Field label="Bulan" htmlFor="exp-month"><input id="exp-month" className="input" type="month" value={exportMonth} max={currentMonth()} onChange={(e) => setExportMonth(e.target.value)} /></Field>
      </Modal>
    </div>
  )
}

function CorrectionForm({ row, date, onClose, onSaved }: { row: Row | null; date: string; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState('hadir')
  const [inTime, setInTime] = useState('')
  const [outTime, setOutTime] = useState('')
  const [late, setLate] = useState('0')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!row) return
    setStatus(row.status ?? 'hadir')
    setInTime(row.check_in_at ? row.check_in_at.slice(11, 16) : '')
    setOutTime(row.check_out_at ? row.check_out_at.slice(11, 16) : '')
    setLate(String(row.late_minutes ?? 0))
    setNote('')
    setError('')
  }, [row])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!row) return
    setLoading(true)
    setError('')
    try {
      await api('/api/admin/attendance', { method: 'POST', body: {
        user_id: row.user_id, work_date: date, status, check_in_time: inTime, check_out_time: outTime, late_minutes: Number(late) || 0, note,
      } })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={row !== null} onClose={onClose} title="Koreksi absensi" subtitle={row ? `${row.name} · ${longDate(date)}` : ''}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="corr-form" loading={loading}>Simpan koreksi</Button></>}>
      <form id="corr-form" className="form-stack" onSubmit={submit}>
        <Field label="Status" htmlFor="c-status">
          <select id="c-status" className="input select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['hadir', 'terlambat', 'izin', 'sakit', 'cuti', 'alpha'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        {(status === 'hadir' || status === 'terlambat') && (
          <div className="form-row form-row-3">
            <Field label="Jam masuk" htmlFor="c-in"><input id="c-in" className="input" type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} /></Field>
            <Field label="Jam pulang" htmlFor="c-out"><input id="c-out" className="input" type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} /></Field>
            {status === 'terlambat' && <Field label="Terlambat (menit)" htmlFor="c-late"><input id="c-late" className="input" type="number" min={0} max={1440} value={late} onChange={(e) => setLate(e.target.value)} /></Field>}
          </div>
        )}
        <Field label="Alasan koreksi" htmlFor="c-note" hint="Wajib diisi. Tercatat di log aktivitas.">
          <input id="c-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} required minLength={3} maxLength={255} placeholder="cth. Lupa check-out, dikonfirmasi atasan" />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
      </form>
    </Modal>
  )
}
