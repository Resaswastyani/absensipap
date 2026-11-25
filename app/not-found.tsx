import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.</p>
        <Button asChild className="mt-6"><Link href="/">Kembali ke beranda</Link></Button>
      </div>
    </main>
  )
}
