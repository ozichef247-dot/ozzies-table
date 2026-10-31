/** The public web address used in emails, links and SEO. A leftover *.vercel.app value is ignored in favour of the real domain. */
export function siteUrl() {
  const v = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  return v && !/\.vercel\.app$/i.test(v) ? v : 'https://www.ozziestable.com'
}
