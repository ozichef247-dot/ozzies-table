import { describe, expect, it } from 'vitest'
import { countBooked, dayState, dishesNotCookedOn, itemLead, longNoticeNote, nextDates, slotState, type ScheduleContext } from '@/lib/schedule'
import type { Product, Slot } from '@/lib/types'

// Wednesday 14 October 2026, 10:00 UK (BST, UTC+1)
const now = new Date('2026-10-14T09:00:00Z')
const slot = (id: string, method: 'collection' | 'delivery', start: string, cap = 2): Slot => ({ id, method, start_time: start, end_time: start.replace(/^(\d\d)/, (h) => String(+h + 1).padStart(2, '0')), capacity: cap, active: true })
const slots = [slot('c1', 'collection', '11:00'), slot('c2', 'collection', '14:00'), slot('d1', 'delivery', '12:00')]
const ctx = (over: Partial<ScheduleContext> = {}): ScheduleContext => ({
  settings: { leadHours: 48, dailyCap: 10, cookingDays: [5, 6, 0] }, slots, closures: [], booked: {}, now, ...over,
})

describe('slot availability', () => {
  it('closes days that are not cooking days', () => {
    expect(slotState(ctx(), '2026-10-15', slots[0], 48)).toEqual({ ok: false, why: 'Closed' }) // Thursday
  })
  it('enforces the notice period against UK time', () => {
    // Fri 16 Oct 11:00 needs ordering by Wed 14 Oct 11:00; it is 10:00, so still open
    const r = slotState(ctx(), '2026-10-16', slots[0], 48)
    expect(r.ok).toBe(true)
    // 72 hours' notice makes it too soon
    expect(slotState(ctx(), '2026-10-16', slots[0], 72)).toEqual({ ok: false, why: 'Too soon' })
  })
  it('reports the order deadline as UK wall-clock time', () => {
    const r = slotState(ctx(), '2026-10-16', slots[0], 48)
    expect(r.ok && new Date(r.deadline).toISOString()).toBe('2026-10-14T11:00:00.000Z') // wall value: Wed 11:00 UK
  })
  it('stays correct across the clocks going back (BST to GMT on 25 Oct 2026)', () => {
    const n = new Date('2026-10-24T08:30:00Z') // Sat 24 Oct 09:30 BST
    const r = slotState(ctx({ now: n }), '2026-10-26', slot('m', 'collection', '09:00'), 48)
    // Mon 26 Oct is not a cooking day, so test with Monday added
    const r2 = slotState(ctx({ now: n, settings: { leadHours: 48, dailyCap: 10, cookingDays: [1] } }), '2026-10-26', slot('m', 'collection', '10:00'), 48)
    expect(r).toEqual({ ok: false, why: 'Closed' })
    expect(r2.ok).toBe(true) // deadline Sat 24 Oct 10:00 UK, it is 09:30 UK
  })
  it('marks full slots and full days', () => {
    const booked = countBooked([{ fulfil_date: '2026-10-17', slot_id: 'c1' }, { fulfil_date: '2026-10-17', slot_id: 'c1' }])
    expect(slotState(ctx({ booked }), '2026-10-17', slots[0], 48)).toEqual({ ok: false, why: 'Fully booked' })
    expect(slotState(ctx({ booked }), '2026-10-17', slots[1], 48).ok).toBe(true)
    expect(slotState(ctx({ booked, settings: { leadHours: 48, dailyCap: 2, cookingDays: [5, 6, 0] } }), '2026-10-17', slots[1], 48)).toEqual({ ok: false, why: 'Fully booked' })
  })
  it('respects closed days and closed slots', () => {
    expect(slotState(ctx({ closures: [{ date: '2026-10-17', slot_id: null }] }), '2026-10-17', slots[1], 48).ok).toBe(false)
    expect(slotState(ctx({ closures: [{ date: '2026-10-17', slot_id: 'c1' }] }), '2026-10-17', slots[1], 48).ok).toBe(true)
  })
  it('blocks days when a dish in the basket is not cooked that day', () => {
    const blocked = dishesNotCookedOn([{ name: 'Pepper soup', cook_days: [6, 0] }], '2026-10-16')
    expect(blocked).toEqual(['Pepper soup'])
    expect(slotState(ctx(), '2026-10-16', slots[0], 48, blocked)).toEqual({ ok: false, why: 'Not cooked this day' })
  })
  it('gives each day the earliest open deadline and finds the next dates', () => {
    const d = dayState(ctx(), '2026-10-17', ['collection', 'delivery'], 48)
    expect(d.ok && new Date(d.deadline).toISOString()).toBe('2026-10-15T11:00:00.000Z')
    expect(nextDates(ctx(), ['delivery'], 3).map((x) => x.date)).toEqual(['2026-10-16', '2026-10-17', '2026-10-18'])
  })
})

describe('notice per size', () => {
  const p = { lead_hours: null } as Pick<Product, 'lead_hours'>
  it('uses size, then dish, then default', () => {
    expect(itemLead(p, { lead_hours: 72 }, 48)).toBe(72)
    expect(itemLead({ lead_hours: 24 }, { lead_hours: null }, 48)).toBe(24)
    expect(itemLead(p, { lead_hours: null }, 48)).toBe(48)
  })
  it('describes longer notice for big bowls', () => {
    const prod = { lead_hours: null, sizes: [{ size: '2L', lead_hours: null }, { size: '5L', lead_hours: 72 }] } as unknown as Product
    expect(longNoticeNote([prod], 48)).toBe('5L bowls need 72 hours’ notice.')
  })
})
