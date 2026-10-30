import 'server-only'
import { z } from 'zod'
import { db } from './supabase/admin'
import { env } from './env'
import { findPromo, getProducts, getScheduleContext, getSettings, getSlots, getZones } from './data'
import { applyPromo, basketLineSchema, computeTotals, priceLine } from './pricing'
import { checkPostcode } from './postcode'
import { dishesNotCookedOn, itemLead, slotState } from './schedule'
import { todayUK } from './time'
import type { Order, OrderItem, OrderStatus } from './types'
import { OPEN_STATUSES } from './types'
import {
  cancelRevolutOrder, captureRevolutOrder, createRevolutOrder, getRevolutOrder, paymentMethodLabel,
  refundRevolutOrder, type RevolutOrder,
} from './revolut'
import { cancelledEmail, confirmationEmail, outEmail, ownerAlertEmail, readyEmail, sendMessage } from './email'
import { money } from './money'

export const checkoutSchema = z.object({
  lines: z.array(basketLineSchema).min(1, 'Your basket is empty.').max(30),
  method: z.enum(['collection', 'delivery']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
  slotId: z.string().uuid('Choose a time.'),
  postcode: z.string().max(10).optional().default(''),
  first: z.string().trim().min(1, 'Enter your first name.').max(60),
  last: z.string().trim().min(1, 'Enter your last name.').max(60),
  email: z.string().trim().email('Enter an email address like name@example.com.').max(120),
  phone: z.string().trim().refine((v) => v.replace(/\D/g, '').length >= 10, 'Enter a mobile number with at least 10 digits.'),
  line1: z.string().trim().max(120).optional().default(''),
  line2: z.string().trim().max(120).optional().default(''),
  town: z.string().trim().max(60).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  promo: z.string().trim().max(30).optional().default(''),
  consent: z.literal(true, { message: 'Tick to agree to the terms before paying.' }),
  existing: z.object({ ref: z.string(), token: z.string() }).nullable().optional(),
})
export type CheckoutInput = z.infer<typeof checkoutSchema>

export type CheckoutResult =
  | { ok: true; ref: string; viewToken: string; publicToken: string; holdUntil: string; totalPence: number; paymentRequired: boolean }
  | { ok: false; message: string; fields?: Record<string, string> }

const fullName = (o: Pick<Order, 'customer_first' | 'customer_last'>) => `${o.customer_first} ${o.customer_last}`

async function loadOrder(id: string) {
  const { data } = await db().from('orders').select('*, order_items(*)').eq('id', id).single()
  return data as (Order & { order_items: OrderItem[] }) | null
}

async function logEvent(orderId: string, status: string, detail = '', actor = 'system') {
  await db().from('order_events').insert({ order_id: orderId, status, detail, actor })
}

/**
 * Validate the basket and details, recalculate every price on the server, hold the slot, and open a Revolut payment.
 * Nothing the browser says about prices, notice or capacity is trusted.
 */
export async function startCheckout(raw: unknown): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message
    return { ok: false, message: 'Check the highlighted details.', fields }
  }
  const input = parsed.data
  const fields: Record<string, string> = {}

  // A retry from the same browser reuses its unpaid order instead of creating a second one.
  let existing: Order | null = null
  if (input.existing) {
    const { data } = await db().from('orders').select('*').eq('ref', input.existing.ref).eq('view_token', input.existing.token).maybeSingle()
    if (data && data.status === 'pending') existing = data as Order
  }

  const [{ general }, products, zones, slots, ctx] = await Promise.all([
    getSettings(), getProducts(), getZones(), getSlots(), getScheduleContext(existing?.id),
  ])

  // Price every line from the database.
  const items: OrderItem[] = []
  for (const line of input.lines) {
    const r = priceLine(products.find((p) => p.id === line.productId), line)
    if (!r.ok) return { ok: false, message: r.error }
    items.push(r.item)
  }
  const basketProducts = input.lines.map((l) => products.find((p) => p.id === l.productId)!)
  const lead = Math.max(
    ...input.lines.map((l, i) => itemLead(basketProducts[i], basketProducts[i].sizes.find((s) => s.size === l.size), general.leadHours)),
  )

  // Fulfilment and delivery area.
  let zone = null
  let postcode: string | null = null
  if (input.method === 'delivery') {
    const pc = checkPostcode(input.postcode, zones)
    if (!pc.ok) fields.postcode = pc.kind === 'area' ? `${pc.message} You can still collect from our kitchen.` : pc.message
    else {
      zone = pc.zone
      postcode = pc.postcode
    }
    if (!input.line1) fields.line1 = 'Enter the first line of the address.'
    if (!input.town) fields.town = 'Enter a town.'
  }

  // Date and slot: notice, cooking days, closures and capacity.
  const slot = slots.find((s) => s.id === input.slotId && s.method === input.method)
  if (!slot) fields.slotId = 'That time is no longer offered. Choose another.'
  else {
    const st = slotState(ctx, input.date, slot, lead, dishesNotCookedOn(basketProducts, input.date))
    if (!st.ok) fields.slotId = `That time is no longer available (${st.why.toLowerCase()}). Choose another.`
  }

  // Discount and totals.
  const subtotal = items.reduce((s, i) => s + i.line_pence, 0)
  let discount = 0
  let promoCode: string | null = null
  if (input.promo) {
    const r = applyPromo(await findPromo(input.promo), subtotal, todayUK())
    if (r.ok) {
      discount = r.amount
      promoCode = r.promo.code
    } else fields.promo = r.error
  }
  const totals = computeTotals(items, discount, input.method, zone, general)
  if (totals.shortBy > 0)
    return { ok: false, message: `Delivery orders need a minimum of ${money(general.minDeliveryPence)}. Add ${money(totals.shortBy)} more, or choose collection.` }
  if (Object.keys(fields).length) return { ok: false, message: 'Check the highlighted details.', fields }

  // Hold the slot (atomic in the database; refuses if someone else just took the last place).
  const orderRow = {
    method: input.method, fulfil_date: input.date, slot_id: slot!.id,
    slot_label: `${slot!.start_time}–${slot!.end_time}`, slot_start: slot!.start_time,
    customer_first: input.first, customer_last: input.last, customer_email: input.email.toLowerCase(), customer_phone: input.phone,
    address_line1: input.method === 'delivery' ? input.line1 : null,
    address_line2: input.method === 'delivery' ? input.line2 || null : null,
    town: input.method === 'delivery' ? input.town : null,
    postcode, notes: input.notes,
    subtotal_pence: totals.subtotal, discount_pence: totals.discount, promo_code: promoCode,
    delivery_fee_pence: totals.fee, total_pence: totals.total,
  }
  const { data: held, error } = await db().rpc('reserve_order', {
    p_order: orderRow, p_items: items, p_existing: existing?.id ?? null,
    p_hold_minutes: general.holdMinutes, p_daily_cap: general.dailyCap,
  })
  if (error) {
    if (error.message.includes('SLOT_FULL'))
      return { ok: false, message: 'Someone has just taken the last place in that slot. Choose another time.', fields: { slotId: 'Fully booked. Choose another time.' } }
    if (error.message.includes('ORDER_NOT_PENDING')) return startCheckout({ ...input, existing: null })
    throw new Error(error.message)
  }
  const h = (held as { r_id: string; r_ref: string; r_view_token: string; r_hold_until: string }[])[0]

  // Online payment switched off: confirm the order straight away and email it to the business.
  if (!env.paymentsEnabled()) {
    const { data: result, error: cErr } = await db().rpc('try_confirm_order', { p_order: h.r_id, p_daily_cap: general.dailyCap })
    if (cErr) throw new Error(cErr.message)
    if (result !== 'confirmed' && result !== 'already')
      return { ok: false, message: 'Someone has just taken the last place in that slot. Choose another time.', fields: { slotId: 'Fully booked. Choose another time.' } }
    await db().from('orders').update({ payment_method: 'Not paid online' }).eq('id', h.r_id)
    await db().from('order_events').update({ detail: 'Order placed (online payment switched off)' }).eq('order_id', h.r_id).eq('status', 'confirmed')
    await sendOrderToBusiness(h.r_id)
    return { ok: true, ref: h.r_ref, viewToken: h.r_view_token, publicToken: '', holdUntil: h.r_hold_until, totalPence: totals.total, paymentRequired: false }
  }

  // Open a Revolut payment for the exact server-calculated total.
  if (existing?.revolut_order_id) await cancelRevolutOrder(existing.revolut_order_id).catch(() => {})
  try {
    const rev = await createRevolutOrder({
      amountPence: totals.total,
      reference: h.r_ref,
      description: `Ozzie's Table ${h.r_ref}`,
      email: orderRow.customer_email,
      fullName: `${input.first} ${input.last}`,
      phone: input.phone,
      redirectUrl: `${env.siteUrl()}/order/${h.r_ref}?t=${h.r_view_token}`,
    })
    await db().from('orders').update({ revolut_order_id: rev.id, revolut_token: rev.token, payment_status: 'pending' }).eq('id', h.r_id)
    return { ok: true, ref: h.r_ref, viewToken: h.r_view_token, publicToken: rev.token, holdUntil: h.r_hold_until, totalPence: totals.total, paymentRequired: true }
  } catch (e) {
    console.error(e)
    await db().from('orders').update({ status: 'expired', hold_until: null }).eq('id', h.r_id)
    await logEvent(h.r_id, 'expired', 'Payment could not be started')
    return { ok: false, message: 'We couldn’t start the payment just now. Nothing was charged. Please try again in a minute.' }
  }
}

/** Record the payment as taken and send the confirmation and owner alert, once per order. */
async function markPaidAndNotify(orderId: string, method: string) {
  const { data: changed } = await db().from('orders').update({ payment_status: 'paid', payment_method: method })
    .eq('id', orderId).in('payment_status', ['pending', 'authorised', 'failed']).select('id')
  if (!changed?.length) return // already marked paid (or refunded) by another request
  await logEvent(orderId, 'paid', `Payment taken (${method})`)
  await sendConfirmation(orderId)
}

/** Email the full order and customer details to the business's order email (Dashboard → Delivery). */
async function sendOrderToBusiness(orderId: string) {
  const [o, { general }] = await Promise.all([loadOrder(orderId), getSettings()])
  if (!o) return
  const to = general.contact.email
  if (!to) {
    await logEvent(orderId, o.status, 'No order email set in Dashboard → Delivery, so the order email was not sent')
    return
  }
  const a = ownerAlertEmail(o, o.order_items, `${env.siteUrl()}/admin/orders/${o.id}`)
  await sendMessage({ orderId, to, replyTo: o.customer_email, ...a })
}

async function sendConfirmation(orderId: string) {
  const [o, { general, content }] = await Promise.all([loadOrder(orderId), getSettings()])
  if (!o) return
  const orderUrl = `${env.siteUrl()}/order/${o.ref}?t=${o.view_token}`
  const c = confirmationEmail(o, o.order_items, general, content, orderUrl)
  const a = ownerAlertEmail(o, o.order_items, `${env.siteUrl()}/admin/orders/${o.id}`)
  await Promise.all([
    sendMessage({ orderId, to: o.customer_email, ...c }),
    general.contact.email ? sendMessage({ orderId, to: general.contact.email, replyTo: o.customer_email, ...a }) : null,
  ])
}

/**
 * Bring our order in line with Revolut's record. Revolut is the source of truth for money; we re-fetch it rather
 * than trusting webhook bodies or browser callbacks. Safe to call repeatedly and concurrently.
 */
export async function syncPayment(order: Order, rev?: RevolutOrder) {
  if (!order.revolut_order_id) return
  rev ??= await getRevolutOrder(order.revolut_order_id)
  const method = paymentMethodLabel(rev)
  const { general } = await getSettings()

  if (rev.state === 'authorised') {
    const { data: result, error } = await db().rpc('try_confirm_order', { p_order: order.id, p_daily_cap: general.dailyCap })
    if (error) throw new Error(error.message)
    if (result === 'confirmed' || result === 'already') {
      await db().from('orders').update({ payment_status: 'authorised', payment_method: method }).eq('id', order.id).eq('payment_status', 'pending')
      if (result === 'confirmed') await logEvent(order.id, 'authorised', `Payment authorised (${method})`)
      // Take the money. Capture is idempotent; if it fails, Revolut's webhook retry or the next status check tries again.
      await captureRevolutOrder(rev.id).catch(async (e) => {
        const now = await getRevolutOrder(rev.id)
        if (now.state !== 'completed' && now.state !== 'processing') throw e
      })
      await markPaidAndNotify(order.id, method)
    } else if (result === 'full' || result === 'cancelled') {
      await cancelRevolutOrder(rev.id)
      await db().from('orders').update({ status: 'cancelled', payment_status: 'voided', payment_method: method, hold_until: null }).eq('id', order.id)
      await logEvent(order.id, 'cancelled', result === 'full' ? 'Slot filled before payment finished; authorisation cancelled, no charge' : 'Order was cancelled; authorisation released')
      if (result === 'full') {
        const fresh = await loadOrder(order.id)
        if (fresh) await sendMessage({ orderId: order.id, to: fresh.customer_email, ...cancelledEmail(fresh, general, 'slot_full') })
      }
    }
    return
  }

  if (rev.state === 'completed' || rev.state === 'processing') {
    if (order.status === 'pending' || order.status === 'expired') {
      // Paid without passing through our capture step: confirm if there is room, otherwise refund in full.
      const { data: result } = await db().rpc('try_confirm_order', { p_order: order.id, p_daily_cap: general.dailyCap })
      if (result === 'full') {
        await refundRevolutOrder(rev.id, rev.amount, 'Slot filled before payment finished', `refund-full-${rev.id}`)
        await db().from('orders').update({ status: 'cancelled', payment_status: 'refunded', refunded_pence: rev.amount, payment_method: method }).eq('id', order.id)
        await logEvent(order.id, 'cancelled', 'Slot filled before payment finished; refunded automatically')
        const fresh = await loadOrder(order.id)
        if (fresh) await sendMessage({ orderId: order.id, to: fresh.customer_email, ...cancelledEmail(fresh, general, 'slot_full') })
        return
      }
      await markPaidAndNotify(order.id, method)
      return
    }
    if (order.status !== 'cancelled') await markPaidAndNotify(order.id, method)
    return
  }

  if ((rev.state === 'failed' || rev.state === 'cancelled') && order.payment_status === 'pending') {
    // The payment attempt is over. The order keeps its hold until it expires, so the customer can try again.
    await db().from('orders').update({ payment_status: 'failed' }).eq('id', order.id)
  }
}

export async function handleRevolutWebhook(revolutOrderId: string) {
  const { data } = await db().from('orders').select('*').eq('revolut_order_id', revolutOrderId).maybeSingle()
  if (!data) return 'unknown order'
  await syncPayment(data as Order)
  return 'ok'
}

/** Used by the confirmation page: if the webhook hasn't arrived yet, ask Revolut directly. */
export async function reconcile(order: Order) {
  if (order.revolut_order_id && ['pending', 'authorised', 'failed'].includes(order.payment_status) && ['pending', 'expired', 'confirmed'].includes(order.status)) {
    try {
      await syncPayment(order)
    } catch (e) {
      console.error('reconcile failed', e)
    }
  }
}

// ============ Dashboard actions ============

const NEXT: Record<string, (o: Order) => OrderStatus | undefined> = {
  confirmed: () => 'scheduled',
  scheduled: () => 'preparing',
  preparing: (o) => (o.method === 'delivery' ? 'out' : 'ready'),
  ready: () => 'completed',
  out: () => 'completed',
}
export const nextStatus = (o: Order) => NEXT[o.status]?.(o)

export async function advanceOrder(orderId: string, actor: string) {
  const o = await loadOrder(orderId)
  if (!o) throw new Error('Order not found')
  const next = nextStatus(o)
  if (!next) return
  await db().from('orders').update({ status: next }).eq('id', orderId).eq('status', o.status)
  await logEvent(orderId, next, '', actor)
  const { general } = await getSettings()
  if (next === 'ready' && general.notify.ready) {
    await sendMessage({ orderId, to: o.customer_email, ...readyEmail(o, general) })
    if (general.notify.sms) await sendMessage({ orderId, to: o.customer_phone, channel: 'sms', subject: `Order ${o.ref} is ready to collect`, text: '' })
  }
  if (next === 'out' && general.notify.out) {
    await sendMessage({ orderId, to: o.customer_email, ...outEmail(o) })
    if (general.notify.sms) await sendMessage({ orderId, to: o.customer_phone, channel: 'sms', subject: `Order ${o.ref} is on its way`, text: '' })
  }
}

/** Cancel an order: refunds a paid order in full, or releases an authorisation without charging. */
export async function cancelOrder(orderId: string, actor: string) {
  const o = await loadOrder(orderId)
  if (!o || !(OPEN_STATUSES as string[]).concat('pending').includes(o.status)) throw new Error('This order can’t be cancelled.')
  let payment = o.payment_status
  let refunded = o.refunded_pence
  if (o.revolut_order_id) {
    if (o.payment_status === 'paid' || o.payment_status === 'partially_refunded') {
      const amount = o.total_pence - o.refunded_pence
      if (amount > 0) await refundRevolutOrder(o.revolut_order_id, amount, `Order ${o.ref} cancelled`, `refund-cancel-${o.id}`)
      payment = 'refunded'
      refunded = o.total_pence
    } else if (o.payment_status === 'authorised' || o.payment_status === 'pending') {
      await cancelRevolutOrder(o.revolut_order_id).catch(() => {})
      payment = 'voided'
    }
  }
  await db().from('orders').update({ status: 'cancelled', payment_status: payment, refunded_pence: refunded, hold_until: null }).eq('id', orderId)
  await logEvent(orderId, 'cancelled', payment === 'refunded' ? `Refunded ${money(refunded)}` : '', actor)
  const { general } = await getSettings()
  await sendMessage({ orderId, to: o.customer_email, ...cancelledEmail({ ...o, payment_status: payment }, general, 'owner') })
}

export async function partialRefund(orderId: string, amountPence: number, actor: string) {
  const o = await loadOrder(orderId)
  if (!o || !o.revolut_order_id) throw new Error('Order not found')
  if (!['paid', 'partially_refunded'].includes(o.payment_status)) throw new Error('Only paid orders can be refunded.')
  const left = o.total_pence - o.refunded_pence
  if (amountPence <= 0 || amountPence > left) throw new Error(`Refund must be between £0.01 and ${money(left)}.`)
  await refundRevolutOrder(o.revolut_order_id, amountPence, `Partial refund for ${o.ref}`, `refund-${o.id}-${o.refunded_pence}-${amountPence}`)
  const refunded = o.refunded_pence + amountPence
  await db().from('orders').update({ refunded_pence: refunded, payment_status: refunded >= o.total_pence ? 'refunded' : 'partially_refunded' }).eq('id', orderId)
  await logEvent(orderId, o.status, `Refunded ${money(amountPence)}`, actor)
}

export async function moveOrder(orderId: string, slotId: string, actor: string) {
  const [o, slots] = await Promise.all([loadOrder(orderId), getSlots(true)])
  const s = slots.find((x) => x.id === slotId)
  if (!o || !s || s.method !== o.method) throw new Error('Choose a slot of the same type.')
  const label = `${s.start_time}–${s.end_time}`
  await db().from('orders').update({ slot_id: s.id, slot_label: label, slot_start: s.start_time }).eq('id', orderId)
  await logEvent(orderId, o.status, `Moved to ${label}`, actor)
}
