import type { Metadata } from 'next'
import { AdminSettings } from '@/components/admin/settings'

export const metadata: Metadata = { title: 'Pengaturan' }

export default function Page() {
  return <AdminSettings />
}
