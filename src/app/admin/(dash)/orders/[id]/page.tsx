import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { db } from '@/lib/supabase/admin'
import { getSlots } from '@/lib/data'
import { nextStatus } from '@/lib/orders'
import type { Order, OrderItem } from '@/lib/types'
import { OPEN_STATUSES, STATUS_LABEL } from '@/lib/types'
import { fmtDate, fmtStamp } from '@/lib/time'
import { money, pounds } from '@/lib/money'
import { ItemMeta } from '@/components/OrderSummary'
import { Flash, G, StatusPill } from '@/components/admin/ui'
import { advanceOrderAction, cancelOrderAction, moveOrderAction, refundAction, saveInternalNote } from '../../../actions'

const PAY: Record<string, string> = { pending: 'Not paid online. Arrange payment with the customer', authorised: 'Authorised, not yet taken', paid: 'Paid', refunded: 'Refunded', partially_refunded: 'Partly refunded', voided: 'Released, not charged', failed: 'Payment attempt failed' }

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; confirm?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const staff = await requireStaff()
  const owner = staff.role === 'owner'
  const [{ data }, { data: events }, { data: notes }, slots] = await Promise.all([
    db().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle(),
    db().from('order_events').select('*').eq('order_id', id).order('at'),
    db().from('notifications').select('*').eq('order_id', id).order('created_at'),
    getSlots(),
  ])
  if (!data) notFound()
  const o = data as Order & { order_items: OrderItem[] }
  const next = nextStatus(o)
  const open = (OPEN_STATUSES as string[]).includes(o.status)
  const here = `/admin/orders/${o.id}`
  const Hidden = () => <><input type="hidden" name="id" value={o.id} /><input type="hidden" name="back" value={here} /></>
  const refundable = o.total_pence - o.refunded_pence

  return (
    <div className="stack" style={G('16px')}>
      <Flash sp={sp} />
      <div className="row between">
        <div>
          <p className="small"><Link className="link" href="/admin">← Orders</Link></p>
          <h1 style={{ fontSize: '1.8rem' }} className="num">{o.ref} <StatusPill s={o.status} /></h1>
          <p className="small muted">Placed {fmtStamp(o.created_at)}</p>
        </div>
        <Link className="btn btn-quiet btn-sm" href={`/admin/orders/${o.id}/ticket`} target="_blank">Print kitchen ticket</Link>
      </div>

      <div className="f2">
        <div className="panel stack" style={G('6px')}>
          <span className="eyebrow">Customer</span>
          <b>{o.customer_first} {o.customer_last}</b>
          <a href={`mailto:${o.customer_email}`} style={{ overflowWrap: 'anywhere' }}>{o.customer_email}</a>
          <a className="num" href={`tel:${o.customer_phone.replace(/\s/g, '')}`}>{o.customer_phone}</a>
          {owner ? <Link className="link small" href={`/admin/customers?email=${encodeURIComponent(o.customer_email)}`}>Past orders</Link> : null}
        </div>
        <div className="panel stack" style={G('6px')}>
          <span className="eyebrow">{o.method === 'delivery' ? 'Delivery' : 'Collection'}</span>
          <b>{fmtDate(o.fulfil_date, true)} · <span className="num">{o.slot_label}</span></b>
          {o.method === 'delivery' ? <span>{[o.address_line1, o.address_line2, o.town, o.postcode].filter(Boolean).join(', ')}</span> : <span className="muted">Collect from kitchen</span>}
          {owner && open ? (
            <form action={moveOrderAction} className="row" style={G('8px')}>
              <Hidden />
              <label className="vh" htmlFor="slotId">Move to another slot</label>
              <select id="slotId" name="slotId" className="mini" defaultValue={o.slot_id ?? ''} style={{ width: 'auto' }}>
                {slots.filter((s) => s.method === o.method).map((s) => <option key={s.id} value={s.id}>{s.start_time}–{s.end_time}</option>)}
              </select>
              <button className="btn btn-quiet btn-sm">Move</button>
            </form>
          ) : null}
        </div>
      </div>

      {o.notes ? <div className="alert warn small"><b>Customer note:</b> {o.notes}</div> : null}

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Item</th><th>Seasoning</th><th className="r">Qty</th>{owner ? <th className="r">Total</th> : null}</tr></thead>
          <tbody>
            {o.order_items.map((i) => (
              <tr key={i.id}>
                <td><b>{i.name}</b><ItemMeta item={{ ...i, seasoning: '' }} /></td>
                <td>{i.seasoning ? <span className="season-tag">{i.seasoning.toUpperCase()}</span> : <span className="muted small">n/a</span>}</td>
                <td className="r num">{i.qty}</td>
                {owner ? <td className="r num">{money(i.line_pence)}</td> : null}
              </tr>
            ))}
            {owner ? (
              <tr><td colSpan={3}>Subtotal {money(o.subtotal_pence)}{o.discount_pence ? ` · discount ${o.promo_code} −${money(o.discount_pence)}` : ''}{o.method === 'delivery' ? ` · delivery ${o.delivery_fee_pence ? money(o.delivery_fee_pence) : 'free'}` : ''}</td><td className="r num"><b>{money(o.total_pence)}</b></td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {owner ? (
        <div className="panel row between">
          <div className="stack" style={G('2px')}>
            <span className="eyebrow">Payment</span>
            <span><b>{PAY[o.payment_status]}</b>{o.payment_method ? ` · ${o.payment_method}` : ''}{o.refunded_pence ? ` · ${money(o.refunded_pence)} refunded` : ''}</span>
            {o.revolut_order_id ? <span className="small muted" style={{ userSelect: 'all' }}>Revolut order {o.revolut_order_id}</span> : null}
          </div>
          {['paid', 'partially_refunded'].includes(o.payment_status) && refundable > 0 ? (
            <form action={refundAction} className="row" style={G('8px')}>
              <Hidden />
              <label htmlFor="amount" className="small">Partial refund £</label>
              <input id="amount" name="amount" className="mini w-s" inputMode="decimal" placeholder={pounds(refundable)} required />
              <button className="btn btn-quiet btn-sm">Refund</button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="row">
        {next ? <form action={advanceOrderAction}><Hidden /><button className="btn btn-ink">Mark as {STATUS_LABEL[next].toLowerCase()}</button></form> : null}
        {owner && (open || o.status === 'pending') && sp.confirm !== 'cancel' ? (
          <Link className="btn btn-quiet" href={`${here}?confirm=cancel`} style={{ color: 'var(--bad)' }}>{o.payment_status === 'paid' ? 'Cancel and refund' : 'Cancel order'}</Link>
        ) : null}
      </div>
      {owner && sp.confirm === 'cancel' ? (
        <div className="alert bad stack" style={G('10px')}>
          <span>{o.payment_status === 'paid' || o.payment_status === 'partially_refunded' ? `Refund ${money(refundable)} to the customer and cancel ${o.ref}?` : `Cancel ${o.ref}? No money has been taken.`} The customer gets an email.</span>
          <div className="row">
            <form action={cancelOrderAction}><Hidden /><button className="btn btn-danger btn-sm">{o.payment_status === 'paid' ? 'Refund and cancel' : 'Cancel order'}</button></form>
            <Link className="btn btn-quiet btn-sm" href={here}>Keep order</Link>
          </div>
        </div>
      ) : null}

      <form action={saveInternalNote} className="fld">
        <Hidden />
        <label htmlFor="internal_notes">Internal notes</label>
        <textarea id="internal_notes" name="internal_notes" className="mini" rows={2} defaultValue={o.internal_notes} placeholder="Only staff see this" />
        <div><button className="btn btn-quiet btn-sm">Save note</button></div>
      </form>

      <div className="f2">
        <div className="stack" style={G('8px')}>
          <span className="eyebrow">History</span>
          <div className="timeline">
            {(events ?? []).map((e) => (
              <div key={e.id}><span><b>{STATUS_LABEL[e.status as keyof typeof STATUS_LABEL] ?? e.status}</b>{e.detail ? ` · ${e.detail}` : ''} <span className="muted small">{fmtStamp(e.at)}{e.actor !== 'system' ? ` · ${e.actor}` : ''}</span></span></div>
            ))}
          </div>
        </div>
        <div className="stack" style={G('8px')}>
          <span className="eyebrow">Messages</span>
          {(notes ?? []).length ? (notes ?? []).map((n) => (
            <details key={n.id} className="small">
              <summary><b>{n.channel === 'sms' ? 'SMS' : 'Email'}</b> to {n.recipient} · <span className={n.status === 'sent' ? '' : 'muted'}>{n.status}</span><br /><span className="muted">{n.subject}</span></summary>
              {n.error ? <p className="err small">{n.error}</p> : null}
              {n.body ? <pre className="email" style={{ marginTop: 6 }}>{n.body}</pre> : null}
            </details>
          )) : <p className="small muted">None yet.</p>}
        </div>
      </div>
    </div>
  )
}
