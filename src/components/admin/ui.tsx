import type { OrderStatus } from '@/lib/types'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/types'

export function Flash({ sp }: { sp: { ok?: string; error?: string } }) {
  if (sp.error) return <div className="alert bad flash" role="alert">{sp.error}</div>
  if (sp.ok) return <div className="alert ok flash" role="status">{sp.ok}</div>
  return null
}

export function StatusPill({ s }: { s: OrderStatus }) {
  return <span className={`pill ${STATUS_TONE[s]}`}>{STATUS_LABEL[s]}</span>
}

/** A one-click on/off control that posts to a server action. */
export function Toggle({ action, on, label, hidden }: { action: (f: FormData) => Promise<void>; on: boolean; label: string; hidden: Record<string, string> }) {
  return (
    <form action={action} className="inline-form">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="value" value={on ? 'false' : 'true'} />
      <button className="switch" aria-pressed={on} aria-label={`${label}: ${on ? 'on' : 'off'}`} title={`${label}: ${on ? 'on' : 'off'}`} style={{ border: 0, background: 'none', padding: 0 }}>
        <span style={{ background: on ? 'var(--ink)' : 'var(--line-2)' }} />
      </button>
    </form>
  )
}

export const G = (g: string) => ({ ['--g' as string]: g }) as React.CSSProperties
