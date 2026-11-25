'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Copy, KeyRound, MoreHorizontal, Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { dateTime } from '@/lib/format'
import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Field, Modal, PageHeader, Skeleton, useToast } from '../kit'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Input, NativeSelect } from '../ui/input'
import { Label, Switch } from '../ui/misc'
import { useOptions, type Department, type Shift } from './use-options'

type Employee = {
  id: number; nik: string; name: string; email: string | null; role: 'admin' | 'employee'; position: string | null; phone: string | null
  is_active: number; must_change_password: number; can_attend: number; department_id: number | null; department: string | null; shift_id: number | null; shift_name: string | null
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
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'toggle'; emp: Employee } | null>(null)
  const [busy, setBusy] = useState(false)
  const [pwTarget, setPwTarget] = useState<Employee | null>(null)
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
      if (kind === 'toggle') {
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
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title="Karyawan" description="Kelola akun karyawan dan admin, divisi, shift, serta akses login."
        actions={<Button icon={<Plus />} onClick={() => setEditing('new')}>Tambah karyawan</Button>} />

      <Card flush>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,11rem))]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Cari karyawan" placeholder="Cari nama, NIK, email, jabatan" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <NativeSelect value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter divisi">
            <option value="">Semua divisi</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </NativeSelect>
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter peran">
            <option value="">Semua peran</option><option value="employee">Karyawan</option><option value="admin">Admin</option>
          </NativeSelect>
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status" className="sm:col-span-2 lg:col-span-1">
            <option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="">Semua status</option>
          </NativeSelect>
        </div>
        {error && <div className="p-4"><Alert tone="danger">{error}</Alert></div>}
        {!rows ? <div className="p-5"><Skeleton rows={6} /></div> : rows.length === 0 ? (
          <EmptyState title="Tidak ada data" description="Belum ada karyawan yang cocok dengan filter." />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="rtable">
              <thead><tr><th>Karyawan</th><th>Divisi &amp; jabatan</th><th data-wide>Shift</th><th>Peran</th><th>Status</th><th data-wide>Login terakhir</th><th className="w-12"><span className="sr-only">Aksi</span></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.is_active ? '' : 'opacity-60'}>
                    <td data-primary>
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={r.name} size={36} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{r.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{r.email ?? `NIK ${r.nik}`}</p>
                          </div>
                        </div>
                        <div className="md:hidden"><RowMenu r={r} onEdit={setEditing} onPassword={setPwTarget} onConfirm={(kind) => setConfirm({ kind, emp: r })} /></div>
                      </div>
                    </td>
                    <td data-label="Divisi"><span>{r.department ?? '—'}<span className="sub">{r.position ?? ''}</span></span></td>
                    <td data-label="Shift" data-wide>{r.shift_name ?? <span className="text-muted-foreground">Default</span>}</td>
                    <td data-label="Peran">
                      <span className="inline-flex flex-wrap items-center justify-end gap-1.5 md:justify-start">
                        <Badge tone={r.role === 'admin' ? 'primary' : 'neutral'} dot={false}>{r.role === 'admin' ? 'Admin' : 'Karyawan'}</Badge>
                        {r.role === 'admin' && Boolean(r.can_attend) && <Badge tone="info" dot={false}>Ikut absen</Badge>}
                      </span>
                    </td>
                    <td data-label="Status">{r.is_active ? <Badge tone="success">Aktif</Badge> : <Badge tone="neutral">Nonaktif</Badge>}</td>
                    <td data-label="Login terakhir" data-wide className="text-muted-foreground">{r.last_login_at ? dateTime(r.last_login_at) : 'Belum pernah'}</td>
                    <td data-desktop className="text-right">
                      <RowMenu r={r} onEdit={setEditing} onPassword={setPwTarget} onConfirm={(kind) => setConfirm({ kind, emp: r })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows && rows.length > 0 && <div className="border-t px-5 py-3 text-xs text-muted-foreground">{rows.length} akun ditampilkan</div>}
      </Card>

      <EmployeeForm value={editing} departments={departments} shifts={shifts} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); toast(msg); load() }} />

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        loading={busy}
        onConfirm={runConfirm}
        title={confirm?.kind === 'toggle' ? (confirm.emp.is_active ? 'Nonaktifkan akun?' : 'Aktifkan akun?') : 'Hapus karyawan?'}
        confirmLabel={confirm?.kind === 'toggle' ? (confirm.emp.is_active ? 'Nonaktifkan' : 'Aktifkan') : 'Hapus'}
        tone={confirm?.kind === 'toggle' && !confirm.emp.is_active ? 'primary' : 'danger'}
        message={confirm?.kind === 'toggle'
          ? confirm.emp.is_active ? `${confirm.emp.name} tidak akan bisa login sampai diaktifkan kembali.` : `${confirm.emp.name} akan dapat login kembali.`
          : `Data ${confirm?.emp.name} akan dihapus. Bila sudah memiliki riwayat absensi, akun hanya dinonaktifkan agar riwayat tetap tersimpan.`}
      />

      <SetPasswordForm emp={pwTarget} onClose={() => setPwTarget(null)} onDone={(password) => { const e = pwTarget!; setPwTarget(null); setTempPassword({ name: e.name, nik: e.nik, password }); load() }} />

      <Modal open={tempPassword !== null} onClose={() => setTempPassword(null)} title="Kata sandi baru tersimpan" description="Kata sandi ini hanya ditampilkan sekali." size="sm"
        footer={<Button onClick={() => setTempPassword(null)}>Selesai</Button>}>
        {tempPassword && (
          <>
            <p className="text-sm text-muted-foreground">Berikan kata sandi ini kepada <span className="font-medium text-foreground">{tempPassword.name}</span>. Sesi login lamanya sudah dikeluarkan.</p>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/50 px-4 py-3">
              <code className="font-mono text-lg font-semibold tracking-wider">{tempPassword.password}</code>
              <Button variant="ghost" size="icon-sm" aria-label="Salin kata sandi" onClick={() => { navigator.clipboard?.writeText(tempPassword.password); toast('Disalin ke clipboard.', 'info') }}><Copy /></Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

function RowMenu({ r, onEdit, onPassword, onConfirm }: { r: Employee; onEdit: (e: Employee) => void; onPassword: (e: Employee) => void; onConfirm: (kind: 'delete' | 'toggle') => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${r.name}`}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onEdit(r)}><Pencil /> Ubah data</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onPassword(r)}><KeyRound /> Atur kata sandi</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onConfirm('toggle')}>{r.is_active ? <UserX /> : <UserCheck />} {r.is_active ? 'Nonaktifkan' : 'Aktifkan'}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onConfirm('delete')}><Trash2 /> Hapus</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmployeeForm({ value, departments, shifts, onClose, onSaved }: { value: Employee | 'new' | null; departments: Department[]; shifts: Shift[]; onClose: () => void; onSaved: (msg: string) => void }) {
  const isNew = value === 'new'
  const emp = value && value !== 'new' ? value : null
  const [form, setForm] = useState({ nik: '', name: '', email: '', role: 'employee', department_id: '', shift_id: '', position: '', phone: '', password: '', can_attend: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!value) return
    setError('')
    setForm({
      nik: emp?.nik ?? '', name: emp?.name ?? '', email: emp?.email ?? '', role: emp?.role ?? 'employee',
      department_id: emp?.department_id ? String(emp.department_id) : '', shift_id: emp?.shift_id ? String(emp.shift_id) : '',
      position: emp?.position ?? '', phone: emp?.phone ?? '', password: '', can_attend: Boolean(emp?.can_attend),
    })
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const defaultShift = shifts.find((s) => s.is_default) ?? shifts[0]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const body: Record<string, unknown> = {
      nik: form.nik, name: form.name, email: form.email, role: form.role, position: form.position, phone: form.phone,
      department_id: form.department_id ? Number(form.department_id) : null, shift_id: form.shift_id ? Number(form.shift_id) : null,
      can_attend: form.role === 'admin' ? form.can_attend : false,
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
    <Modal open={value !== null} onClose={onClose} title={isNew ? 'Tambah karyawan' : 'Ubah data karyawan'} description={emp?.name} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="emp-form" loading={loading}>{isNew ? 'Simpan karyawan' : 'Simpan perubahan'}</Button></>}>
      <form id="emp-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Nama lengkap" htmlFor="f-name"><Input id="f-name" value={form.name} onChange={set('name')} required maxLength={120} /></Field>
        <Field label="NIK" htmlFor="f-nik"><Input id="f-nik" value={form.nik} onChange={set('nik')} required maxLength={30} placeholder="cth. 2024001" /></Field>
        <Field label="Email" htmlFor="f-email" hint="Dipakai untuk login."><Input id="f-email" type="email" value={form.email} onChange={set('email')} required /></Field>
        <Field label="Telepon" htmlFor="f-phone" hint="Opsional."><Input id="f-phone" inputMode="tel" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Divisi" htmlFor="f-dept">
          <NativeSelect id="f-dept" value={form.department_id} onChange={set('department_id')}>
            <option value="">Pilih divisi</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Jabatan" htmlFor="f-pos"><Input id="f-pos" value={form.position} onChange={set('position')} maxLength={100} placeholder="cth. Staff Marketing" /></Field>
        <Field label="Shift kerja" htmlFor="f-shift">
          <NativeSelect id="f-shift" value={form.shift_id} onChange={set('shift_id')}>
            <option value="">Default{defaultShift ? ` (${defaultShift.name} ${defaultShift.start_time.slice(0, 5)}–${defaultShift.end_time.slice(0, 5)})` : ''}</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})</option>)}
          </NativeSelect>
        </Field>
        <Field label="Peran akses" htmlFor="f-role" hint={form.role === 'admin' ? 'Admin dapat mengelola seluruh data.' : 'Hanya dapat absen dan melihat data sendiri.'}>
          <NativeSelect id="f-role" value={form.role} onChange={set('role')}>
            <option value="employee">Karyawan</option><option value="admin">Admin</option>
          </NativeSelect>
        </Field>
        {form.role === 'admin' && (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3.5 sm:col-span-2">
            <div>
              <Label htmlFor="f-attend">Juga absen sebagai karyawan</Label>
              <p className="mt-1 text-[13px] text-muted-foreground">Menampilkan menu Absen saya dan ikut dihitung di rekap.</p>
            </div>
            <Switch id="f-attend" checked={form.can_attend} onCheckedChange={(v) => setForm((f) => ({ ...f, can_attend: v }))} />
          </div>
        )}
        {isNew && (
          <Field label="Kata sandi awal" htmlFor="f-pw" hint="Minimal 8 karakter berisi huruf dan angka." className="sm:col-span-2">
            <Input id="f-pw" type="text" autoComplete="off" value={form.password} onChange={set('password')} required minLength={8} />
          </Field>
        )}
        {error && <div className="sm:col-span-2"><Alert tone="danger">{error}</Alert></div>}
      </form>
    </Modal>
  )
}

function SetPasswordForm({ emp, onClose, onDone }: { emp: Employee | null; onClose: () => void; onDone: (password: string) => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (emp) { setPassword(''); setError('') } }, [emp])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!emp) return
    setLoading(true)
    setError('')
    try {
      const res = await api<{ password: string }>(`/api/admin/employees/${emp.id}/reset-password`, { method: 'POST', body: password ? { password } : {} })
      onDone(res.password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={emp !== null} onClose={onClose} title="Atur kata sandi" description={emp ? emp.name : undefined} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="pw-form" loading={loading}>{password ? 'Simpan kata sandi' : 'Buat kata sandi acak'}</Button></>}>
      <form id="pw-form" className="grid gap-4" onSubmit={submit}>
        <Field label="Kata sandi baru" htmlFor="pw-set" hint="Minimal 8 karakter berisi huruf dan angka. Kosongkan untuk membuat kata sandi acak.">
          <Input id="pw-set" type="text" autoComplete="off" spellCheck={false} value={password} onChange={(e) => setPassword(e.target.value)} minLength={password ? 8 : undefined} maxLength={100} />
        </Field>
        <p className="text-[13px] text-muted-foreground">Sesi login {emp?.name} di semua perangkat akan dikeluarkan.</p>
        {error && <Alert tone="danger">{error}</Alert>}
      </form>
    </Modal>
  )
}
