import 'server-only'
import { db } from './supabase/admin'
import { getSettings } from './data'
import { env } from './env'
import type { ContentSettings, GeneralSettings, Order, OrderItem } from './types'
import { itemMeta } from './pricing'
import { money } from './money'
import { fmtDate } from './time'
import { docToText, renderEmail, type Block, type EmailDoc } from './email-layout'

interface Message {
  orderId: string | null
  to: string
  subject: string
  text: string
  channel?: 'email' | 'sms'
  /** Where replies go. Defaults to the business's order email. */
  replyTo?: string
  /** The designed version of the email. Without it, the text is wrapped in the same branded layout. */
  doc?: EmailDoc
}

export async function sendMessage(m: Message) {
  const channel = m.channel ?? 'email'
  const record = { order_id: m.orderId, channel, recipient: m.to, subject: m.subject, body: m.text }
  if (channel === 'sms') {
    await db().from('notifications').insert({ ...record, status: 'skipped', error: 'SMS provider not connected yet' })
    return
  }
  const key = env.resendKey()
  if (!key) {
    await db().from('notifications').insert({ ...record, status: 'skipped', error: 'RESEND_API_KEY not set' })
    return
  }
  try {
    // Replies go to the owner's order email (set in Dashboard → Delivery), not the sending address.
    const { general, content } = await getSettings()
    const doc: EmailDoc = m.doc ?? { preheader: m.subject, heading: m.subject, audience: 'customer', blocks: m.text.split(/\n{2,}/).map((t) => ({ kind: 'p' as const, text: t })) }
    const html = renderEmail(doc, { logo: content.logo, themeLine: content.themeLine, siteUrl: env.siteUrl(), contact: general.contact })
    const replyTo = m.replyTo ? [m.replyTo] : general.contact.email && general.contact.email !== m.to ? [general.contact.email] : undefined
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom(), to: [m.to], reply_to: replyTo, subject: m.subject, text: m.text, html }),
    })
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
    await db().from('notifications').insert({ ...record, status: 'sent' })
  } catch (e) {
    await db().from('notifications').insert({ ...record, status: 'failed', error: String(e instanceof Error ? e.message : e) })
  }
}


// ---------- the emails ----------

type Built = { subject: string; text: string; doc: EmailDoc }
const build = (subject: string, doc: EmailDoc): Built => ({ subject, text: docToText(doc), doc })

const addressLine = (o: Order) => [o.address_line1, o.address_line2, o.town, o.postcode].filter(Boolean).join(', ')
const when = (o: Order) => `${fmtDate(o.fulfil_date, true)}, ${o.slot_label}`

function itemsBlock(o: Order, items: OrderItem[], totalLabel: string): Block {
  const totals: { label: string; value: string; strong?: boolean }[] = [{ label: 'Subtotal', value: money(o.subtotal_pence) }]
  if (o.discount_pence) totals.push({ label: `Discount (${o.promo_code})`, value: `−${money(o.discount_pence)}` })
  if (o.method === 'delivery') totals.push({ label: 'Delivery', value: o.delivery_fee_pence ? money(o.delivery_fee_pence) : 'Free' })
  totals.push({ label: totalLabel, value: money(o.total_pence), strong: true })
  return { kind: 'items', title: 'Your order', items: items.map((i) => ({ qty: i.qty, name: i.name, price: money(i.line_pence), meta: itemMeta(i) })), totals }
}

function fulfilBlock(o: Order, g: GeneralSettings): Block {
  const rows: [string, string][] = [['Order number', o.ref], [o.method === 'delivery' ? 'Delivery' : 'Collection', when(o)]]
  if (o.method === 'delivery') rows.push(['Deliver to', addressLine(o)])
  else rows.push(['Collect from', g.collection.address])
  if (o.notes) rows.push(['Your note', o.notes])
  return { kind: 'details', title: o.method === 'delivery' ? 'Delivery' : 'Collection', rows }
}

export function confirmationEmail(o: Order, items: OrderItem[], g: GeneralSettings, _c: ContentSettings, orderUrl: string) {
  const blocks: Block[] = [
    { kind: 'p', text: `Hello ${o.customer_first}, thank you for your order. It’s booked and paid, and we’ll start cooking for your slot.` },
    fulfilBlock(o, g),
  ]
  if (o.method === 'collection' && g.collection.instructions) blocks.push({ kind: 'small', text: g.collection.instructions })
  const ib = itemsBlock(o, items, `Total paid${o.payment_method ? ` (${o.payment_method})` : ''}`)
  blocks.push(ib, { kind: 'button', label: 'View your order', href: orderUrl })
  const promise = o.method === 'delivery' ? g.notify.out : g.notify.ready
  if (promise) blocks.push({ kind: 'note', text: o.method === 'delivery' ? 'We’ll email you when your order leaves the kitchen.' : 'We’ll email you when it’s ready to collect.' })
  blocks.push({ kind: 'small', text: `Changes and full refunds are possible up to ${g.cancelHours} hours before your slot. Quote ${o.ref}.` })
  return build(`Order ${o.ref} confirmed for ${fmtDate(o.fulfil_date)}, ${o.slot_label}`, {
    audience: 'customer', eyebrow: `Order ${o.ref} · Confirmed`, heading: 'Your order is booked', preheader: `${o.method === 'delivery' ? 'Delivery' : 'Collection'} ${when(o)}`, blocks,
  })
}

export const DEFAULT_OFFLINE_NOTE = 'We’ll contact you to confirm your order and arrange payment.'

/** Sent to the customer when online payment is off: a copy of the order and how we'll be in touch. */
export function orderReceivedEmail(o: Order, items: OrderItem[], g: GeneralSettings, _c: ContentSettings, orderUrl: string) {
  const blocks: Block[] = [
    { kind: 'p', text: `Hello ${o.customer_first}, thank you for your order. We’ve received it and saved your slot.` },
    { kind: 'note', text: `${g.offlinePaymentNote || DEFAULT_OFFLINE_NOTE} No payment has been taken online.` },
    fulfilBlock(o, g),
  ]
  if (o.method === 'collection' && g.collection.instructions) blocks.push({ kind: 'small', text: g.collection.instructions })
  blocks.push(itemsBlock(o, items, 'Total to pay'), { kind: 'button', label: 'View your order', href: orderUrl })
  if (o.method === 'delivery' ? g.notify.out : g.notify.ready)
    blocks.push({ kind: 'small', text: o.method === 'delivery' ? 'We’ll email you when your order leaves the kitchen.' : 'We’ll email you when it’s ready to collect.' })
  blocks.push({ kind: 'small', text: `Need to change something? Changes are possible up to ${g.cancelHours} hours before your slot. Quote ${o.ref}.` })
  return build(`We’ve received your order ${o.ref} for ${fmtDate(o.fulfil_date)}`, {
    audience: 'customer', eyebrow: `Order ${o.ref} · Received`, heading: 'We’ve got your order', preheader: `${o.method === 'delivery' ? 'Delivery' : 'Collection'} ${when(o)}. We’ll be in touch about payment.`, blocks,
  })
}

/** The order email to the business: everything needed to prepare the order and contact the customer. */
export function ownerAlertEmail(o: Order, items: OrderItem[], adminUrl: string) {
  const paid = o.payment_status === 'paid'
  const customer: [string, string][] = [['Name', `${o.customer_first} ${o.customer_last}`], ['Phone', o.customer_phone], ['Email', o.customer_email]]
  const fulfil: [string, string][] = [['Date', fmtDate(o.fulfil_date, true)], ['Time', o.slot_label]]
  if (o.method === 'delivery') fulfil.push(['Address', addressLine(o)])
  if (o.notes) fulfil.push(['Customer note', o.notes])
  const ib = itemsBlock(o, items, 'Total') as Extract<Block, { kind: 'items' }>
  const blocks: Block[] = [
    paid
      ? { kind: 'note', tone: 'ok', text: `Payment: paid online${o.payment_method ? ` (${o.payment_method})` : ''}.` }
      : { kind: 'note', tone: 'warn', text: 'Payment: NOT taken online. Please contact the customer to arrange payment.' },
    { kind: 'details', title: 'Customer', rows: customer },
    { kind: 'details', title: o.method === 'delivery' ? 'Delivery' : 'Collection', rows: fulfil },
    { ...ib, title: 'Order' },
    { kind: 'button', label: 'Open in the dashboard', href: adminUrl },
    { kind: 'small', text: 'Reply to this email to write to the customer.' },
  ]
  return build(`New order ${o.ref}: ${money(o.total_pence)}, ${o.method} ${fmtDate(o.fulfil_date)} ${o.slot_label}`, {
    audience: 'owner', eyebrow: `New order · ${o.method === 'delivery' ? 'Delivery' : 'Collection'}`, heading: `${o.ref} · ${money(o.total_pence)}`,
    preheader: `${o.customer_first} ${o.customer_last}, ${when(o)}`, blocks,
  })
}

export function readyEmail(o: Order, g: GeneralSettings) {
  const blocks: Block[] = [
    { kind: 'p', text: `Hello ${o.customer_first}, your order ${o.ref} is ready and waiting for you.` },
    { kind: 'details', title: 'Collection', rows: [['Where', g.collection.address], ['Your slot', when(o)], ['Order number', o.ref]] },
  ]
  if (g.collection.instructions) blocks.push({ kind: 'note', text: g.collection.instructions })
  return build(`Order ${o.ref} is ready to collect`, { audience: 'customer', eyebrow: `Order ${o.ref}`, heading: 'Ready to collect', preheader: `Collect from ${g.collection.address}`, blocks })
}

export function outEmail(o: Order) {
  return build(`Order ${o.ref} is on its way`, {
    audience: 'customer', eyebrow: `Order ${o.ref}`, heading: 'Your order is on its way', preheader: `Arriving in your ${o.slot_label} window`,
    blocks: [
      { kind: 'p', text: `Hello ${o.customer_first}, your order has left the kitchen and will arrive in your ${o.slot_label} window.` },
      { kind: 'details', title: 'Delivery', rows: [['Arriving', when(o)], ['Address', addressLine(o)], ['Order number', o.ref]] },
    ],
  })
}

export function cancelledEmail(o: Order, _g: GeneralSettings, reason: 'owner' | 'slot_full') {
  const blocks: Block[] = []
  if (reason === 'slot_full') {
    blocks.push(
      { kind: 'p', text: `Hello ${o.customer_first}, we’re sorry: the ${when(o)} slot filled up before your payment went through, so your order ${o.ref} wasn’t placed.` },
      { kind: 'note', text: 'You have not been charged. Any hold on your card will be released by your bank.' },
      { kind: 'p', text: 'You can choose another time on our website.' },
    )
  } else {
    blocks.push({ kind: 'p', text: `Hello ${o.customer_first}, your order ${o.ref} for ${fmtDate(o.fulfil_date, true)} has been cancelled.` })
    if (o.payment_status === 'refunded') blocks.push({ kind: 'note', text: `We have refunded ${money(o.total_pence)}. Refunds usually take 3–5 working days to appear.` })
    if (o.payment_status === 'voided') blocks.push({ kind: 'note', text: 'You have not been charged.' })
  }
  return build(reason === 'slot_full' ? `Order ${o.ref} not placed: slot filled` : `Order ${o.ref} cancelled`, {
    audience: 'customer', eyebrow: `Order ${o.ref}`, heading: reason === 'slot_full' ? 'Your order wasn’t placed' : 'Your order is cancelled', preheader: `Order ${o.ref}`, blocks,
  })
}
