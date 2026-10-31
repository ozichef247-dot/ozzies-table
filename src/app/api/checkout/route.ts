import { NextResponse } from 'next/server'
import { startCheckout } from '@/lib/orders'
import { getCustomer, saveCustomerDetails } from '@/lib/customer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const customer = await getCustomer()
    const result = await startCheckout(body, customer ? { customerId: customer.userId, email: customer.email } : undefined)
    // Signed-in customers can keep what they entered for next time.
    if (result.ok && customer) {
      await saveCustomerDetails(customer.userId, customer.email, {
        first_name: body.first, last_name: body.last, phone: body.phone,
        ...(body.method === 'delivery' ? { address_line1: body.line1, address_line2: body.line2, town: body.town, postcode: body.postcode } : {}),
      }).catch((e) => console.error('saving customer details failed', e))
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 422 })
  } catch (e) {
    console.error('checkout failed', e)
    return NextResponse.json({ ok: false, message: 'Something went wrong on our side. Nothing was charged. Please try again.' }, { status: 500 })
  }
}
