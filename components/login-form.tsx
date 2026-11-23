'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Camera, Eye, EyeOff, LockKeyhole, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { Alert } from './ui'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api<{ redirect: string }>('/api/auth/login', { method: 'POST', body: { email, password } })
      window.location.href = res.redirect
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <aside className="login-hero">
        <div className="login-hero-brand">
          <span className="brand-mark brand-mark-lg"><img src="/logo-mark.png" alt="Logo PT Pandawa Amerta Packindo" width={512} height={512} decoding="async" /></span>
          <span><strong>PT Pandawa Amerta Packindo</strong><small>Flexible Plastic Packaging Manufacture</small></span>
        </div>
        <div className="login-hero-copy">
          <span className="eyebrow eyebrow-light">PAP ATTENDANCE</span>
          <h1>Absensi yang tepat, untuk hari kerja yang lebih teratur.</h1>
          <p>Check-in dan check-out dengan verifikasi foto serta lokasi kantor — tercatat otomatis dan aman.</p>
          <ul className="login-points">
            <li><span><Camera size={16} /></span>Verifikasi foto wajah setiap absen</li>
            <li><span><MapPin size={16} /></span>Validasi radius lokasi kantor (geofence)</li>
            <li><span><ShieldCheck size={16} /></span>Data terenkripsi &amp; akses berbasis peran</li>
          </ul>
        </div>
        <small className="login-hero-foot">© {new Date().getFullYear()} PT Pandawa Amerta Packindo</small>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <span className="eyebrow">PORTAL AKSES</span>
          <h2>Masuk ke akun Anda</h2>
          <p className="muted-text">Gunakan email kerja dan kata sandi Anda. Karyawan dan admin akan diarahkan ke halaman masing-masing.</p>

          <form className="form-stack" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="input-icon">
                <Mail size={17} />
                <input id="email" className="input" type="email" inputMode="email" autoComplete="username email" autoCapitalize="none" spellCheck={false} placeholder="nama@pandawaamerta.co.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">Kata sandi</label>
              <div className="input-icon">
                <LockKeyhole size={17} />
                <input id="password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Masukkan kata sandi" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="input-addon" onClick={() => setShow((v) => !v)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading || !email.trim() || !password}>
              {loading ? 'Memverifikasi…' : 'Masuk'} <ArrowRight size={17} />
            </button>
          </form>
          <p className="login-help"><ShieldCheck size={15} /> Lupa kata sandi? Hubungi tim IT untuk reset akun.</p>
        </div>
      </main>
    </div>
  )
}
