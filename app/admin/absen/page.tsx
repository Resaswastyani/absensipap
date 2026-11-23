import type { Metadata } from 'next'
import { AttendTabs } from '@/components/admin/attend-tabs'
import { EmployeeHome } from '@/components/employee/home'
import { requireAdminAttendee } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Absen Saya' }

export default async function Page() {
  const user = await requireAdminAttendee()
  return <EmployeeHome firstName={user.name.split(' ')[0]} basePath="/admin/absen" nav={<AttendTabs />} />
}
