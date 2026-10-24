import { z } from 'zod'
import type { GeneralSettings, OrderItem, Product, Promo, Season, Zone } from './types'
import { SEASONS, SIZES } from './types'
import { money } from './money'

/** What the browser sends: ids and choices only. Prices are always worked out on the server from the database. */
export const basketLineSchema = z.object({
  productId: z.string().uuid(),
  size: z.enum(SIZES),
  swapId: z.string().uuid().nullable().optional(),
  extraIds: z.array(z.string().uuid()).max(20).default([]),
  seasoning: z.enum(SEASONS).nullable().optional(),
  note: z.string().max(300).optional().default(''),
  qty: z.number().int().min(1).max(20),
})
export type BasketLine = z.infer<typeof basketLineSchema>

export const sizeLabel = (size: string) => `${parseFloat(size)} litres`

export function includedText(product: Pick<Product, 'included'>, sizeIncluded: string | null | undefined) {
  const t = (sizeIncluded && sizeIncluded.trim()) || product.included.trim()
  return t ? `Includes ${t}` : 'No protein included'
}

export type PriceResult = { ok: true; item: OrderItem } | { ok: false; error: string }

export function priceLine(product: Product | undefined, line: BasketLine): PriceResult {
  if (!product) return { ok: false, error: 'A dish in your basket is no longer on the menu. Remove it to continue.' }
  if (!product.available) return { ok: false, error: `${product.name} has sold out. Remove it to continue.` }
  const size = product.sizes.find((s) => s.size === line.size)
  if (!size) return { ok: false, error: `${product.name} is no longer offered in ${line.size}. Edit it in your basket.` }
  let unit = size.price_pence
  let swapText = ''
  if (line.swapId) {
    const swap = product.proteins.find((p) => p.id === line.swapId && p.kind === 'swap')
    if (!swap) return { ok: false, error: `A protein choice for ${product.name} has changed. Edit it in your basket.` }
    unit += swap.price_pence
    swapText = swap.price_pence ? `${swap.name} (+${money(swap.price_pence)})` : swap.name
  }
  const extras: string[] = []
  for (const id of new Set(line.extraIds)) {
    const ex = product.proteins.find((p) => p.id === id && p.kind === 'add')
    if (!ex) return { ok: false, error: `An extra for ${product.name} has changed. Edit it in your basket.` }
    unit += ex.price_pence
    extras.push(ex.price_pence ? `${ex.name} (+${money(ex.price_pence)})` : ex.name)
  }
  let seasoning = ''
  if (product.seasoning_enabled) {
    if (!line.seasoning) return { ok: false, error: `Choose Mild, Medium or Hot for ${product.name}.` }
    const sp = product.season_prices?.[line.seasoning as Season] ?? 0
    unit += sp
    seasoning = sp ? `${line.seasoning} (+${money(sp)})` : line.seasoning
  }
  const note = product.allow_notes ? (line.note || '').trim().slice(0, 300) : ''
  return {
    ok: true,
    item: {
      product_id: product.id,
      name: product.name,
      size_label: sizeLabel(size.size),
      included_text: includedText(product, size.included),
      protein_swap: swapText,
      extras,
      seasoning,
      note,
      qty: line.qty,
      unit_pence: unit,
      line_pence: unit * line.qty,
    },
  }
}

/** The one description of an item, used in the basket, checkout, payment, emails, dashboard and kitchen ticket. */
export function itemMeta(i: Pick<OrderItem, 'size_label' | 'protein_swap' | 'included_text' | 'extras' | 'seasoning' | 'note'>) {
  const m = [i.size_label, i.protein_swap ? `Protein: ${i.protein_swap}` : i.included_text]
  for (const e of i.extras) m.push(`Extra: ${e}`)
  if (i.seasoning) m.push(`Seasoning: ${i.seasoning}`)
  if (i.note) m.push(`Note: ${i.note}`)
  return m
}

export type PromoResult = { ok: true; amount: number; promo: Promo } | { ok: false; error: string; soft?: boolean }

export function applyPromo(promo: Promo | undefined | null, subtotal: number, today: string): PromoResult {
  if (!promo || !promo.active) return { ok: false, error: 'That code isn’t valid.' }
  if ((promo.starts_on && today < promo.starts_on) || (promo.ends_on && today > promo.ends_on))
    return { ok: false, error: 'That code has expired.' }
  if (promo.usage_limit != null && promo.used_count >= promo.usage_limit)
    return { ok: false, error: 'That code has reached its usage limit.' }
  if (subtotal < promo.min_pence)
    return { ok: false, error: `Spend ${money(promo.min_pence)} or more to use ${promo.code}.`, soft: true }
  const amount = promo.kind === 'pct' ? Math.round((subtotal * promo.value) / 100) : Math.min(promo.value, subtotal)
  return { ok: true, amount, promo }
}

export interface Totals {
  subtotal: number
  discount: number
  basisAmount: number
  fee: number
  total: number
  shortBy: number
}

/** Delivery minimum and free-delivery threshold are always judged on the same figure (before or after discount, set by the owner). */
export function computeTotals(
  items: Pick<OrderItem, 'line_pence'>[],
  discount: number,
  method: 'collection' | 'delivery',
  zone: Zone | null,
  settings: Pick<GeneralSettings, 'minDeliveryPence' | 'freeOverPence' | 'thresholdBasis'>,
): Totals {
  const subtotal = items.reduce((s, i) => s + i.line_pence, 0)
  const d = Math.min(discount, subtotal)
  const basisAmount = settings.thresholdBasis === 'before' ? subtotal : subtotal - d
  let fee = 0
  if (method === 'delivery' && zone) fee = basisAmount >= settings.freeOverPence ? 0 : zone.fee_pence
  const shortBy = method === 'delivery' ? Math.max(0, settings.minDeliveryPence - basisAmount) : 0
  return { subtotal, discount: d, basisAmount, fee, total: subtotal - d + fee, shortBy }
}
