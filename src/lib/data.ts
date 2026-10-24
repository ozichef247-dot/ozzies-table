import 'server-only'
import { cache } from 'react'
import { db } from './supabase/admin'
import type {
  Category, Closure, ContentSettings, Faq, GeneralSettings, Product, Promo, Review, Slot, Zone,
} from './types'
import { LIVE_STATUSES } from './types'
import { addDays, hhmm, todayUK } from './time'
import { countBooked, sortSlots, type ScheduleContext } from './schedule'

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Could not load ${what}: ${res.error.message}`)
  return res.data as T
}

export const getSettings = cache(async () => {
  const row = must(await db().from('site_settings').select('general, content').eq('id', 1).single(), 'settings') as {
    general: GeneralSettings
    content: ContentSettings
  }
  return row
})

export const getCategories = cache(async (includeHidden = false) => {
  let q = db().from('categories').select('*').order('sort').order('name')
  if (!includeHidden) q = q.eq('hidden', false)
  return must(await q, 'categories') as Category[]
})

function normaliseProduct(p: Record<string, unknown>): Product {
  const sizes = ((p.product_sizes as Product['sizes']) ?? []).sort((a, b) => parseFloat(a.size) - parseFloat(b.size))
  const proteins = ((p.protein_options as Product['proteins']) ?? []).sort((a, b) => a.sort - b.sort)
  const { product_sizes: _s, protein_options: _p, ...rest } = p
  return { ...(rest as unknown as Product), sizes, proteins }
}

export const getProducts = cache(async () => {
  const rows = must(
    await db().from('products').select('*, product_sizes(*), protein_options(*)').order('sort').order('name'),
    'menu',
  ) as Record<string, unknown>[]
  return rows.map(normaliseProduct)
})

/** Dishes customers can see: in a visible category. Sold-out dishes are included (shown greyed). */
export const getPublicMenu = cache(async () => {
  const [cats, products] = await Promise.all([getCategories(false), getProducts()])
  const visible = new Set(cats.map((c) => c.id))
  return { categories: cats, products: products.filter((p) => visible.has(p.category_id)) }
})

export async function getProductBySlug(slug: string) {
  const { products, categories } = await getPublicMenu()
  const product = products.find((p) => p.slug === slug)
  return product ? { product, category: categories.find((c) => c.id === product.category_id)! } : null
}

export const getSlots = cache(async (includeInactive = false) => {
  let q = db().from('slots').select('*')
  if (!includeInactive) q = q.eq('active', true)
  const rows = must(await q, 'slots') as Slot[]
  return rows.map((s) => ({ ...s, start_time: hhmm(s.start_time), end_time: hhmm(s.end_time) })).sort(sortSlots)
})

export const getClosures = cache(async () => {
  const from = addDays(todayUK(), -1)
  return must(await db().from('closures').select('*').gte('date', from), 'closures') as Closure[]
})

export const getZones = cache(async () => {
  const rows = must(await db().from('zones').select('*').order('sort'), 'delivery zones') as Zone[]
  return rows
})

export const getFaqs = cache(async () => must(await db().from('faqs').select('*').order('sort'), 'FAQs') as Faq[])

export const getReviews = cache(async (permittedOnly = true) => {
  let q = db().from('reviews').select('*').order('sort').order('created_at')
  if (permittedOnly) q = q.eq('permitted', true)
  return must(await q, 'reviews') as Review[]
})

export const getPromos = cache(async () => must(await db().from('promos').select('*').order('created_at'), 'promotions') as Promo[])

export async function findPromo(code: string) {
  const { data } = await db().from('promos').select('*').ilike('code', code.trim()).maybeSingle()
  return (data as Promo | null) ?? null
}

/** Rows that take a place: confirmed orders and unpaid orders still inside their payment hold. */
export async function getBookedRows(from: string, to: string, excludeOrderId?: string | null) {
  const nowIso = new Date().toISOString()
  let q = db()
    .from('orders')
    .select('id, fulfil_date, slot_id')
    .gte('fulfil_date', from)
    .lte('fulfil_date', to)
    .or(`status.in.(${LIVE_STATUSES.join(',')}),and(status.eq.pending,hold_until.gt.${nowIso})`)
  if (excludeOrderId) q = q.neq('id', excludeOrderId)
  return must(await q, 'bookings') as { id: string; fulfil_date: string; slot_id: string | null }[]
}

export async function getScheduleContext(excludeOrderId?: string | null, horizonDays = 42): Promise<ScheduleContext> {
  const t = todayUK()
  const [{ general }, slots, closures, rows] = await Promise.all([
    getSettings(),
    getSlots(),
    getClosures(),
    getBookedRows(t, addDays(t, horizonDays), excludeOrderId),
  ])
  return { settings: general, slots, closures, booked: countBooked(rows) }
}
