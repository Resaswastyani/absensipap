import type { Metadata } from 'next'
import { AttendTabs } from '@/components/admin/attend-tabs'
import { EmployeeRequests } from '@/components/employee/requests'
import { requireAdminAttendee } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Pengajuan Saya' }

export default async function Page() {
  await requireAdminAttendee()
  return <EmployeeRequests nav={<AttendTabs />} />
}
