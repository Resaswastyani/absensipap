import type { Metadata } from 'next'
import { AttendTabs } from '@/components/admin/attend-tabs'
import { EmployeeHistory } from '@/components/employee/history'
import { requireAdminAttendee } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Riwayat Absensi Saya' }

export default async function Page() {
  await requireAdminAttendee()
  return <EmployeeHistory nav={<AttendTabs />} />
}
