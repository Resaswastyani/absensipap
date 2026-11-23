import type { Metadata } from 'next'
import { AdminDashboard } from '@/components/admin/dashboard'
import { getCurrentUser } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Ringkasan Admin' }

export default async function Page() {
  const user = await getCurrentUser()
  return <AdminDashboard adminName={user?.name ?? 'Admin'} />
}
