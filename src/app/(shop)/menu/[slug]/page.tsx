import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug, getSettings, getZones } from '@/lib/data'
import { fillTokens } from '@/lib/text'
import { money } from '@/lib/money'
import { Photo } from '@/components/Photo'
import { DishOptions } from '@/components/DishOptions'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const r = await getProductBySlug(slug)
  if (!r) return { title: 'Dish not found · Ozzie’s Table' }
  const from = Math.min(...r.product.sizes.map((s) => s.price_pence))
  return {
    title: `${r.product.name} · Ozzie’s Table`,
    description: `${r.product.description} From ${money(from)}, cooked to order in Peterborough.`,
    alternates: { canonical: `/menu/${slug}` },
    openGraph: r.product.photo_url ? { images: [r.product.photo_url] } : undefined,
  }
}

export default async function DishPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const [r, { general, content }, zones] = await Promise.all([getProductBySlug(slug), getSettings(), getZones()])
  if (!r) notFound()
  const { product, category } = r
  return (
    <section className="section" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <p className="small" style={{ marginBottom: 14 }}><Link className="link" href={`/menu?cat=${category.id}`}>← {category.name}</Link></p>
        <div className="dish">
          <div className="ph-wrap"><Photo src={product.photo_url} alt={product.name} sizes="(min-width: 900px) 50vw, 100vw" priority /></div>
          <DishOptions
            product={product}
            categoryName={category.name}
            defaultLead={general.leadHours}
            showServes={general.showServes}
            allergenNote={fillTokens(content.legal.allergenNote, general, zones)}
            kitchenNote={fillTokens(content.legal.kitchen, general, zones)}
            editIndex={sp.edit != null ? Number(sp.edit) : null}
          />
        </div>
      </div>
    </section>
  )
}
