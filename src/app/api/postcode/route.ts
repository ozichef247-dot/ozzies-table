import { NextResponse } from 'next/server'
import { getScheduleContext, getSettings, getZones } from '@/lib/data'
import { checkPostcode } from '@/lib/postcode'
import { nextDates } from '@/lib/schedule'

export async function POST(req: Request) {
  const { postcode } = (await req.json().catch(() => ({}))) as { postcode?: string }
  const [zones, { general }, ctx] = await Promise.all([getZones(), getSettings(), getScheduleContext()])
  const r = checkPostcode(postcode ?? '', zones)
  if (r.ok) {
    return NextResponse.json({
      ok: true, postcode: r.postcode, zone: r.zone.name, feePence: r.zone.fee_pence,
      minPence: general.minDeliveryPence, freeOverPence: general.freeOverPence,
      dates: nextDates(ctx, ['delivery'], 3),
    })
  }
  return NextResponse.json({
    ok: false, kind: r.kind, message: r.message, postcode: r.postcode,
    collection: r.kind === 'area' ? { address: general.collection.address, next: nextDates(ctx, ['collection'], 1)[0] ?? null } : null,
  })
}
