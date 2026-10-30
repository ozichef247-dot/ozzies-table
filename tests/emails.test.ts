import { describe, expect, it } from 'vitest'
import { orderReceivedEmail, ownerAlertEmail } from '@/lib/email'
import type { ContentSettings, GeneralSettings, Order, OrderItem } from '@/lib/types'

const g = {
  cancelHours: 48, offlinePaymentNote: 'We’ll text you our bank details to pay before your slot.',
  contact: { phone: '01733 000000', whatsappDisplay: '07700 900000', whatsapp: '447700900000', email: 'orders@ozziestable.com' },
  collection: { address: 'Ozzie’s kitchen, Peterborough PE2', instructions: 'Give your order number at the door.' },
} as GeneralSettings
const c = { themeLine: 'Tradition in every bite, from our pot to your table' } as ContentSettings
const o = {
  id: 'x', ref: 'OT-1042', method: 'delivery', fulfil_date: '2026-11-06', slot_label: '12:00–14:00',
  customer_first: 'Ada', customer_last: 'Okafor', customer_email: 'ada@example.com', customer_phone: '07700 900123',
  address_line1: '12 Thorpe Road', address_line2: null, town: 'Peterborough', postcode: 'PE3 6JF', notes: 'Ring the bell',
  subtotal_pence: 4250, discount_pence: 0, promo_code: null, delivery_fee_pence: 400, total_pence: 4650, payment_status: 'pending',
} as Order
const items: OrderItem[] = [{
  product_id: null, name: 'Egusi Soup', size_label: '2 litres', included_text: 'Includes assorted beef and stockfish',
  protein_swap: 'Swap to goat meat (+£4.00)', extras: [], seasoning: 'Hot', note: '', qty: 1, unit_pence: 4250, line_pence: 4250,
}]

describe('order emails with online payment off', () => {
  it('tells the customer we will be in touch, with their full order', () => {
    const e = orderReceivedEmail(o, items, g, c, 'https://www.ozziestable.com/order/OT-1042?t=abc')
    expect(e.subject).toBe('We’ve received your order OT-1042 for Fri 6 Nov')
    expect(e.text).toContain('We’ll text you our bank details to pay before your slot.')
    expect(e.text).toContain('No payment has been taken online.')
    expect(e.text).toContain('Deliver to: 12 Thorpe Road, Peterborough, PE3 6JF')
    expect(e.text).toContain('Seasoning: Hot')
    expect(e.text).toContain('Total to pay: £46.50')
  })
  it('gives the business every customer and order detail', () => {
    const e = ownerAlertEmail(o, items, 'https://www.ozziestable.com/admin/orders/x')
    for (const s of ['Name: Ada Okafor', 'Phone: 07700 900123', 'Email: ada@example.com', 'Address: 12 Thorpe Road', 'Customer note: Ring the bell',
      'Protein: Swap to goat meat (+£4.00)', 'Seasoning: Hot', 'Total: £46.50', 'Payment: NOT taken online'])
      expect(e.text).toContain(s)
  })
})
