import Link from 'next/link'
import { getSettings } from '@/lib/data'
import { whatsappLink } from '@/lib/text'

export async function Footer() {
  const { general, content } = await getSettings()
  const c = general.contact
  return (
    <footer>
      <div className="wrap fl">
        <div className="stack" style={{ ['--g' as string]: '10px' }}>
          <h3>Ozzie’s Table</h3>
          <p className="rule small">{content.themeLine}</p>
          <p className="muted small">{general.collection.address}</p>
        </div>
        <div className="stack" style={{ ['--g' as string]: '8px' }}>
          <p className="eyebrow">Questions</p>
          <p className="small">Call or WhatsApp us. To order, use the website so your slot is booked and paid.</p>
          <p className="num" style={{ fontWeight: 700 }}>
            <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a> · WhatsApp {c.whatsappDisplay}
          </p>
          <a className="small" href={whatsappLink(c.whatsapp, 'Hello Ozzie’s Table, I have a question.')} target="_blank" rel="noopener">Message us on WhatsApp</a>
        </div>
        <div className="stack" style={{ ['--g' as string]: '6px' }}>
          <div className="row links" style={{ ['--g' as string]: '4px 18px' }}>
            <Link href="/menu">Menu</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/how-it-works#faq">FAQ</Link>
            <Link href="/policies">Policies</Link>
          </div>
          {content.legal.hygiene ? <p className="small">Food hygiene rating: <b>{content.legal.hygiene}</b></p> : null}
          {content.legal.company ? <p className="muted small" style={{ whiteSpace: 'pre-line' }}>{content.legal.company}</p> : null}
        </div>
      </div>
    </footer>
  )
}
