'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import RevolutCheckout from '@revolut/checkout'
import type { GeneralSettings, Method, OrderItem, Product, Zone } from '@/lib/types'
import { computeTotals, priceLine } from '@/lib/pricing'
import { checkPostcode, formatPostcode } from '@/lib/postcode'
import { money } from '@/lib/money'
import { DOW, DOW_LONG, MON, dow, fmtDate, fmtShortWall, fmtWall } from '@/lib/time'
import { useBasket } from './basket'
import { SummaryLines } from './OrderSummary'

interface Props {
  products: Product[]
  zones: Zone[]
  settings: Pick<GeneralSettings, 'minDeliveryPence' | 'freeOverPence' | 'thresholdBasis' | 'cancelHours' | 'collection'> & { phone: string }
  revolut: { mode: 'prod' | 'sandbox'; publicKey: string }
  paymentsEnabled: boolean
  offlineNote: string
}

type Day = { date: string; ok: boolean; why?: string; deadline?: number }
type SlotOpt = { id: string; start: string; end: string; ok: boolean; why?: string; left?: number; deadline?: number }
type Fields = Record<string, string>

export function CheckoutForm({ products, zones, settings, revolut, paymentsEnabled, offlineNote }: Props) {
  const b = useBasket()
  const router = useRouter()
  const [method, setMethod] = useState<Method>('collection')
  const [postcode, setPostcode] = useState('')
  const [date, setDate] = useState<string | null>(null)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [days, setDays] = useState<Day[]>([])
  const [slots, setSlots] = useState<SlotOpt[]>([])
  const [lead, setLead] = useState<number | null>(null)
  const [blocked, setBlocked] = useState<string[]>([])
  const [d, setD] = useState({ first: '', last: '', email: '', phone: '', line1: '', line2: '', town: 'Peterborough', notes: '' })
  const [consent, setConsent] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [fields, setFields] = useState<Fields>({})
  const [alert, setAlert] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pay, setPay] = useState<null | { ref: string; viewToken: string; publicToken: string; holdUntil: string; totalPence: number }>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const widgetRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  // Start from the postcode check and promo chosen earlier.
  useEffect(() => {
    if (!b.ready) return
    setMethod(b.prefs.method)
    setPostcode(b.prefs.postcode)
  }, [b.ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => b.lines.map((l) => priceLine(products.find((p) => p.id === l.productId), { ...l, seasoning: l.seasoning ?? undefined })).filter((r) => r.ok).map((r) => (r as { ok: true; item: OrderItem }).item), [b.lines, products])
  const pc = method === 'delivery' && postcode ? checkPostcode(postcode, zones) : null
  const zone = pc && pc.ok ? pc.zone : null
  const totals = computeTotals(items, discount, method, zone, settings)

  // Promo from the basket page is re-checked against the current basket.
  useEffect(() => {
    if (!b.ready || !b.prefs.promo || !b.lines.length) { setDiscount(0); return }
    fetch('/api/promo', { method: 'POST', body: JSON.stringify({ code: b.prefs.promo, lines: b.lines }) })
      .then((r) => r.json()).then((r) => setDiscount(r.ok ? r.amountPence : 0)).catch(() => setDiscount(0))
  }, [b.ready, b.prefs.promo, b.lines])

  const loadAvailability = useCallback(async (forDate: string | null) => {
    if (!b.lines.length) return
    const r = await fetch('/api/availability', { method: 'POST', body: JSON.stringify({ method, date: forDate, lines: b.lines.map((l) => ({ productId: l.productId, size: l.size })) }) })
    if (!r.ok) return
    const j = await r.json()
    setDays(j.days); setLead(j.lead); setSlots(j.slots); setBlocked(j.blocked)
    return j as { days: Day[]; slots: SlotOpt[] }
  }, [b.lines, method])

  useEffect(() => {
    if (!b.ready) return
    loadAvailability(date).then((j) => {
      if (!j) return
      if (date && !j.days.find((x) => x.date === date)?.ok) { setDate(null); setSlotId(null) }
      if (slotId && !j.slots.find((s) => s.id === slotId)?.ok) setSlotId(null)
    })
  }, [b.ready, method, date, loadAvailability]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown for the slot hold while paying.
  useEffect(() => {
    if (!pay) return
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(pay.holdUntil).getTime() - Date.now()) / 1000))
      setSecondsLeft(s)
      if (s === 0) {
        dialogRef.current?.close()
        setPay(null)
        setAlert('Your slot hold ran out before payment finished. Nothing was charged. Choose a time again.')
        setSlotId(null)
        loadAvailability(date)
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [pay]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mount Revolut's embedded checkout once a payment has been opened.
  useEffect(() => {
    if (!pay || !widgetRef.current) return
    dialogRef.current?.showModal()
    let instance: { destroy: () => void } | null = null
    let cancelled = false
    RevolutCheckout.embeddedCheckout({
      mode: revolut.mode,
      publicToken: revolut.publicKey,
      target: widgetRef.current,
      locale: 'en',
      email: d.email,
      createOrder: async () => ({ publicId: pay.publicToken }),
      onSuccess: () => {
        setPlaced(true)
        b.clear(); b.setPrefs({ pending: null, promo: '' })
        router.push(`/order/${pay.ref}?t=${pay.viewToken}`)
      },
      onError: ({ error }) => setAlert(`${error?.message || 'The payment didn’t go through.'} Nothing was charged. Your slot is still held, so you can try again.`),
      onCancel: () => {},
    }).then((i) => { if (cancelled) i.destroy(); else instance = i }).catch((e) => {
      console.error(e)
      setAlert('The payment form couldn’t load. Check your connection and try again. Nothing was charged.')
      dialogRef.current?.close(); setPay(null)
    })
    return () => { cancelled = true; instance?.destroy() }
  }, [pay]) // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof typeof d>(k: K, v: string) {
    setD((x) => ({ ...x, [k]: v }))
    if (fields[k]) setFields((f) => { const n = { ...f }; delete n[k]; return n })
  }

  const [placed, setPlaced] = useState(false)

  async function submit() {
    setAlert(null)
    // Email is required: the customer's copy of the order is sent there.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) {
      const msg = d.email.trim() ? 'Enter an email address like name@example.com.' : 'Enter your email address. We send your order details there.'
      setFields((f) => ({ ...f, email: msg }))
      setAlert('Please check the highlighted details.')
      requestAnimationFrame(() => { const el = document.getElementById('co-email'); el?.focus(); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }) })
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          lines: b.lines, method, date, slotId, postcode, ...d, consent, promo: b.prefs.promo || '', existing: b.prefs.pending,
        }),
      })
      const j = await res.json()
      if (!j.ok) {
        setFields(j.fields ?? {})
        setAlert(j.message)
        requestAnimationFrame(() => {
          const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
          ;(first ?? alertRef.current)?.focus()
          ;(first ?? alertRef.current)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        })
        if (j.fields?.slotId) loadAvailability(date)
        return
      }
      if (!j.paymentRequired) {
        // Online payment is switched off: the order is placed and emailed to the business.
        setPlaced(true) // show "Opening your order…" rather than an empty basket while the page changes
        b.clear()
        b.setPrefs({ pending: null, promo: '', method, postcode: method === 'delivery' ? formatPostcode(postcode) : b.prefs.postcode })
        router.push(`/order/${j.ref}?t=${j.viewToken}`)
        return
      }
      b.setPrefs({ pending: { ref: j.ref, token: j.viewToken }, method, postcode: method === 'delivery' ? formatPostcode(postcode) : b.prefs.postcode })
      setPay(j)
    } catch {
      setAlert('We couldn’t reach the server. Check your connection and try again. Nothing was charged.')
    } finally {
      setBusy(false)
    }
  }

  if (placed) return <section className="section"><div className="wrap"><p className="muted">Order placed. Opening your order…</p></div></section>
  if (!b.ready) return <section className="section"><div className="wrap"><p className="muted">Loading…</p></div></section>
  if (!b.lines.length)
    return <section className="section"><div className="wrap stack" style={{ maxWidth: 560 }}><h1 style={{ fontSize: '2.2rem' }}>Your basket is empty</h1><div><Link className="btn btn-order" href="/menu">Order food</Link></div></div></section>

  const slot = slots.find((s) => s.id === slotId)
  const area = settings.collection.address.split(',').slice(-1)[0].trim()
  const minFee = zones.length ? Math.min(...zones.map((z) => z.fee_pence)) : 0
  const err = (k: string) => (fields[k] ? <p className="err" id={`${k}-err`}>{fields[k]}</p> : null)
  const inv = (k: string) => (fields[k] ? { 'aria-invalid': true as const, 'aria-describedby': `${k}-err` } : {})
  const field = (label: string, k: keyof typeof d, o: { type?: string; ac?: string; opt?: boolean; hint?: string; im?: 'email' | 'tel' } = {}) => (
    <div className="fld">
      <label htmlFor={`co-${k}`}>{label}{o.opt ? <span className="opt-tx"> optional</span> : null}</label>
      <input id={`co-${k}`} type={o.type ?? 'text'} autoComplete={o.ac} inputMode={o.im} value={d[k]} onChange={(e) => set(k, e.target.value)} {...inv(k)} />
      {o.hint ? <p className="hint">{o.hint}</p> : null}
      {err(k)}
    </div>
  )

  return (
    <section className="section" style={{ paddingTop: 26 }}>
      <div className="wrap two">
        <div className="stack" style={{ ['--g' as string]: '22px' }}>
          <div className="row between"><h1 style={{ fontSize: 'clamp(2rem,6vw,2.7rem)' }}>Checkout</h1><Link className="link" href="/basket">Back to basket</Link></div>
          {alert ? <div ref={alertRef} tabIndex={-1} className="alert bad" role="alert">{alert}</div> : null}

          <div className="panel stepblock">
            <h3><span className="n">1</span>Collection or delivery</h3>
            <div className="segm" role="group" aria-label="Collection or delivery">
              <button type="button" aria-pressed={method === 'collection'} onClick={() => { setMethod('collection'); setSlotId(null) }}><b>Collect</b><span>Free · {area}</span></button>
              <button type="button" aria-pressed={method === 'delivery'} onClick={() => { setMethod('delivery'); setSlotId(null) }}><b>Delivery</b><span>From {money(minFee)} · min {money(settings.minDeliveryPence)}</span></button>
            </div>
            {method === 'collection' ? (
              <div className="alert plain small"><b>Collect from:</b> {settings.collection.address}<br />{settings.collection.instructions}</div>
            ) : (
              <>
                <div className="fld">
                  <label htmlFor="co-postcode">Delivery postcode</label>
                  <input id="co-postcode" className="inp" value={postcode} onChange={(e) => { setPostcode(e.target.value); setFields((f) => ({ ...f, postcode: '' })) }} onBlur={() => setPostcode(formatPostcode(postcode))} autoComplete="postal-code" placeholder="e.g. PE1 2AB" style={{ textTransform: 'uppercase' }} {...inv('postcode')} />
                  {fields.postcode ? err('postcode') : pc ? (pc.ok
                    ? <p className="hint" style={{ color: 'var(--ok)', fontWeight: 600 }}>We deliver to {pc.postcode}: {money(pc.zone.fee_pence)}, free over {money(settings.freeOverPence)}.</p>
                    : <p className="err">{pc.message}{pc.kind === 'area' ? ' You can still collect from our kitchen.' : ''}</p>) : <p className="hint">We check this before you pay.</p>}
                </div>
                {totals.shortBy > 0 ? <div className="alert warn small">Delivery orders need a minimum of {money(settings.minDeliveryPence)}. Add {money(totals.shortBy)} more, or switch to collection.</div> : null}
              </>
            )}
          </div>

          <div className="panel stepblock">
            <h3><span className="n">2</span>Choose a date</h3>
            <p className="small muted">{lead != null ? <>Your basket needs at least <b>{lead} hours’</b> notice. </> : null}Each date shows the latest time to order. All times UK.</p>
            <div className="days" role="group" aria-label="Dates">
              {days.map((x) => (
                <button key={x.date} type="button" className={`day${x.why === 'Fully booked' ? ' full' : ''}`} disabled={!x.ok} aria-pressed={date === x.date}
                  aria-label={`${fmtDate(x.date, true)}, ${x.ok ? `order by ${fmtWall(x.deadline!)}` : x.why}`}
                  onClick={() => { setDate(x.date); setSlotId(null); setFields((f) => ({ ...f, date: '' })) }}>
                  <span className="dw">{DOW[dow(x.date)]}</span>
                  <span className="dn num">{+x.date.slice(8)}</span>
                  <span className="dw" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 600 }}>{MON[+x.date.slice(5, 7) - 1]}</span>
                  <span className="st num">{x.ok ? <>Order by<br />{fmtShortWall(x.deadline!)}</> : x.why}</span>
                </button>
              ))}
            </div>
            {err('date')}
          </div>

          <div className="panel stepblock">
            <h3><span className="n">3</span>Choose a time</h3>
            {!date ? <p className="muted">Pick a date first.</p> : blocked.length ? (
              <div className="alert warn small">{blocked.join(', ')} {blocked.length > 1 ? 'aren’t' : 'isn’t'} cooked on {DOW_LONG[dow(date)]}s. Choose another day or remove {blocked.length > 1 ? 'them' : 'it'}.</div>
            ) : slots.length && slots.every((s) => !s.ok) ? (
              <div className="alert warn small">No {method} times left on {fmtDate(date)}. Try {method === 'delivery' ? 'collection' : 'delivery'} or another date.</div>
            ) : null}
            {date ? (
              <div className="opt-list">
                {slots.map((s) => (
                  <label key={s.id} className={`opt${s.ok ? '' : ' dis'}`}>
                    <input type="radio" name="slot" checked={slotId === s.id} disabled={!s.ok} onChange={() => { setSlotId(s.id); setFields((f) => ({ ...f, slotId: '' })) }} />
                    <span className="grow"><b className="num">{s.start}–{s.end}</b><br /><span className="small muted num">{s.ok ? `Order by ${fmtWall(s.deadline!)}` : method === 'delivery' ? 'Delivery window' : 'Collection'}</span></span>
                    {s.ok ? (s.left! <= 2 ? <span className="pill warn">{s.left} left</span> : <span className="pill ok">Available</span>) : <span className={`pill ${s.why === 'Fully booked' ? 'bad' : 'muted'}`}>{s.why}</span>}
                  </label>
                ))}
              </div>
            ) : null}
            {err('slotId')}
          </div>

          <div className="panel stepblock">
            <h3><span className="n">4</span>Your details</h3>
            <div className="f2">
              {field('First name', 'first', { ac: 'given-name' })}
              {field('Last name', 'last', { ac: 'family-name' })}
              {field('Email', 'email', { type: 'email', ac: 'email', im: 'email', hint: 'Required. We email your order details here.' })}
              {field('Mobile number', 'phone', { type: 'tel', ac: 'tel', im: 'tel', hint: 'Only used about this order.' })}
            </div>
            {method === 'delivery' ? (
              <div className="f2">
                {field('Address line 1', 'line1', { ac: 'address-line1' })}
                {field('Address line 2', 'line2', { ac: 'address-line2', opt: true })}
                {field('Town', 'town', { ac: 'address-level2' })}
                <div className="fld"><label htmlFor="co-pc-ro">Postcode</label><input id="co-pc-ro" className="inp" value={formatPostcode(postcode)} disabled /></div>
              </div>
            ) : null}
            <div className="fld">
              <label htmlFor="co-notes">Order notes <span className="opt-tx">optional</span></label>
              <textarea id="co-notes" rows={3} maxLength={500} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Gate code, or call when outside" />
              <p className="hint">Allergy requests can’t be handled through notes. Call us on {settings.phone} before ordering if you have an allergy.</p>
            </div>
          </div>

          <div className="panel stepblock">
            <h3><span className="n">5</span>{paymentsEnabled ? 'Pay' : 'Place your order'}</h3>
            <label className="check">
              <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setFields((f) => ({ ...f, consent: '' })) }} {...inv('consent')} />
              <span>I agree to the <Link className="link" href="/policies" target="_blank">terms and cancellation policy</Link>. Orders can be cancelled for a full refund up to {settings.cancelHours} hours before the slot.</span>
            </label>
            {err('consent')}
            {err('promo')}
            <button type="button" className="btn btn-order btn-block" disabled={busy} onClick={submit}>
              {busy
                ? <><span className="spinner" aria-hidden="true" /> {paymentsEnabled ? 'Holding your slot…' : 'Placing your order…'}</>
                : paymentsEnabled ? `Continue to payment · ${money(totals.total)}` : `Place order · ${money(totals.total)}`}
            </button>
            {paymentsEnabled
              ? <p className="small muted">Pay by card, Apple Pay, Google Pay or Revolut Pay on the next step. Wallets appear when your device supports them. Card details go straight to Revolut; we never see or store them.</p>
              : <p className="small muted">No payment is taken online. {offlineNote}</p>}
          </div>
        </div>

        <div className="aside">
          <div className="panel stack" style={{ ['--g' as string]: '6px' }}>
            <h3 style={{ marginBottom: 6 }}>Order summary</h3>
            <div className="alert plain small" style={{ marginBottom: 8 }}>
              {date ? `${method === 'delivery' ? 'Delivery' : 'Collection'} · ${fmtDate(date)}${slot ? ` · ${slot.start}–${slot.end}` : ' · choose a time'}` : 'No date chosen yet'}
            </div>
            <SummaryLines items={items} />
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 6 }} />
            <div className="sumrow"><span>Subtotal</span><span className="num">{money(totals.subtotal)}</span></div>
            {totals.discount ? <div className="sumrow" style={{ color: 'var(--ok)' }}><span>Discount ({b.prefs.promo})</span><span className="num">−{money(totals.discount)}</span></div> : null}
            <div className="sumrow"><span>{method === 'delivery' ? 'Delivery' : 'Collection'}</span><span className="num">{method === 'delivery' ? (zone ? (totals.fee ? money(totals.fee) : 'Free') : 'Add postcode') : 'Free'}</span></div>
            <div className="sumrow total"><span>Total</span><span className="num">{money(totals.total)}</span></div>
          </div>
        </div>
      </div>

      <dialog ref={dialogRef} className="sheet" aria-labelledby="pay-title" style={{ padding: 0, border: 0 }} onCancel={(e) => e.preventDefault()}>
        <div className="sheet-hd">
          <div><b id="pay-title">Secure payment</b><p className="small muted">{pay?.ref} · {pay ? money(pay.totalPence) : ''}</p></div>
          <button className="x" aria-label="Close payment" onClick={() => { dialogRef.current?.close(); setPay(null) }}>×</button>
        </div>
        <div className="sheet-body pad stack" style={{ ['--g' as string]: '14px' }}>
          <div className="alert ok small">We’re holding your <b>{date ? fmtDate(date) : ''}{slot ? `, ${slot.start}–${slot.end}` : ''}</b> slot for <b className="num">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</b> while you pay.</div>
          {alert && pay ? <div className="alert bad small" role="alert">{alert}</div> : null}
          <div id="revolut-checkout" ref={widgetRef} />
        </div>
      </dialog>
    </section>
  )
}
