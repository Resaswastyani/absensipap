'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin/absen', label: 'Absen hari ini' },
  { href: '/admin/absen/riwayat', label: 'Riwayat' },
]

/** Navigasi halaman absensi pribadi untuk admin yang juga karyawan. */
export function AttendTabs() {
  const pathname = usePathname()
  return (
    <nav aria-label="Absensi saya" className="inline-flex h-10 w-full items-center gap-1 rounded-lg bg-muted p-1 sm:w-auto">
      {TABS.map((t) => {
        const active = pathname === t.href
        return (
          <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined}
            className={cn('inline-flex h-full flex-1 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:flex-none', active && 'bg-background text-foreground shadow-sm')}>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
