'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Product, Season, SizeCode } from '@/lib/types'
import { SEASONS } from '@/lib/types'
import { includedText, priceLine } from '@/lib/pricing'
import { itemLead } from '@/lib/schedule'
import { money } from '@/lib/money'
import { DOW_LONG } from '@/lib/time'
import { BowlIcon } from './Photo'
import { sameChoice, useBasket } from './basket'

interface Props {
  product: Product
  categoryName: string
  defaultLead: number
  showServes: boolean
  allergenNote: string
  kitchenNote: string
  editIndex: number | null
}

export function DishOptions({ product: p, categoryName, defaultLead, showServes, allergenNote, kitchenNote, editIndex }: Props) {
  const basket = useBasket()
  const router = useRouter()
  const [size, setSize] = useState<SizeCode>(p.sizes[0]?.size ?? '2L')
  const [swapId, setSwapId] = useState<string | null>(null)
  const [extraIds, setExtraIds] = useState<string[]>([])
  const [seasoning, setSeasoning] = useState<Season | null>(null)
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')
  const [addedKey, setAddedKey] = useState<string | null>(null)

  // Editing a basket line: start from its choices.
  useEffect(() => {
    if (editIndex == null || !basket.ready) return
    const l = basket.lines[editIndex]
    if (!l || l.productId !== p.id) return
    setSize(l.size); setSwapId(l.swapId ?? null); setExtraIds(l.extraIds); setSeasoning((l.seasoning as Season) ?? null); setNote(l.note ?? ''); setQty(l.qty)
  }, [editIndex, basket.ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const sz = p.sizes.find((s) => s.size === size)
  const swaps = p.proteins.filter((x) => x.kind === 'swap')
  const adds = p.proteins.filter((x) => x.kind === 'add')
  const line = { productId: p.id, size, swapId, extraIds, seasoning: seasoning ?? (p.seasoning_enabled ? 'Mild' : null), note, qty } as const
  const price = useMemo(() => {
    const r = priceLine(p, { ...line, extraIds: [...extraIds] })
    return r.ok ? r.item.line_pence : 0
  }, [p, size, swapId, extraIds, seasoning, qty]) // eslint-disable-line react-hooks/exhaustive-deps
  // How many with exactly these choices are already in the basket, so repeat taps are obvious.
  const current = { productId: p.id, size, swapId, extraIds: [...extraIds].sort(), seasoning: p.seasoning_enabled ? seasoning : null, note: note.trim(), qty }
  const choiceKey = JSON.stringify({ ...current, qty: 0 })
  const inBasket = basket.lines.find((l) => sameChoice(l, current))?.qty ?? 0
  const added = addedKey === choiceKey && inBasket > 0
  const included = sz?.included || p.included
  const lead = itemLead(p, sz, defaultLead)

  function submit() {
    if (p.seasoning_enabled && !seasoning) {
      setError('Choose Mild, Medium or Hot.')
      document.getElementById('season-mild')?.focus()
      return
    }
    const l = { productId: p.id, size, swapId, extraIds: [...extraIds].sort(), seasoning: p.seasoning_enabled ? seasoning : null, note: note.trim(), qty }
    if (editIndex != null && basket.lines[editIndex]?.productId === p.id) {
      basket.replace(editIndex, l)
      router.push('/basket')
      return
    }
    basket.add(l)
    setAddedKey(choiceKey)
  }

  return (
    <div className="stack" style={{ ['--g' as string]: '22px' }}>
      <div className="stack" style={{ ['--g' as string]: '8px' }}>
        <span className="eyebrow">{categoryName}</span>
        <h1 style={{ fontSize: 'clamp(2rem,6vw,2.8rem)' }}>{p.name}</h1>
        <p className="muted">{p.description}</p>
      </div>
      {!p.available ? <div className="alert bad">Sold out for now. Check back soon or choose another dish.</div> : null}

      <fieldset className="group">
        <legend>Size<span className="req">Required</span></legend>
        <div className="sizes">
          {p.sizes.map((s) => (
            <button key={s.id} type="button" className="size" aria-pressed={s.size === size} onClick={() => setSize(s.size)}>
              <BowlIcon width={28 + parseFloat(s.size) * 9} />
              <b>{s.size}</b>
              <span className="price">{money(s.price_pence)}</span>
              {showServes && s.serves ? <small>{s.serves}</small> : null}
              {itemLead(p, s, defaultLead) > defaultLead ? <small>{itemLead(p, s, defaultLead)}h notice</small> : null}
            </button>
          ))}
        </div>
        <p className="included" aria-live="polite">
          <span><b>{includedText(p, sz?.included)}</b>{included ? ' in the base price.' : '. Add one below if you like.'}</span>
        </p>
      </fieldset>

      {swaps.length ? (
        <fieldset className="group">
          <legend>Protein<span className="req">Optional</span></legend>
          <div className="opt-list">
            <label className="opt"><input type="radio" name="swap" checked={!swapId} onChange={() => setSwapId(null)} /><span className="grow">As standard{included ? ` (${included})` : ''}</span><span className="price">Included</span></label>
            {swaps.map((s) => (
              <label key={s.id} className="opt"><input type="radio" name="swap" checked={swapId === s.id} onChange={() => setSwapId(s.id)} /><span className="grow">{s.name}</span><span className="price">{s.price_pence ? `+${money(s.price_pence)}` : 'No charge'}</span></label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {adds.length ? (
        <fieldset className="group">
          <legend>Extra protein<span className="req">Optional</span></legend>
          <div className="opt-list">
            {adds.map((a) => (
              <label key={a.id} className="opt">
                <input type="checkbox" checked={extraIds.includes(a.id)} onChange={(e) => setExtraIds((x) => (e.target.checked ? [...x, a.id] : x.filter((y) => y !== a.id)))} />
                <span className="grow">{a.name}</span><span className="price">+{money(a.price_pence)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {p.seasoning_enabled ? (
        <fieldset className="group" aria-describedby={error ? 'season-err' : undefined}>
          <legend>Seasoning<span className="req">Required</span></legend>
          <div className="seg3">
            {SEASONS.map((s) => (
              <button key={s} id={`season-${s.toLowerCase()}`} type="button" aria-pressed={seasoning === s} onClick={() => { setSeasoning(s); setError('') }}>
                {s}{p.season_prices?.[s] ? <small>+{money(p.season_prices[s])}</small> : null}
              </button>
            ))}
          </div>
          {error ? <p id="season-err" className="err" role="alert">{error}</p> : null}
        </fieldset>
      ) : null}

      {p.allow_notes ? (
        <div className="fld">
          <label htmlFor="note">Special instructions <span className="opt-tx">optional</span></label>
          <input id="note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Pack the meat separately" />
        </div>
      ) : null}

      <section className="allergen-block" aria-labelledby="alg">
        <h4 id="alg">Allergen information</h4>
        <p><b>Contains:</b> {p.allergens.length ? p.allergens.join(', ') : 'none of the 14 major allergens'}.</p>
        <p className="small muted">This doesn’t change with the options you choose. {kitchenNote} {allergenNote}</p>
      </section>

      <p className="small muted">Needs <b>{lead} hours’</b> notice{p.cook_days.length ? `. Cooked on ${p.cook_days.map((d) => `${DOW_LONG[d]}s`).join(' and ')} only` : ''}.</p>

      <div className="order-bar">
        <div className="row" style={{ ['--g' as string]: '12px', flexWrap: 'nowrap' }}>
          <div className="qty" role="group" aria-label="Quantity">
            <button type="button" aria-label="Fewer" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="num" aria-live="polite">{qty}</span>
            <button type="button" aria-label="More" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
          </div>
          <button type="button" className="btn btn-order grow" style={{ justifyContent: 'space-between' }} disabled={!p.available || !sz} onClick={submit}>
            <span>{editIndex != null ? 'Update basket' : added ? (qty > 1 ? `Add ${qty} more` : 'Add another') : 'Add to basket'}</span><span className="num" aria-live="polite">{money(price)}</span>
          </button>
        </div>
        {added ? (
          <p className="small" role="status" style={{ marginTop: 10 }}>
            ✓ You have <b>{inBasket}</b> of {inBasket === 1 ? 'this' : 'these'} in your basket. <a className="link" href="/basket">View basket</a> or <a className="link" href="/menu">keep browsing</a>.
          </p>
        ) : null}
      </div>
    </div>
  )
}
