import { Fragment } from 'react'
import type { OrderItem } from '@/lib/types'

/** What to cook for a day: dish and size, then each seasoning and protein variation, seasoning boxed. */
export function ProductionList({ items, orderCount }: { items: OrderItem[]; orderCount: number }) {
  const map = new Map<string, { n: number; v: Map<string, { season: string; rest: string; n: number }> }>()
  for (const i of items) {
    const k = `${i.name} — ${i.size_label}`
    const e = map.get(k) ?? { n: 0, v: new Map() }
    e.n += i.qty
    const season = i.seasoning ? i.seasoning.split(' (')[0].toUpperCase() : ''
    const rest = [i.protein_swap.split(' (')[0], ...i.extras.map((x) => `+ ${x.split(' (')[0]}`)].filter(Boolean).join(' · ')
    const vk = `${season}|${rest}`
    const ve = e.v.get(vk) ?? { season, rest, n: 0 }
    ve.n += i.qty
    e.v.set(vk, ve)
    map.set(k, e)
  }
  return (
    <div className="stack" style={{ ['--g' as string]: '8px' }}>
      <span className="eyebrow">Production list · {orderCount} order{orderCount === 1 ? '' : 's'}</span>
      {map.size ? (
        <div className="tbl-wrap">
          <table>
            <tbody>
              {[...map.entries()].sort().map(([k, e]) => (
                <Fragment key={k}>
                  <tr><td><b>{k}</b></td><td className="r num"><b>{e.n}</b></td></tr>
                  {[...e.v.values()].map((v) => (
                    <tr key={k + v.season + v.rest}>
                      <td style={{ paddingLeft: 28 }}>{v.season ? <span className="season-tag">{v.season}</span> : null} {v.rest || 'Standard'}</td>
                      <td className="r num">{v.n}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="small muted">Nothing to cook yet.</p>}
    </div>
  )
}
