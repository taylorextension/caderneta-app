import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { ToastContainer } from '@/components/ui/toast'
import { MetaPixel } from '@/components/analytics/meta-pixel'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Suspense } from 'react'
import './globals.css'

const inter = localFont({
  src: [
    {
      path: './fonts/inter-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/inter-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/inter-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/inter-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['Helvetica', 'Arial', 'sans-serif'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Pagamento fácil via Pix | Caderneta',
  description:
    'Confira o valor e faça seu pagamento no Pix em poucos toques, de forma simples',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.png', sizes: 'any', type: 'image/png' },
    ],
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Pagamento fácil via Pix | Caderneta',
    description:
      'Confira o valor e faça seu pagamento no Pix em poucos toques, de forma simples',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Pagamento fácil via Pix | Caderneta',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pagamento fácil via Pix | Caderneta',
    description:
      'Confira o valor e faça seu pagamento no Pix em poucos toques, de forma simples',
    images: ['/logo.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F5F7F5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body
        className="min-h-screen bg-bg-app font-sans antialiased"
        suppressHydrationWarning
      >
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        {children}
        <SpeedInsights />
        <ToastContainer />
      </body>
    </html>
  )
}
