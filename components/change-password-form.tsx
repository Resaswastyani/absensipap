'use client'

import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { Alert, Button, Field } from './ui'

function strength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}

export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const score = strength(next)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (next !== confirm) { setError('Konfirmasi kata sandi tidak sama.'); return }
    setLoading(true)
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } })
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
      onDone?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const type = show ? 'text' : 'password'
  return (
    <form className="form-stack" onSubmit={submit}>
      <Field label="Kata sandi saat ini" htmlFor="pw-current">
        <input id="pw-current" className="input" type={type} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </Field>
      <Field label="Kata sandi baru" htmlFor="pw-new" hint="Minimal 8 karakter, kombinasi huruf dan angka.">
        <div className="input-group">
          <input id="pw-new" className="input" type={type} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
          <button type="button" className="input-addon" onClick={() => setShow((v) => !v)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
        {next && <div className="strength" data-score={score}><span /><span /><span /><span /><small>{['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][score]}</small></div>}
      </Field>
      <Field label="Ulangi kata sandi baru" htmlFor="pw-confirm">
        <input id="pw-confirm" className="input" type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </Field>
      {error && <Alert tone="danger">{error}</Alert>}
      {success && <Alert tone="success">Kata sandi berhasil diperbarui. Sesi di perangkat lain telah dikeluarkan.</Alert>}
      <Button type="submit" loading={loading}>Simpan kata sandi</Button>
    </form>
  )
}
