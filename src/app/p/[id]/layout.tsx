import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pagamento fácil via Pix | Caderneta',
  description:
    'Confira o valor e faça seu pagamento no Pix em poucos toques, de forma simples e segura.',
  openGraph: {
    title: 'Pagamento fácil via Pix | Caderneta',
    description:
      'Confira o valor e faça seu pagamento no Pix em poucos toques, de forma simples e segura.',
    images: [
      {
        url: '/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Pagamento via Pix na Caderneta',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pagamento fácil via Pix | Caderneta',
    description:
      'Confira o valor e faça seu pagamento no Pix em poucos toques, de forma simples e segura.',
    images: ['/icon-512x512.png'],
  },
}

export default function PublicPixLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
