'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

const KEY = 'ozzies-consent'
export const CONSENT_EVENT = 'ozzies-consent-reset'

/** Essential cookies only, unless the visitor accepts analytics. Analytics never load without consent. */
export function CookieBanner() {
  const [choice, setChoice] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    try { setChoice(localStorage.getItem(KEY)) } catch { setChoice(null) }
    const reset = () => setChoice(null)
    window.addEventListener(CONSENT_EVENT, reset)
    return () => window.removeEventListener(CONSENT_EVENT, reset)
  }, [])
  const choose = (v: 'essential' | 'all') => {
    try { localStorage.setItem(KEY, v) } catch {}
    setChoice(v)
  }
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SRC
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN
  return (
    <>
      {choice === 'all' && src ? <Script src={src} data-domain={domain} strategy="afterInteractive" /> : null}
      {choice === null ? (
        <div className="cookie" role="region" aria-label="Cookie choice">
          <p className="small"><b>Cookies.</b> Essential cookies keep your basket working. With your permission we also use analytics cookies to see how people use the site and where checkout gets stuck.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-quiet btn-sm" onClick={() => choose('essential')}>Essential only</button>
            <button className="btn btn-ink btn-sm" onClick={() => choose('all')}>Accept analytics</button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function ChangeCookieChoice() {
  return (
    <button className="link" onClick={() => { try { localStorage.removeItem(KEY) } catch {} window.dispatchEvent(new Event(CONSENT_EVENT)) }}>
      Change cookie choice
    </button>
  )
}
