import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { REMEMBER_COOKIE, sessionCookieOptions } from './lib/supabase/remember'
import { ACCESS_COOKIE, accessToken, getAccess, isOpenPath } from './lib/access'

const SESSION_PATHS = /^\/(admin|account|checkout|api\/checkout)(\/|$)/

/**
 * 1. Private mode: without the shared password, visitors only see the password page.
 * 2. Keeps staff and customer sign-ins fresh on dashboard, account and checkout pages.
 * Permission checks happen on the server in each page and action.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const access = await getAccess()

  if (access.enabled && !isOpenPath(path)) {
    const ok = request.cookies.get(ACCESS_COOKIE)?.value === (await accessToken(access.password))
    if (!ok) {
      if (path.startsWith('/api/')) return NextResponse.json({ error: 'This website is private.' }, { status: 401 })
      const to = request.nextUrl.clone()
      to.pathname = '/private'
      to.search = path === '/' ? '' : `?next=${encodeURIComponent(path + request.nextUrl.search)}`
      return NextResponse.redirect(to)
    }
  }

  let response = NextResponse.next({ request })
  if (access.enabled) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  if (!SESSION_PATHS.test(path)) return response

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return response
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== '0'
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        if (access.enabled) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
        for (const { name, value, options } of list) response.cookies.set(name, value, sessionCookieOptions(remember, options))
      },
    },
  })
  await supabase.auth.getUser()
  return response
}

// Everything except Next's own files and static images/icons.
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)'] }
