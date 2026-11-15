import { siteUrl } from '@/lib/site'
import type { MetadataRoute } from 'next'
import { getAccess } from '@/lib/access'

export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = siteUrl()
  // Private mode: ask search engines to stay away entirely.
  if ((await getAccess()).enabled) return { rules: [{ userAgent: '*', disallow: '/' }] }
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/basket', '/checkout', '/order'] }], sitemap: `${base}/sitemap.xml` }
}
