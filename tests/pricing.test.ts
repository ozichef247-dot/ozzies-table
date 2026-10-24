import { describe, expect, it } from 'vitest'
import { applyPromo, computeTotals, itemMeta, priceLine } from '@/lib/pricing'
import { checkPostcode } from '@/lib/postcode'
import { fillTokens } from '@/lib/text'
import type { GeneralSettings, Product, Promo, Zone } from '@/lib/types'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const egusi: Product = {
  id: uuid(1), category_id: uuid(9), slug: 'egusi', name: 'Egusi Soup', description: '', included: 'assorted beef and stockfish', photo_url: null,
  available: true, featured: false, allow_notes: true, lead_hours: null, cook_days: [], seasoning_enabled: true,
  season_prices: { Mild: 0, Medium: 0, Hot: 150 }, allergens: ['Fish'], tags: [], sort: 0,
  sizes: [
    { id: uuid(11), product_id: uuid(1), size: '2L', price_pence: 3800, lead_hours: null, included: null, serves: null },
    { id: uuid(12), product_id: uuid(1), size: '5L', price_pence: 8600, lead_hours: 72, included: 'double beef', serves: null },
  ],
  proteins: [
    { id: uuid(21), product_id: uuid(1), name: 'Swap to goat meat', price_pence: 400, kind: 'swap', sort: 1 },
    { id: uuid(22), product_id: uuid(1), name: 'Extra stockfish', price_pence: 500, kind: 'add', sort: 2 },
  ],
}

describe('pricing on the server', () => {
  it('adds size, protein swap, extras and seasoning charge', () => {
    const r = priceLine(egusi, { productId: egusi.id, size: '2L', swapId: uuid(21), extraIds: [uuid(22)], seasoning: 'Hot', note: '', qty: 2 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.item.unit_pence).toBe(3800 + 400 + 500 + 150)
    expect(r.item.line_pence).toBe(2 * 4850)
    expect(itemMeta(r.item)).toEqual(['2 litres', 'Protein: Swap to goat meat (+£4.00)', 'Extra: Extra stockfish (+£5.00)', 'Seasoning: Hot (+£1.50)'])
  })
  it('states the included protein per size', () => {
    const r = priceLine(egusi, { productId: egusi.id, size: '5L', extraIds: [], seasoning: 'Mild', note: '', qty: 1 })
    expect(r.ok && r.item.included_text).toBe('Includes double beef')
  })
  it('requires seasoning, refuses sold-out dishes and tampered options', () => {
    expect(priceLine(egusi, { productId: egusi.id, size: '2L', extraIds: [], note: '', qty: 1 }).ok).toBe(false)
    expect(priceLine({ ...egusi, available: false }, { productId: egusi.id, size: '2L', extraIds: [], seasoning: 'Mild', note: '', qty: 1 }).ok).toBe(false)
    expect(priceLine(egusi, { productId: egusi.id, size: '2L', swapId: uuid(22), extraIds: [], seasoning: 'Mild', note: '', qty: 1 }).ok).toBe(false)
    expect(priceLine(egusi, { productId: egusi.id, size: '3L', extraIds: [], seasoning: 'Mild', note: '', qty: 1 }).ok).toBe(false)
  })
})

const settings = { minDeliveryPence: 3000, freeOverPence: 8000, thresholdBasis: 'after' } as GeneralSettings
const zone: Zone = { id: 'z', name: 'Central', outcodes: ['PE1', 'PE2'], fee_pence: 400, sort: 1 }

describe('delivery thresholds use one figure', () => {
  it('after discount: both minimum and free delivery judged after discount', () => {
    const t = computeTotals([{ line_pence: 8500 }], 1000, 'delivery', zone, settings)
    expect(t).toMatchObject({ subtotal: 8500, discount: 1000, basisAmount: 7500, fee: 400, total: 7900, shortBy: 0 })
  })
  it('before discount: both judged before discount', () => {
    const t = computeTotals([{ line_pence: 8500 }], 1000, 'delivery', zone, { ...settings, thresholdBasis: 'before' })
    expect(t).toMatchObject({ fee: 0, total: 7500 })
    const s = computeTotals([{ line_pence: 3200 }], 500, 'delivery', zone, settings)
    expect(s.shortBy).toBe(300)
  })
  it('collection has no fee or minimum', () => {
    expect(computeTotals([{ line_pence: 1000 }], 0, 'collection', null, settings)).toMatchObject({ fee: 0, shortBy: 0, total: 1000 })
  })
})

describe('promo codes', () => {
  const promo: Promo = { id: 'p', code: 'FIRSTBOWL', kind: 'pct', value: 10, min_pence: 4000, starts_on: '2026-10-01', ends_on: '2026-12-31', usage_limit: 2, used_count: 0, active: true }
  it('applies percentage and checks dates, minimum and limit', () => {
    expect(applyPromo(promo, 5000, '2026-10-14')).toMatchObject({ ok: true, amount: 500 })
    expect(applyPromo(promo, 3000, '2026-10-14')).toMatchObject({ ok: false, soft: true })
    expect(applyPromo(promo, 5000, '2027-01-01').ok).toBe(false)
    expect(applyPromo({ ...promo, used_count: 2 }, 5000, '2026-10-14').ok).toBe(false)
    expect(applyPromo({ ...promo, kind: 'fixed', value: 9999 }, 5000, '2026-10-14')).toMatchObject({ amount: 5000 })
  })
})

describe('postcodes and live text', () => {
  it('checks format and delivery area', () => {
    expect(checkPostcode('pe2 5rt', [zone])).toMatchObject({ ok: true, postcode: 'PE2 5RT' })
    expect(checkPostcode('PE9 1AA', [zone])).toMatchObject({ ok: false, kind: 'area' })
    expect(checkPostcode('hello', [zone])).toMatchObject({ ok: false, kind: 'format' })
  })
  it('fills {tokens} from settings', () => {
    const g = { ...settings, leadHours: 48, cancelHours: 24, contact: { phone: '01733 000000', whatsappDisplay: '', whatsapp: '', email: '' }, collection: { address: 'X', instructions: '' } } as GeneralSettings
    expect(fillTokens('Order {notice}h ahead, cancel {cancel}h before, min {min}, areas {areas}', g, [zone]))
      .toBe('Order 48h ahead, cancel 24h before, min £30.00, areas PE1, PE2 in Peterborough')
  })
})
