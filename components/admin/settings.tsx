'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Building2, Clock3, Crosshair, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { dateTime } from '@/lib/format'
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, Modal, PageHeader, Skeleton, Tabs, useToast } from '../ui'
import { useOptions, type Department, type Shift } from './use-options'

type Location = { id: number; name: string; address: string | null; latitude: number; longitude: number; radius_m: number; is_active: number }
type Log = { id: number; action: string; entity: string | null; entity_id: number | null; ip: string | null; created_at: string; user_name: string | null; nik: string | null }

const ACTION_LABEL: Record<string, string> = {
  login: 'Login', check_in: 'Check-in', check_out: 'Check-out', change_password: 'Ganti kata sandi', profile_update: 'Ubah profil',
  leave_create: 'Buat pengajuan', leave_cancel: 'Batalkan pengajuan', leave_approve: 'Setujui pengajuan', leave_reject: 'Tolak pengajuan',
  employee_create: 'Tambah karyawan', employee_update: 'Ubah karyawan', employee_delete: 'Hapus karyawan', employee_deactivate: 'Nonaktifkan karyawan',
  password_reset: 'Reset kata sandi', attendance_correct: 'Koreksi absensi', attendance_export: 'Ekspor rekap',
  location_create: 'Tambah lokasi', location_update: 'Ubah lokasi', location_delete: 'Hapus lokasi',
  shift_create: 'Tambah shift', shift_update: 'Ubah shift', shift_delete: 'Hapus shift',
  department_create: 'Tambah divisi', department_update: 'Ubah divisi', department_delete: 'Hapus divisi',
}

type Tab = 'lokasi' | 'shift' | 'divisi' | 'log'

export function AdminSettings() {
  const [tab, setTab] = useState<Tab>('lokasi')
  return (
    <div className="page">
      <PageHeader eyebrow="KONFIGURASI" title="Pengaturan" description="Atur titik lokasi absensi, jadwal shift, divisi, dan pantau log aktivitas sistem." />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'lokasi', label: 'Lokasi kantor' }, { value: 'shift', label: 'Shift kerja' }, { value: 'divisi', label: 'Divisi' }, { value: 'log', label: 'Log aktivitas' }]} />
      {tab === 'lokasi' && <LocationsTab />}
      {tab === 'shift' && <ShiftsTab />}
      {tab === 'divisi' && <DepartmentsTab />}
      {tab === 'log' && <LogsTab />}
    </div>
  )
}

/* ---------------- Lokasi ---------------- */
function LocationsTab() {
  const toast = useToast()
  const [rows, setRows] = useState<Location[] | null>(null)
  const [editing, setEditing] = useState<Location | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Location | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => api<Location[]>('/api/admin/locations').then(setRows).catch((e) => toast(errorMessage(e), 'danger')), [toast])
  useEffect(() => { load() }, [load])

  return (
    <>
      <Card title="Titik lokasi absensi" subtitle="GEOFENCE" actions={<Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>Tambah lokasi</Button>} flush>
        {!rows ? <div className="pad"><Skeleton rows={3} /></div> : rows.length === 0 ? (
          <EmptyState icon={<MapPin size={22} />} title="Belum ada lokasi" description="Tambahkan minimal satu lokasi kantor agar karyawan dapat check-in." />
        ) : (
          <ul className="setting-list">
            {rows.map((l) => (
              <li key={l.id}>
                <span className="setting-icon"><MapPin size={18} /></span>
                <div className="setting-main">
                  <strong>{l.name} {!l.is_active && <span className="badge tone-neutral"><i />Nonaktif</span>}</strong>
                  <small>{l.address || 'Tanpa alamat'} · {Number(l.latitude).toFixed(6)}, {Number(l.longitude).toFixed(6)} · radius {l.radius_m} m</small>
                </div>
                <div className="row-actions">
                  <a className="icon-btn" href={`https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`} target="_blank" rel="noopener noreferrer" title="Buka di peta" aria-label={`Buka ${l.name} di peta`}><Crosshair size={16} /></a>
                  <button className="icon-btn" onClick={() => setEditing(l)} aria-label={`Ubah ${l.name}`}><Pencil size={16} /></button>
                  <button className="icon-btn danger" onClick={() => setDeleting(l)} aria-label={`Hapus ${l.name}`}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <LocationForm value={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); toast('Lokasi tersimpan.'); load() }} />
      <ConfirmDialog open={deleting !== null} title="Hapus lokasi?" message={`Lokasi "${deleting?.name}" akan dihapus. Riwayat absensi tetap tersimpan.`} confirmLabel="Hapus" loading={busy} onClose={() => setDeleting(null)}
        onConfirm={async () => { setBusy(true); try { await api(`/api/admin/locations/${deleting!.id}`, { method: 'DELETE' }); toast('Lokasi dihapus.'); setDeleting(null); load() } catch (e) { toast(errorMessage(e), 'danger') } finally { setBusy(false) } }} />
    </>
  )
}

function LocationForm({ value, onClose, onSaved }: { value: Location | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const loc = value && value !== 'new' ? value : null
  const [f, setF] = useState({ name: '', address: '', latitude: '', longitude: '', radius_m: '150', is_active: true })
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!value) return
    setError('')
    setF({ name: loc?.name ?? 'Kantor PT Pandawa Amerta Packindo', address: loc?.address ?? '', latitude: loc ? String(loc.latitude) : '', longitude: loc ? String(loc.longitude) : '', radius_m: String(loc?.radius_m ?? 150), is_active: loc ? Boolean(loc.is_active) : true })
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const useMine = () => {
    if (!navigator.geolocation) { setError('Perangkat tidak mendukung GPS.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((x) => ({ ...x, latitude: p.coords.latitude.toFixed(7), longitude: p.coords.longitude.toFixed(7) })); setLocating(false) },
      () => { setError('Tidak dapat membaca lokasi. Izinkan akses lokasi.'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  // Terima tempelan "lat, lng" dari Google Maps
  const pasteCoords = (text: string) => {
    const m = text.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
    if (m) { setF((x) => ({ ...x, latitude: m[1], longitude: m[2] })); return true }
    return false
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const body = { name: f.name, address: f.address, latitude: Number(f.latitude), longitude: Number(f.longitude), radius_m: Number(f.radius_m), is_active: f.is_active }
    try {
      if (loc) await api(`/api/admin/locations/${loc.id}`, { method: 'PATCH', body })
      else await api('/api/admin/locations', { method: 'POST', body })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={value !== null} onClose={onClose} title={loc ? 'Ubah lokasi' : 'Tambah lokasi'} subtitle="TITIK ABSENSI"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="loc-form" loading={loading}>Simpan lokasi</Button></>}>
      <form id="loc-form" className="form-stack" onSubmit={submit}>
        <Field label="Nama lokasi" htmlFor="l-name"><input id="l-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Alamat (opsional)" htmlFor="l-addr"><input id="l-addr" className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <div className="form-row">
          <Field label="Latitude" htmlFor="l-lat"><input id="l-lat" className="input" inputMode="decimal" value={f.latitude} onChange={(e) => { if (!pasteCoords(e.target.value)) setF({ ...f, latitude: e.target.value }) }} required placeholder="-6.2xxxxx" /></Field>
          <Field label="Longitude" htmlFor="l-lng"><input id="l-lng" className="input" inputMode="decimal" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} required placeholder="106.8xxxxx" /></Field>
        </div>
        <Button type="button" variant="secondary" icon={<Crosshair size={16} />} loading={locating} onClick={useMine}>Gunakan lokasi saya saat ini</Button>
        <p className="fine-print" style={{ marginTop: -6 }}>Tip: salin koordinat dari Google Maps (klik kanan → koordinat) lalu tempel ke kolom Latitude.</p>
        <Field label={`Radius absensi: ${f.radius_m} m`} htmlFor="l-rad" hint="Karyawan hanya bisa absen di dalam radius ini. Disarankan 100–300 m.">
          <input id="l-rad" type="range" min={20} max={1000} step={10} value={f.radius_m} onChange={(e) => setF({ ...f, radius_m: e.target.value })} className="range" />
        </Field>
        <label className="switch"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /><span /> Lokasi aktif</label>
        {error && <Alert tone="danger">{error}</Alert>}
      </form>
    </Modal>
  )
}

/* ---------------- Shift ---------------- */
function ShiftsTab() {
  const toast = useToast()
  const { shifts, reload } = useOptions()
  const [editing, setEditing] = useState<Shift | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Shift | null>(null)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ name: '', start_time: '08:00', end_time: '17:00', late_tolerance_minutes: '5' })
  const [error, setError] = useState('')
  const sh = editing && editing !== 'new' ? editing : null

  useEffect(() => {
    if (!editing) return
    setError('')
    setF(sh ? { name: sh.name, start_time: sh.start_time.slice(0, 5), end_time: sh.end_time.slice(0, 5), late_tolerance_minutes: String(sh.late_tolerance_minutes) } : { name: '', start_time: '08:00', end_time: '17:00', late_tolerance_minutes: '5' })
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const body = { ...f, late_tolerance_minutes: Number(f.late_tolerance_minutes) }
    try {
      if (sh) await api(`/api/admin/shifts/${sh.id}`, { method: 'PATCH', body })
      else await api('/api/admin/shifts', { method: 'POST', body })
      toast('Shift tersimpan.')
      setEditing(null)
      reload()
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <>
      <Card title="Jadwal shift" subtitle="JAM KERJA" actions={<Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>Tambah shift</Button>} flush>
        {shifts.length === 0 ? <div className="pad"><Skeleton rows={3} /></div> : (
          <ul className="setting-list">
            {shifts.map((s) => (
              <li key={s.id}>
                <span className="setting-icon"><Clock3 size={18} /></span>
                <div className="setting-main"><strong>{s.name}</strong><small>{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)} · toleransi {s.late_tolerance_minutes} menit · {s.members} karyawan</small></div>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => setEditing(s)} aria-label={`Ubah ${s.name}`}><Pencil size={16} /></button>
                  <button className="icon-btn danger" onClick={() => setDeleting(s)} aria-label={`Hapus ${s.name}`}><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={sh ? 'Ubah shift' : 'Tambah shift'} subtitle="JADWAL" size="sm"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" form="shift-form" loading={busy}>Simpan</Button></>}>
        <form id="shift-form" className="form-stack" onSubmit={save}>
          <Field label="Nama shift" htmlFor="s-name"><input id="s-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <div className="form-row">
            <Field label="Jam masuk" htmlFor="s-start"><input id="s-start" className="input" type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} required /></Field>
            <Field label="Jam pulang" htmlFor="s-end"><input id="s-end" className="input" type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} required /></Field>
          </div>
          <Field label="Toleransi terlambat (menit)" htmlFor="s-tol"><input id="s-tol" className="input" type="number" min={0} max={240} value={f.late_tolerance_minutes} onChange={(e) => setF({ ...f, late_tolerance_minutes: e.target.value })} required /></Field>
          {error && <Alert tone="danger">{error}</Alert>}
        </form>
      </Modal>
      <ConfirmDialog open={deleting !== null} title="Hapus shift?" message={`Karyawan pada "${deleting?.name}" akan memakai shift default.`} confirmLabel="Hapus" loading={busy} onClose={() => setDeleting(null)}
        onConfirm={async () => { setBusy(true); try { await api(`/api/admin/shifts/${deleting!.id}`, { method: 'DELETE' }); toast('Shift dihapus.'); setDeleting(null); reload() } catch (e) { toast(errorMessage(e), 'danger') } finally { setBusy(false) } }} />
    </>
  )
}

/* ---------------- Divisi ---------------- */
function DepartmentsTab() {
  const toast = useToast()
  const { departments, reload } = useOptions()
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<Department | null>(null)
  const [busy, setBusy] = useState(false)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try { await api('/api/admin/departments', { method: 'POST', body: { name } }); setName(''); toast('Divisi ditambahkan.'); reload() } catch (err) { toast(errorMessage(err), 'danger') } finally { setAdding(false) }
  }

  return (
    <>
      <Card title="Daftar divisi" subtitle="STRUKTUR ORGANISASI" flush>
        <form className="toolbar" onSubmit={add}>
          <input className="input" placeholder="Nama divisi baru" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} aria-label="Nama divisi baru" />
          <Button type="submit" icon={<Plus size={16} />} loading={adding}>Tambah</Button>
        </form>
        <ul className="setting-list">
          {departments.map((d) => (
            <li key={d.id}>
              <span className="setting-icon"><Building2 size={18} /></span>
              <div className="setting-main"><strong>{d.name}</strong><small>{d.members} karyawan aktif</small></div>
              <div className="row-actions">
                <button className="icon-btn" onClick={() => { setEditing(d); setEditName(d.name) }} aria-label={`Ubah ${d.name}`}><Pencil size={16} /></button>
                <button className="icon-btn danger" onClick={() => setDeleting(d)} aria-label={`Hapus ${d.name}`}><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Ubah divisi" size="sm"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Batal</Button><Button loading={busy} onClick={async () => { setBusy(true); try { await api(`/api/admin/departments/${editing!.id}`, { method: 'PATCH', body: { name: editName } }); toast('Divisi diperbarui.'); setEditing(null); reload() } catch (e) { toast(errorMessage(e), 'danger') } finally { setBusy(false) } }}>Simpan</Button></>}>
        <Field label="Nama divisi" htmlFor="d-name"><input id="d-name" className="input" value={editName} onChange={(e) => setEditName(e.target.value)} /></Field>
      </Modal>
      <ConfirmDialog open={deleting !== null} title="Hapus divisi?" message={`Karyawan di divisi "${deleting?.name}" akan menjadi tanpa divisi.`} confirmLabel="Hapus" loading={busy} onClose={() => setDeleting(null)}
        onConfirm={async () => { setBusy(true); try { await api(`/api/admin/departments/${deleting!.id}`, { method: 'DELETE' }); toast('Divisi dihapus.'); setDeleting(null); reload() } catch (e) { toast(errorMessage(e), 'danger') } finally { setBusy(false) } }} />
    </>
  )
}

/* ---------------- Log ---------------- */
function LogsTab() {
  const [rows, setRows] = useState<Log[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<Log[]>('/api/admin/audit-logs').then(setRows).catch((e) => setError(errorMessage(e))) }, [])
  return (
    <Card title="Log aktivitas" subtitle="200 AKTIVITAS TERAKHIR" flush>
      {error && <div className="pad"><Alert tone="danger">{error}</Alert></div>}
      {!rows ? <div className="pad"><Skeleton rows={6} /></div> : rows.length === 0 ? <EmptyState title="Belum ada aktivitas" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Objek</th><th>IP</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Waktu">{dateTime(r.created_at)}</td>
                  <td data-label="Pengguna"><span>{r.user_name ?? 'Sistem'}</span>{r.nik && <small>NIK {r.nik}</small>}</td>
                  <td data-label="Aktivitas">{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td data-label="Objek">{r.entity ? `${r.entity} #${r.entity_id ?? ''}` : '—'}</td>
                  <td data-label="IP"><code className="mono">{r.ip ?? '—'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
