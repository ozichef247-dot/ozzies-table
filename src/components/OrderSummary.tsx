import type { OrderItem } from '@/lib/types'
import { itemMeta } from '@/lib/pricing'
import { money } from '@/lib/money'

export function ItemMeta({ item }: { item: Pick<OrderItem, 'size_label' | 'protein_swap' | 'included_text' | 'extras' | 'seasoning' | 'note'> }) {
  return (
    <ul className="meta">
      {itemMeta(item).map((t, i) => <li key={i} className={t.startsWith('Seasoning') ? 'season' : ''}>{t}</li>)}
    </ul>
  )
}

export function SummaryLines({ items }: { items: OrderItem[] }) {
  return (
    <>
      {items.map((i, k) => (
        <div key={k} className="sumrow small" style={{ alignItems: 'flex-start' }}>
          <span style={{ minWidth: 0 }}>{i.qty} × <b>{i.name}</b><ItemMeta item={i} /></span>
          <span className="num">{money(i.line_pence)}</span>
        </div>
      ))}
    </>
  )
}
