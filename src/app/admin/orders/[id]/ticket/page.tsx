import { notFound } from 'next/navigation'
import { requireStaff } from '@/lib/auth'
import { db } from '@/lib/supabase/admin'
import type { Order, OrderItem } from '@/lib/types'
import { fmtDate } from '@/lib/time'
import { PrintButton } from '@/components/admin/PrintButton'

/** Printable kitchen ticket. Seasoning is boxed and in capitals so it can't be missed. */
export default async function Ticket({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params
  const { data } = await db().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()
  if (!data) notFound()
  const o = data as Order & { order_items: OrderItem[] }
  return (
    <div className="ticket">
      <div className="no-print" style={{ marginBottom: 16 }}><PrintButton /></div>
      <div><b>{o.ref}</b> — {o.method.toUpperCase()}</div>
      <div><b>{fmtDate(o.fulfil_date, true)} · {o.slot_label}</b></div>
      <div>{o.customer_first} {o.customer_last} · {o.customer_phone}</div>
      {o.method === 'delivery' ? <div>{[o.address_line1, o.address_line2, o.town, o.postcode].filter(Boolean).join(', ')}</div> : null}
      <hr />
      {o.order_items.map((i) => (
        <div key={i.id} style={{ marginBottom: 12 }}>
          <div><b>{i.qty} × {i.name}</b> — {i.size_label}</div>
          {i.seasoning ? <div className="s">SEASONING: {i.seasoning.toUpperCase()}</div> : null}
          <div>{i.protein_swap ? `Protein: ${i.protein_swap}` : i.included_text}</div>
          {i.extras.map((e) => <div key={e}>Extra: {e}</div>)}
          {i.note ? <div>Note: {i.note}</div> : null}
        </div>
      ))}
      {o.notes ? <><hr /><div><b>ORDER NOTE:</b> {o.notes}</div></> : null}
    </div>
  )
}
