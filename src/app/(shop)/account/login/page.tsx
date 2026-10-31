import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCustomer } from '@/lib/customer'
import { CustomerLoginForm } from '@/components/CustomerLoginForm'

export const metadata: Metadata = { title: 'Sign in · Ozzie’s Table', robots: { index: false } }

export default async function CustomerLogin({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const sp = await searchParams
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/account'
  if (await getCustomer()) redirect(next)
  const fromCheckout = next.startsWith('/checkout')
  return (
    <section className="section">
      <div className="wrap stack" style={{ maxWidth: 460, ['--g' as string]: '18px' }}>
        <h1 style={{ fontSize: 'clamp(1.9rem,6vw,2.4rem)' }}>Sign in or create an account</h1>
        <p className="muted">Enter your email and we’ll send you a 6-digit code. No password needed. New here? The same code creates your account.</p>
        <div className="panel"><CustomerLoginForm next={next} email={sp.email} /></div>
        <p className="small muted">With an account, your details are filled in at checkout and you can see your past orders.</p>
        {fromCheckout ? <Link className="btn btn-line" href="/checkout">Continue as guest instead</Link> : null}
      </div>
    </section>
  )
}
