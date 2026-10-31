'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/admin'
import { getCustomer } from '@/lib/customer'
import { formatPostcode } from '@/lib/postcode'

export type CodeState = { step: 'email' | 'code'; email?: string; next?: string; error?: string; info?: string }

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
/** Only send people back to pages on this site. */
const safeNext = (v: string) => (v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/admin') ? v : '/account')

/** Step 1: email a 6-digit code. Creates the account on first use, so signing in and signing up are the same. */
export async function sendCustomerCode(_: CodeState, f: FormData): Promise<CodeState> {
  const email = str(f, 'email').toLowerCase()
  const next = safeNext(str(f, 'next'))
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { step: 'email', next, email, error: 'Enter an email address like name@example.com.' }
  // Public sign-up stays off in Supabase; the server creates the login here instead. "Already registered" is fine.
  await db().auth.admin.createUser({ email, email_confirm: true }).catch(() => null)
  const sb = await authClient()
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
  if (error) {
    const wait = /rate|seconds|too many/i.test(error.message)
    return { step: 'email', email, next, error: wait ? 'Please wait a minute before asking for another code.' : 'We couldn’t send a code just now. Please try again.' }
  }
  return { step: 'code', email, next, info: `We’ve emailed a 6-digit code to ${email}. It expires in an hour. Check your spam folder if it hasn’t arrived.` }
}

/** Step 2: check the code, make sure the account record exists, and go back to where they were. */
export async function verifyCustomerCode(_: CodeState, f: FormData): Promise<CodeState> {
  const email = str(f, 'email').toLowerCase()
  const next = safeNext(str(f, 'next'))
  const token = str(f, 'code').replace(/\D/g, '')
  if (token.length !== 6) return { step: 'code', email, next, error: 'Enter the 6-digit code from the email.' }
  const sb = await authClient()
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' })
  if (error || !data.user) return { step: 'code', email, next, error: 'That code isn’t right or has expired. Check the latest email, or ask for a new code.' }
  await db().from('customers').upsert({ user_id: data.user.id, email }, { onConflict: 'user_id', ignoreDuplicates: true })
  redirect(next)
}

export async function saveProfile(_: { ok?: string; error?: string }, f: FormData): Promise<{ ok?: string; error?: string }> {
  const c = await getCustomer()
  if (!c) return { error: 'Please sign in again.' }
  const phone = str(f, 'phone')
  if (phone && phone.replace(/\D/g, '').length < 10) return { error: 'Enter a mobile number with at least 10 digits.' }
  const pc = str(f, 'postcode')
  await db().from('customers').upsert({
    user_id: c.userId, email: c.email,
    first_name: str(f, 'first').slice(0, 60), last_name: str(f, 'last').slice(0, 60), phone: phone.slice(0, 30),
    address_line1: str(f, 'line1').slice(0, 120), address_line2: str(f, 'line2').slice(0, 120), town: str(f, 'town').slice(0, 60),
    postcode: pc ? formatPostcode(pc) : '', updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  revalidatePath('/account')
  return { ok: 'Your details are saved.' }
}

export async function customerSignOut() {
  const sb = await authClient()
  await sb.auth.signOut()
  redirect('/')
}

