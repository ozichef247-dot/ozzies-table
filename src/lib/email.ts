import 'server-only'
import { db } from './supabase/admin'
import { env } from './env'
import type { ContentSettings, GeneralSettings, Order, OrderItem } from './types'
import { itemMeta } from './pricing'
import { money } from './money'
import { fmtDate } from './time'

interface Message {
  orderId: string | null
  to: string
  subject: string
  text: string
  channel?: 'email' | 'sms'
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function toHtml(text: string) {
  const body = escapeHtml(text)
    .split('\n')
    .map((l) => (l.startsWith('   ') ? `<div style="padding-left:16px;color:#675F55">${l.trim()}</div>` : `<div>${l || '&nbsp;'}</div>`))
    .join('')
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2A2724;max-width:560px">${body}</div>`
}

/** Send through Resend when a key is set; always keep a copy on the order so the owner can see what went out. */
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
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom(), to: [m.to], subject: m.subject, text: m.text, html: toHtml(m.text) }),
    })
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
    await db().from('notifications').insert({ ...record, status: 'sent' })
  } catch (e) {
    await db().from('notifications').insert({ ...record, status: 'failed', error: String(e instanceof Error ? e.message : e) })
  }
}

const addressLine = (o: Order) => [o.address_line1, o.address_line2, o.town, o.postcode].filter(Boolean).join(', ')

function itemLines(items: OrderItem[]) {
  const L: string[] = []
  for (const i of items) {
    L.push(`${i.qty} × ${i.name} — ${money(i.line_pence)}`)
    for (const m of itemMeta(i)) L.push(`   ${m}`)
  }
  return L
}

export function confirmationEmail(o: Order, items: OrderItem[], g: GeneralSettings, c: ContentSettings, orderUrl: string) {
  const L = [
    `Hello ${o.customer_first},`, '', 'Thank you for your order. It’s booked and paid.', '',
    `Order number: ${o.ref}`,
    `${o.method === 'delivery' ? 'Delivery' : 'Collection'}: ${fmtDate(o.fulfil_date, true)}, ${o.slot_label}`,
  ]
  if (o.method === 'delivery') L.push(`Deliver to: ${addressLine(o)}`)
  else L.push(`Collect from: ${g.collection.address}`, g.collection.instructions)
  L.push('', 'Your order', ...itemLines(items), '', `Subtotal: ${money(o.subtotal_pence)}`)
  if (o.discount_pence) L.push(`Discount (${o.promo_code}): −${money(o.discount_pence)}`)
  if (o.method === 'delivery') L.push(`Delivery: ${o.delivery_fee_pence ? money(o.delivery_fee_pence) : 'Free'}`)
  L.push(`Total paid: ${money(o.total_pence)}${o.payment_method ? ` (${o.payment_method})` : ''}`)
  if (o.notes) L.push('', `Your note: ${o.notes}`)
  const promise = o.method === 'delivery' ? g.notify.out : g.notify.ready
  if (promise) L.push('', o.method === 'delivery' ? 'We’ll email you when your order leaves the kitchen.' : 'We’ll email you when it’s ready to collect.')
  L.push(
    '', `View your order: ${orderUrl}`,
    `Changes and full refunds are possible up to ${g.cancelHours} hours before your slot.`,
    `Questions? Call ${g.contact.phone} or WhatsApp ${g.contact.whatsappDisplay}, quoting ${o.ref}.`,
    '', 'Ozzie’s Table', c.themeLine,
  )
  return { subject: `Order ${o.ref} confirmed for ${fmtDate(o.fulfil_date)}, ${o.slot_label}`, text: L.join('\n') }
}

export function ownerAlertEmail(o: Order, items: OrderItem[], adminUrl: string) {
  const L = [
    `${o.customer_first} ${o.customer_last} · ${o.customer_phone} · ${o.customer_email}`,
    `${o.method === 'delivery' ? `Delivery to ${addressLine(o)}` : 'Collection'} · ${fmtDate(o.fulfil_date, true)}, ${o.slot_label}`,
    '', ...itemLines(items), '', `Total paid: ${money(o.total_pence)}`,
  ]
  if (o.notes) L.push(`Customer note: ${o.notes}`)
  L.push('', `Open in the dashboard: ${adminUrl}`)
  return { subject: `New order ${o.ref}: ${money(o.total_pence)} for ${fmtDate(o.fulfil_date)} ${o.slot_label}`, text: L.join('\n') }
}

export function readyEmail(o: Order, g: GeneralSettings) {
  return {
    subject: `Order ${o.ref} is ready to collect`,
    text: [`Hello ${o.customer_first},`, '', `Your order ${o.ref} is ready to collect from ${g.collection.address}.`, g.collection.instructions, '', 'Ozzie’s Table'].join('\n'),
  }
}

export function outEmail(o: Order) {
  return {
    subject: `Order ${o.ref} is on its way`,
    text: [`Hello ${o.customer_first},`, '', `Your order ${o.ref} has left the kitchen and will arrive in your ${o.slot_label} window.`, '', 'Ozzie’s Table'].join('\n'),
  }
}

export function cancelledEmail(o: Order, g: GeneralSettings, reason: 'owner' | 'slot_full') {
  const L = [`Hello ${o.customer_first},`, '']
  if (reason === 'slot_full') {
    L.push(`We’re sorry: the ${fmtDate(o.fulfil_date, true)} ${o.slot_label} slot filled up before your payment went through, so your order ${o.ref} wasn’t placed.`, 'You have not been charged. Any hold on your card will be released by your bank.', '', 'You can choose another time on our website.')
  } else {
    L.push(`Your order ${o.ref} for ${fmtDate(o.fulfil_date, true)} has been cancelled.`)
    if (o.payment_status === 'refunded') L.push(`We have refunded ${money(o.total_pence)}. Refunds usually take 3–5 working days to appear.`)
    if (o.payment_status === 'voided') L.push('You have not been charged.')
  }
  L.push('', `Questions? Call ${g.contact.phone} or WhatsApp ${g.contact.whatsappDisplay}.`, '', 'Ozzie’s Table')
  return { subject: reason === 'slot_full' ? `Order ${o.ref} not placed: slot filled` : `Order ${o.ref} cancelled`, text: L.join('\n') }
}
