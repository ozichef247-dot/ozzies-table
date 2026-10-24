import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyRevolutSignature } from '@/lib/revolut-signature'

const secret = 'wsk_r59a4HfWVAKycbCaNO1RvgCJec02gRd8'
const body = '{"event": "ORDER_COMPLETED","order_id": "9fc01989-3f61-4484-a5d9-ffe768531be9","merchant_order_ext_ref": "Test #3928"}'
const ts = '1683650202360'
const sign = (s: string) => 'v1=' + crypto.createHmac('sha256', s).update(`v1.${ts}.${body}`).digest('hex')

describe('Revolut webhook signatures', () => {
  it('accepts a valid signature within five minutes', () => {
    expect(verifyRevolutSignature(body, ts, sign(secret), secret, Number(ts) + 60_000)).toBe(true)
  })
  it('accepts any matching signature during secret rotation', () => {
    expect(verifyRevolutSignature(body, ts, `${sign('old')},${sign(secret)}`, secret, Number(ts))).toBe(true)
  })
  it('rejects tampered bodies, wrong secrets and old deliveries', () => {
    expect(verifyRevolutSignature(body.replace('COMPLETED', 'AUTHORISED'), ts, sign(secret), secret, Number(ts))).toBe(false)
    expect(verifyRevolutSignature(body, ts, sign('nope'), secret, Number(ts))).toBe(false)
    expect(verifyRevolutSignature(body, ts, sign(secret), secret, Number(ts) + 6 * 60_000)).toBe(false)
    expect(verifyRevolutSignature(body, null, sign(secret), secret)).toBe(false)
  })
})
