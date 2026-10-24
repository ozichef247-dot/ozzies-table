import 'server-only'
import { db } from './supabase/admin'
import type { Order, OrderItem } from './types'
import { LIVE_STATUSES } from './types'

/** Confirmed orders (with items) between two dates, for production lists and capacity bars. */
export async function liveOrdersBetween(from: string, to: string) {
  const { data, error } = await db().from('orders').select('id, fulfil_date, slot_id, status, order_items(*)')
    .gte('fulfil_date', from).lte('fulfil_date', to).in('status', LIVE_STATUSES)
  if (error) throw new Error(error.message)
  return (data ?? []) as (Pick<Order, 'id' | 'fulfil_date' | 'slot_id' | 'status'> & { order_items: OrderItem[] })[]
}
