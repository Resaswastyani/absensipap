import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="login-main" style={{ minHeight: '100dvh' }}>
      <div className="login-card" style={{ textAlign: 'center', justifyItems: 'center' }}>
        <span className="eyebrow">ERROR 404</span>
        <h2>Halaman tidak ditemukan</h2>
        <p className="muted-text">Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 12 }}>Kembali ke beranda</Link>
      </div>
    </main>
  )
}
