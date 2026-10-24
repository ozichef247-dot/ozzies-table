'use client'

import { useActionState } from 'react'
import { signIn } from '../actions'

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null as { error?: string } | null)
  return (
    <form action={action} className="stack" style={{ ['--g' as string]: '12px' }}>
      <div className="fld"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
      <div className="fld"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      {state?.error ? <p className="err" role="alert">{state.error}</p> : null}
      <button className="btn btn-ink" disabled={pending}>{pending ? 'Signing in…' : 'Continue'}</button>
    </form>
  )
}
