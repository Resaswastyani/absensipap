'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/absen', label: 'Absen hari ini' },
  { href: '/admin/absen/riwayat', label: 'Riwayat' },
  { href: '/admin/absen/pengajuan', label: 'Pengajuan' },
]

/** Navigasi halaman absensi pribadi untuk admin yang juga karyawan. */
export function AttendTabs() {
  const pathname = usePathname()
  return (
    <nav className="tabs" aria-label="Absensi saya">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={pathname === t.href ? 'active' : ''} aria-current={pathname === t.href ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
