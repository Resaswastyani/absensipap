import type { Metadata } from 'next'
import { EmployeeRequests } from '@/components/employee/requests'

export const metadata: Metadata = { title: 'Pengajuan' }

export default function Page() {
  return <EmployeeRequests />
}
