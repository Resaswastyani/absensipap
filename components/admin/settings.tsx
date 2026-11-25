'use client'

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Building2, Clock3, Crosshair, ExternalLink, MapPin, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { dateTime } from '@/lib/format'
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Field, Modal, PageHeader, Skeleton, Tabs, useToast } from '../kit'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Label, Switch } from '../ui/misc'
import { useOptions, type Department, type Shift } from './use-options'

type Location = { id: number; name: string; address: string | null; latitude: number; longitude: number; radius_m: number; is_active: number }
type Log = { id: number; action: string; entity: string | null; entity_id: number | null; ip: string | null; created_at: string; user_name: string | null; nik: string | null }

const ACTION_LABEL: Record<string, string> = {
  login: 'Login', check_in: 'Check-in', check_out: 'Check-out', change_password: 'Ganti kata sandi', profile_update: 'Ubah profil',
  leave_create: 'Buat pengajuan', leave_cancel: 'Batalkan pengajuan', leave_approve: 'Setujui pengajuan', leave_reject: 'Tolak pengajuan',
  employee_create: 'Tambah karyawan', employee_update: 'Ubah karyawan', employee_delete: 'Hapus karyawan', employee_deactivate: 'Nonaktifkan karyawan',
  password_reset: 'Atur kata sandi', attendance_correct: 'Koreksi absensi', attendance_export: 'Ekspor rekap',
  location_create: 'Tambah lokasi', location_update: 'Ubah lokasi', location_delete: 'Hapus lokasi',
  shift_create: 'Tambah shift', shift_update: 'Ubah shift', shift_delete: 'Hapus shift',
  department_create: 'Tambah divisi', department_update: 'Ubah divisi', department_delete: 'Hapus divisi',
}

type Tab = 'lokasi' | 'shift' | 'divisi' | 'log'

export function AdminSettings() {
  const [tab, setTab] = useState<Tab>('lokasi')
  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title="Pengaturan" description="Lokasi absensi, jadwal shift, divisi, dan log aktivitas sistem." />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'lokasi', label: 'Lokasi' }, { value: 'shift', label: 'Shift' }, { value: 'divisi', label: 'Divisi' }, { value: 'log', label: 'Log aktivitas' }]} />
      {tab === 'lokasi' && <LocationsTab />}
      {tab === 'shift' && <ShiftsTab />}
      {tab === 'divisi' && <DepartmentsTab />}
      {tab === 'log' && <LogsTab />}
    </div>
  )
}

/* ---------- Komponen daftar ---------- */
function ListRow({ icon, title, meta, menu }: { icon: ReactNode; title: ReactNode; meta: ReactNode; menu: ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5 sm:gap-4 sm:px-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:size-[18px]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">{title}</div>
        <p className="mt-0.5 text-[13px] break-words text-muted-foreground">{meta}</p>
      </div>
      {menu}
    </li>
  )
}

function RowActions({ label, onEdit, onDelete, extra }: { label: string; onEdit: () => void; onDelete: () => void; extra?: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${label}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {extra}
        <DropdownMenuItem onSelect={onEdit}><Pencil /> Ubah</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 /> Hapus</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
      <Card title="Titik lokasi absensi" description="Karyawan hanya dapat absen di dalam radius lokasi aktif." flush actions={<Button size="sm" icon={<Plus />} onClick={() => setEditing('new')}>Tambah</Button>}>
        {!rows ? <div className="p-5"><Skeleton rows={3} /></div> : rows.length === 0 ? (
          <EmptyState icon={<MapPin />} title="Belum ada lokasi" description="Tambahkan minimal satu lokasi kantor agar karyawan dapat check-in." />
        ) : (
          <ul className="divide-y">
            {rows.map((l) => (
              <ListRow key={l.id} icon={<MapPin />}
                title={<>{l.name}{!l.is_active && <Badge tone="neutral">Nonaktif</Badge>}</>}
                meta={<>{l.address ? `${l.address} · ` : ''}{Number(l.latitude).toFixed(6)}, {Number(l.longitude).toFixed(6)} · radius {l.radius_m} m</>}
                menu={<RowActions label={l.name} onEdit={() => setEditing(l)} onDelete={() => setDeleting(l)}
                  extra={<DropdownMenuItem asChild><a href={`https://www.google.com/maps/search/?api=1&query=${l.latitude},${l.longitude}`} target="_blank" rel="noopener noreferrer"><ExternalLink /> Buka di peta</a></DropdownMenuItem>} />}
              />
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
    <Modal open={value !== null} onClose={onClose} title={loc ? 'Ubah lokasi' : 'Tambah lokasi'} description="Titik dan radius tempat karyawan dapat absen."
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="loc-form" loading={loading}>Simpan lokasi</Button></>}>
      <form id="loc-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Nama lokasi" htmlFor="l-name" className="sm:col-span-2"><Input id="l-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Alamat" htmlFor="l-addr" hint="Opsional." className="sm:col-span-2"><Input id="l-addr" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <Field label="Latitude" htmlFor="l-lat"><Input id="l-lat" inputMode="decimal" value={f.latitude} onChange={(e) => { if (!pasteCoords(e.target.value)) setF({ ...f, latitude: e.target.value }) }} required placeholder="-7.54108" /></Field>
        <Field label="Longitude" htmlFor="l-lng"><Input id="l-lng" inputMode="decimal" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} required placeholder="110.73653" /></Field>
        <div className="grid gap-1.5 sm:col-span-2">
          <Button type="button" variant="secondary" icon={<Crosshair />} loading={locating} onClick={useMine}>Gunakan lokasi saya saat ini</Button>
          <p className="text-[13px] text-muted-foreground">Atau salin koordinat dari Google Maps lalu tempel ke kolom Latitude.</p>
        </div>
        <Field label={`Radius absensi: ${f.radius_m} m`} htmlFor="l-rad" hint="Disarankan 100–300 m." className="sm:col-span-2">
          <input id="l-rad" type="range" min={20} max={1000} step={10} value={f.radius_m} onChange={(e) => setF({ ...f, radius_m: e.target.value })} className="w-full accent-primary" />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5 sm:col-span-2">
          <Label htmlFor="l-active">Lokasi aktif</Label>
          <Switch id="l-active" checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
        </div>
        {error && <div className="sm:col-span-2"><Alert tone="danger">{error}</Alert></div>}
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
  const [f, setF] = useState({ name: '', start_time: '08:00', end_time: '17:00', late_tolerance_minutes: '5', is_default: false })
  const [error, setError] = useState('')
  const sh = editing && editing !== 'new' ? editing : null

  useEffect(() => {
    if (!editing) return
    setError('')
    setF(sh ? { name: sh.name, start_time: sh.start_time.slice(0, 5), end_time: sh.end_time.slice(0, 5), late_tolerance_minutes: String(sh.late_tolerance_minutes), is_default: Boolean(sh.is_default) } : { name: '', start_time: '08:00', end_time: '17:00', late_tolerance_minutes: '5', is_default: false })
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
      <Card title="Jadwal shift" description="Jam kerja dan toleransi keterlambatan." flush actions={<Button size="sm" icon={<Plus />} onClick={() => setEditing('new')}>Tambah</Button>}>
        {shifts.length === 0 ? <div className="p-5"><Skeleton rows={3} /></div> : (
          <ul className="divide-y">
            {shifts.map((s) => (
              <ListRow key={s.id} icon={<Clock3 />}
                title={<>{s.name}{Boolean(s.is_default) && <Badge tone="primary" dot={false}>Default</Badge>}</>}
                meta={`${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} · toleransi ${s.late_tolerance_minutes} menit · ${s.members} orang`}
                menu={<RowActions label={s.name} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />}
              />
            ))}
          </ul>
        )}
      </Card>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={sh ? 'Ubah shift' : 'Tambah shift'} size="sm"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" form="shift-form" loading={busy}>Simpan</Button></>}>
        <form id="shift-form" className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
          <Field label="Nama shift" htmlFor="s-name" className="sm:col-span-2"><Input id="s-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <Field label="Jam masuk" htmlFor="s-start"><Input id="s-start" type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} required /></Field>
          <Field label="Jam pulang" htmlFor="s-end"><Input id="s-end" type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} required /></Field>
          <Field label="Toleransi terlambat (menit)" htmlFor="s-tol" className="sm:col-span-2"><Input id="s-tol" type="number" min={0} max={240} value={f.late_tolerance_minutes} onChange={(e) => setF({ ...f, late_tolerance_minutes: e.target.value })} required /></Field>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3.5 sm:col-span-2">
            <div>
              <Label htmlFor="s-default">Jadikan shift default</Label>
              <p className="mt-1 text-[13px] text-muted-foreground">Dipakai karyawan yang tidak punya shift khusus.</p>
            </div>
            <Switch id="s-default" checked={f.is_default} onCheckedChange={(v) => setF({ ...f, is_default: v })} />
          </div>
          {error && <div className="sm:col-span-2"><Alert tone="danger">{error}</Alert></div>}
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
      <Card title="Daftar divisi" description="Struktur organisasi untuk pengelompokan karyawan." flush>
        <form className="flex flex-col gap-2 border-b p-4 sm:flex-row" onSubmit={add}>
          <Input placeholder="Nama divisi baru" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} aria-label="Nama divisi baru" />
          <Button type="submit" icon={<Plus />} loading={adding}>Tambah</Button>
        </form>
        <ul className="divide-y">
          {departments.map((d) => (
            <ListRow key={d.id} icon={<Building2 />} title={d.name} meta={`${d.members} karyawan aktif`}
              menu={<RowActions label={d.name} onEdit={() => { setEditing(d); setEditName(d.name) }} onDelete={() => setDeleting(d)} />} />
          ))}
        </ul>
      </Card>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Ubah divisi" size="sm"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Batal</Button><Button loading={busy} onClick={async () => { setBusy(true); try { await api(`/api/admin/departments/${editing!.id}`, { method: 'PATCH', body: { name: editName } }); toast('Divisi diperbarui.'); setEditing(null); reload() } catch (e) { toast(errorMessage(e), 'danger') } finally { setBusy(false) } }}>Simpan</Button></>}>
        <Field label="Nama divisi" htmlFor="d-name"><Input id="d-name" value={editName} onChange={(e) => setEditName(e.target.value)} /></Field>
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
    <Card title="Log aktivitas" description="200 aktivitas terakhir di sistem." flush>
      {error && <div className="p-4"><Alert tone="danger">{error}</Alert></div>}
      {!rows ? <div className="p-5"><Skeleton rows={6} /></div> : rows.length === 0 ? <EmptyState title="Belum ada aktivitas" /> : (
        <div className="w-full overflow-x-auto">
          <table className="rtable">
            <thead><tr><th>Aktivitas</th><th>Pengguna</th><th>Objek</th><th>IP</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-primary><span className="font-medium">{ACTION_LABEL[r.action] ?? r.action}</span><span className="sub">{dateTime(r.created_at)}</span></td>
                  <td data-label="Pengguna">{r.user_name ?? 'Sistem'}</td>
                  <td data-label="Objek" className="text-muted-foreground">{r.entity ? `${r.entity} #${r.entity_id ?? ''}` : '—'}</td>
                  <td data-label="IP"><code className="font-mono text-xs">{r.ip ?? '—'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
