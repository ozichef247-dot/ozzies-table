import { siteUrl } from '@/lib/site'
import type { MetadataRoute } from 'next'
export const dynamic = 'force-dynamic'
import { getPublicMenu } from '@/lib/data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const { products } = await getPublicMenu()
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/menu`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/how-it-works`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/policies`, changeFrequency: 'yearly', priority: 0.3 },
    ...products.map((p) => ({ url: `${base}/menu/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ]
}
