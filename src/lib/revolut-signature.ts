import crypto from 'node:crypto'

/**
 * Check a webhook really came from Revolut.
 * Signed payload is "v1.{Revolut-Request-Timestamp}.{raw body}", HMAC-SHA256 with the webhook signing secret,
 * compared against each "v1=<hex>" entry in Revolut-Signature. Rejects anything older than 5 minutes.
 */
export function verifyRevolutSignature(rawBody: string, timestamp: string | null, signatureHeader: string | null, secret: string, nowMs = Date.now()) {
  if (!secret || !timestamp || !signatureHeader) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(nowMs - ts) > 5 * 60 * 1000) return false
  const expected = 'v1=' + crypto.createHmac('sha256', secret).update(`v1.${timestamp}.${rawBody}`).digest('hex')
  return signatureHeader.split(',').some((sig) => {
    const s = sig.trim()
    return s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))
  })
}
