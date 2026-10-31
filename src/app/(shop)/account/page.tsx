import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCustomer } from '@/lib/customer'
import { db } from '@/lib/supabase/admin'
import { fmtDate } from '@/lib/time'
import { money } from '@/lib/money'
import { LIVE_STATUSES, STATUS_LABEL, STATUS_TONE, type Order } from '@/lib/types'
import { ProfileForm } from '@/components/ProfileForm'
import { customerSignOut, customerSignOutEverywhere } from './actions'

export const metadata: Metadata = { title: 'Your account · Ozzie’s Table', robots: { index: false } }

type Row = Pick<Order, 'id' | 'ref' | 'view_token' | 'status' | 'method' | 'fulfil_date' | 'slot_label' | 'total_pence'> & { order_items: { qty: number; name: string; size_label: string }[] }

export default async function AccountPage() {
  const c = await getCustomer()
  if (!c) redirect('/account/login')
  // Orders placed while signed in, plus earlier guest orders made with the same (verified) email.
  const { data } = await db().from('orders')
    .select('id, ref, view_token, status, method, fulfil_date, slot_label, total_pence, order_items(qty, name, size_label)')
    .or(`customer_id.eq.${c.userId},customer_email.eq."${c.email}"`)
    .in('status', [...LIVE_STATUSES, 'cancelled'])
    .order('fulfil_date', { ascending: false })
    .limit(50)
  const orders = (data ?? []) as Row[]
  const name = c.profile.first_name

  return (
    <section className="section" style={{ paddingTop: 26 }}>
      <div className="wrap stack" style={{ maxWidth: 820, ['--g' as string]: '22px' }}>
        <div className="row between">
          <h1 style={{ fontSize: 'clamp(1.9rem,6vw,2.6rem)' }}>{name ? `Hello, ${name}` : 'Your account'}</h1>
          <form action={customerSignOut}><button className="link">Sign out</button></form>
        </div>
        <p className="muted" style={{ marginTop: -10 }}>Signed in as <b>{c.email}</b></p>

        <div className="panel stack" style={{ ['--g' as string]: '12px' }}>
          <div className="row between"><h3>Your orders</h3><Link className="btn btn-order btn-sm" href="/menu">Order food</Link></div>
          {orders.length ? (
            <div className="stack" style={{ ['--g' as string]: '0px' }}>
              {orders.map((o) => (
                <Link key={o.id} href={`/order/${o.ref}?t=${o.view_token}`} className="acct-order">
                  <span className="grow">
                    <b>{fmtDate(o.fulfil_date, true)}</b> <span className="muted num">· {o.slot_label} · {o.method === 'delivery' ? 'Delivery' : 'Collection'}</span><br />
                    <span className="small muted">{o.ref} · {o.order_items.map((i) => `${i.qty} × ${i.name} (${i.size_label})`).join(', ')}</span>
                  </span>
                  <span className="stack" style={{ ['--g' as string]: '4px', alignItems: 'flex-end' }}>
                    <span className={`pill ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                    <b className="num">{money(o.total_pence)}</b>
                  </span>
                </Link>
              ))}
            </div>
          ) : <p className="muted">No orders yet. When you order with {c.email}, it will show here.</p>}
        </div>

        <div className="panel stack" style={{ ['--g' as string]: '12px' }}>
          <h3>Your details</h3>
          <p className="small muted" style={{ marginTop: -6 }}>We use these to fill in checkout for you.</p>
          <ProfileForm p={c.profile} />
        </div>

        <div className="panel stack" style={{ ['--g' as string]: '8px' }}>
          <h3>Signed-in devices</h3>
          <p className="small muted">You stay signed in on devices where you ticked “Keep me signed in”. Lost a phone, or used a shared computer?</p>
          <form action={customerSignOutEverywhere}><button className="btn btn-line btn-sm">Sign out of all devices</button></form>
        </div>
      </div>
    </section>
  )
}
