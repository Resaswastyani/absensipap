'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, LocateFixed, MapPin, RefreshCw, ShieldCheck } from 'lucide-react'
import { api, errorMessage } from '@/lib/client'
import { cn } from '@/lib/utils'
import { Alert, Button, Modal } from '../kit'

export type Office = { id: number; name: string; address: string | null; latitude: number; longitude: number; radius_m: number }
type Position = { lat: number; lng: number; accuracy: number }

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

export function nearest(offices: Office[], pos: Position | null) {
  if (!pos || offices.length === 0) return null
  return offices
    .map((o) => ({ ...o, distance: distanceMeters(pos.lat, pos.lng, Number(o.latitude), Number(o.longitude)) }))
    .sort((a, b) => a.distance - b.distance - (a.radius_m - b.radius_m))[0]
}

export function CameraCheck({ mode, offices, open, onClose, onSuccess }: { mode: 'in' | 'out'; offices: Office[]; open: boolean; onClose: () => void; onSuccess: (message: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // Callback ref: elemen video di dalam portal dialog bisa muncul setelah stream siap.
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (el && streamRef.current && el.srcObject !== streamRef.current) el.srcObject = streamRef.current
  }, [])
  const [photo, setPhoto] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState('')
  const [pos, setPos] = useState<Position | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // Kamera
  useEffect(() => {
    if (!open || photo) return
    let cancelled = false
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser tidak mendukung kamera. Gunakan Chrome/Safari terbaru melalui HTTPS.')
      return
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setCameraError('Kamera tidak dapat diakses. Izinkan akses kamera di pengaturan browser, lalu coba lagi.'))
    return () => { cancelled = true; stopCamera() }
  }, [open, photo, attempt, stopCamera])

  // GPS: pantau hingga akurasi terbaik
  useEffect(() => {
    if (!open) return
    setGpsError('')
    if (!navigator.geolocation) { setGpsError('Perangkat tidak mendukung GPS.'); return }
    const id = navigator.geolocation.watchPosition(
      (p) => setPos((prev) => (!prev || p.coords.accuracy <= prev.accuracy ? { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy } : prev)),
      (err) => setGpsError(err.code === 1 ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk absen.' : 'Lokasi belum didapat. Pastikan GPS aktif.'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [open, attempt])

  useEffect(() => {
    if (!open) { setPhoto(null); setPos(null); setError(''); setSubmitting(false) }
  }, [open])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) { setCameraError('Kamera belum siap. Tunggu sebentar.'); return }
    const size = Math.min(video.videoWidth, video.videoHeight)
    const target = Math.min(720, size)
    const canvas = document.createElement('canvas')
    canvas.width = target
    canvas.height = target
    const ctx = canvas.getContext('2d')!
    // Potong persegi di tengah + cermin agar sesuai pratinjau selfie
    ctx.translate(target, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, target, target)
    setPhoto(canvas.toDataURL('image/jpeg', 0.82))
    stopCamera()
  }

  const near = nearest(offices, pos)
  const inside = near ? near.distance <= near.radius_m : false

  const submit = async () => {
    if (!photo || !pos) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api<{ time: string; status?: string; lateMinutes?: number; office: string }>(
        mode === 'in' ? '/api/attendance/check-in' : '/api/attendance/check-out',
        { method: 'POST', body: { photo, latitude: pos.lat, longitude: pos.lng, accuracy: pos.accuracy } },
      )
      const t = res.time.slice(0, 5)
      onSuccess(mode === 'in'
        ? res.status === 'terlambat' ? `Check-in tercatat ${t} WIB (terlambat ${res.lateMinutes} menit).` : `Check-in berhasil pukul ${t} WIB. Selamat bekerja!`
        : `Check-out berhasil pukul ${t} WIB. Terima kasih atas kerja kerasnya!`)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  const gpsTone = !pos ? 'idle' : offices.length === 0 ? 'warn' : inside ? 'ok' : 'bad'
  return (
    <Modal open={open} onClose={onClose} title={mode === 'in' ? 'Check-in kehadiran' : 'Check-out'} description="Ambil foto wajah, lokasi Anda diverifikasi otomatis." size="md">
      <div className="relative mx-auto grid aspect-square max-h-[48dvh] w-full max-w-sm place-items-center overflow-hidden rounded-xl bg-zinc-900 sm:max-w-none">
        {photo ? (
          <img src={photo} alt="Foto verifikasi yang diambil" className="size-full object-cover" />
        ) : cameraError ? (
          <div className="grid max-w-72 justify-items-center gap-3 p-6 text-center text-sm text-zinc-200">
            <Camera className="size-7" />
            <p>{cameraError}</p>
            <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={() => setAttempt((a) => a + 1)}>Coba lagi</Button>
          </div>
        ) : (
          <video ref={attachVideo} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" aria-label="Pratinjau kamera" />
        )}
        {!photo && !cameraError && <div aria-hidden="true" className="pointer-events-none absolute inset-x-[22%] top-[13%] bottom-[17%] rounded-[50%] border-2 border-dashed border-white/60" />}
        {(photo || !cameraError) && <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white">
          {photo ? <><CheckCircle2 className="size-3.5" /> Foto siap</> : 'Posisikan wajah di dalam bingkai'}
        </span>}
      </div>

      <div className={cn('flex items-center gap-3 rounded-lg border px-3.5 py-3', gpsTone === 'ok' && 'border-success/30 bg-success/5', gpsTone === 'bad' && 'border-destructive/30 bg-destructive/5', gpsTone === 'warn' && 'border-warning/30 bg-warning/5')}>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground', gpsTone === 'ok' && 'bg-success text-white', gpsTone === 'bad' && 'bg-destructive text-white', gpsTone === 'warn' && 'bg-warning text-white')}>
          {pos ? <MapPin className="size-4" /> : <LocateFixed className="size-4 animate-pulse" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {gpsError ? 'Lokasi tidak tersedia' : !pos ? 'Mencari lokasi Anda…' : offices.length === 0 ? 'Lokasi kantor belum diatur' : inside ? `Di area ${near!.name}` : `Di luar area kantor`}
          </p>
          <p className="text-xs text-muted-foreground">
            {gpsError || (!pos ? 'Pastikan GPS aktif dan izin lokasi diberikan.' : near ? `Jarak ${near.distance} m · radius ${near.radius_m} m · akurasi ±${Math.round(pos.accuracy)} m` : `Akurasi ±${Math.round(pos.accuracy)} m`)}
          </p>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {photo ? (
          <>
            <Button variant="secondary" size="lg" className="h-11 sm:flex-1" icon={<RefreshCw />} onClick={() => { setPhoto(null); setError('') }} disabled={submitting}>Ulangi foto</Button>
            <Button size="lg" className="h-11 sm:flex-1" onClick={submit} loading={submitting} disabled={!pos} icon={<ShieldCheck />}>{mode === 'in' ? 'Kirim check-in' : 'Kirim check-out'}</Button>
          </>
        ) : (
          <Button size="lg" className="h-11 w-full" onClick={capture} disabled={Boolean(cameraError)} icon={<Camera />}>Ambil foto</Button>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">Foto dan lokasi hanya digunakan untuk verifikasi absensi.</p>
    </Modal>
  )
}
