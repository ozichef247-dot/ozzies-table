import { requireStaff } from '@/lib/auth'
import { getSettings } from '@/lib/data'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { Brand } from '@/components/ShopHeader'
import { signOut } from '../actions'

export default async function Dashboard({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff()
  const { content } = await getSettings()
  return (
    <>
      <header className="hdr">
        <div className="wrap">
          <span className="logo"><Brand logo={content.logo} sub={staff.role === 'owner' ? 'Owner dashboard' : 'Kitchen view'} /></span>
          <span className="small" style={{ marginLeft: 'auto', color: 'var(--on-green-2)', overflowWrap: 'anywhere' }}>{staff.email}</span>
          <form action={signOut}><button className="cartbtn" style={{ marginLeft: 10 }}>Sign out</button></form>
        </div>
      </header>
      <main className="wrap admin-main">
        <AdminTabs role={staff.role} />
        <div style={{ paddingTop: 22 }}>{children}</div>
      </main>
    </>
  )
}
