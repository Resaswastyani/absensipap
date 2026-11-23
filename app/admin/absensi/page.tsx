import type { Metadata } from 'next'
import { AdminAttendance } from '@/components/admin/attendance'

export const metadata: Metadata = { title: 'Rekap Absensi' }

export default function Page() {
  return <AdminAttendance />
}
