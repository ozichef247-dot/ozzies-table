'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBasket } from './basket'

/** Mobile shortcut to the basket on browsing pages. */
export function BasketBar() {
  const { count } = useBasket()
  const path = usePathname()
  if (!count || !(path === '/' || path.startsWith('/menu') || path.startsWith('/how-it-works'))) return null
  return (
    <div className="basketbar">
      <Link className="btn btn-order" href="/basket">
        <span>View basket · {count} item{count > 1 ? 's' : ''}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
