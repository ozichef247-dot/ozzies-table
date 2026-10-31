import { describe, expect, it } from 'vitest'
import { REMEMBER_SECONDS, sessionCookieOptions } from '../src/lib/supabase/remember'

describe('keep me signed in', () => {
  it('keeps sign-in cookies for 400 days when ticked', () => {
    expect(sessionCookieOptions(true, { path: '/', maxAge: 3600 }).maxAge).toBe(REMEMBER_SECONDS)
  })
  it('makes them end with the browser when not ticked', () => {
    const o = sessionCookieOptions(false, { path: '/', maxAge: 3600, expires: new Date() })
    expect(o.maxAge).toBeUndefined()
    expect(o.expires).toBeUndefined()
    expect(o.path).toBe('/')
  })
  it('still lets sign-out delete cookies', () => {
    expect(sessionCookieOptions(true, { maxAge: 0 }).maxAge).toBe(0)
    expect(sessionCookieOptions(false, { maxAge: 0 }).maxAge).toBe(0)
  })
})
