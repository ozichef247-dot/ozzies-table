import { NextResponse } from 'next/server'
import { startCheckout } from '@/lib/orders'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await startCheckout(body)
    return NextResponse.json(result, { status: result.ok ? 200 : 422 })
  } catch (e) {
    console.error('checkout failed', e)
    return NextResponse.json({ ok: false, message: 'Something went wrong on our side. Nothing was charged. Please try again.' }, { status: 500 })
  }
}
