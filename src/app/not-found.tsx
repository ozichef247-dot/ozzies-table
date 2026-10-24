import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="section">
      <div className="wrap stack" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: '2.2rem' }}>Page not found</h1>
        <p className="muted">That page doesn’t exist or has moved.</p>
        <div><Link className="btn btn-order" href="/menu">See the menu</Link></div>
      </div>
    </main>
  )
}
