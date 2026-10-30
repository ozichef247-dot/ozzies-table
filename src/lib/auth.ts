import 'server-only'
import { redirect } from 'next/navigation'
import { authClient } from './supabase/server'
import { db } from './supabase/admin'

export type Role = 'owner' | 'kitchen'
export interface StaffSession { userId: string; email: string; role: Role }

/** Signed in with an emailed code and listed as staff. Otherwise sends the visitor to sign in. */
export async function requireStaff(allowed: Role[] = ['owner', 'kitchen']): Promise<StaffSession> {
  const sb = await authClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: staff } = await db().from('staff').select('role, email').eq('user_id', user.id).maybeSingle()
  if (!staff) redirect('/admin/login?error=not-staff')
  if (!allowed.includes(staff.role as Role)) redirect('/admin')
  return { userId: user.id, email: staff.email, role: staff.role as Role }
}

/** For server actions: same checks, but throws instead of redirecting. */
export async function assertStaff(allowed: Role[] = ['owner']): Promise<StaffSession> {
  const sb = await authClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Please sign in again.')
  const { data: staff } = await db().from('staff').select('role, email').eq('user_id', user.id).maybeSingle()
  if (!staff || !allowed.includes(staff.role as Role)) throw new Error('You don’t have permission to do that.')
  return { userId: user.id, email: staff.email, role: staff.role as Role }
}
