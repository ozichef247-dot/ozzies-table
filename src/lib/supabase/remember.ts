import type { CookieOptions } from '@supabase/ssr'

/** "Keep me signed in on this device". On (default): sign-in lasts until signed out, refreshed as it's used. Off: ends when the browser closes. */
export const REMEMBER_COOKIE = 'ot-remember'
export const REMEMBER_SECONDS = 60 * 60 * 24 * 400 // the longest browsers allow

export function rememberCookieOptions(remember: boolean): CookieOptions {
  return remember ? { path: '/', maxAge: REMEMBER_SECONDS, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } : { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
}

/** Apply the choice to Supabase's sign-in cookies. Deletions (maxAge 0) are left alone. */
export function sessionCookieOptions(remember: boolean, o: CookieOptions = {}): CookieOptions {
  if (o.maxAge === 0) return o
  if (remember) return { ...o, maxAge: REMEMBER_SECONDS }
  const { maxAge: _m, expires: _e, ...rest } = o // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest
}
