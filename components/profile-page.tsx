'use client'

import { useState, type FormEvent } from 'react'
import { BadgeCheck, Building2, Clock3, IdCard, Mail, Phone, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api, errorMessage } from '@/lib/client'
import { Alert, Avatar, Button, Card, Field, PageHeader, useToast } from './ui'
import { ChangePasswordForm } from './change-password-form'

export type ProfileData = { name: string; nik: string; email: string | null; phone: string | null; position: string | null; department: string | null; shift: string | null; role: 'admin' | 'employee' }

export function ProfilePage({ profile }: { profile: ProfileData }) {
  const toast = useToast()
  const router = useRouter()
  const [email, setEmail] = useState(profile.email ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api('/api/profile', { method: 'PATCH', body: { email, phone } })
      toast('Profil diperbarui.')
      router.refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="AKUN SAYA" title="Profil" description="Kelola informasi kontak dan keamanan akun Anda." />
      <div className="grid-profile">
        <div className="stack">
          <section className="card profile-card">
            <Avatar name={profile.name} size={72} />
            <h2>{profile.name}</h2>
            <span className={`role-chip role-${profile.role}`}>{profile.role === 'admin' ? 'Administrator' : 'Karyawan'}</span>
            <dl className="profile-meta">
              <div><dt><IdCard size={15} /> NIK</dt><dd>{profile.nik}</dd></div>
              <div><dt><BadgeCheck size={15} /> Jabatan</dt><dd>{profile.position || '—'}</dd></div>
              <div><dt><Building2 size={15} /> Divisi</dt><dd>{profile.department || '—'}</dd></div>
              {profile.role === 'employee' && <div><dt><Clock3 size={15} /> Shift</dt><dd>{profile.shift || 'Default'}</dd></div>}
            </dl>
          </section>
          <Card title="Kontak" subtitle="DAPAT DIUBAH">
            <form className="form-stack" onSubmit={save}>
              <Field label="Email kerja" htmlFor="pf-email"><div className="input-icon"><Mail size={16} /><input id="pf-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@pandawaamerta.co.id" /></div></Field>
              <Field label="Nomor telepon" htmlFor="pf-phone"><div className="input-icon"><Phone size={16} /><input id="pf-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" /></div></Field>
              {error && <Alert tone="danger">{error}</Alert>}
              <Button type="submit" loading={saving}>Simpan perubahan</Button>
            </form>
          </Card>
        </div>
        <div id="keamanan">
          <Card title="Ganti kata sandi" subtitle="KEAMANAN">
            <ChangePasswordForm />
            <p className="fine-print"><ShieldCheck size={13} /> Setelah kata sandi diganti, semua sesi di perangkat lain otomatis keluar.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
