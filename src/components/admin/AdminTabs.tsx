'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const OWNER = [
  ['/admin', 'Orders'], ['/admin/production', 'Production'], ['/admin/schedule', 'Schedule'], ['/admin/menu', 'Menu'],
  ['/admin/customers', 'Customers'], ['/admin/delivery', 'Delivery'], ['/admin/promotions', 'Promotions'],
  ['/admin/reports', 'Reports'], ['/admin/content', 'Content'],
]
const KITCHEN = [['/admin', 'Orders'], ['/admin/production', 'Production']]

export function AdminTabs({ role }: { role: 'owner' | 'kitchen' }) {
  const path = usePathname()
  const tabs = role === 'owner' ? OWNER : KITCHEN
  const current = (href: string) => (href === '/admin' ? path === '/admin' || path.startsWith('/admin/orders') : path.startsWith(href))
  return (
    <nav className="tabs" aria-label="Dashboard sections" style={{ marginTop: 6 }}>
      {tabs.map(([href, label]) => <Link key={href} href={href} aria-current={current(href) ? 'page' : undefined}>{label}</Link>)}
    </nav>
  )
}
