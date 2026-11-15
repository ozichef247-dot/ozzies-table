import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAccess } from '@/lib/access'
import { getSettings } from '@/lib/data'
import { Brand } from '@/components/ShopHeader'
import { PasswordForm } from './PasswordForm'

export const metadata: Metadata = { title: 'Ozzie’s Table', robots: { index: false, follow: false } }

/** Shown to everyone without the password while private mode is on. */
export default async function PrivatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/'
  if (!(await getAccess(true)).enabled) redirect(next)
  const { content } = await getSettings()
  return (
    <main className="private-gate">
      <div className="private-card stack" style={{ ['--g' as string]: '18px' }}>
        <div className="private-brand"><Brand logo={content.logo} sub={content.themeLine} /></div>
        <div className="stack" style={{ ['--g' as string]: '16px', padding: '24px 24px 28px' }}>
          <h1 style={{ fontSize: '1.7rem' }}>Friends and family preview</h1>
          <p className="muted">Ozzie’s Table isn’t open to the public yet. Enter the password you were given to see the menu and order.</p>
          <PasswordForm next={next} />
        </div>
      </div>
    </main>
  )
}
