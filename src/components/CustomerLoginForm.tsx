'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { sendCustomerCode, verifyCustomerCode, type CodeState } from '@/app/(shop)/account/actions'

const act = (prev: CodeState, f: FormData) => (f.get('intent') === 'verify' ? verifyCustomerCode(prev, f) : sendCustomerCode(prev, f))

/** Sign in or create an account: email → 6-digit code. No passwords. */
export function CustomerLoginForm({ next, email: initialEmail }: { next: string; email?: string }) {
  const [state, action, pending] = useActionState(act, { step: 'email', next, email: initialEmail } as CodeState)

  if (state.step === 'email')
    return (
      <form action={action} className="stack" style={{ ['--g' as string]: '12px' }}>
        <input type="hidden" name="intent" value="send" />
        <input type="hidden" name="next" value={state.next ?? next} />
        <div className="fld"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required autoFocus /></div>
        {state.error ? <p className="err" role="alert">{state.error}</p> : null}
        <button className="btn btn-ink" disabled={pending}>{pending ? 'Sending…' : 'Email me a code'}</button>
      </form>
    )

  return (
    <div className="stack" style={{ ['--g' as string]: '12px' }}>
      {state.info ? <p className="alert plain small" role="status">{state.info}</p> : null}
      <form action={action} className="stack" style={{ ['--g' as string]: '12px' }}>
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={state.next ?? next} />
        <div className="fld">
          <label htmlFor="code">6-digit code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus style={{ letterSpacing: '.3em', fontSize: '1.3rem' }} />
        </div>
        {state.error ? <p className="err" role="alert">{state.error}</p> : null}
        <button className="btn btn-ink" disabled={pending}>{pending ? 'Checking…' : 'Continue'}</button>
      </form>
      <form action={action}>
        <input type="hidden" name="intent" value="send" />
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={state.next ?? next} />
        <button className="link small" disabled={pending}>Send a new code</button>
      </form>
      <Link className="link small" href={`/account/login?next=${encodeURIComponent(next)}`}>Use a different email</Link>
    </div>
  )
}
