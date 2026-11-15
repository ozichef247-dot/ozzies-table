/**
 * Private mode: the site asks for a shared password before showing anything.
 * Used by proxy.ts on every request, so it reads the setting over plain fetch and caches it briefly.
 */
export const ACCESS_COOKIE = 'ot-access'
export const ACCESS_DAYS = 90

type Access = { enabled: boolean; password: string }
let cache: { at: number; value: Access } | null = null
const TTL_MS = 20_000

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''

export async function getAccess(fresh = false): Promise<Access> {
  if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value
  const url = supabaseUrl(), key = serviceKey()
  if (!url || !key) return { enabled: false, password: '' }
  try {
    const res = await fetch(`${url}/rest/v1/site_access?id=eq.1&select=enabled,password`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    })
    if (!res.ok) throw new Error(String(res.status))
    const [row] = (await res.json()) as Access[]
    const value = { enabled: !!row?.enabled && !!row?.password, password: row?.password ?? '' }
    cache = { at: Date.now(), value }
    return value
  } catch {
    // Database briefly unreachable: keep the last known setting.
    return cache?.value ?? { enabled: false, password: '' }
  }
}

export function clearAccessCache() { cache = null }

/** The cookie value for a password. Changing the password signs everyone out of the private site. */
export async function accessToken(password: string) {
  const data = new TextEncoder().encode(`ozzies-access|${password}|${serviceKey()}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Pages that never ask for the password: the gate itself, the owner panel, and server-to-server calls. */
export function isOpenPath(p: string) {
  return p === '/private' || p.startsWith('/admin') || p.startsWith('/api/webhooks') || p.startsWith('/api/cron')
}
