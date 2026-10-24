import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicMenu, getSettings } from '@/lib/data'
import { longNoticeNote } from '@/lib/schedule'
import { fillTokens } from '@/lib/text'
import { getZones } from '@/lib/data'
import type { Product } from '@/lib/types'
import { DishCard } from '@/components/DishCard'
import { PostcodeCheck } from '@/components/PostcodeCheck'

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getSettings()
  return { title: content.seo.menu.title, description: content.seo.menu.description, alternates: { canonical: '/menu' } }
}

const FILTERS: [string, string, (p: Product) => boolean][] = [
  ['nofish', 'No fish or shellfish', (p) => !p.allergens.some((a) => ['Fish', 'Crustaceans', 'Molluscs'].includes(a))],
  ['nonuts', 'No nuts', (p) => !p.allergens.some((a) => ['Peanuts', 'Tree nuts'].includes(a))],
  ['noeggs', 'No eggs', (p) => !p.allergens.includes('Eggs')],
  ['meatfree', 'Meat-free', (p) => p.tags.includes('Vegetarian') || p.tags.includes('Vegan')],
]

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ cat?: string; f?: string }> }) {
  const sp = await searchParams
  const [{ general, content }, { categories, products }, zones] = await Promise.all([getSettings(), getPublicMenu(), getZones()])
  const cat = categories.some((c) => c.id === sp.cat) ? sp.cat! : 'all'
  const active = (sp.f ?? '').split(',').filter((f) => FILTERS.some((x) => x[0] === f))
  let list = products.filter((p) => cat === 'all' || p.category_id === cat)
  for (const f of active) list = list.filter(FILTERS.find((x) => x[0] === f)![2])
  list = [...list].sort((a, b) => Number(b.available) - Number(a.available))
  const groups = (cat === 'all' ? categories : categories.filter((c) => c.id === cat)).filter((g) => list.some((p) => p.category_id === g.id))
  const ln = longNoticeNote(products.filter((p) => p.available), general.leadHours)
  const href = (c: string, f: string[]) => {
    const q = new URLSearchParams()
    if (c !== 'all') q.set('cat', c)
    if (f.length) q.set('f', f.join(','))
    const s = q.toString()
    return s ? `/menu?${s}` : '/menu'
  }
  const toggle = (f: string) => (active.includes(f) ? active.filter((x) => x !== f) : [...active, f])

  return (
    <section className="section" style={{ paddingTop: 26 }}>
      <div className="wrap stack" style={{ ['--g' as string]: '16px' }}>
        <div className="stack" style={{ ['--g' as string]: '6px' }}>
          <h1 style={{ fontSize: 'clamp(2rem,6vw,2.9rem)' }}>Menu</h1>
          <p className="muted">Every dish is cooked to order. Book at least {general.leadHours} hours ahead.{ln ? ` ${ln}` : ''}</p>
        </div>
        <PostcodeCheck variant="bar" />
      </div>
      <div className="stick" style={{ marginTop: 14 }}>
        <div className="wrap">
          <nav className="chips" aria-label="Categories">
            <Link className="chip" href={href('all', active)} aria-current={cat === 'all' ? 'page' : undefined} aria-pressed={cat === 'all'}>All dishes</Link>
            {categories.map((c) => (
              <Link key={c.id} className="chip" href={href(c.id, active)} aria-pressed={cat === c.id} aria-current={cat === c.id ? 'page' : undefined}>{c.name}</Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="wrap stack" style={{ ['--g' as string]: '30px', marginTop: 14 }}>
        <div className="row" style={{ ['--g' as string]: '6px' }} aria-label="Dietary filters">
          <span className="small muted" style={{ marginRight: 4 }}>Filter:</span>
          {FILTERS.map(([k, l]) => (
            <Link key={k} className="chip sm" href={href(cat, toggle(k))} aria-pressed={active.includes(k)}>{l}</Link>
          ))}
        </div>
        {groups.length ? groups.map((g) => (
          <div key={g.id} className="stack" style={{ ['--g' as string]: '14px' }}>
            {cat === 'all' ? <h2>{g.name}</h2> : null}
            <div className="grid">{list.filter((p) => p.category_id === g.id).map((p) => <DishCard key={p.id} p={p} defaultLead={general.leadHours} />)}</div>
          </div>
        )) : (
          <div className="panel muted">No dishes match these filters. <Link className="link" href={href(cat, [])}>Clear filters</Link></div>
        )}
        <p className="small muted">Filters use each dish’s allergen list. {fillTokens(content.legal.kitchen, general, zones)}</p>
      </div>
    </section>
  )
}
