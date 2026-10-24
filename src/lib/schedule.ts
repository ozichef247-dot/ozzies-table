import type { Closure, GeneralSettings, Method, Product, ProductSize, Slot } from './types'
import { addDays, dow, hhmm, todayUK, ukNow, wall } from './time'

/** Places taken per date: total for the day and per slot. Counts confirmed orders plus live payment holds. */
export type Booked = Record<string, { total: number; bySlot: Record<string, number> }>

export interface ScheduleContext {
  settings: Pick<GeneralSettings, 'leadHours' | 'dailyCap' | 'cookingDays'>
  slots: Slot[]
  closures: Closure[]
  booked: Booked
  now?: Date
}

export type Unavailable = 'Closed' | 'Too soon' | 'Not cooked this day' | 'Fully booked'
const RANK: Record<Unavailable, number> = { Closed: 0, 'Too soon': 1, 'Not cooked this day': 2, 'Fully booked': 3 }

export type SlotState =
  | { ok: true; left: number; deadline: number }
  | { ok: false; why: Unavailable }

export type DayState = { ok: true; deadline: number } | { ok: false; why: Unavailable }

export const sortSlots = (a: Slot, b: Slot) => hhmm(a.start_time).localeCompare(hhmm(b.start_time))

/** Notice needed for one size of a dish: the size's own setting, else the dish's, else the site default. */
export function itemLead(product: Pick<Product, 'lead_hours'>, size: Pick<ProductSize, 'lead_hours'> | undefined, defaultLead: number) {
  if (size && size.lead_hours != null) return size.lead_hours
  if (product.lead_hours != null) return product.lead_hours
  return defaultLead
}

/** Names of dishes in the basket that are not cooked on this date's weekday. */
export function dishesNotCookedOn(products: Pick<Product, 'name' | 'cook_days'>[], date: string) {
  const d = dow(date)
  return products.filter((p) => p.cook_days.length > 0 && !p.cook_days.includes(d)).map((p) => p.name)
}

export function slotState(
  ctx: ScheduleContext,
  date: string,
  slot: Slot,
  leadHours: number,
  blockedDishes: string[] = [],
): SlotState {
  const { settings, closures, booked } = ctx
  const closed =
    !slot.active ||
    !settings.cookingDays.includes(dow(date)) ||
    closures.some((c) => c.date === date && (c.slot_id === null || c.slot_id === slot.id))
  if (closed) return { ok: false, why: 'Closed' }
  const deadline = wall(date, hhmm(slot.start_time)) - leadHours * 36e5
  if (deadline <= ukNow(ctx.now)) return { ok: false, why: 'Too soon' }
  if (blockedDishes.length) return { ok: false, why: 'Not cooked this day' }
  const day = booked[date] ?? { total: 0, bySlot: {} }
  if (day.total >= settings.dailyCap) return { ok: false, why: 'Fully booked' }
  const taken = day.bySlot[slot.id] ?? 0
  if (taken >= slot.capacity) return { ok: false, why: 'Fully booked' }
  return { ok: true, left: slot.capacity - taken, deadline }
}

/** A day is open if any slot for the given methods is open. Its deadline is the earliest open slot's deadline. */
export function dayState(ctx: ScheduleContext, date: string, methods: Method[], leadHours: number, blockedDishes: string[] = []): DayState {
  let best: Unavailable | null = null
  let deadline: number | null = null
  for (const s of ctx.slots) {
    if (!methods.includes(s.method)) continue
    const r = slotState(ctx, date, s, leadHours, blockedDishes)
    if (r.ok) deadline = deadline == null ? r.deadline : Math.min(deadline, r.deadline)
    else if (best == null || RANK[r.why] < RANK[best]) best = r.why
  }
  if (deadline != null) return { ok: true, deadline }
  return { ok: false, why: best ?? 'Closed' }
}

export function nextDates(ctx: ScheduleContext, methods: Method[], n: number, leadHours = ctx.settings.leadHours, horizonDays = 42) {
  const out: { date: string; deadline: number }[] = []
  const t = todayUK(ctx.now)
  for (let i = 0; i < horizonDays && out.length < n; i++) {
    const d = addDays(t, i)
    const r = dayState(ctx, d, methods, leadHours)
    if (r.ok) out.push({ date: d, deadline: r.deadline })
  }
  return out
}

/** Build the Booked map from rows of {fulfil_date, slot_id}. */
export function countBooked(rows: { fulfil_date: string; slot_id: string | null }[]): Booked {
  const b: Booked = {}
  for (const r of rows) {
    const d = (b[r.fulfil_date] ??= { total: 0, bySlot: {} })
    d.total++
    if (r.slot_id) d.bySlot[r.slot_id] = (d.bySlot[r.slot_id] ?? 0) + 1
  }
  return b
}

/** Plain-English note on sizes that need more notice than the default, e.g. "5L bowls need 72 hours’ notice." */
export function longNoticeNote(products: Product[], defaultLead: number) {
  const m: Record<string, number> = {}
  for (const p of products)
    for (const s of p.sizes) {
      const l = itemLead(p, s, defaultLead)
      if (l > defaultLead) m[s.size] = Math.max(m[s.size] ?? 0, l)
    }
  const k = Object.keys(m).sort()
  if (!k.length) return ''
  return k.every((x) => m[x] === m[k[0]])
    ? `${k.join(' and ')} bowls need ${m[k[0]]} hours’ notice.`
    : k.map((x) => `${x} bowls need ${m[x]} hours`).join(', ') + '.'
}
