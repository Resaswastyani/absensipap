'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarCheck2, ChevronsUpDown, Fingerprint, House, KeyRound, LayoutDashboard, LogOut, Moon,
  Settings, Sun, UserRound, Users,
} from 'lucide-react'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import { Avatar, ToastProvider } from './kit'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Tip } from './ui/misc'

type Role = 'admin' | 'employee'
export type ShellUser = { name: string; nik: string; subtitle: string; canAttend?: boolean }
type NavItem = { href: string; label: string; icon: typeof House; exact?: boolean }

const NAV: Record<Role, NavItem[]> = {
  employee: [
    { href: '/karyawan', label: 'Beranda', icon: House, exact: true },
    { href: '/karyawan/riwayat', label: 'Riwayat', icon: CalendarCheck2 },
    { href: '/karyawan/profil', label: 'Profil', icon: UserRound },
  ],
  admin: [
    { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard, exact: true },
    { href: '/admin/karyawan', label: 'Karyawan', icon: Users },
    { href: '/admin/absensi', label: 'Absensi', icon: CalendarCheck2 },
    { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
  ],
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  useEffect(() => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light') }, [])
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('pap-theme', next) } catch { /* abaikan */ }
  }
  return { theme, toggle }
}

function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <img src="/logo-mark.png" alt="Logo PT Pandawa Amerta Packindo" width={512} height={512} decoding="async" />
    </span>
  )
}

export function AppShell({ role, user, children }: { role: Role; user: ShellUser; children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [loggingOut, setLoggingOut] = useState(false)
  const items: NavItem[] = role === 'admin' && user.canAttend
    ? [NAV.admin[0], { href: '/admin/absen', label: 'Absen saya', icon: Fingerprint }, ...NAV.admin.slice(1)]
    : NAV[role]
  const profileHref = role === 'admin' ? '/admin/profil' : '/karyawan/profil'
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))
  const current = items.find((i) => isActive(i.href, i.exact))?.label ?? (pathname.endsWith('/profil') ? 'Profil' : '')

  const logout = async () => {
    setLoggingOut(true)
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { /* tetap keluar */ }
    window.location.href = '/login'
  }

  const userMenu = (
    <DropdownMenuContent align="end" className="w-60">
      <DropdownMenuLabel className="font-normal">
        <p className="truncate font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.subtitle}</p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => router.push(profileHref)}><UserRound /> Profil saya</DropdownMenuItem>
      {role === 'admin' && <DropdownMenuItem onSelect={() => router.push(`${profileHref}#keamanan`)}><KeyRound /> Ganti kata sandi</DropdownMenuItem>}
      <DropdownMenuItem onSelect={toggle}>{theme === 'light' ? <Moon /> : <Sun />} {theme === 'light' ? 'Mode gelap' : 'Mode terang'}</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" disabled={loggingOut} onSelect={logout}><LogOut /> {loggingOut ? 'Keluar…' : 'Keluar'}</DropdownMenuItem>
    </DropdownMenuContent>
  )

  return (
    <ToastProvider>
      <div className="min-h-dvh">
        {/* Sidebar: ikon saja di tablet (md), penuh mulai laptop (lg) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col border-r bg-sidebar md:flex lg:w-60 xl:w-64" aria-label="Navigasi utama">
          <Link href={items[0].href} className="flex h-16 items-center gap-3 border-b px-[18px] lg:px-5">
            <Logo size={36} />
            <span className="hidden min-w-0 leading-tight lg:block">
              <span className="block truncate text-[15px] font-semibold">PAP Attendance</span>
              <span className="block truncate text-xs text-muted-foreground">{role === 'admin' ? 'Panel Admin' : 'Portal Karyawan'}</span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {items.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact)
              const cls = cn(
                'flex h-10 items-center justify-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:justify-start',
                active && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
              )
              return (
                <div key={href}>
                  <div className="lg:hidden">
                    <Tip label={label} side="right">
                      <Link href={href} aria-current={active ? 'page' : undefined} aria-label={label} className={cls}><Icon className="size-[18px] shrink-0" /></Link>
                    </Tip>
                  </div>
                  <Link href={href} aria-current={active ? 'page' : undefined} className={cn(cls, 'hidden lg:flex')}>
                    <Icon className="size-[18px] shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                </div>
              )
            })}
          </nav>

          <div className="border-t p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-center gap-3 rounded-md p-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 lg:justify-start lg:p-2" aria-label="Menu akun">
                  <Avatar name={user.name} size={34} />
                  <span className="hidden min-w-0 flex-1 leading-tight lg:block">
                    <span className="block truncate text-sm font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.subtitle}</span>
                  </span>
                  <ChevronsUpDown className="hidden size-4 text-muted-foreground lg:block" />
                </button>
              </DropdownMenuTrigger>
              {userMenu}
            </DropdownMenu>
          </div>
        </aside>

        <div className="flex min-h-dvh flex-col md:pl-[72px] lg:pl-60 xl:pl-64">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6 md:h-16 lg:px-8">
            <Link href={items[0].href} className="flex items-center gap-2.5 md:hidden">
              <Logo size={30} />
              <span className="text-[15px] font-semibold">PAP Attendance</span>
            </Link>
            <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
              <span className="text-muted-foreground">{role === 'admin' ? 'Admin' : 'Karyawan'}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="truncate font-medium">{current}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Tip label={theme === 'light' ? 'Mode gelap' : 'Mode terang'}>
                <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'} className="hidden sm:inline-flex">
                  {theme === 'light' ? <Moon /> : <Sun />}
                </Button>
              </Tip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 md:hidden" aria-label="Menu akun">
                    <Avatar name={user.name} size={32} />
                  </button>
                </DropdownMenuTrigger>
                {userMenu}
              </DropdownMenu>
            </div>
          </header>

          <main id="konten" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-10 lg:px-8 lg:pt-8 2xl:max-w-[88rem]">
            {children}
          </main>
        </div>

        {/* Navigasi bawah untuk HP */}
        <nav aria-label="Navigasi" className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
            {items.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors', active && 'text-primary')}>
                  <span className={cn('grid h-7 w-12 place-items-center rounded-full transition-colors', active && 'bg-primary/10')}><Icon className="size-[19px]" /></span>
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </ToastProvider>
  )
}
