import type { Metadata } from 'next'
import { getSettings, getZones } from '@/lib/data'
import { fillTokens, paragraphs } from '@/lib/text'
import { ChangeCookieChoice } from '@/components/CookieBanner'

export const metadata: Metadata = { title: 'Policies · Ozzie’s Table', alternates: { canonical: '/policies' } }

export default async function Policies() {
  const [{ general, content }, zones] = await Promise.all([getSettings(), getZones()])
  const l = content.legal
  const P = ({ t }: { t: string }) => <>{paragraphs(fillTokens(t, general, zones)).map((x, i) => <p key={i}>{x}</p>)}</>
  return (
    <section className="section" style={{ paddingTop: 26 }}>
      <div className="wrap prose stack" style={{ ['--g' as string]: '4px' }}>
        <h1 style={{ fontSize: 'clamp(2rem,6vw,2.7rem)' }}>Policies</h1>
        {l.sample ? <div className="alert warn small" style={{ marginTop: 10 }}>Sample wording. The owner replaces it in the dashboard under Content → Policies and legal.</div> : null}
        <h3 id="cancellations">Cancellations and refunds</h3><P t={l.cancellation} />
        <h3 id="allergens">Allergens</h3><p>Each dish lists which of the 14 major allergens it contains.</p><P t={l.kitchen} /><P t={l.allergenNote} />
        <h3 id="privacy">Privacy</h3><P t={l.privacy} />
        <h3 id="terms">Terms</h3><P t={l.terms} />
        <h3 id="cookies">Cookies</h3><P t={l.cookies} /><p><ChangeCookieChoice /></p>
        {l.hygiene || l.company ? <><h3>About the business</h3>{l.hygiene ? <p>Food hygiene rating: {l.hygiene}</p> : null}<P t={l.company} /></> : null}
      </div>
    </section>
  )
}
