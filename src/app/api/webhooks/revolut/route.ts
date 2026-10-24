import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { verifyRevolutSignature } from '@/lib/revolut-signature'
import { handleRevolutWebhook } from '@/lib/orders'
import { db } from '@/lib/supabase/admin'

/**
 * Revolut calls this when a payment changes state. We verify the signature, record the delivery so repeats are
 * ignored, then re-read the order from Revolut and act on that (never on the webhook body alone).
 */
export async function POST(req: Request) {
  const raw = await req.text()
  const ok = verifyRevolutSignature(
    raw,
    req.headers.get('revolut-request-timestamp'),
    req.headers.get('revolut-signature'),
    env.revolutWebhookSecret(),
  )
  if (!ok) return new NextResponse('Invalid signature', { status: 401 })

  let event: { event?: string; order_id?: string }
  try {
    event = JSON.parse(raw)
  } catch {
    return new NextResponse('Bad payload', { status: 400 })
  }
  if (!event.order_id) return NextResponse.json({ ignored: true })

  const deliveryId = `${event.event}:${event.order_id}:${req.headers.get('revolut-request-timestamp')}`
  const { error: dup } = await db().from('webhook_events').insert({ id: deliveryId })
  if (dup && dup.code === '23505') return NextResponse.json({ duplicate: true })

  try {
    const result = await handleRevolutWebhook(event.order_id)
    return NextResponse.json({ result })
  } catch (e) {
    console.error('Revolut webhook failed', e)
    await db().from('webhook_events').delete().eq('id', deliveryId) // let Revolut's retry try again
    return new NextResponse('Error', { status: 500 })
  }
}
