import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../src/proxy'
import { ACCESS_COOKIE, accessToken, clearAccessCache } from '../src/lib/access'

function setAccess(enabled: boolean, password = 'jollof123') {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ enabled, password }]), { status: 200 })))
}
const req = (path: string, cookie?: string) => new NextRequest(new URL(path, 'https://www.ozziestable.com'), { headers: cookie ? { cookie } : {} })

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  clearAccessCache()
})
afterEach(() => vi.unstubAllGlobals())

describe('private mode', () => {
  it('lets everyone in when off', async () => {
    setAccess(false)
    const r = await proxy(req('/menu'))
    expect(r.headers.get('location')).toBeNull()
  })
  it('sends visitors without the password to the password page, keeping where they were going', async () => {
    setAccess(true)
    const r = await proxy(req('/menu/egusi-soup'))
    expect(r.headers.get('location')).toBe('https://www.ozziestable.com/private?next=%2Fmenu%2Fegusi-soup')
    expect(r.headers.get('x-robots-tag')).toBeNull()
    const api = await proxy(req('/api/availability'))
    expect(api.status).toBe(401)
  })
  it('lets in visitors with the right cookie, and asks again after the password changes', async () => {
    setAccess(true)
    const good = `${ACCESS_COOKIE}=${await accessToken('jollof123')}`
    const r = await proxy(req('/menu', good))
    expect(r.headers.get('location')).toBeNull()
    expect(r.headers.get('x-robots-tag')).toContain('noindex')
    clearAccessCache(); setAccess(true, 'egusi456')
    expect((await proxy(req('/menu', good))).headers.get('location')).toContain('/private')
  })
  it('never blocks the owner panel, the password page or server callbacks', async () => {
    setAccess(true)
    for (const p of ['/admin/login', '/private', '/api/webhooks/revolut', '/api/cron/expire']) {
      expect((await proxy(req(p))).headers.get('location'), p).toBeNull()
    }
  })
})
