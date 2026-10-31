import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '../env'
import { REMEMBER_COOKIE, rememberCookieOptions, sessionCookieOptions } from './remember'

/**
 * Client bound to the visitor's sign-in (staff or customer).
 * Pass `remember` when signing in to record "Keep me signed in on this device"; otherwise the saved choice is used.
 */
export async function authClient(opts: { remember?: boolean } = {}) {
  const store = await cookies()
  let remember = opts.remember ?? store.get(REMEMBER_COOKIE)?.value !== '0'
  if (opts.remember !== undefined) {
    try { store.set(REMEMBER_COOKIE, remember ? '1' : '0', rememberCookieOptions(remember)) } catch { remember = opts.remember }
  }
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, sessionCookieOptions(remember, options))
        } catch {
          // Called from a Server Component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  })
}
