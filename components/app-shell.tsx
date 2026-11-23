'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarCheck2, ChevronDown, ClipboardList, FileText, House, KeyRound, LayoutDashboard, LogOut, Moon,
  Settings, Sun, UserRound, Users,
} from 'lucide-react'
import { api } from '@/lib/client'
import { Avatar, ToastProvider } from './ui'

type Role = 'admin' | 'employee'
export type ShellUser = { name: string; nik: string; subtitle: string }

const NAV: Record<Role, { href: string; label: string; icon: typeof House; exact?: boolean }[]> = {
  employee: [
    { href: '/karyawan', label: 'Beranda', icon: House, exact: true },
    { href: '/karyawan/riwayat', label: 'Riwayat', icon: CalendarCheck2 },
    { href: '/karyawan/pengajuan', label: 'Pengajuan', icon: FileText },
    { href: '/karyawan/profil', label: 'Profil', icon: UserRound },
  ],
  admin: [
    { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard, exact: true },
    { href: '/admin/karyawan', label: 'Karyawan', icon: Users },
    { href: '/admin/absensi', label: 'Absensi', icon: CalendarCheck2 },
    { href: '/admin/pengajuan', label: 'Pengajuan', icon: ClipboardList },
    { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
  ],
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }, [])
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('pap-theme', next) } catch { /* abaikan */ }
  }
  return { theme, toggle }
}

export function AppShell({ role, user, children }: { role: Role; user: ShellUser; children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const items = NAV[role]
  const profileHref = role === 'admin' ? '/admin/profil' : '/karyawan/profil'
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`))
  const current = items.find((i) => active(i.href, i.exact))?.label ?? (pathname.endsWith('/profil') ? 'Profil' : '')

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  useEffect(() => setMenuOpen(false), [pathname])

  const logout = async () => {
    setLoggingOut(true)
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { /* tetap keluar */ }
    window.location.href = '/login'
  }

  return (
    <ToastProvider>
      <div className="shell">
        <aside className="sidebar" aria-label="Navigasi utama">
          <Link href={items[0].href} className="brand">
            <span className="brand-mark"><img src="/logo-pap.png" alt="" /></span>
            <span className="brand-text"><strong>PAP <em>Attendance</em></strong><small>{role === 'admin' ? 'Panel Admin' : 'Portal Karyawan'}</small></span>
          </Link>
          <span className="nav-label">Menu</span>
          <nav className="side-nav">
            {items.map(({ href, label, icon: Icon, exact }) => (
              <Link key={href} href={href} className={`side-link ${active(href, exact) ? 'active' : ''}`} title={label} aria-current={active(href, exact) ? 'page' : undefined}>
                <Icon size={19} strokeWidth={1.9} /><span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-foot">
            <Link href={profileHref} className="side-profile" title="Profil">
              <Avatar name={user.name} size={36} />
              <span><strong>{user.name}</strong><small>{user.subtitle}</small></span>
            </Link>
            <button type="button" className="side-link side-logout" onClick={logout} disabled={loggingOut} title="Keluar">
              <LogOut size={19} strokeWidth={1.9} /><span>{loggingOut ? 'Keluar…' : 'Keluar'}</span>
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <Link href={items[0].href} className="topbar-brand" aria-label="Beranda">
              <span className="brand-mark"><img src="/logo-pap.png" alt="" /></span>
              <strong>PAP <em>Attendance</em></strong>
            </Link>
            <div className="crumbs"><span>{role === 'admin' ? 'Admin' : 'Karyawan'}</span><span className="crumb-sep">/</span><strong>{current}</strong></div>
            <div className="topbar-actions">
              <span className={`role-chip role-${role}`}>{role === 'admin' ? 'Admin' : 'Karyawan'}</span>
              <button type="button" className="icon-btn" onClick={toggle} aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'} title="Ganti tema">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="user-menu" ref={menuRef}>
                <button type="button" className="user-trigger" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-haspopup="menu">
                  <Avatar name={user.name} size={32} />
                  <span className="user-trigger-name">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={15} />
                </button>
                {menuOpen && (
                  <div className="dropdown" role="menu">
                    <div className="dropdown-head"><strong>{user.name}</strong><small>NIK {user.nik}</small></div>
                    <button type="button" role="menuitem" onClick={() => router.push(profileHref)}><UserRound size={16} /> Profil saya</button>
                    {role === 'admin' && <button type="button" role="menuitem" onClick={() => router.push(`${profileHref}#keamanan`)}><KeyRound size={16} /> Ganti kata sandi</button>}
                    <button type="button" role="menuitem" className="danger" onClick={logout} disabled={loggingOut}><LogOut size={16} /> Keluar</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="content" id="konten">{children}</main>
        </div>

        <nav className="bottom-nav" aria-label="Navigasi">
          {items.map(({ href, label, icon: Icon, exact }) => (
            <Link key={href} href={href} className={active(href, exact) ? 'active' : ''} aria-current={active(href, exact) ? 'page' : undefined}>
              <Icon size={20} strokeWidth={1.9} /><span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </ToastProvider>
  )
}
