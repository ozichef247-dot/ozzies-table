import { assertStaff } from '@/lib/auth'
import { reportOrders, toCsv, type Period } from '@/lib/reports'
import { todayUK } from '@/lib/time'

/** CSV download of paid orders for the chosen period (owner only). */
export async function GET(req: Request) {
  try {
    await assertStaff(['owner'])
  } catch {
    return new Response('Sign in as the owner to download reports.', { status: 401 })
  }
  const p = new URL(req.url).searchParams.get('period') as Period
  const period: Period = ['7', '30', '90', 'up', 'all'].includes(p) ? p : '30'
  const csv = toCsv(await reportOrders(period))
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ozzies-table-orders-${period}-${todayUK()}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
