import type { Metadata } from 'next'
import { EmployeeHome } from '@/components/employee/home'
import { getCurrentUser } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Beranda' }

export default async function Page() {
  const user = await getCurrentUser()
  return <EmployeeHome firstName={user?.name.split(' ')[0] ?? ''} />
}
