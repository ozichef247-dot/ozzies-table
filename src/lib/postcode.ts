import type { Zone } from './types'

export const normalisePostcode = (pc: string) => String(pc || '').toUpperCase().replace(/\s+/g, '')

export function formatPostcode(pc: string) {
  const n = normalisePostcode(pc)
  return n.length > 3 ? `${n.slice(0, -3)} ${n.slice(-3)}` : n
}

export const isValidPostcode = (pc: string) => /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(normalisePostcode(pc))

export function outcodeOf(pc: string) {
  const n = normalisePostcode(pc)
  return n.slice(0, -3)
}

export function zoneFor(pc: string, zones: Zone[]): Zone | null {
  if (!isValidPostcode(pc)) return null
  const out = outcodeOf(pc)
  return zones.find((z) => z.outcodes.map((o) => o.toUpperCase().trim()).includes(out)) ?? null
}

export type PostcodeCheck =
  | { ok: true; postcode: string; zone: Zone }
  | { ok: false; kind: 'empty' | 'format' | 'area'; postcode?: string; message: string }

export function checkPostcode(pc: string, zones: Zone[]): PostcodeCheck {
  if (!String(pc || '').trim()) return { ok: false, kind: 'empty', message: 'Enter your postcode.' }
  if (!isValidPostcode(pc))
    return { ok: false, kind: 'format', message: 'That doesn’t look like a full UK postcode. Check it and try again, for example PE1 2AB.' }
  const zone = zoneFor(pc, zones)
  const postcode = formatPostcode(pc)
  if (!zone) return { ok: false, kind: 'area', postcode, message: `We don’t deliver to ${postcode} yet.` }
  return { ok: true, postcode, zone }
}

export const parseOutcodes = (s: string) =>
  s.toUpperCase().split(/[\s,]+/).map((x) => x.trim()).filter(Boolean)
