'use client'

import { useActionState } from 'react'
import { sendLoginCode, verifyLoginCode } from '../actions'

type State = { step: 'email' | 'code'; email?: string; error?: string; info?: string }

const act = (prev: State, f: FormData) => (f.get('intent') === 'verify' ? verifyLoginCode(prev, f) : sendLoginCode(prev, f))

/** Two steps: enter email → enter the 6-digit code that arrives by email. */
export function LoginForm() {
  const [state, action, pending] = useActionState(act, { step: 'email' } as State)

  if (state.step === 'email')
    return (
      <form action={action} className="stack" style={{ ['--g' as string]: '12px' }}>
        <input type="hidden" name="intent" value="send" />
        <p className="muted small">We’ll email you a 6-digit code. No password needed.</p>
        <div className="fld"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required autoFocus /></div>
        {state.error ? <p className="err" role="alert">{state.error}</p> : null}
        <button className="btn btn-ink" disabled={pending}>{pending ? 'Sending…' : 'Email me a code'}</button>
      </form>
    )

  return (
    <div className="stack" style={{ ['--g' as string]: '12px' }}>
      {state.info ? <p className="muted small" role="status">{state.info}</p> : null}
      <form action={action} className="stack" style={{ ['--g' as string]: '12px' }}>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        <div className="fld">
          <label htmlFor="code">6-digit code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus style={{ letterSpacing: '.3em', fontSize: '1.3rem' }} />
        </div>
        {state.error ? <p className="err" role="alert">{state.error}</p> : null}
        <button className="btn btn-ink" disabled={pending}>{pending ? 'Checking…' : 'Sign in'}</button>
      </form>
      <form action={action}>
        <input type="hidden" name="intent" value="send" />
        <input type="hidden" name="email" value={state.email} />
        <button className="link small" disabled={pending}>Send a new code</button>
      </form>
      <a className="link small" href="/admin/login">Use a different email</a>
    </div>
  )
}
