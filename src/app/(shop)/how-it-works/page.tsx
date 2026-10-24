import type { Metadata } from 'next'
import { getFaqs, getPublicMenu, getSettings, getZones } from '@/lib/data'
import { longNoticeNote } from '@/lib/schedule'
import { fillTokens } from '@/lib/text'
import { ContactBlock } from '@/components/ContactBlock'

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getSettings()
  return { title: content.seo.info.title, description: content.seo.info.description, alternates: { canonical: '/how-it-works' } }
}

export default async function HowItWorks() {
  const [{ general }, faqs, zones, { products }] = await Promise.all([getSettings(), getFaqs(), getZones(), getPublicMenu()])
  const ln = longNoticeNote(products.filter((p) => p.available), general.leadHours)
  return (
    <section className="section" style={{ paddingTop: 26 }}>
      <div className="wrap stack" style={{ ['--g' as string]: '44px' }}>
        <div className="stack prose" style={{ ['--g' as string]: '12px' }}>
          <p className="eyebrow">How ordering works</p>
          <h1 style={{ fontSize: 'clamp(2rem,6vw,2.9rem)' }}>Cooked to order, never kept warm</h1>
          <p className="muted">Ozzie only cooks what has been ordered, which is why we ask for notice. Your bowls are cooked for the day you collect or we deliver.</p>
        </div>
        <div className="steps">
          <div className="step"><h3>Order {general.leadHours} hours ahead</h3><p>{ln ? `${ln} ` : ''}The checkout calendar shows the order deadline for every date.</p></div>
          <div className="step"><h3>We cook for your date</h3><p>Soups, stews and rice are cooked for your slot and packed in sealed bowls.</p></div>
          <div className="step"><h3>Collect or get delivery</h3><p>Collect from the kitchen or choose a delivery window anywhere in our delivery area.</p></div>
        </div>
        <div id="faq" className="prose">
          <h2>Questions</h2>
          {faqs.map((f) => (
            <details key={f.id} className="faq"><summary>{f.question}</summary><p>{fillTokens(f.answer, general, zones)}</p></details>
          ))}
        </div>
        <div id="contact" className="two">
          <div className="panel stack" style={{ ['--g' as string]: '14px' }}>
            <h2>Contact us</h2>
            <ContactBlock g={general} />
            <p className="small muted">Email: <a href={`mailto:${general.contact.email}`}>{general.contact.email}</a></p>
          </div>
          <div className="panel stack"><h3>Collection</h3><p>{general.collection.address}</p><p className="small muted">{general.collection.instructions}</p></div>
        </div>
      </div>
    </section>
  )
}
