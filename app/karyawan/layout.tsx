import { AppShell } from '@/components/app-shell'
import { requirePageRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole('employee')
  return (
    <AppShell
      role="employee"
      user={{
        name: user.name,
        nik: user.nik,
        subtitle: [user.position, user.department].filter(Boolean).join(' · ') || 'Karyawan',
        mustChangePassword: Boolean(user.must_change_password),
      }}
    >
      {children}
    </AppShell>
  )
}
