import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const font = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'PAP Attendance', template: '%s | PAP Attendance' },
  description: 'Portal absensi karyawan PT Pandawa Amerta Packindo dengan verifikasi foto dan lokasi.',
  robots: {
    index: false, follow: false, nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, 'max-snippet': 0, 'max-image-preview': 'none' },
  },
  icons: {
    icon: [
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180' },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0e161d' },
  ],
}

// Terapkan tema sebelum render untuk mencegah kedipan.
const themeScript = `try{var t=localStorage.getItem('pap-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
