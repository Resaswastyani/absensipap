import type { Metadata } from 'next'
import { AdminRequests } from '@/components/admin/requests'

export const metadata: Metadata = { title: 'Pengajuan' }

export default function Page() {
  return <AdminRequests />
}
