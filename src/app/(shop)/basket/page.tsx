import type { Metadata } from 'next'
import { getProducts, getSettings } from '@/lib/data'
import { BasketView } from '@/components/BasketView'

export const metadata: Metadata = { title: 'Basket · Ozzie’s Table', robots: { index: false } }

export default async function BasketPage() {
  const [products, { general }] = await Promise.all([getProducts(), getSettings()])
  return <BasketView products={products} settings={{ minDeliveryPence: general.minDeliveryPence, freeOverPence: general.freeOverPence, thresholdBasis: general.thresholdBasis }} />
}
