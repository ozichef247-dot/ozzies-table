import type { Metadata, Viewport } from 'next'
import { Young_Serif, Figtree, Cormorant_Garamond, Mulish, DM_Serif_Display, Karla } from 'next/font/google'
import './globals.css'
import { getSettings } from '@/lib/data'

export const dynamic = 'force-dynamic'

const young = Young_Serif({ weight: '400', subsets: ['latin'], variable: '--font-young', display: 'swap' })
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' })
const cormorant = Cormorant_Garamond({ weight: ['600', '700'], subsets: ['latin'], variable: '--font-cormorant', display: 'swap' })
const mulish = Mulish({ subsets: ['latin'], variable: '--font-mulish', display: 'swap' })
const dmserif = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-dmserif', display: 'swap' })
const karla = Karla({ subsets: ['latin'], variable: '--font-karla', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getSettings()
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    title: { default: content.seo.home.title, template: '%s' },
    description: content.seo.home.description,
    openGraph: { siteName: 'Ozzie’s Table', locale: 'en_GB', type: 'website' },
  }
}

export const viewport: Viewport = { themeColor: '#1E3A2A', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { content } = await getSettings()
  const fonts = [young, figtree, cormorant, mulish, dmserif, karla].map((f) => f.variable).join(' ')
  return (
    <html lang="en-GB" data-fp={content.fontPairing || 'a'} className={fonts}>
      <body>{children}</body>
    </html>
  )
}
