'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import sharp from 'sharp'
import { assertStaff, type Role } from '@/lib/auth'
import { authClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/data'
import { advanceOrder, cancelOrder, moveOrder, partialRefund } from '@/lib/orders'
import { toPence } from '@/lib/money'
import { parseOutcodes } from '@/lib/postcode'
import { slugify } from '@/lib/text'
import { ALLERGENS, OPEN_STATUSES, SEASONS, SIZES } from '@/lib/types'
import type { ContentSettings, GeneralSettings } from '@/lib/types'
import { todayUK } from '@/lib/time'

// ---------- helpers ----------

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const int = (f: FormData, k: string, min = 0) => {
  const v = str(f, k)
  if (v === '') return null
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.max(min, n) : null
}
const bool = (f: FormData, k: string) => f.get(k) === 'on' || f.get(k) === 'true'
const back = (f: FormData, fallback: string) => {
  const b = str(f, 'back')
  return b.startsWith('/admin') ? b : fallback
}
const withParam = (path: string, k: string, v: string) => `${path}${path.includes('?') ? '&' : '?'}${k}=${encodeURIComponent(v)}`

/** Run a dashboard change: check permission, apply, refresh pages, and come back with a message. */
async function run(f: FormData, fallback: string, roles: Role[], fn: (actor: string) => Promise<string | void>) {
  const to = back(f, fallback).replace(/[?&](ok|error)=[^&]*/g, '')
  let message = 'Saved'
  try {
    const s = await assertStaff(roles)
    message = (await fn(s.email)) || 'Saved'
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    redirect(withParam(to, 'error', err))
  }
  revalidatePath('/', 'layout')
  redirect(withParam(to, 'ok', message))
}

async function check<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data
}

async function saveGeneral(patch: Partial<GeneralSettings>) {
  const { general } = await getSettings()
  await check(db().from('site_settings').update({ general: { ...general, ...patch }, updated_at: new Date().toISOString() }).eq('id', 1))
}
async function saveContent(patch: Partial<ContentSettings>) {
  const { content } = await getSettings()
  await check(db().from('site_settings').update({ content: { ...content, ...patch }, updated_at: new Date().toISOString() }).eq('id', 1))
}

/** Crop to the house photo shape, resize and save as WebP in Supabase Storage. Returns the public URL. */
async function uploadImage(file: File, folder: string, kind: 'photo' | 'hero' | 'logo') {
  if (!file || file.size === 0) throw new Error('Choose a photo to upload.')
  if (file.size > 8 * 1024 * 1024) throw new Error('That photo is over 8MB. Please use a smaller one.')
  if (!/^image\//.test(file.type)) throw new Error('Choose an image file (JPEG, PNG or WebP).')
  const input = Buffer.from(await file.arrayBuffer())
  let out: Buffer
  let ext = 'webp'
  let type = 'image/webp'
  if (kind === 'logo') {
    out = await sharp(input).resize({ width: 600, height: 200, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    ext = 'png'
    type = 'image/png'
  } else {
    const [w, h] = kind === 'hero' ? [2400, 1600] : [1600, 1200]
    out = await sharp(input).rotate().resize(w, h, { fit: 'cover', position: 'attention', withoutEnlargement: false }).webp({ quality: 82 }).toBuffer()
  }
  const path = `${folder}/${randomUUID()}.${ext}`
  await check(db().storage.from('media').upload(path, out, { contentType: type, cacheControl: '31536000', upsert: false }))
  return db().storage.from('media').getPublicUrl(path).data.publicUrl
}

// ---------- sign-in ----------

/** Step 1 of sign-in: email a 6-digit code to a staff member. No passwords. */
export async function sendLoginCode(_: unknown, f: FormData): Promise<{ step: 'email' | 'code'; email?: string; error?: string; info?: string }> {
  const email = str(f, 'email').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { step: 'email', error: 'Enter your email address.' }
  const { data: staff } = await db().from('staff').select('user_id').ilike('email', email).maybeSingle()
  if (staff) {
    const sb = await authClient()
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (error) {
      const wait = /rate|seconds|too many/i.test(error.message)
      return { step: 'email', email, error: wait ? 'Please wait a minute before asking for another code.' : 'We couldn’t send a code just now. Please try again.' }
    }
  }
  // Same answer whether or not the address is staff, so the form doesn't reveal who has access.
  return { step: 'code', email, info: `If ${email} has dashboard access, a 6-digit code is on its way. It expires in an hour.` }
}

/** Step 2: check the code and sign in. */
export async function verifyLoginCode(_: unknown, f: FormData): Promise<{ step: 'email' | 'code'; email?: string; error?: string; info?: string }> {
  const email = str(f, 'email').toLowerCase()
  const token = str(f, 'code').replace(/\D/g, '')
  if (token.length !== 6) return { step: 'code', email, error: 'Enter the 6-digit code from the email.' }
  const sb = await authClient({ remember: f.get('remember') === 'on' })
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' })
  if (error || !data.user) return { step: 'code', email, error: 'That code isn’t right or has expired. Check the latest email, or ask for a new code.' }
  const { data: staff } = await db().from('staff').select('role').eq('user_id', data.user.id).maybeSingle()
  if (!staff) {
    await sb.auth.signOut()
    return { step: 'email', error: 'You don’t have access to this area.' }
  }
  redirect('/admin')
}

export async function signOut() {
  const sb = await authClient()
  await sb.auth.signOut({ scope: 'local' })
  redirect('/admin/login')
}

/** Sign out on every phone and computer, e.g. after losing a device. */
export async function signOutEverywhere() {
  const sb = await authClient()
  await sb.auth.signOut({ scope: 'global' })
  redirect('/admin/login')
}

// ---------- orders ----------

export async function advanceOrderAction(f: FormData) {
  await run(f, '/admin', ['owner', 'kitchen'], async (actor) => { await advanceOrder(str(f, 'id'), actor); return 'Status updated' })
}
export async function cancelOrderAction(f: FormData) {
  await run(f, '/admin', ['owner'], async (actor) => { await cancelOrder(str(f, 'id'), actor); return 'Order cancelled and the customer emailed' })
}
export async function refundAction(f: FormData) {
  await run(f, '/admin', ['owner'], async (actor) => { await partialRefund(str(f, 'id'), toPence(f.get('amount')), actor); return 'Refund sent' })
}
export async function moveOrderAction(f: FormData) {
  await run(f, '/admin', ['owner'], async (actor) => { await moveOrder(str(f, 'id'), str(f, 'slotId'), actor); return 'Order moved' })
}
export async function saveInternalNote(f: FormData) {
  await run(f, '/admin', ['owner', 'kitchen'], async () => {
    await check(db().from('orders').update({ internal_notes: str(f, 'internal_notes').slice(0, 2000) }).eq('id', str(f, 'id')))
    return 'Note saved'
  })
}

// ---------- schedule ----------

export async function saveScheduleSettings(f: FormData) {
  await run(f, '/admin/schedule', ['owner'], async () => {
    const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => bool(f, `day_${d}`))
    await saveGeneral({
      leadHours: int(f, 'leadHours') ?? 48,
      dailyCap: int(f, 'dailyCap') ?? 24,
      holdMinutes: Math.max(5, Math.min(30, int(f, 'holdMinutes') ?? 10)),
      cancelHours: int(f, 'cancelHours') ?? 48,
      cookingDays: days,
    })
  })
}

const timeOk = (t: string) => /^\d{2}:\d{2}$/.test(t)

export async function saveSlot(f: FormData) {
  await run(f, '/admin/schedule', ['owner'], async () => {
    const start = str(f, 'start'), end = str(f, 'end')
    if (!timeOk(start) || !timeOk(end) || end <= start) throw new Error('Enter a start and end time, with the end after the start.')
    const row = { start_time: start, end_time: end, capacity: int(f, 'capacity') ?? 0 }
    const id = str(f, 'id')
    if (id) await check(db().from('slots').update(row).eq('id', id))
    else await check(db().from('slots').insert({ ...row, method: str(f, 'method') === 'delivery' ? 'delivery' : 'collection' }))
  })
}

export async function removeSlot(f: FormData) {
  await run(f, '/admin/schedule', ['owner'], async () => {
    const id = str(f, 'id')
    const { count } = await db().from('orders').select('id', { count: 'exact', head: true })
      .eq('slot_id', id).gte('fulfil_date', todayUK()).in('status', [...OPEN_STATUSES, 'pending'])
    if (count) throw new Error(`${count} upcoming order${count > 1 ? 's are' : ' is'} booked in this slot. Move them to another slot first, or set capacity to 0 to stop new bookings.`)
    // Keep the record for past orders; it just stops being offered.
    await check(db().from('slots').update({ active: false }).eq('id', id))
    return 'Slot removed'
  })
}

export async function toggleClosure(f: FormData) {
  await run(f, '/admin/schedule', ['owner'], async () => {
    const date = str(f, 'date')
    const slotId = str(f, 'slotId') || null
    let q = db().from('closures').select('id').eq('date', date)
    q = slotId ? q.eq('slot_id', slotId) : q.is('slot_id', null)
    const { data } = await q.maybeSingle()
    if (data) await check(db().from('closures').delete().eq('id', data.id))
    else await check(db().from('closures').insert({ date, slot_id: slotId }))
    return data ? 'Reopened' : 'Closed for bookings'
  })
}

// ---------- menu ----------

export async function saveCategory(f: FormData) {
  await run(f, '/admin/menu', ['owner'], async () => {
    const name = str(f, 'name')
    if (!name) throw new Error('Enter a category name.')
    const id = str(f, 'id')
    if (id) await check(db().from('categories').update({ name, hidden: bool(f, 'hidden') }).eq('id', id))
    else {
      const { data } = await db().from('categories').select('sort').order('sort', { ascending: false }).limit(1)
      await check(db().from('categories').insert({ name, hidden: true, sort: (data?.[0]?.sort ?? 0) + 1 }))
      return 'Category added. It’s hidden until you switch it on.'
    }
  })
}

export async function moveCategory(f: FormData) {
  await run(f, '/admin/menu', ['owner'], async () => {
    const { data } = await db().from('categories').select('id, sort').order('sort').order('name')
    const list = data ?? []
    const i = list.findIndex((c) => c.id === str(f, 'id'))
    const j = i + (str(f, 'dir') === 'up' ? -1 : 1)
    if (i < 0 || j < 0 || j >= list.length) return 'Order unchanged'
    ;[list[i], list[j]] = [list[j], list[i]]
    await Promise.all(list.map((c, k) => db().from('categories').update({ sort: k + 1 }).eq('id', c.id)))
    return 'Order updated'
  })
}

export async function deleteCategory(f: FormData) {
  await run(f, '/admin/menu', ['owner'], async () => {
    const id = str(f, 'id')
    const { count } = await db().from('products').select('id', { count: 'exact', head: true }).eq('category_id', id)
    if (count) throw new Error('Move or delete the dishes in this category first.')
    await check(db().from('categories').delete().eq('id', id))
    return 'Category deleted'
  })
}

export async function uploadCategoryPhoto(f: FormData) {
  await run(f, '/admin/menu', ['owner'], async () => {
    const url = await uploadImage(f.get('photo') as File, 'categories', 'photo')
    await check(db().from('categories').update({ photo_url: url }).eq('id', str(f, 'id')))
    return 'Photo saved'
  })
}

export async function toggleProductFlag(f: FormData) {
  await run(f, '/admin/menu', ['owner'], async () => {
    const field = str(f, 'field')
    if (!['available', 'featured'].includes(field)) throw new Error('Unknown setting')
    await check(db().from('products').update({ [field]: str(f, 'value') === 'true' }).eq('id', str(f, 'id')))
  })
}

export async function setShowServes(f: FormData) {
  await run(f, '/admin/menu', ['owner'], async () => { await saveGeneral({ showServes: str(f, 'value') === 'true' }) })
}

export async function createProduct(f: FormData) {
  let id = ''
  await (async () => {
    try {
      await assertStaff(['owner'])
      const { data: cats } = await db().from('categories').select('id').order('sort').limit(1)
      if (!cats?.length) throw new Error('Add a category first.')
      const slug = `new-dish-${Date.now().toString(36)}`
      const row = await check(db().from('products').insert({ category_id: cats[0].id, slug, name: 'New dish', available: false }).select('id').single())
      id = (row as { id: string }).id
      await check(db().from('product_sizes').insert({ product_id: id, size: '2L', price_pence: 0 }))
    } catch (e) {
      redirect(withParam('/admin/menu', 'error', e instanceof Error ? e.message : String(e)))
    }
  })()
  redirect(`/admin/menu/${id}?ok=${encodeURIComponent('New dish created. It stays unavailable until you switch it on.')}`)
}

export async function saveProduct(f: FormData) {
  const id = str(f, 'id')
  await run(f, `/admin/menu/${id}`, ['owner'], async () => {
    const name = str(f, 'name')
    if (!name) throw new Error('Enter a dish name.')
    const sizes = SIZES.filter((s) => bool(f, `size_${s}_on`))
    if (!sizes.length) throw new Error('Offer at least one size.')
    const seasonPrices = Object.fromEntries(SEASONS.map((s) => [s, toPence(f.get(`season_${s}`))]))
    let slug = slugify(str(f, 'slug') || name) || `dish-${id.slice(0, 8)}`
    const { data: clash } = await db().from('products').select('id').eq('slug', slug).neq('id', id).maybeSingle()
    if (clash) slug = `${slug}-${id.slice(0, 4)}`
    await check(db().from('products').update({
      name, slug,
      category_id: str(f, 'category_id'),
      description: str(f, 'description').slice(0, 400),
      included: str(f, 'included'),
      lead_hours: int(f, 'lead_hours'),
      cook_days: [0, 1, 2, 3, 4, 5, 6].filter((d) => bool(f, `cook_${d}`)),
      seasoning_enabled: bool(f, 'seasoning_enabled'),
      season_prices: seasonPrices,
      allergens: ALLERGENS.filter((a) => bool(f, `allergen_${a}`)),
      tags: ['Vegetarian', 'Vegan'].filter((t) => bool(f, `tag_${t}`)),
      available: bool(f, 'available'),
      featured: bool(f, 'featured'),
      allow_notes: bool(f, 'allow_notes'),
    }).eq('id', id))

    // Sizes: one row per size offered.
    await check(db().from('product_sizes').delete().eq('product_id', id).not('size', 'in', `(${sizes.join(',')})`))
    await check(db().from('product_sizes').upsert(
      sizes.map((s) => ({
        product_id: id, size: s,
        price_pence: toPence(f.get(`size_${s}_price`)),
        lead_hours: int(f, `size_${s}_lead`),
        included: str(f, `size_${s}_included`) || null,
        serves: str(f, `size_${s}_serves`) || null,
      })),
      { onConflict: 'product_id,size' },
    ))

    // Protein choices: edit, delete or add.
    const existing = new Set(f.getAll('prot_id').map(String))
    for (const pid of existing) {
      if (bool(f, `prot_${pid}_delete`) || !str(f, `prot_${pid}_name`)) await check(db().from('protein_options').delete().eq('id', pid).eq('product_id', id))
      else await check(db().from('protein_options').update({
        name: str(f, `prot_${pid}_name`), price_pence: toPence(f.get(`prot_${pid}_price`)),
        kind: str(f, `prot_${pid}_kind`) === 'swap' ? 'swap' : 'add',
      }).eq('id', pid).eq('product_id', id))
    }
    for (let n = 0; n < 3; n++) {
      const nm = str(f, `new_${n}_name`)
      if (!nm) continue
      await check(db().from('protein_options').insert({
        product_id: id, name: nm, price_pence: toPence(f.get(`new_${n}_price`)),
        kind: str(f, `new_${n}_kind`) === 'swap' ? 'swap' : 'add', sort: 100 + n,
      }))
    }
    return 'Dish saved'
  })
}

export async function uploadProductPhoto(f: FormData) {
  const id = str(f, 'id')
  await run(f, `/admin/menu/${id}`, ['owner'], async () => {
    const url = await uploadImage(f.get('photo') as File, 'dishes', 'photo')
    await check(db().from('products').update({ photo_url: url }).eq('id', id))
    return 'Photo saved'
  })
}

export async function removeProductPhoto(f: FormData) {
  const id = str(f, 'id')
  await run(f, `/admin/menu/${id}`, ['owner'], async () => {
    await check(db().from('products').update({ photo_url: null }).eq('id', id))
    return 'Photo removed'
  })
}

export async function deleteProduct(f: FormData) {
  await run(f, '/admin/menu', ['owner'], async () => {
    await check(db().from('products').delete().eq('id', str(f, 'id')))
    return 'Dish deleted. Past orders keep their details.'
  })
}

// ---------- delivery & contact ----------

export async function saveDeliverySettings(f: FormData) {
  await run(f, '/admin/delivery', ['owner'], async () => {
    const { general } = await getSettings()
    await saveGeneral({
      collection: { address: str(f, 'address'), instructions: str(f, 'instructions') },
      contact: { phone: str(f, 'phone'), email: str(f, 'email'), whatsappDisplay: str(f, 'whatsappDisplay'), whatsapp: str(f, 'whatsapp').replace(/\D/g, '') },
      minDeliveryPence: toPence(f.get('minDelivery')),
      freeOverPence: toPence(f.get('freeOver')),
      thresholdBasis: str(f, 'basis') === 'before' ? 'before' : 'after',
      offlinePaymentNote: str(f, 'offlinePaymentNote'),
      notify: { ready: bool(f, 'notify_ready'), out: bool(f, 'notify_out'), sms: false }, // SMS is a later phase
    })
  })
}

export async function saveZone(f: FormData) {
  await run(f, '/admin/delivery', ['owner'], async () => {
    const row = { name: str(f, 'name') || 'Zone', outcodes: parseOutcodes(str(f, 'outcodes')), fee_pence: toPence(f.get('fee')) }
    const id = str(f, 'id')
    if (id) await check(db().from('zones').update(row).eq('id', id))
    else await check(db().from('zones').insert({ ...row, sort: Date.now() % 100000 }))
  })
}

export async function deleteZone(f: FormData) {
  await run(f, '/admin/delivery', ['owner'], async () => { await check(db().from('zones').delete().eq('id', str(f, 'id'))); return 'Zone removed' })
}

// ---------- promotions ----------

export async function savePromo(f: FormData) {
  await run(f, '/admin/promotions', ['owner'], async () => {
    const code = str(f, 'code').toUpperCase().replace(/\s/g, '')
    if (!code) throw new Error('Enter a code.')
    const kind = str(f, 'kind') === 'fixed' ? 'fixed' : 'pct'
    const row = {
      code, kind,
      value: kind === 'pct' ? Math.min(100, int(f, 'value') ?? 0) : toPence(f.get('value')),
      min_pence: toPence(f.get('min')),
      starts_on: str(f, 'starts_on') || null, ends_on: str(f, 'ends_on') || null,
      usage_limit: int(f, 'usage_limit'), active: bool(f, 'active'),
    }
    const id = str(f, 'id')
    if (id) await check(db().from('promos').update(row).eq('id', id))
    else await check(db().from('promos').insert(row))
  })
}

export async function deletePromo(f: FormData) {
  await run(f, '/admin/promotions', ['owner'], async () => { await check(db().from('promos').delete().eq('id', str(f, 'id'))); return 'Code deleted' })
}

// ---------- content ----------

export async function saveHomepage(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => {
    await saveContent({
      notice: str(f, 'notice'), themeLine: str(f, 'themeLine'), headline: str(f, 'headline'), intro: str(f, 'intro'), story: str(f, 'story'),
    })
  })
}

export async function saveFontPairing(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => {
    const v = str(f, 'fontPairing')
    await saveContent({ fontPairing: v === 'b' || v === 'c' ? v : 'a' })
  })
}

export async function uploadSiteImage(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => {
    const which = str(f, 'which')
    if (!['heroPhoto', 'storyPhoto', 'logo'].includes(which)) throw new Error('Unknown image')
    if (bool(f, 'remove')) {
      await saveContent({ [which]: null } as Partial<ContentSettings>)
      return 'Removed'
    }
    const url = await uploadImage(f.get('photo') as File, 'site', which === 'logo' ? 'logo' : which === 'heroPhoto' ? 'hero' : 'photo')
    await saveContent({ [which]: url } as Partial<ContentSettings>)
    return 'Image saved'
  })
}

export async function saveLegal(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => {
    await saveContent({
      legal: {
        sample: false,
        allergenNote: str(f, 'allergenNote'), kitchen: str(f, 'kitchen'), cancellation: str(f, 'cancellation'),
        privacy: str(f, 'privacy'), terms: str(f, 'terms'), cookies: str(f, 'cookies'),
        hygiene: str(f, 'hygiene'), company: str(f, 'company'),
      },
    })
  })
}

export async function saveSeo(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => {
    const e = (k: string) => ({ title: str(f, `${k}_title`), description: str(f, `${k}_description`) })
    await saveContent({ seo: { home: e('home'), menu: e('menu'), info: e('info') } })
  })
}

export async function saveFaq(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => {
    const row = { question: str(f, 'question'), answer: str(f, 'answer'), sort: int(f, 'sort') ?? 0 }
    if (!row.question) throw new Error('Enter the question.')
    const id = str(f, 'id')
    if (id) await check(db().from('faqs').update(row).eq('id', id))
    else await check(db().from('faqs').insert(row))
  })
}

export async function deleteFaq(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => { await check(db().from('faqs').delete().eq('id', str(f, 'id'))); return 'Question removed' })
}

export async function saveReview(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => {
    const row = { first_name: str(f, 'first_name').split(/\s+/)[0] ?? '', town: str(f, 'town'), body: str(f, 'body'), permitted: bool(f, 'permitted') }
    if (!row.first_name || !row.body) throw new Error('Enter the customer’s first name and their review.')
    const id = str(f, 'id')
    if (id) await check(db().from('reviews').update(row).eq('id', id))
    else await check(db().from('reviews').insert(row))
  })
}

export async function deleteReview(f: FormData) {
  await run(f, '/admin/content', ['owner'], async () => { await check(db().from('reviews').delete().eq('id', str(f, 'id'))); return 'Review removed' })
}
