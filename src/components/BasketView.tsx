'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { GeneralSettings, OrderItem, Product } from '@/lib/types'
import { priceLine } from '@/lib/pricing'
import { money } from '@/lib/money'
import { useBasket } from './basket'
import { ItemMeta, SummaryLines } from './OrderSummary'
import { Photo } from './Photo'

type S = Pick<GeneralSettings, 'minDeliveryPence' | 'freeOverPence' | 'thresholdBasis'>

export function BasketView({ products, settings }: { products: Product[]; settings: S }) {
  const b = useBasket()
  const [promoIn, setPromoIn] = useState(b.prefs.promo)
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [discount, setDiscount] = useState(0)

  const priced = useMemo(
    () => b.lines.map((l) => ({ l, p: products.find((x) => x.id === l.productId), r: priceLine(products.find((x) => x.id === l.productId), { ...l, seasoning: l.seasoning ?? undefined }) })),
    [b.lines, products],
  )
  const items = priced.filter((x) => x.r.ok).map((x) => (x.r as { ok: true; item: OrderItem }).item)
  const subtotal = items.reduce((s, i) => s + i.line_pence, 0)
  const problems = priced.filter((x) => !x.r.ok)

  async function applyPromo() {
    if (!promoIn.trim()) { setPromoMsg({ ok: false, text: 'Enter a code.' }); return }
    const r = await (await fetch('/api/promo', { method: 'POST', body: JSON.stringify({ code: promoIn, lines: b.lines }) })).json()
    if (r.ok) { b.setPrefs({ promo: r.code }); setDiscount(r.amountPence); setPromoMsg({ ok: true, text: `${r.code} applied: −${money(r.amountPence)}.` }) }
    else { if (!r.soft) b.setPrefs({ promo: '' }); setDiscount(0); setPromoMsg({ ok: false, text: r.error }) }
  }

  if (!b.ready) return <section className="section"><div className="wrap"><p className="muted">Loading your basket…</p></div></section>
  if (!b.lines.length)
    return (
      <section className="section">
        <div className="wrap stack" style={{ ['--g' as string]: '16px', maxWidth: 560 }}>
          <h1 style={{ fontSize: '2.3rem' }}>Your basket is empty</h1>
          <p className="muted">Choose a bowl or two. You pick the date and time at checkout.</p>
          <div><Link className="btn btn-order" href="/menu">Order food</Link></div>
        </div>
      </section>
    )

  const basis = settings.thresholdBasis === 'before' ? subtotal : subtotal - discount
  return (
    <section className="section" style={{ paddingTop: 26 }}>
      <div className="wrap two">
        <div className="stack" style={{ ['--g' as string]: '14px' }}>
          <h1 style={{ fontSize: 'clamp(2rem,6vw,2.7rem)' }}>Basket</h1>
          <div className="panel" style={{ paddingBlock: 4 }}>
            {priced.map(({ l, p, r }, i) => (
              <div key={i} className="line">
                <Photo src={p?.photo_url} alt={p?.name ?? 'Dish'} sizes="72px" />
                <div className="stack" style={{ ['--g' as string]: '4px', minWidth: 0 }}>
                  <b>{p?.name ?? 'Dish no longer available'}</b>
                  {r.ok ? <ItemMeta item={r.item} /> : <span className="err">{r.error}</span>}
                  <div className="row" style={{ marginTop: 8 }}>
                    <div className="qty" role="group" aria-label={`Quantity of ${p?.name ?? 'dish'}`}>
                      <button aria-label="Fewer" onClick={() => b.setQty(i, l.qty - 1)}>−</button>
                      <span className="num">{l.qty}</span>
                      <button aria-label="More" onClick={() => b.setQty(i, l.qty + 1)}>+</button>
                    </div>
                    {p ? <Link className="link small" href={`/menu/${p.slug}?edit=${i}`}>Edit</Link> : null}
                    <button className="link small bad" onClick={() => b.remove(i)}>Remove</button>
                  </div>
                </div>
                <span className="num" style={{ fontWeight: 700 }}>{r.ok ? money(r.item.line_pence) : ''}</span>
              </div>
            ))}
          </div>
          <div className="panel stack">
            <div className="fld">
              <label htmlFor="promo">Promo code</label>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input id="promo" className="inp grow" value={promoIn} onChange={(e) => setPromoIn(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applyPromo() }} placeholder="e.g. FIRSTBOWL" style={{ textTransform: 'uppercase' }} />
                <button className="btn btn-quiet btn-sm" onClick={applyPromo}>Apply</button>
              </div>
              {promoMsg ? <p className={promoMsg.ok ? 'hint' : 'err'} style={promoMsg.ok ? { color: 'var(--ok)', fontWeight: 600 } : undefined} role="status">{promoMsg.text}</p> : null}
            </div>
          </div>
          <div className="alert plain small">
            Delivery needs a minimum order of {money(settings.minDeliveryPence)} {settings.thresholdBasis === 'before' ? 'before' : 'after'} discounts
            {basis < settings.minDeliveryPence ? ` (you’re ${money(settings.minDeliveryPence - basis)} short)` : ''}. Free delivery over {money(settings.freeOverPence)}. Collection has no minimum.
          </div>
        </div>
        <div className="aside stack">
          <div className="panel stack" style={{ ['--g' as string]: '6px' }}>
            <h3 style={{ marginBottom: 6 }}>Order summary</h3>
            <SummaryLines items={items} />
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 6 }} />
            <div className="sumrow"><span>Subtotal</span><span className="num">{money(subtotal)}</span></div>
            {discount ? <div className="sumrow" style={{ color: 'var(--ok)' }}><span>Discount</span><span className="num">−{money(discount)}</span></div> : null}
            <p className="small muted">Delivery charge, if any, is added at checkout.</p>
          </div>
          <Link className="btn btn-order btn-block" href="/checkout" aria-disabled={problems.length > 0} onClick={(e) => { if (problems.length) e.preventDefault() }}>Choose date and check out</Link>
          <Link className="btn btn-quiet btn-block" href="/menu">Add more food</Link>
        </div>
      </div>
    </section>
  )
}
