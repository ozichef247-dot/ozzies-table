import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCustomer } from '@/lib/customer'
import { ProfileForm } from '@/components/ProfileForm'

export const metadata: Metadata = { title: 'Your details · Ozzie’s Table', robots: { index: false } }

/** Shown once after creating an account (and from checkout's "Edit"): the details that fill in every order. */
export default async function DetailsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') && !sp.next.startsWith('/admin') ? sp.next : '/account'
  const c = await getCustomer()
  if (!c) redirect(`/account/login?next=${encodeURIComponent(next)}`)
  const isNew = !c.profile.first_name
  return (
    <section className="section">
      <div className="wrap stack" style={{ maxWidth: 620, ['--g' as string]: '16px' }}>
        <h1 style={{ fontSize: 'clamp(1.9rem,6vw,2.4rem)' }}>{isNew ? 'Welcome! Just a few details' : 'Your details'}</h1>
        <p className="muted">{isNew ? 'We’ll use these for every order, so you won’t need to type them again.' : 'Changes are used for your next orders.'}</p>
        <div className="panel"><ProfileForm p={c.profile} next={next} /></div>
      </div>
    </section>
  )
}
