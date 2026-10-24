import Link from 'next/link'
import { requireStaff } from '@/lib/auth'
import { groupKey, reportOrders, type Group, type Period } from '@/lib/reports'
import { DOW, MON, dow } from '@/lib/time'
import { money } from '@/lib/money'
import { SIZES } from '@/lib/types'
import { G } from '@/components/admin/ui'

export default async function Reports({ searchParams }: { searchParams: Promise<{ period?: string; group?: string }> }) {
  const sp = await searchParams
  await requireStaff(['owner'])
  const period = (['7', '30', '90', 'up', 'all'].includes(sp.period ?? '') ? sp.period : '30') as Period
  const group = (['day', 'week', 'month'].includes(sp.group ?? '') ? sp.group : 'day') as Group
  const orders = await reportOrders(period)
  const net = (o: (typeof orders)[number]) => o.total_pence - o.refunded_pence
  const revenue = orders.reduce((s, o) => s + net(o), 0)
  const n = orders.length
  const del = orders.filter((o) => o.method === 'delivery').length
  const by = new Map<string, number>()
  for (const o of orders) by.set(groupKey(o.fulfil_date, group), (by.get(groupKey(o.fulfil_date, group)) ?? 0) + net(o))
  const keys = [...by.keys()].sort()
  const label = (k: string): [string, string] => group === 'month' ? [MON[+k.slice(5, 7) - 1], k.slice(0, 4)] : group === 'week' ? ['w/c', `${+k.slice(8)}/${+k.slice(5, 7)}`] : [DOW[dow(k)], `${+k.slice(8)}/${+k.slice(5, 7)}`]
  const max = Math.max(100, ...by.values())
  const step = max > 200000 ? 50000 : max > 50000 ? 25000 : 10000
  const top = Math.ceil(max / step) * step
  const W = Math.max(320, keys.length * 52 + 60), H = 230, pl = 56, pb = 36, pt = 12
  const col = (W - pl - 10) / Math.max(1, keys.length), bw = Math.min(32, col - 12)
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / top)
  const dishes = new Map<string, { q: number; r: number }>()
  const sizes = new Map<string, number>()
  for (const o of orders) for (const i of o.order_items) {
    const d = dishes.get(i.name) ?? { q: 0, r: 0 }
    d.q += i.qty; d.r += i.line_pence; dishes.set(i.name, d)
    sizes.set(i.size_label, (sizes.get(i.size_label) ?? 0) + i.qty)
  }
  const topDishes = [...dishes.entries()].sort((a, b) => b[1].r - a[1].r).slice(0, 8)
  const topMax = topDishes[0]?.[1].r || 1
  const promos = new Map<string, { n: number; d: number }>()
  for (const o of orders) if (o.promo_code) { const p = promos.get(o.promo_code) ?? { n: 0, d: 0 }; p.n++; p.d += o.discount_pence; promos.set(o.promo_code, p) }
  const href = (p: string, g: string) => `/admin/reports?period=${p}&group=${g}`

  return (
    <div className="stack" style={G('18px')}>
      <div className="row between">
        <nav className="row" style={G('8px')} aria-label="Period">
          {[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['up', 'Upcoming'], ['all', 'All time']].map(([k, l]) => <Link key={k} className="chip" href={href(k, group)} aria-pressed={period === k}>{l}</Link>)}
        </nav>
        <nav className="row" style={G('6px')} aria-label="Group by">
          {[['day', 'By day'], ['week', 'By week'], ['month', 'By month']].map(([k, l]) => <Link key={k} className="chip sm" href={href(period, k)} aria-pressed={group === k}>{l}</Link>)}
        </nav>
      </div>
      <div className="kpis">
        <div className="kpi"><span className="eyebrow">Revenue</span><b>{money(revenue)}</b><span className="small muted">After refunds</span></div>
        <div className="kpi"><span className="eyebrow">Orders</span><b>{n}</b></div>
        <div className="kpi"><span className="eyebrow">Average order</span><b>{money(n ? Math.round(revenue / n) : 0)}</b></div>
        <div className="kpi"><span className="eyebrow">Delivery share</span><b>{n ? Math.round((del / n) * 100) : 0}%</b><span className="small muted num">{del} delivery · {n - del} collection</span></div>
      </div>
      <div className="panel stack">
        <h3>Revenue by {group} (fulfilment date)</h3>
        {keys.length ? (
          <div style={{ overflowX: 'auto' }}>
            <svg className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Revenue by ${group}`}>
              {[0, 0.5, 1].map((f) => (
                <g key={f}><line className="grid-l" x1={pl} x2={W - 6} y1={y(top * f)} y2={y(top * f)} /><text x={pl - 6} y={y(top * f) + 4} textAnchor="end">£{Math.round((top * f) / 100)}</text></g>
              ))}
              {keys.map((k, i) => {
                const x = pl + 6 + i * col + (col - bw) / 2
                const [a, b] = label(k)
                const v = by.get(k)!
                return (
                  <g key={k}>
                    <rect className="bar" x={x} y={y(v)} width={bw} height={Math.max(0, H - pb - y(v))} rx={3}><title>{`${a} ${b}: ${money(v)}`}</title></rect>
                    <text x={x + bw / 2} y={H - 20} textAnchor="middle">{a}</text>
                    <text x={x + bw / 2} y={H - 6} textAnchor="middle">{b}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        ) : <p className="muted small">No paid orders in this period.</p>}
        <p className="small muted">Paid orders only. Cancelled and expired orders are excluded; refunds are taken off.</p>
      </div>
      <div className="f2">
        <div className="panel stack" style={G('4px')}>
          <h3 style={{ marginBottom: 8 }}>Top dishes</h3>
          {topDishes.length ? topDishes.map(([k, v]) => (
            <div key={k} className="hbar"><span>{k} <span className="muted small num">× {v.q}</span></span><span className="cap"><i style={{ width: `${(v.r / topMax) * 100}%` }} /></span><span className="num small">{money(v.r)}</span></div>
          )) : <p className="muted small">No data.</p>}
        </div>
        <div className="panel stack" style={G('4px')}>
          <h3 style={{ marginBottom: 8 }}>Bowls sold by size</h3>
          {SIZES.map((s) => <div key={s} className="sumrow small"><span>{s}</span><span className="num">{sizes.get(`${parseFloat(s)} litres`) ?? 0}</span></div>)}
          <h3 style={{ margin: '14px 0 8px' }}>Discount codes</h3>
          {promos.size ? [...promos.entries()].map(([k, v]) => <div key={k} className="sumrow small"><span>{k}</span><span className="num">{v.n} uses · −{money(v.d)}</span></div>) : <p className="muted small">No codes used.</p>}
        </div>
      </div>
      <div className="panel row between">
        <div><h3>Export orders</h3><p className="small muted">Download the orders in this period as a spreadsheet file (CSV).</p></div>
        <a className="btn btn-ink btn-sm" href={`/admin/export?period=${period}`}>Download CSV</a>
      </div>
    </div>
  )
}
