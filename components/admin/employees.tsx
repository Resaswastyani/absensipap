'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Copy, KeyRound, Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { dateTime } from '@/lib/format'
import { Alert, Avatar, Button, Card, ConfirmDialog, EmptyState, Field, Modal, PageHeader, Skeleton, useToast } from '../ui'
import { useOptions, type Department, type Shift } from './use-options'

type Employee = {
  id: number; nik: string; name: string; email: string | null; role: 'admin' | 'employee'; position: string | null; phone: string | null
  is_active: number; must_change_password: number; department_id: number | null; department: string | null; shift_id: number | null; shift_name: string | null
  last_login_at: string | null
}

export function AdminEmployees() {
  const toast = useToast()
  const { departments, shifts } = useOptions()
  const [rows, setRows] = useState<Employee[] | null>(null)
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [status, setStatus] = useState('active')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Employee | 'new' | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'reset' | 'delete' | 'toggle'; emp: Employee } | null>(null)
  const [busy, setBusy] = useState(false)
  const [tempPassword, setTempPassword] = useState<{ name: string; nik: string; password: string } | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ q, status })
    if (dept) params.set('department', dept)
    if (role) params.set('role', role)
    try { setRows(await api<Employee[]>(`/api/admin/employees?${params}`)); setError('') } catch (e) { setError(errorMessage(e)) }
  }, [q, dept, status, role])

  useEffect(() => { const t = window.setTimeout(load, 250); return () => window.clearTimeout(t) }, [load])

  const runConfirm = async () => {
    if (!confirm) return
    setBusy(true)
    const { kind, emp } = confirm
    try {
      if (kind === 'reset') {
        const res = await api<{ temporaryPassword: string }>(`/api/admin/employees/${emp.id}/reset-password`, { method: 'POST' })
        setTempPassword({ name: emp.name, nik: emp.nik, password: res.temporaryPassword })
      } else if (kind === 'toggle') {
        await api(`/api/admin/employees/${emp.id}`, { method: 'PATCH', body: { is_active: !emp.is_active } })
        toast(emp.is_active ? 'Akun dinonaktifkan.' : 'Akun diaktifkan kembali.')
      } else {
        const res = await api<{ deleted: boolean }>(`/api/admin/employees/${emp.id}`, { method: 'DELETE' })
        toast(res.deleted ? 'Karyawan dihapus.' : 'Karyawan memiliki riwayat absensi, akun dinonaktifkan.')
      }
      setConfirm(null)
      load()
    } catch (e) {
      toast(errorMessage(e), 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="DATA MASTER" title="Karyawan" description="Kelola akun karyawan dan admin, divisi, shift, serta akses login."
        actions={<Button icon={<Plus size={16} />} onClick={() => setEditing('new')}>Tambah karyawan</Button>} />

      <Card flush>
        <div className="toolbar">
          <label className="search"><Search size={16} /><input aria-label="Cari karyawan" placeholder="Cari nama, NIK, email, jabatan" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <select className="input select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter divisi">
            <option value="">Semua divisi</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter peran">
            <option value="">Semua peran</option><option value="employee">Karyawan</option><option value="admin">Admin</option>
          </select>
          <select className="input select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
            <option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="">Semua status</option>
          </select>
        </div>
        {error && <div className="pad"><Alert tone="danger">{error}</Alert></div>}
        {!rows ? <div className="pad"><Skeleton rows={6} /></div> : rows.length === 0 ? (
          <EmptyState title="Tidak ada data" description="Belum ada karyawan yang cocok dengan filter." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Karyawan</th><th>Divisi &amp; jabatan</th><th>Shift</th><th>Peran</th><th>Status</th><th>Login terakhir</th><th className="ta-right">Aksi</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.is_active ? '' : 'row-muted'}>
                    <td data-label="Karyawan"><div className="person"><Avatar name={r.name} size={34} /><div><strong>{r.name}</strong><small>NIK {r.nik}{r.email ? ` · ${r.email}` : ''}</small></div></div></td>
                    <td data-label="Divisi"><span>{r.department ?? '—'}</span><small>{r.position ?? ''}</small></td>
                    <td data-label="Shift">{r.shift_name ?? <span className="muted-text">Default</span>}</td>
                    <td data-label="Peran"><span className={`role-chip role-${r.role}`}>{r.role === 'admin' ? 'Admin' : 'Karyawan'}</span></td>
                    <td data-label="Status">{r.is_active ? <span className="badge tone-success"><i />Aktif</span> : <span className="badge tone-neutral"><i />Nonaktif</span>}{r.must_change_password ? <small>Wajib ganti sandi</small> : null}</td>
                    <td data-label="Login terakhir">{r.last_login_at ? dateTime(r.last_login_at) : <span className="muted-text">Belum pernah</span>}</td>
                    <td data-label="Aksi" className="ta-right">
                      <div className="row-actions">
                        <button className="icon-btn" title="Ubah" aria-label={`Ubah ${r.name}`} onClick={() => setEditing(r)}><Pencil size={16} /></button>
                        <button className="icon-btn" title="Reset kata sandi" aria-label={`Reset kata sandi ${r.name}`} onClick={() => setConfirm({ kind: 'reset', emp: r })}><KeyRound size={16} /></button>
                        <button className="icon-btn" title={r.is_active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={r.is_active ? `Nonaktifkan ${r.name}` : `Aktifkan ${r.name}`} onClick={() => setConfirm({ kind: 'toggle', emp: r })}>{r.is_active ? <UserX size={16} /> : <UserCheck size={16} />}</button>
                        <button className="icon-btn danger" title="Hapus" aria-label={`Hapus ${r.name}`} onClick={() => setConfirm({ kind: 'delete', emp: r })}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows && rows.length > 0 && <div className="table-foot">{rows.length} akun ditampilkan</div>}
      </Card>

      <EmployeeForm value={editing} departments={departments} shifts={shifts} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); toast(msg); load() }} />

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        loading={busy}
        onConfirm={runConfirm}
        tone={confirm?.kind === 'reset' ? 'primary' : 'danger'}
        title={confirm?.kind === 'reset' ? 'Reset kata sandi?' : confirm?.kind === 'toggle' ? (confirm.emp.is_active ? 'Nonaktifkan akun?' : 'Aktifkan akun?') : 'Hapus karyawan?'}
        confirmLabel={confirm?.kind === 'reset' ? 'Reset sekarang' : confirm?.kind === 'toggle' ? (confirm.emp.is_active ? 'Nonaktifkan' : 'Aktifkan') : 'Hapus'}
        message={confirm?.kind === 'reset'
          ? `Kata sandi sementara baru akan dibuat untuk ${confirm.emp.name}. Sesi login yang aktif akan dikeluarkan.`
          : confirm?.kind === 'toggle'
            ? confirm.emp.is_active ? `${confirm.emp.name} tidak akan bisa login sampai diaktifkan kembali.` : `${confirm.emp.name} akan dapat login kembali.`
            : `Data ${confirm?.emp.name} akan dihapus. Bila sudah memiliki riwayat absensi, akun hanya dinonaktifkan agar riwayat tetap tersimpan.`}
      />

      <Modal open={tempPassword !== null} onClose={() => setTempPassword(null)} title="Kata sandi sementara" subtitle="TAMPIL SEKALI" size="sm"
        footer={<Button onClick={() => setTempPassword(null)}>Selesai</Button>}>
        {tempPassword && (
          <div className="form-stack">
            <p className="muted-text" style={{ margin: 0 }}>Berikan kata sandi ini kepada <strong>{tempPassword.name}</strong> (NIK {tempPassword.nik}). Karyawan wajib menggantinya saat login pertama.</p>
            <div className="secret-box"><code>{tempPassword.password}</code><button className="icon-btn" aria-label="Salin" onClick={() => { navigator.clipboard?.writeText(tempPassword.password); toast('Disalin ke clipboard.', 'info') }}><Copy size={16} /></button></div>
            <Alert tone="warning">Kata sandi ini tidak akan ditampilkan lagi.</Alert>
          </div>
        )}
      </Modal>
    </div>
  )
}

function EmployeeForm({ value, departments, shifts, onClose, onSaved }: { value: Employee | 'new' | null; departments: Department[]; shifts: Shift[]; onClose: () => void; onSaved: (msg: string) => void }) {
  const isNew = value === 'new'
  const emp = value && value !== 'new' ? value : null
  const [form, setForm] = useState({ nik: '', name: '', email: '', role: 'employee', department_id: '', shift_id: '', position: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!value) return
    setError('')
    setForm({
      nik: emp?.nik ?? '', name: emp?.name ?? '', email: emp?.email ?? '', role: emp?.role ?? 'employee',
      department_id: emp?.department_id ? String(emp.department_id) : '', shift_id: emp?.shift_id ? String(emp.shift_id) : '',
      position: emp?.position ?? '', phone: emp?.phone ?? '', password: '',
    })
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const body: Record<string, unknown> = {
      nik: form.nik, name: form.name, email: form.email, role: form.role, position: form.position, phone: form.phone,
      department_id: form.department_id ? Number(form.department_id) : null, shift_id: form.shift_id ? Number(form.shift_id) : null,
    }
    try {
      if (isNew) {
        await api('/api/admin/employees', { method: 'POST', body: { ...body, password: form.password } })
        onSaved('Karyawan baru ditambahkan.')
      } else if (emp) {
        await api(`/api/admin/employees/${emp.id}`, { method: 'PATCH', body })
        onSaved('Data karyawan diperbarui.')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={value !== null} onClose={onClose} title={isNew ? 'Tambah karyawan' : 'Ubah data karyawan'} subtitle={isNew ? 'AKUN BARU' : emp?.name} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="emp-form" loading={loading}>{isNew ? 'Simpan karyawan' : 'Simpan perubahan'}</Button></>}>
      <form id="emp-form" className="form-stack" onSubmit={submit}>
        <div className="form-row">
          <Field label="NIK" htmlFor="f-nik"><input id="f-nik" className="input" value={form.nik} onChange={set('nik')} required maxLength={30} placeholder="cth. 2024001" /></Field>
          <Field label="Nama lengkap" htmlFor="f-name"><input id="f-name" className="input" value={form.name} onChange={set('name')} required maxLength={120} /></Field>
        </div>
        <div className="form-row">
          <Field label="Email (opsional)" htmlFor="f-email"><input id="f-email" className="input" type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="Telepon (opsional)" htmlFor="f-phone"><input id="f-phone" className="input" inputMode="tel" value={form.phone} onChange={set('phone')} /></Field>
        </div>
        <div className="form-row">
          <Field label="Divisi" htmlFor="f-dept">
            <select id="f-dept" className="input select" value={form.department_id} onChange={set('department_id')}>
              <option value="">— Pilih divisi —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Jabatan" htmlFor="f-pos"><input id="f-pos" className="input" value={form.position} onChange={set('position')} maxLength={100} placeholder="cth. Operator Produksi" /></Field>
        </div>
        <div className="form-row">
          <Field label="Shift kerja" htmlFor="f-shift">
            <select id="f-shift" className="input select" value={form.shift_id} onChange={set('shift_id')}>
              <option value="">Default (shift pertama)</option>
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})</option>)}
            </select>
          </Field>
          <Field label="Peran akses" htmlFor="f-role" hint={form.role === 'admin' ? 'Admin dapat mengelola seluruh data.' : 'Karyawan hanya dapat absen & melihat datanya sendiri.'}>
            <select id="f-role" className="input select" value={form.role} onChange={set('role')}>
              <option value="employee">Karyawan</option><option value="admin">Admin</option>
            </select>
          </Field>
        </div>
        {isNew && (
          <Field label="Kata sandi awal" htmlFor="f-pw" hint="Min. 8 karakter berisi huruf & angka. Karyawan wajib menggantinya saat login pertama.">
            <input id="f-pw" className="input" type="text" autoComplete="off" value={form.password} onChange={set('password')} required minLength={8} />
          </Field>
        )}
        {error && <Alert tone="danger">{error}</Alert>}
      </form>
    </Modal>
  )
}
