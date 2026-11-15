'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACCESS_COOKIE, ACCESS_DAYS, accessToken, getAccess } from '@/lib/access'

const safeNext = (v: string) => (v.startsWith('/') && !v.startsWith('//') ? v : '/')

export async function enterPassword(_: { error?: string }, f: FormData): Promise<{ error?: string }> {
  const next = safeNext(String(f.get('next') ?? '/'))
  const given = String(f.get('password') ?? '').trim()
  const access = await getAccess(true)
  if (!access.enabled) redirect(next)
  const [a, b] = await Promise.all([accessToken(given), accessToken(access.password)])
  if (!given || a !== b) {
    await new Promise((r) => setTimeout(r, 600)) // slow down guessing
    return { error: 'That password isn’t right. Check it with whoever shared the link.' }
  }
  ;(await cookies()).set(ACCESS_COOKIE, b, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * ACCESS_DAYS })
  redirect(next)
}
