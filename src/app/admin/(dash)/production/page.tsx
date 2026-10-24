import { requireStaff } from '@/lib/auth'
import { getSettings } from '@/lib/data'
import { liveOrdersBetween } from '@/lib/admin-data'
import { addDays, dow, fmtDate, todayUK } from '@/lib/time'
import { ProductionList } from '@/components/admin/ProductionList'
import { G } from '@/components/admin/ui'

export default async function Production() {
  await requireStaff()
  const t = todayUK()
  const [{ general }, orders] = await Promise.all([getSettings(), liveOrdersBetween(t, addDays(t, 13))])
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i)).filter((d) => general.cookingDays.includes(dow(d)) || orders.some((o) => o.fulfil_date === d))
  return (
    <div className="stack" style={G('10px')}>
      <div className="section-hd" style={{ margin: 0 }}><h2>What to cook</h2><span className="small muted">Next two weeks of cooking days</span></div>
      {days.map((d, i) => {
        const day = orders.filter((o) => o.fulfil_date === d)
        return (
          <details key={d} className="dayrow" open={i === 0}>
            <summary style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', gap: 12 }}>
              <b>{fmtDate(d, true)}</b><span className="small muted num">{day.length} orders</span>
            </summary>
            <div className="inner"><ProductionList items={day.flatMap((o) => o.order_items)} orderCount={day.length} /></div>
          </details>
        )
      })}
    </div>
  )
}
