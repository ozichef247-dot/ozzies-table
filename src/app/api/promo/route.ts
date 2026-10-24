import { NextResponse } from 'next/server'
import { z } from 'zod'
import { findPromo, getProducts } from '@/lib/data'
import { applyPromo, basketLineSchema, priceLine } from '@/lib/pricing'
import { todayUK } from '@/lib/time'

const schema = z.object({ code: z.string().trim().min(1).max(30), lines: z.array(basketLineSchema).max(30) })

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Enter a code.' })
  const products = await getProducts()
  let subtotal = 0
  for (const l of parsed.data.lines) {
    const r = priceLine(products.find((p) => p.id === l.productId), { ...l, seasoning: l.seasoning ?? undefined })
    if (r.ok) subtotal += r.item.line_pence
  }
  const r = applyPromo(await findPromo(parsed.data.code), subtotal, todayUK())
  return NextResponse.json(r.ok ? { ok: true, code: r.promo.code, amountPence: r.amount } : { ok: false, error: r.error, soft: r.soft ?? false })
}
