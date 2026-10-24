'use client'

import { useRef } from 'react'
import { PostcodeCheck } from './PostcodeCheck'

/** "Check delivery area": a native dialog, so focus is trapped and returned and Escape closes it. */
export function DeliveryDialog({ label = 'Check delivery area', className = 'btn btn-line' }: { label?: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} className="sheet" aria-labelledby="pc-dialog-title" style={{ padding: 0, border: 0 }}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close() }}>
        <div className="sheet-hd">
          <h3 id="pc-dialog-title">Check delivery area</h3>
          <button className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button>
        </div>
        <div className="sheet-body pad"><PostcodeCheck variant="panel" /></div>
      </dialog>
    </>
  )
}
