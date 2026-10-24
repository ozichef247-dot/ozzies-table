import 'server-only'
import { env } from './env'

const API_VERSION = '2024-09-01'
const base = () => (env.revolutMode() === 'prod' ? 'https://merchant.revolut.com' : 'https://sandbox-merchant.revolut.com')

export type RevolutOrderState = 'pending' | 'processing' | 'authorised' | 'completed' | 'cancelled' | 'failed'

export interface RevolutOrder {
  id: string
  token: string
  state: RevolutOrderState
  amount: number
  currency: string
  payments?: { payment_method?: { type?: string } }[]
}

async function call<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.revolutSecret()}`,
    'Revolut-Api-Version': API_VERSION,
    Accept: 'application/json',
  }
  if (init.body) headers['Content-Type'] = 'application/json'
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey
  const res = await fetch(`${base()}${path}`, { ...init, headers, cache: 'no-store' })
  const text = await res.text()
  if (!res.ok) throw new Error(`Revolut ${init.method ?? 'GET'} ${path} failed (${res.status}): ${text.slice(0, 300)}`)
  return (text ? JSON.parse(text) : {}) as T
}

/**
 * Create an order with manual capture: the customer's card is authorised at checkout,
 * and the money is only taken once the server has confirmed the slot is still theirs.
 */
export function createRevolutOrder(o: {
  amountPence: number
  reference: string
  description: string
  email: string
  fullName: string
  phone: string
  redirectUrl: string
}) {
  return call<RevolutOrder>('/api/orders', {
    method: 'POST',
    idempotencyKey: `create-${o.reference}-${o.amountPence}-${Date.now()}`,
    body: JSON.stringify({
      amount: o.amountPence,
      currency: 'GBP',
      capture_mode: 'manual',
      cancel_authorised_after: 'P1D',
      description: o.description,
      merchant_order_data: { reference: o.reference },
      metadata: { order_ref: o.reference },
      redirect_url: o.redirectUrl,
      customer: { email: o.email, full_name: o.fullName, phone: o.phone },
    }),
  })
}

export const getRevolutOrder = (id: string) => call<RevolutOrder>(`/api/orders/${id}`)

export const captureRevolutOrder = (id: string) =>
  call<RevolutOrder>(`/api/orders/${id}/capture`, { method: 'POST', idempotencyKey: `capture-${id}` })

export const cancelRevolutOrder = (id: string) =>
  call<RevolutOrder>(`/api/orders/${id}/cancel`, { method: 'POST', idempotencyKey: `cancel-${id}` })

export function refundRevolutOrder(id: string, amountPence: number, reason: string, key: string) {
  return call<RevolutOrder>(`/api/orders/${id}/refund`, {
    method: 'POST',
    idempotencyKey: key,
    body: JSON.stringify({ amount: amountPence, currency: 'GBP', description: reason.slice(0, 100) }),
  })
}

export function paymentMethodLabel(o: RevolutOrder) {
  const t = o.payments?.[o.payments.length - 1]?.payment_method?.type?.toLowerCase() ?? ''
  if (t.includes('apple')) return 'Apple Pay'
  if (t.includes('google')) return 'Google Pay'
  if (t.includes('revolut')) return 'Revolut Pay'
  if (t.includes('card')) return 'Card'
  return t ? t.replace(/_/g, ' ') : 'Card'
}

export { verifyRevolutSignature } from './revolut-signature'
