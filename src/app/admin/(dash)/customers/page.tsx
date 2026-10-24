import Link from 'next/link'
import { requireStaff } from '@/lib/auth'
import { db } from '@/lib/supabase/admin'
import type { Order } from '@/lib/types'
import { LIVE_STATUSES } from '@/lib/types'
import { fmtDate } from '@/lib/time'
import { money } from '@/lib/money'
import { G, StatusPill } from '@/components/admin/ui'

type Row = Pick<Order, 'id' | 'ref' | 'customer_first' | 'customer_last' | 'customer_email' | 'customer_phone' | 'fulfil_date' | 'slot_label' | 'status' | 'total_pence' | 'method'>

export default async function Customers({ searchParams }: { searchParams: Promise<{ email?: string; q?: string }> }) {
  const sp = await searchParams
  await requireStaff(['owner'])
  const { data } = await db().from('orders')
    .select('id, ref, customer_first, customer_last, customer_email, customer_phone, fulfil_date, slot_label, status, total_pence, method')
    .not('status', 'in', '(pending,expired)').order('fulfil_date', { ascending: false }).limit(5000)
  const rows = (data ?? []) as Row[]
  const byEmail = new Map<string, Row[]>()
  for (const r of rows) {
    const k = r.customer_email.toLowerCase()
    byEmail.set(k, [...(byEmail.get(k) ?? []), r])
  }
  const sel = sp.email ? byEmail.get(sp.email.toLowerCase()) : null
  if (sel) {
    const c = sel[0]
    const paid = sel.filter((o) => (LIVE_STATUSES as string[]).includes(o.status))
    return (
      <div className="panel stack" style={G('12px')}>
        <p className="small"><Link className="link" href="/admin/customers">← All customers</Link></p>
        <h2>{c.customer_first} {c.customer_last}</h2>
        <p className="small muted"><a href={`mailto:${c.customer_email}`}>{c.customer_email}</a> · <a className="num" href={`tel:${c.customer_phone.replace(/\s/g, '')}`}>{c.customer_phone}</a></p>
        <p className="small num">{paid.length} paid orders · {money(paid.reduce((s, o) => s + o.total_pence, 0))} spent</p>
        <div className="olist">
          {sel.map((o) => (
            <Link key={o.id} className="orow" href={`/admin/orders/${o.id}`}>
              <span><b className="num">{o.ref}</b> · {fmtDate(o.fulfil_date)} · <span className="num">{o.slot_label}</span></span>
              <span className="num" style={{ fontWeight: 700 }}>{money(o.total_pence)}</span>
              <span className="r2"><span>{o.method === 'delivery' ? 'Delivery' : 'Collection'}</span><StatusPill s={o.status} /></span>
            </Link>
          ))}
        </div>
      </div>
    )
  }
  const q = (sp.q ?? '').trim().toLowerCase()
  const list = [...byEmail.entries()]
    .map(([email, os]) => ({ email, c: os[0], paid: os.filter((o) => (LIVE_STATUSES as string[]).includes(o.status)), last: os[0].fulfil_date }))
    .filter((x) => !q || `${x.c.customer_first} ${x.c.customer_last} ${x.email} ${x.c.customer_phone}`.toLowerCase().includes(q))
  return (
    <div className="stack" style={G('14px')}>
      <form className="row" style={G('8px')} role="search">
        <label className="vh" htmlFor="cq">Search customers</label>
        <input id="cq" name="q" className="inp grow" defaultValue={sp.q ?? ''} placeholder="Search name, email or phone" />
        <button className="btn btn-quiet btn-sm">Search</button>
      </form>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Customer</th><th className="r">Paid orders</th><th className="r">Spent</th><th>Last order</th><th /></tr></thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.email}>
                <td><b>{x.c.customer_first} {x.c.customer_last}</b><br /><span className="small muted">{x.email}</span></td>
                <td className="r num">{x.paid.length}</td>
                <td className="r num">{money(x.paid.reduce((s, o) => s + o.total_pence, 0))}</td>
                <td>{fmtDate(x.last)}</td>
                <td className="r"><Link className="btn btn-quiet btn-sm" href={`/admin/customers?email=${encodeURIComponent(x.email)}`}>Orders</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!list.length ? <p className="muted">No customers yet.</p> : null}
    </div>
  )
}
