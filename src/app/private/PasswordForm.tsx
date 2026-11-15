'use client'

import { useActionState } from 'react'
import { enterPassword } from './actions'

export function PasswordForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(enterPassword, {})
  return (
    <form action={action} className="stack" style={{ ['--g' as string]: '12px' }}>
      <input type="hidden" name="next" value={next} />
      <div className="fld">
        <label htmlFor="pw">Password</label>
        <input id="pw" name="password" type="password" autoComplete="current-password" required autoFocus />
      </div>
      {state.error ? <p className="err" role="alert">{state.error}</p> : null}
      <button className="btn btn-ink" disabled={pending}>{pending ? 'Checking…' : 'Enter'}</button>
    </form>
  )
}
