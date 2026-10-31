'use client'

import { useActionState } from 'react'
import { saveProfile } from '@/app/(shop)/account/actions'
import type { CustomerProfile } from '@/lib/customer'

/** Saved details used to fill in checkout. */
export function ProfileForm({ p, next }: { p: CustomerProfile; next?: string }) {
  const [state, action, pending] = useActionState(saveProfile, {})
  const f = (label: string, name: string, value: string, o: { ac?: string; type?: string; opt?: boolean } = {}) => (
    <div className="fld">
      <label htmlFor={`pf-${name}`}>{label}{o.opt ? <span className="opt-tx"> optional</span> : null}</label>
      <input id={`pf-${name}`} name={name} type={o.type ?? 'text'} autoComplete={o.ac} defaultValue={value} />
    </div>
  )
  return (
    <form action={action} className="stack" style={{ ['--g' as string]: '14px' }}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="f2">
        {f('First name', 'first', p.first_name, { ac: 'given-name' })}
        {f('Last name', 'last', p.last_name, { ac: 'family-name' })}
        <div className="fld"><label htmlFor="pf-email">Email</label><input id="pf-email" value={p.email} disabled /></div>
        {f('Mobile number', 'phone', p.phone, { ac: 'tel', type: 'tel' })}
      </div>
      <p className="eyebrow" style={{ marginTop: 6 }}>Delivery address <span className="opt-tx" style={{ textTransform: 'none', letterSpacing: 0 }}>optional</span></p>
      <p className="hint" style={{ marginTop: -8 }}>Add it now and you won’t need to type it when you order delivery. Only collecting? Leave it blank.</p>
      <div className="f2">
        {f('Address line 1', 'line1', p.address_line1, { ac: 'address-line1' })}
        {f('Address line 2', 'line2', p.address_line2, { ac: 'address-line2', opt: true })}
        {f('Town', 'town', p.town, { ac: 'address-level2' })}
        {f('Postcode', 'postcode', p.postcode, { ac: 'postal-code' })}
      </div>
      {state.error ? <p className="err" role="alert">{state.error}</p> : null}
      {state.ok ? <p className="alert ok small" role="status">{state.ok}</p> : null}
      <div><button className="btn btn-ink" disabled={pending}>{pending ? 'Saving…' : next ? 'Save and continue' : 'Save details'}</button></div>
    </form>
  )
}
