import 'server-only'
import { authClient } from './supabase/server'
import { db } from './supabase/admin'

export interface CustomerProfile {
  email: string
  first_name: string
  last_name: string
  phone: string
  address_line1: string
  address_line2: string
  town: string
  postcode: string
}
export interface CustomerSession { userId: string; email: string; profile: CustomerProfile }

/** The signed-in customer, or null for guests. Their email is proven by the emailed code. */
export async function getCustomer(): Promise<CustomerSession | null> {
  try {
    const sb = await authClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user?.email) return null
    const email = user.email.toLowerCase()
    const { data } = await db().from('customers').select('*').eq('user_id', user.id).maybeSingle()
    const profile: CustomerProfile = data ?? { email, first_name: '', last_name: '', phone: '', address_line1: '', address_line2: '', town: '', postcode: '' }
    return { userId: user.id, email, profile: { ...profile, email } }
  } catch {
    return null
  }
}

/** Keep the account's saved details up to date from what was entered at checkout. */
export async function saveCustomerDetails(userId: string, email: string, d: Partial<Omit<CustomerProfile, 'email'>>) {
  const clean = Object.fromEntries(Object.entries(d).filter(([, v]) => typeof v === 'string' && v.trim() !== '')) as Partial<CustomerProfile>
  await db().from('customers').upsert({ user_id: userId, email, ...clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
}
