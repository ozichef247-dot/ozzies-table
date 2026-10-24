import type { GeneralSettings } from '@/lib/types'
import { whatsappLink } from '@/lib/text'

export function ContactBlock({ g, orderRef }: { g: GeneralSettings; orderRef?: string }) {
  const msg = orderRef ? `Hello Ozzie’s Table, I have a question about order ${orderRef}.` : 'Hello Ozzie’s Table, I have a question.'
  return (
    <div className="contact">
      <p>Questions? Call or WhatsApp us. To order, use the website so your slot is booked and paid.</p>
      <div className="nums num">
        <span>Call <a href={`tel:${g.contact.phone.replace(/\s/g, '')}`}>{g.contact.phone}</a></span>
        <span>WhatsApp {g.contact.whatsappDisplay}</span>
      </div>
      <div><a className="btn btn-quiet btn-sm" href={whatsappLink(g.contact.whatsapp, msg)} target="_blank" rel="noopener">Message us on WhatsApp</a></div>
    </div>
  )
}
