'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Script from 'next/script'
import { ArrowRight, Camera, Eye, EyeOff, Loader2, LockKeyhole, Mail, MapPin, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { Alert } from './kit'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label, Skeleton, TooltipProvider, Tip } from './ui/misc'

declare global {
  interface Window {
    grecaptcha?: { ready: (cb: () => void) => void; execute: (siteKey: string, opts: { action: string }) => Promise<string> }
  }
}

/** Ambil token reCAPTCHA v3 tepat saat submit (token hanya berlaku 2 menit). */
function getRecaptchaToken(siteKey: string): Promise<string | undefined> {
  if (!siteKey) return Promise.resolve(undefined)
  return new Promise((resolve, reject) => {
    const g = window.grecaptcha
    if (!g) { reject(new Error('Verifikasi keamanan belum termuat. Periksa koneksi lalu muat ulang halaman.')); return }
    const timer = window.setTimeout(() => reject(new Error('Verifikasi keamanan terlalu lama. Coba lagi.')), 10000)
    g.ready(() => {
      g.execute(siteKey, { action: 'login' })
        .then((t) => { window.clearTimeout(timer); resolve(t) })
        .catch(() => { window.clearTimeout(timer); reject(new Error('Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi.')) })
    })
  })
}

const FEATURES = [
  { icon: Camera, text: 'Verifikasi foto wajah setiap absen' },
  { icon: MapPin, text: 'Validasi radius lokasi kantor' },
  { icon: ShieldCheck, text: 'Data terenkripsi dan akses berbasis peran' },
]

export default function LoginForm({ recaptchaSiteKey = '' }: { recaptchaSiteKey?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState('')
  // 0 = belum dimuat (hindari beda render server/klien); diisi saat komponen tampil.
  const [captchaKey, setCaptchaKey] = useState(0)
  const refreshCaptcha = () => { setCaptcha(''); setCaptchaKey(Date.now()) }
  useEffect(() => { setCaptchaKey(Date.now()) }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const recaptchaToken = await getRecaptchaToken(recaptchaSiteKey)
      const res = await api<{ redirect: string }>('/api/auth/login', { method: 'POST', body: { email, password, recaptchaToken, captcha } })
      window.location.href = res.redirect
    } catch (err) {
      setError(errorMessage(err))
      setLoading(false)
      // Kode CAPTCHA sekali pakai: selalu minta gambar baru setelah gagal.
      refreshCaptcha()
    }
  }

  const canSubmit = !loading && email.trim() && password && captcha.trim().length >= 5

  return (
    <TooltipProvider>
      <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {recaptchaSiteKey && <Script src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`} strategy="afterInteractive" />}

        {/* Panel foto: banner di HP/tablet, kolom penuh di laptop/desktop */}
        <aside className="login-hero relative flex min-h-[220px] flex-col gap-8 overflow-hidden px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-6 text-white sm:min-h-[280px] sm:px-8 lg:min-h-dvh lg:px-12 lg:py-10 xl:px-16">
          <div className="flex items-center gap-3 [text-shadow:0_1px_8px_rgba(0,0,0,.5)]">
            <span className="brand-mark size-11 shadow-lg xl:size-12"><img src="/logo-mark.png" alt="Logo PT Pandawa Amerta Packindo" width={512} height={512} decoding="async" /></span>
            <span className="leading-tight">
              <span className="block font-semibold">PT Pandawa Amerta Packindo</span>
              <span className="block text-[13px] text-white/75">Flexible Plastic Packaging Manufacture</span>
            </span>
          </div>

          <div className="mt-auto hidden max-w-lg [text-shadow:0_1px_12px_rgba(0,0,0,.45)] lg:block">
            <p className="text-sm font-medium text-sky-200">PAP Attendance</p>
            <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">Absensi yang tepat untuk hari kerja yang lebih teratur.</h1>
            <p className="mt-3 text-[15px] text-white/80">Check-in dan check-out dengan verifikasi foto serta lokasi kantor, tercatat otomatis dan aman.</p>
            <ul className="mt-7 grid gap-3 [@media(max-height:820px)]:hidden">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="grid size-8 place-items-center rounded-lg border border-white/15 bg-white/10"><Icon className="size-4" /></span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="hidden text-xs text-white/60 lg:block">© {new Date().getFullYear()} PT Pandawa Amerta Packindo</p>
        </aside>

        {/* Form */}
        <main className="flex justify-center px-5 pt-6 pb-10 sm:px-8 sm:pt-10 lg:items-center lg:py-10">
          <div className="w-full max-w-[420px]">
            <h2 className="text-2xl font-semibold tracking-tight">Masuk ke akun Anda</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Gunakan email kerja dan kata sandi Anda.</p>

            <form className="mt-7 grid gap-5" onSubmit={submit} noValidate>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" inputMode="email" autoComplete="username email" autoCapitalize="none" spellCheck={false} placeholder="nama@perusahaan.com" className="h-11 pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Kata sandi</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Masukkan kata sandi" className="h-11 pr-11 pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground">
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="captcha">Kode verifikasi</Label>
                <div className="flex gap-2">
                  <div className="grid h-14 min-w-0 flex-1 place-items-center overflow-hidden rounded-md border border-input bg-white">
                    {captchaKey
                      ? <img src={`/api/captcha?r=${captchaKey}`} alt="Gambar kode verifikasi" width={200} height={60} className="h-[52px] w-full max-w-[210px] object-contain select-none" draggable={false} />
                      : <Skeleton className="h-6 w-2/3" />}
                  </div>
                  <Tip label="Ganti gambar">
                    <Button type="button" variant="outline" className="h-14 w-14 shrink-0" onClick={refreshCaptcha} aria-label="Ganti gambar kode verifikasi"><RefreshCw /></Button>
                  </Tip>
                </div>
                <Input id="captcha" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={8} placeholder="Ketik kode pada gambar" className="h-11 font-semibold tracking-[0.2em] uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case" value={captcha} onChange={(e) => setCaptcha(e.target.value.toUpperCase())} required aria-describedby="captcha-hint" />
                <p id="captcha-hint" className="text-[13px] text-muted-foreground">Huruf tidak membedakan besar-kecil.</p>
              </div>

              {error && <Alert tone="danger">{error}</Alert>}

              <Button type="submit" size="lg" className="h-11 w-full" disabled={!canSubmit}>
                {loading ? <><Loader2 className="animate-spin" /> Memverifikasi…</> : <>Masuk <ArrowRight /></>}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">Lupa kata sandi? Hubungi tim IT untuk reset akun.</p>
            {recaptchaSiteKey && (
              <p className="mt-3 text-center text-xs text-muted-foreground/80">
                Dilindungi reCAPTCHA Google.{' '}
                <a className="underline underline-offset-2 hover:text-foreground" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privasi</a> dan{' '}
                <a className="underline underline-offset-2 hover:text-foreground" href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Persyaratan</a>.
              </p>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
