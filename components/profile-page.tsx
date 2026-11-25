'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api, errorMessage } from '@/lib/client'
import { Alert, Avatar, Badge, Button, Card, Field, PageHeader, useToast } from './kit'
import { ChangePasswordForm } from './change-password-form'
import { Input } from './ui/input'

export type ProfileData = { name: string; nik: string; email: string | null; phone: string | null; position: string | null; department: string | null; shift: string | null; role: 'admin' | 'employee' }

export function ProfilePage({ profile }: { profile: ProfileData }) {
  const toast = useToast()
  const router = useRouter()
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api('/api/profile', { method: 'PATCH', body: { phone } })
      toast('Profil diperbarui.')
      router.refresh()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const rows: [string, string][] = [
    ['NIK', profile.nik],
    ['Email', profile.email || '—'],
    ['Jabatan', profile.position || '—'],
    ['Divisi', profile.department || '—'],
    ...(profile.shift ? [['Shift', profile.shift] as [string, string]] : []),
  ]

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title="Profil" description="Informasi akun dan pengaturan keamanan Anda." />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar name={profile.name} size={56} />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{profile.name}</p>
                <Badge tone={profile.role === 'admin' ? 'primary' : 'neutral'} className="mt-1">{profile.role === 'admin' ? 'Administrator' : 'Karyawan'}</Badge>
              </div>
            </div>
            <dl className="mt-5 divide-y text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Kontak" description="Nomor yang dapat dihubungi tim HR.">
            <form className="grid gap-4" onSubmit={save}>
              <Field label="Nomor telepon" htmlFor="pf-phone">
                <Input id="pf-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx xxxx xxxx" />
              </Field>
              {error && <Alert tone="danger">{error}</Alert>}
              <Button type="submit" loading={saving} className="w-full sm:w-auto sm:justify-self-start">Simpan</Button>
            </form>
          </Card>
        </div>

        <div id="keamanan" className="scroll-mt-24">
          {profile.role === 'admin' ? (
            <Card title="Ganti kata sandi" description="Setelah diganti, sesi di perangkat lain otomatis keluar.">
              <ChangePasswordForm />
            </Card>
          ) : (
            <Card title="Kata sandi" description="Kata sandi akun dikelola oleh tim IT.">
              <p className="text-sm text-muted-foreground">Jika lupa atau ingin mengganti kata sandi, silakan hubungi tim IT. Jangan bagikan kata sandi Anda kepada siapa pun.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
