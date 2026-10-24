import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProducts, getScheduleContext } from '@/lib/data'
import { dayState, dishesNotCookedOn, itemLead, slotState } from '@/lib/schedule'
import { addDays, todayUK } from '@/lib/time'
import { SIZES } from '@/lib/types'

const schema = z.object({
  method: z.enum(['collection', 'delivery']),
  lines: z.array(z.object({ productId: z.string(), size: z.enum(SIZES) })).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  excludeRef: z.object({ ref: z.string(), token: z.string() }).nullable().optional(),
})

/** Dates and times the customer can still book, with the order deadline for each. Worked out on the server. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const { method, lines, date } = parsed.data
  const [products, ctx] = await Promise.all([getProducts(), getScheduleContext(null)])
  const basket = lines.map((l) => ({ l, p: products.find((p) => p.id === l.productId) })).filter((x) => x.p)
  const lead = basket.length
    ? Math.max(...basket.map(({ l, p }) => itemLead(p!, p!.sizes.find((s) => s.size === l.size), ctx.settings.leadHours)))
    : ctx.settings.leadHours
  const ps = basket.map((x) => x.p!)
  const t = todayUK()
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = addDays(t, i)
    return { date: d, ...dayState(ctx, d, [method], lead, dishesNotCookedOn(ps, d)) }
  })
  const blocked = date ? dishesNotCookedOn(ps, date) : []
  const slots = date
    ? ctx.slots.filter((s) => s.method === method).map((s) => ({
        id: s.id, start: s.start_time, end: s.end_time, ...slotState(ctx, date, s, lead, blocked),
      }))
    : []
  return NextResponse.json({ lead, days, slots, blocked })
}
