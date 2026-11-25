'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, Pencil, Search } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { currentMonth, duration, hm, longDate, STATUS_LABEL, todayLocal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Alert, Avatar, Button, Card, EmptyState, Field, Modal, PageHeader, Skeleton, StatusBadge, useToast } from '../kit'
import { Button as UIButton } from '../ui/button'
import { Input, NativeSelect } from '../ui/input'
import { Tip } from '../ui/misc'
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

  // Filter awal dari URL, mis. /admin/absensi?status=terlambat (dari kartu di dashboard)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status')
    if (s && ['hadir', 'terlambat', 'izin', 'belum'].includes(s)) setStatus(s)
  }, [])

  const load = useCallback(async () => {
    const p = new URLSearchParams({ date, q })
    if (dept) p.set('department', dept)
    try { setRows((await api<{ rows: Row[] }>(`/api/admin/attendance?${p}`)).rows); setError('') } catch (e) { setError(errorMessage(e)) }
  }, [date, q, dept])

  useEffect(() => { setRows(null); const t = window.setTimeout(load, 250); return () => window.clearTimeout(t) }, [load])

  const isLeave = (s: string | null) => s === 'izin' || s === 'sakit' || s === 'cuti'
  const filtered = rows?.filter((r) => !status || (status === 'belum' ? !r.status : status === 'izin' ? isLeave(r.status) : r.status === status))
  const count = (s: string) => rows?.filter((r) => (s === 'belum' ? !r.status : s === 'izin' ? isLeave(r.status) : r.status === s)).length ?? 0
  const chips = [
    { v: '', label: 'Semua', n: rows?.length ?? 0, dot: '' },
    { v: 'hadir', label: 'Hadir', n: count('hadir'), dot: 'bg-success' },
    { v: 'terlambat', label: 'Terlambat', n: count('terlambat'), dot: 'bg-warning' },
    { v: 'izin', label: 'Izin/sakit/cuti', n: count('izin'), dot: 'bg-info' },
    { v: 'belum', label: 'Belum hadir', n: count('belum'), dot: 'bg-muted-foreground' },
  ]

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title="Rekap absensi" description="Pantau kehadiran harian, lihat foto verifikasi, dan lakukan koreksi."
        actions={<Button variant="secondary" icon={<Download />} onClick={() => setExportOpen(true)}>Ekspor CSV</Button>} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-xs">
          <Button variant="ghost" size="icon-sm" aria-label="Hari sebelumnya" onClick={() => setDate(shift(date, -1))}><ChevronLeft /></Button>
          <Input type="date" className="h-8 w-[9.5rem] border-0 shadow-none focus-visible:ring-0" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Pilih tanggal" />
          <Button variant="ghost" size="icon-sm" aria-label="Hari berikutnya" disabled={date >= todayLocal()} onClick={() => setDate(shift(date, 1))}><ChevronRight /></Button>
        </div>
        <span className="text-sm font-medium">{longDate(date)}</span>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map((c) => (
          <button key={c.v || 'all'} onClick={() => setStatus(c.v)}
            className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-full border bg-card px-3.5 text-sm transition-colors hover:bg-accent', status === c.v && 'border-primary bg-primary/10 text-primary hover:bg-primary/10')}>
            {c.dot && <span className={cn('size-2 rounded-full', c.dot)} />}
            {c.label}
            <span className="tabular-nums font-semibold">{rows ? c.n : '–'}</span>
          </button>
        ))}
      </div>

      <Card flush>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Cari karyawan" placeholder="Cari nama atau NIK" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <NativeSelect value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter divisi">
            <option value="">Semua divisi</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </NativeSelect>
        </div>
        {error && <div className="p-4"><Alert tone="danger">{error}</Alert></div>}
        {!filtered ? <div className="p-5"><Skeleton rows={6} /></div> : filtered.length === 0 ? (
          <EmptyState title="Tidak ada data" description="Tidak ada karyawan yang cocok dengan filter." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="rtable">
              <thead><tr><th>Karyawan</th><th>Divisi</th><th>Masuk</th><th>Pulang</th><th data-wide>Durasi</th><th>Status</th><th data-wide>Lokasi</th><th className="text-right">Aksi</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.user_id}>
                    <td data-primary>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={r.name} size={34} />
                        <div className="min-w-0"><p className="truncate font-medium">{r.name}</p><p className="truncate text-xs text-muted-foreground">NIK {r.nik}</p></div>
                      </div>
                    </td>
                    <td data-label="Divisi"><span>{r.department ?? '—'}<span className="sub">{r.shift_name ?? ''}</span></span></td>
                    <td data-label="Masuk" className="tabular-nums">{hm(r.check_in_at)}</td>
                    <td data-label="Pulang" className="tabular-nums">{hm(r.check_out_at)}</td>
                    <td data-label="Durasi" data-wide className="tabular-nums">{r.check_in_at && !r.check_out_at ? 'Berjalan' : duration(r.check_in_at, r.check_out_at)}</td>
                    <td data-label="Status"><span className="inline-flex items-center gap-2">{r.status ? <StatusBadge status={r.status} /> : <StatusBadge status="belum" />}{Number(r.late_minutes) > 0 && <span className="text-xs text-muted-foreground">{r.late_minutes} mnt</span>}</span></td>
                    <td data-label="Lokasi" data-wide className="text-muted-foreground">{r.location_name ? <span className="inline-block max-w-56 truncate align-middle" title={r.location_name}>{r.location_name}<span className="sub">{r.check_in_distance_m} m dari titik</span></span> : r.note ?? '—'}</td>
                    <td data-label="Aksi" className="text-right">
                      <div className="inline-flex gap-0.5">
                        {r.id && Boolean(r.has_in_photo) && <Tip label="Foto masuk"><Button variant="ghost" size="icon-sm" aria-label={`Foto masuk ${r.name}`} onClick={() => setPhoto({ id: r.id!, kind: 'in', name: r.name })}><ImageIcon /></Button></Tip>}
                        {r.id && Boolean(r.has_out_photo) && <Tip label="Foto pulang"><Button variant="ghost" size="icon-sm" aria-label={`Foto pulang ${r.name}`} onClick={() => setPhoto({ id: r.id!, kind: 'out', name: r.name })}><ImageIcon className="-scale-x-100" /></Button></Tip>}
                        <Tip label="Koreksi"><Button variant="ghost" size="icon-sm" aria-label={`Koreksi absensi ${r.name}`} onClick={() => setEditing(r)}><Pencil /></Button></Tip>
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

      <Modal open={photo !== null} onClose={() => setPhoto(null)} title={photo?.kind === 'out' ? 'Foto check-out' : 'Foto check-in'} description={photo?.name} size="sm">
        {photo && <img className="aspect-square w-full rounded-lg bg-muted object-cover" src={`/api/attendance/${photo.id}/photo?kind=${photo.kind}`} alt={`Foto verifikasi ${photo.name}`} />}
      </Modal>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Ekspor rekap bulanan" description="File CSV, dapat dibuka di Excel." size="sm"
        footer={<><Button variant="secondary" onClick={() => setExportOpen(false)}>Batal</Button><UIButton asChild><a href={`/api/admin/attendance/export?month=${exportMonth}`} onClick={() => setExportOpen(false)}><Download /> Unduh</a></UIButton></>}>
        <Field label="Bulan" htmlFor="exp-month"><Input id="exp-month" type="month" value={exportMonth} max={currentMonth()} onChange={(e) => setExportMonth(e.target.value)} /></Field>
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

  const present = status === 'hadir' || status === 'terlambat'
  return (
    <Modal open={row !== null} onClose={onClose} title="Koreksi absensi" description={row ? `${row.name} · ${longDate(date)}` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="corr-form" loading={loading}>Simpan koreksi</Button></>}>
      <form id="corr-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Status" htmlFor="c-status" className="sm:col-span-2">
          <NativeSelect id="c-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['hadir', 'terlambat', 'izin', 'sakit', 'cuti', 'alpha'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </NativeSelect>
        </Field>
        {present && (
          <>
            <Field label="Jam masuk" htmlFor="c-in"><Input id="c-in" type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} /></Field>
            <Field label="Jam pulang" htmlFor="c-out"><Input id="c-out" type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} /></Field>
            {status === 'terlambat' && <Field label="Terlambat (menit)" htmlFor="c-late"><Input id="c-late" type="number" min={0} max={1440} value={late} onChange={(e) => setLate(e.target.value)} /></Field>}
          </>
        )}
        <Field label="Alasan koreksi" htmlFor="c-note" hint="Wajib diisi dan tercatat di log aktivitas." className="sm:col-span-2">
          <Input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} required minLength={3} maxLength={255} placeholder="cth. Lupa check-out, dikonfirmasi atasan" />
        </Field>
        {error && <div className="sm:col-span-2"><Alert tone="danger">{error}</Alert></div>}
      </form>
    </Modal>
  )
}
