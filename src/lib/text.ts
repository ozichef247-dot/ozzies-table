import type { GeneralSettings, Zone } from './types'
import { money } from './money'

/** Replace {tokens} in owner-written text with live settings, so FAQs and policies never go out of date. */
export function fillTokens(text: string, s: GeneralSettings, zones: Zone[]) {
  const areas = zones.flatMap((z) => z.outcodes)
  const minFee = zones.length ? Math.min(...zones.map((z) => z.fee_pence)) : 0
  const map: Record<string, string> = {
    notice: String(s.leadHours),
    cancel: String(s.cancelHours),
    min: money(s.minDeliveryPence),
    free: money(s.freeOverPence),
    fee: money(minFee),
    phone: s.contact.phone,
    whatsapp: s.contact.whatsappDisplay,
    areas: areas.length ? `${areas.join(', ')} in Peterborough` : 'no areas yet',
    address: s.collection.address,
  }
  return String(text || '').replace(/\{(\w+)\}/g, (m, k) => map[k] ?? m)
}

export const paragraphs = (t: string) => String(t || '').split(/\n+/).map((x) => x.trim()).filter(Boolean)

export const whatsappLink = (number: string, msg: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}
