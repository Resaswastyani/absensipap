import type { Metadata } from 'next'
import { AdminEmployees } from '@/components/admin/employees'

export const metadata: Metadata = { title: 'Karyawan' }

export default function Page() {
  return <AdminEmployees />
}
