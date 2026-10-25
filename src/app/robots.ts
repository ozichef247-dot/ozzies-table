import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ozziestable.com').replace(/\/$/, '')
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/basket', '/checkout', '/order'] }], sitemap: `${base}/sitemap.xml` }
}
