// Registers this site's webhook with Revolut and prints the signing secret to put in REVOLUT_WEBHOOK_SECRET.
// Usage: node --env-file=.env.local scripts/create-revolut-webhook.mjs https://www.ozziestable.com
const site = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
const key = process.env.REVOLUT_SECRET_KEY
const mode = (process.env.REVOLUT_MODE || process.env.NEXT_PUBLIC_REVOLUT_MODE) === 'prod' ? 'prod' : 'sandbox'
if (!site.startsWith('https://')) throw new Error('Pass the public https address of the site, e.g. https://www.ozziestable.com')
if (!key) throw new Error('Set REVOLUT_SECRET_KEY first')
const base = mode === 'prod' ? 'https://merchant.revolut.com' : 'https://sandbox-merchant.revolut.com'
const res = await fetch(`${base}/api/1.0/webhooks`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: `${site}/api/webhooks/revolut`,
    events: ['ORDER_AUTHORISED', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'ORDER_FAILED', 'ORDER_PAYMENT_DECLINED', 'ORDER_PAYMENT_FAILED'],
  }),
})
const body = await res.json().catch(() => ({}))
if (!res.ok) {
  console.error('Revolut refused the request:', res.status, body)
  process.exit(1)
}
console.log(`Webhook created in ${mode} mode for ${site}/api/webhooks/revolut`)
console.log('Set this in your hosting environment as REVOLUT_WEBHOOK_SECRET:')
console.log(body.signing_secret ?? '(not returned; open the webhook in the Revolut Business dashboard to copy its signing secret)')
