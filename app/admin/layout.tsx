import { AppShell } from '@/components/app-shell'
import { requirePageRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole('admin')
  return (
    <AppShell
      role="admin"
      user={{
        name: user.name,
        nik: user.nik,
        subtitle: user.position || 'Administrator',
      }}
    >
      {children}
    </AppShell>
  )
}
