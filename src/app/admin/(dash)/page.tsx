import Link from 'next/link'
import { requireStaff } from '@/lib/auth'
import { db } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/data'
import type { Order, OrderItem } from '@/lib/types'
import { OPEN_STATUSES, STATUS_TONE } from '@/lib/types'
import { addDays, fmtDate, todayUK } from '@/lib/time'
import { money } from '@/lib/money'
import { Flash, G, StatusPill } from '@/components/admin/ui'

const TONE_COLOUR = { warn: 'var(--gold)', info: 'var(--info)', ok: 'var(--ok)', muted: 'var(--line-2)', bad: 'var(--bad)' }

export default async function Orders({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; date?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams
  const staff = await requireStaff()
  const owner = staff.role === 'owner'
  const view = ['upcoming', 'unpaid', 'done', 'all'].includes(sp.view ?? '') ? sp.view! : 'upcoming'
  const t = todayUK()
  let q = db().from('orders').select('*, order_items(qty)').limit(300)
  if (view === 'upcoming') q = q.gte('fulfil_date', t).in('status', OPEN_STATUSES).order('fulfil_date').order('slot_start')
  else if (view === 'unpaid') q = q.in('status', ['pending', 'expired']).order('created_at', { ascending: false })
  else if (view === 'done') q = q.in('status', ['completed', 'cancelled']).order('fulfil_date', { ascending: false })
  else q = q.order('fulfil_date', { ascending: false })
  if (sp.date) q = q.eq('fulfil_date', sp.date)
  const search = (sp.q ?? '').trim()
  if (search) {
    const s = search.replace(/[,()%]/g, ' ')
    q = q.or(`ref.ilike.%${s}%,customer_first.ilike.%${s}%,customer_last.ilike.%${s}%,customer_email.ilike.%${s}%,customer_phone.ilike.%${s}%,postcode.ilike.%${s}%`)
  }
  const [{ data }, { general }, upcoming, holds] = await Promise.all([
    q,
    getSettings(),
    db().from('orders').select('fulfil_date, total_pence').gte('fulfil_date', t).lte('fulfil_date', addDays(t, 60)).in('status', OPEN_STATUSES),
    db().from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending').gt('hold_until', new Date().toISOString()),
  ])
  const orders = (data ?? []) as (Order & { order_items: Pick<OrderItem, 'qty'>[] })[]
  const up = upcoming.data ?? []
  const nextDay = [...new Set(up.map((o) => o.fulfil_date))].sort()[0]
  const nextDayOrders = up.filter((o) => o.fulfil_date === nextDay)
  const link = (v: string) => `/admin?view=${v}${search ? `&q=${encodeURIComponent(search)}` : ''}`

  return (
    <div className="stack" style={G('18px')}>
      <Flash sp={sp} />
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Upcoming orders</span><b>{up.length}</b></div>
        <div className="kpi"><span className="eyebrow">Next cook day</span><b>{nextDay ? fmtDate(nextDay) : '—'}</b><span className="small muted num">{nextDayOrders.length} orders{owner ? ` · ${money(nextDayOrders.reduce((s, o) => s + o.total_pence, 0))}` : ''}</span></div>
        <div className="kpi"><span className="eyebrow">Slots on hold</span><b>{holds.count ?? 0}</b><span className="small muted">Released after {general.holdMinutes} min unpaid</span></div>
        <div className="kpi"><span className="eyebrow">Notice period</span><b>{general.leadHours}h</b><span className="small muted">Change in Schedule</span></div>
      </div>
      <nav className="row" style={G('8px')} aria-label="Order filters">
        {[['upcoming', 'Upcoming'], ['unpaid', 'Unpaid & expired'], ['done', 'Completed & cancelled'], ['all', 'All']].map(([k, l]) => (
          <Link key={k} className="chip" href={link(k)} aria-pressed={view === k}>{l}</Link>
        ))}
      </nav>
      <form className="row" style={G('8px')} role="search">
        <input type="hidden" name="view" value={view} />
        <label className="vh" htmlFor="q">Search orders</label>
        <input id="q" name="q" className="inp grow" type="search" defaultValue={search} placeholder="Search name, order number, phone or postcode" style={{ minWidth: 200 }} />
        <label className="vh" htmlFor="date">Date</label>
        <input id="date" name="date" type="date" className="inp" defaultValue={sp.date ?? ''} style={{ width: 'auto' }} />
        <button className="btn btn-quiet btn-sm">Search</button>
      </form>
      <div className="olist">
        {orders.length ? orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="orow" style={{ ['--sk' as string]: TONE_COLOUR[STATUS_TONE[o.status]] }}>
            <span><b className="num">{o.ref}</b> · <b>{o.customer_first} {o.customer_last}</b></span>
            <span className="num" style={{ fontWeight: 700 }}>{owner ? money(o.total_pence) : `${o.order_items.reduce((s, i) => s + i.qty, 0)} bowls`}</span>
            <span className="r2">
              <span>{fmtDate(o.fulfil_date)} · <span className="num">{o.slot_label}</span></span><span>·</span>
              <span>{o.method === 'delivery' ? `Delivery ${o.postcode ?? ''}` : 'Collection'}</span>
              <StatusPill s={o.status} />
            </span>
          </Link>
        )) : <div className="panel muted">No orders match. Try another filter or clear the search.</div>}
      </div>
    </div>
  )
}
