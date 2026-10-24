import 'server-only'
import { db } from './supabase/admin'
import type { Order, OrderItem } from './types'
import { LIVE_STATUSES } from './types'
import { addDays, dow, todayUK } from './time'

export type Period = '7' | '30' | '90' | 'up' | 'all'
export type Group = 'day' | 'week' | 'month'

export async function reportOrders(period: Period) {
  const t = todayUK()
  let q = db().from('orders').select('*, order_items(*)').in('status', LIVE_STATUSES).order('fulfil_date')
  if (period === 'up') q = q.gte('fulfil_date', t)
  else if (period !== 'all') q = q.lte('fulfil_date', t).gte('fulfil_date', addDays(t, -Number(period)))
  const { data, error } = await q.limit(10000)
  if (error) throw new Error(error.message)
  return (data ?? []) as (Order & { order_items: OrderItem[] })[]
}

export const weekStart = (d: string) => addDays(d, -((dow(d) + 6) % 7))
export const groupKey = (d: string, g: Group) => (g === 'week' ? weekStart(d) : g === 'month' ? d.slice(0, 7) : d)

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export function toCsv(orders: (Order & { order_items: OrderItem[] })[]) {
  const head = ['ref', 'created_at', 'fulfil_date', 'slot', 'method', 'status', 'customer', 'email', 'phone', 'postcode', 'items', 'subtotal', 'discount', 'promo', 'delivery_fee', 'total', 'refunded', 'payment_status', 'payment_method', 'revolut_order_id']
  const rows = orders.map((o) => [
    o.ref, o.created_at, o.fulfil_date, o.slot_label, o.method, o.status, `${o.customer_first} ${o.customer_last}`, o.customer_email, o.customer_phone, o.postcode ?? '',
    o.order_items.map((i) => `${i.qty}x ${i.name} [${[i.size_label, i.protein_swap || i.included_text, ...i.extras, i.seasoning && `Seasoning: ${i.seasoning}`, i.note && `Note: ${i.note}`].filter(Boolean).join('; ')}]`).join(' | '),
    (o.subtotal_pence / 100).toFixed(2), (o.discount_pence / 100).toFixed(2), o.promo_code ?? '', (o.delivery_fee_pence / 100).toFixed(2),
    (o.total_pence / 100).toFixed(2), (o.refunded_pence / 100).toFixed(2), o.payment_status, o.payment_method ?? '', o.revolut_order_id ?? '',
  ])
  return [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n')
}
