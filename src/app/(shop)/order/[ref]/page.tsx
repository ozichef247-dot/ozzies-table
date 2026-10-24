import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/supabase/admin'
import { reconcile } from '@/lib/orders'
import { getSettings } from '@/lib/data'
import type { Order, OrderItem } from '@/lib/types'
import { LIVE_STATUSES } from '@/lib/types'
import { fmtDate } from '@/lib/time'
import { money } from '@/lib/money'
import { SummaryLines } from '@/components/OrderSummary'
import { ContactBlock } from '@/components/ContactBlock'
import { StatusPoller } from '@/components/StatusPoller'

export const metadata: Metadata = { title: 'Your order · Ozzie’s Table', robots: { index: false } }

async function load(ref: string, token: string) {
  const { data } = await db().from('orders').select('*, order_items(*)').eq('ref', ref).eq('view_token', token).maybeSingle()
  return data as (Order & { order_items: OrderItem[] }) | null
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ ref }, { t = '' }] = await Promise.all([params, searchParams])
  let o = await load(ref, t)
  if (!o) notFound()
  if (o.payment_status !== 'paid' && o.status !== 'cancelled') {
    await reconcile(o)
    o = (await load(ref, t))!
  }
  const { general } = await getSettings()
  const confirmed = (LIVE_STATUSES as string[]).includes(o.status) && o.payment_status !== 'pending'
  const how = general.notify.sms ? 'text and email' : 'email'
  const promise = o.method === 'delivery'
    ? general.notify.out ? `We’ll ${how} you when your order leaves the kitchen.` : ''
    : general.notify.ready ? `We’ll ${how} you when it’s ready to collect.` : ''

  if (!confirmed) {
    const slotFull = o.status === 'cancelled'
    return (
      <section className="section">
        <div className="wrap stack" style={{ ['--g' as string]: '16px', maxWidth: 640 }}>
          {slotFull ? (
            <>
              <h1 style={{ fontSize: '2.2rem' }}>Your order wasn’t placed</h1>
              <p className="muted">The {fmtDate(o.fulfil_date, true)} {o.slot_label} slot filled up before your payment went through. {o.payment_status === 'refunded' ? 'We’ve refunded you in full.' : 'You have not been charged; any hold on your card will be released by your bank.'}</p>
              <div><Link className="btn btn-order" href="/checkout">Choose another time</Link></div>
            </>
          ) : o.status === 'expired' && o.payment_status !== 'authorised' ? (
            <>
              <h1 style={{ fontSize: '2.2rem' }}>Payment not completed</h1>
              <p className="muted">We didn’t receive payment for {o.ref} in time, so the slot was released. Nothing was charged.</p>
              <div><Link className="btn btn-order" href="/checkout">Try again</Link></div>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '2.2rem' }}>Confirming your payment…</h1>
              <p className="muted">This usually takes a few seconds. Please keep this page open.</p>
              <StatusPoller orderRef={o.ref} token={t} />
            </>
          )}
          <ContactBlock g={general} orderRef={o.ref} />
        </div>
      </section>
    )
  }

  return (
    <section className="section" style={{ paddingTop: 26 }}>
      <div className="wrap two">
        <div className="stack" style={{ ['--g' as string]: '18px' }}>
          <div className="conf-hd">
            <p className="rule eyebrow">Order confirmed</p>
            <h1 style={{ fontSize: 'clamp(1.9rem,6vw,2.7rem)' }}>Thank you, {o.customer_first}. Your order is booked.</h1>
            <div className="row"><span className="ref">{o.ref}</span><span className="pill ok">Paid</span></div>
          </div>
          <div className="panel stack" style={{ ['--g' as string]: '12px' }}>
            <h3>{o.method === 'delivery' ? 'Delivery' : 'Collection'}</h3>
            <dl className="kv">
              <dt>Date</dt><dd>{fmtDate(o.fulfil_date, true)}</dd>
              <dt>Time</dt><dd className="num">{o.slot_label}</dd>
              {o.method === 'delivery'
                ? <><dt>Address</dt><dd>{[o.address_line1, o.address_line2, o.town, o.postcode].filter(Boolean).join(', ')}</dd></>
                : <><dt>Where</dt><dd>{general.collection.address}</dd></>}
            </dl>
            {o.method === 'collection' ? <p className="small muted">{general.collection.instructions}</p> : null}
            {promise ? <p className="small muted">{promise}</p> : null}
          </div>
          <div className="panel stack" style={{ ['--g' as string]: '10px' }}>
            <h3>Need to change something?</h3>
            <p className="small muted">Changes and full refunds are possible up to {general.cancelHours} hours before your slot. Quote <b style={{ color: 'var(--ink)' }}>{o.ref}</b>.</p>
            <ContactBlock g={general} orderRef={o.ref} />
          </div>
          <p className="small muted">A confirmation has been emailed to <b style={{ color: 'var(--ink)' }}>{o.customer_email}</b>.</p>
          <div><Link className="btn btn-line" href="/menu">Back to menu</Link></div>
        </div>
        <div className="aside">
          <div className="panel stack" style={{ ['--g' as string]: '6px' }}>
            <h3 style={{ marginBottom: 6 }}>Your order</h3>
            <SummaryLines items={o.order_items} />
            <div className="sumrow" style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 8 }}><span>Subtotal</span><span className="num">{money(o.subtotal_pence)}</span></div>
            {o.discount_pence ? <div className="sumrow"><span>Discount ({o.promo_code})</span><span className="num">−{money(o.discount_pence)}</span></div> : null}
            <div className="sumrow"><span>{o.method === 'delivery' ? 'Delivery' : 'Collection'}</span><span className="num">{o.delivery_fee_pence ? money(o.delivery_fee_pence) : 'Free'}</span></div>
            <div className="sumrow total"><span>Paid</span><span className="num">{money(o.total_pence)}</span></div>
            {o.payment_method ? <p className="small muted">{o.payment_method}</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
