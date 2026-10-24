import { BasketProvider } from '@/components/basket'
import { ShopHeader } from '@/components/ShopHeader'
import { Footer } from '@/components/Footer'
import { BasketBar } from '@/components/BasketBar'
import { CookieBanner } from '@/components/CookieBanner'
import { getSettings } from '@/lib/data'

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { content } = await getSettings()
  return (
    <BasketProvider>
      <a href="#main" className="skip">Skip to content</a>
      {content.notice ? <div className="notice">{content.notice}</div> : null}
      <ShopHeader logo={content.logo} />
      <main id="main">{children}</main>
      <Footer />
      <BasketBar />
      <CookieBanner />
    </BasketProvider>
  )
}
