import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/admin'
import { reconcile } from '@/lib/orders'
import type { Order } from '@/lib/types'

/** Polled by the confirmation page until the payment is settled. */
export async function GET(req: Request) {
  const u = new URL(req.url)
  const ref = u.searchParams.get('ref') ?? ''
  const token = u.searchParams.get('t') ?? ''
  const { data } = await db().from('orders').select('*').eq('ref', ref).eq('view_token', token).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await reconcile(data as Order)
  const { data: fresh } = await db().from('orders').select('status, payment_status').eq('id', data.id).single()
  return NextResponse.json(fresh, { headers: { 'Cache-Control': 'no-store' } })
}
