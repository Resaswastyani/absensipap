import type { Metadata } from 'next'
import LoginForm from '@/components/login-form'

export const metadata: Metadata = { title: 'Masuk' }
// Site key dibaca saat runtime dari env server.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginForm recaptchaSiteKey={process.env.RECAPTCHA_SITE_KEY ?? ''} />
}
