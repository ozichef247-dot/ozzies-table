'use client'

import { useActionState, useEffect, useState } from 'react'
import { startEnrolment, verifyCode, signOut } from '../actions'

export function VerifyForm({ factorId, email }: { factorId: string | null; email: string }) {
  const [enrol, setEnrol] = useState<{ factorId: string; qr: string; secret: string } | null>(null)
  const [enrolError, setEnrolError] = useState('')
  const [state, action, pending] = useActionState(verifyCode, null as { error?: string } | null)

  useEffect(() => {
    if (factorId) return
    startEnrolment().then((r) => ('error' in r ? setEnrolError(r.error ?? '') : setEnrol(r)))
  }, [factorId])

  const id = factorId ?? enrol?.factorId
  return (
    <>
      <h1 style={{ fontSize: '1.8rem' }}>{factorId ? 'Enter your code' : 'Set up two-step sign-in'}</h1>
      {factorId ? (
        <p className="muted small">Open your authenticator app and enter the 6-digit code for Ozzie’s Table ({email}).</p>
      ) : enrol ? (
        <div className="stack" style={{ ['--g' as string]: '10px' }}>
          <p className="muted small">Scan this with an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrol.qr} alt="QR code for your authenticator app" width={180} height={180} style={{ background: '#fff', padding: 8, borderRadius: 8 }} />
          <p className="small muted">Can’t scan? Enter this key: <code style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>{enrol.secret}</code></p>
        </div>
      ) : (
        <p className="muted small">{enrolError || 'Preparing…'}</p>
      )}
      {id ? (
        <form action={action} className="stack" style={{ ['--g' as string]: '12px' }}>
          <input type="hidden" name="factorId" value={id} />
          <div className="fld">
            <label htmlFor="code">Sign-in code</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required style={{ letterSpacing: '.3em', fontSize: '1.3rem' }} />
          </div>
          {state?.error ? <p className="err" role="alert">{state.error}</p> : null}
          <button className="btn btn-ink" disabled={pending}>{pending ? 'Checking…' : 'Sign in'}</button>
        </form>
      ) : null}
      <form action={signOut}><button className="link small">Use a different account</button></form>
    </>
  )
}
