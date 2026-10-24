'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/** Checks the payment every few seconds and refreshes the page once it settles. */
export function StatusPoller({ orderRef, token }: { orderRef: string; token: string }) {
  const router = useRouter()
  const [tries, setTries] = useState(0)
  useEffect(() => {
    if (tries > 30) return
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/order-status?ref=${encodeURIComponent(orderRef)}&t=${encodeURIComponent(token)}`, { cache: 'no-store' })
        const j = await r.json()
        if (j.status !== 'pending' || j.payment_status === 'paid') { router.refresh(); return }
      } catch {}
      setTries((n) => n + 1)
    }, 2500)
    return () => clearTimeout(t)
  }, [tries, orderRef, token, router])
  return tries > 30
    ? <p className="alert warn small">This is taking longer than usual. If money has left your account, your order is safe: call us with your order number and we’ll confirm it.</p>
    : <p className="small muted"><span className="spinner" aria-hidden="true" /> Checking with the payment provider…</p>
}
