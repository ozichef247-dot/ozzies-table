import Link from 'next/link'
import type { Product } from '@/lib/types'
import { money } from '@/lib/money'
import { itemLead } from '@/lib/schedule'
import { DOW } from '@/lib/time'
import { Photo } from './Photo'

export function DishCard({ p, defaultLead }: { p: Product; defaultLead: number }) {
  const from = Math.min(...p.sizes.map((s) => s.price_pence))
  const base = itemLead(p, p.sizes[0], defaultLead)
  const badges: string[] = []
  if (p.available) {
    if (base > defaultLead) badges.push(`${base}h notice`)
    if (p.cook_days.length) badges.push(`${p.cook_days.map((d) => DOW[d]).join(' & ')} only`)
  }
  return (
    <Link href={`/menu/${p.slug}`} className={`card${p.available ? '' : ' out'}`} aria-label={`${p.name}, from ${money(from)}${p.available ? '' : ', sold out'}`}>
      <div style={{ position: 'relative' }}>
        <div className="badges">
          {!p.available ? <span className="pill bad solid">Sold out</span> : badges.map((b) => <span key={b} className="pill solid">{b}</span>)}
        </div>
        <Photo src={p.photo_url} alt={p.name} />
      </div>
      <div className="body">
        <h3>{p.name}</h3>
        <p className="desc">{p.description}</p>
        <div className="foot">
          <span className="price">{p.sizes.length ? `from ${money(from)}` : ''}</span>
          <span className="small muted">{p.sizes.map((s) => s.size).join(' · ')}</span>
        </div>
      </div>
    </Link>
  )
}
