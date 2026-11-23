import type { Metadata } from 'next'
import { EmployeeHistory } from '@/components/employee/history'

export const metadata: Metadata = { title: 'Riwayat Absensi' }

export default function Page() {
  return <EmployeeHistory />
}
