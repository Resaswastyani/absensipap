import type { Metadata } from 'next'
import { ProfilePage } from '@/components/profile-page'
import { requirePageRole } from '@/lib/server/auth'

export const metadata: Metadata = { title: 'Profil' }

export default async function Page() {
  const u = await requirePageRole('admin')
  return <ProfilePage profile={{ name: u.name, nik: u.nik, email: u.email, phone: u.phone, position: u.position, department: u.department, shift: u.shift_name, role: u.role }} />
}
