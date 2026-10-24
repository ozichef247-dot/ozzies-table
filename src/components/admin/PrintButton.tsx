'use client'

export function PrintButton() {
  return <button className="btn btn-ink btn-sm" onClick={() => window.print()}>Print</button>
}
