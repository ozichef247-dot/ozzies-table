'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBasket } from './basket'

const NAV = [
  { href: '/menu', label: 'Menu' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/how-it-works#faq', label: 'FAQ' },
  { href: '/how-it-works#contact', label: 'Contact' },
]

export function Brand({ logo, sub }: { logo: string | null; sub: string }) {
  return (
    <>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="Ozzie’s Table" style={{ display: 'block', height: 40, width: 'auto', maxWidth: 200 }} />
      ) : (
        <b>Ozzie’s Table</b>
      )}
      <small>{sub}</small>
    </>
  )
}

export function ShopHeader({ logo }: { logo: string | null }) {
  const path = usePathname()
  const { count } = useBasket()
  return (
    <header className="hdr">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="Ozzie’s Table home">
          <Brand logo={logo} sub="Nigerian home cooking · Peterborough" />
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}>{n.label}</Link>
          ))}
        </nav>
        <Link className="cartbtn" href="/basket" aria-label={`Basket, ${count} item${count === 1 ? '' : 's'}`} style={{ textDecoration: 'none' }}>
          Basket <span className="n num">{count}</span>
        </Link>
      </div>
    </header>
  )
}
