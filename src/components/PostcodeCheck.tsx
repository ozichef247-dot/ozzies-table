'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useBasket } from './basket'
import { money } from '@/lib/money'
import { fmtDate, fmtWall } from '@/lib/time'

type Result =
  | { ok: true; postcode: string; zone: string; feePence: number; minPence: number; freeOverPence: number; dates: { date: string; deadline: number }[] }
  | { ok: false; kind: string; message: string; postcode?: string; collection: { address: string; next: { date: string; deadline: number } | null } | null }

/** Postcode check before ordering. A successful check is remembered into checkout. */
export function PostcodeCheck({ variant }: { variant: 'panel' | 'bar' }) {
  const { prefs, setPrefs } = useBasket()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Result | null>(null)
  const [editing, setEditing] = useState(false)
  const [collectFrom, setCollectFrom] = useState('')

  /** Leave the check: close the pop-up it sits in (if any) and go to the menu. */
  function goToMenu(el: HTMLElement) {
    el.closest('dialog')?.close()
    router.push('/menu')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function chooseCollection(el: HTMLElement, address: string) {
    setPrefs({ method: 'collection' })
    setRes(null)
    setEditing(false)
    setValue('')
    setCollectFrom(address)
    goToMenu(el)
  }

  async function check(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    try {
      const r = (await (await fetch('/api/postcode', { method: 'POST', body: JSON.stringify({ postcode: value }) })).json()) as Result
      setRes(r)
      if (r.ok) {
        setPrefs({ postcode: r.postcode, method: 'delivery' })
        setEditing(false)
      }
    } catch {
      setRes({ ok: false, kind: 'error', message: 'We couldn’t check that just now. Please try again.', collection: null })
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'bar' && prefs.postcode && prefs.method === 'delivery' && !editing && !res) {
    return (
      <div className="pcbar">
        <div className="row between">
          <span>Delivering to <b>{prefs.postcode}</b>. Delivery charge and dates are confirmed at checkout.</span>
          <button className="link small" onClick={() => { setEditing(true); setValue(prefs.postcode) }}>Change</button>
        </div>
      </div>
    )
  }

  if (variant === 'bar' && collectFrom && !editing && !res) {
    return (
      <div className="pcbar" role="status">
        <div className="row between">
          <span>You’re collecting from <b>{collectFrom}</b>. Choose your dishes below; you’ll pick a collection time at checkout.</span>
          <button className="link small" onClick={() => { setCollectFrom(''); setEditing(true) }}>Check delivery instead</button>
        </div>
      </div>
    )
  }

  const id = variant === 'bar' ? 'pc-bar' : 'pc-panel'
  return (
    <section className={variant === 'bar' ? 'pcbar' : 'stack'} style={{ ['--g' as string]: '12px' }} aria-labelledby={`${id}-title`}>
      {variant === 'bar' ? <h2 id={`${id}-title`}>Do we deliver to you?</h2> : <span id={`${id}-title`} className="vh">Check delivery area</span>}
      <p className="small muted">Enter your postcode to see the delivery charge, minimum order and the next dates you can book. Outside our area? You can still collect.</p>
      <form onSubmit={check} className="fld">
        <label htmlFor={id} style={{ fontWeight: 700 }}>Your postcode</label>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id={id} className="inp grow" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. PE1 2AB" autoComplete="postal-code" style={{ textTransform: 'uppercase' }} />
          <button className="btn btn-ink btn-sm" disabled={busy}>{busy ? <span className="spinner" aria-label="Checking" /> : 'Check'}</button>
        </div>
      </form>
      {res ? (
        res.ok ? (
          <div className="alert ok stack" style={{ ['--g' as string]: '10px' }} role="status">
            <span><b>We deliver to {res.postcode}</b> ({res.zone}).</span>
            <dl className="kv" style={{ color: 'var(--ink)' }}>
              <dt>Delivery charge</dt><dd className="num">{money(res.feePence)}, free over {money(res.freeOverPence)}</dd>
              <dt>Minimum order</dt><dd className="num">{money(res.minPence)}</dd>
            </dl>
            {res.dates.length ? (
              <div className="stack" style={{ ['--g' as string]: '4px', color: 'var(--ink)' }}>
                <span className="eyebrow">Next delivery dates</span>
                <div className="dates-list">
                  {res.dates.map((d) => (
                    <div key={d.date}><b>{fmtDate(d.date)}</b><span className="num">Order by {fmtWall(d.deadline)}</span></div>
                  ))}
                </div>
              </div>
            ) : <span>No delivery dates are open at the moment.</span>}
            {variant === 'panel' ? <div><Link className="btn btn-order" href="/menu" onClick={(e) => e.currentTarget.closest('dialog')?.close()}>Order food</Link></div> : null}
          </div>
        ) : res.kind === 'area' && res.collection ? (
          <div className="alert warn stack" style={{ ['--g' as string]: '8px' }} role="status">
            <span><b>{res.message}</b> Our delivery area doesn’t cover it at the moment.</span>
            <span>You can collect from <b>{res.collection.address}</b>.</span>
            {res.collection.next ? <span className="num">Next collection: {fmtDate(res.collection.next.date)}, order by {fmtWall(res.collection.next.deadline)}.</span> : null}
            <div><button className="btn btn-order btn-sm" onClick={(e) => chooseCollection(e.currentTarget, res.collection!.address)}>Order for collection</button></div>
          </div>
        ) : (
          <p className="err" role="alert">{res.message}</p>
        )
      ) : null}
    </section>
  )
}
