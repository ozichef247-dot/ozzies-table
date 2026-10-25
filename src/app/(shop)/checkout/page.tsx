import type { Metadata } from 'next'
import { getProducts, getSettings, getZones } from '@/lib/data'
import { CheckoutForm } from '@/components/CheckoutForm'
import { env } from '@/lib/env'

export const metadata: Metadata = { title: 'Checkout · Ozzie’s Table', robots: { index: false } }

export default async function CheckoutPage() {
  const [products, { general }, zones] = await Promise.all([getProducts(), getSettings(), getZones()])
  return (
    <CheckoutForm
      products={products}
      zones={zones}
      settings={{
        minDeliveryPence: general.minDeliveryPence, freeOverPence: general.freeOverPence, thresholdBasis: general.thresholdBasis,
        cancelHours: general.cancelHours, collection: general.collection, phone: general.contact.phone,
      }}
      revolut={{ mode: env.revolutMode(), publicKey: env.revolutPublicKey() }}
    />
  )
}
