/** All money is held as integer pence. */
export const money = (pence: number) => `£${((pence || 0) / 100).toFixed(2)}`

/** Parse a pounds string or number from a form ("12.50") into pence. */
export function toPence(v: FormDataEntryValue | string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[£,\s]/g, ''))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100)
}

export const pounds = (pence: number) => (pence / 100).toFixed(2)
