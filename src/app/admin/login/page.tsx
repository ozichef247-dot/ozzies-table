import { LoginForm } from './LoginForm'

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <>
      <header className="hdr"><div className="wrap"><span className="logo"><b>Ozzie’s Table</b><small>Staff sign-in</small></span></div></header>
      <main className="wrap"><div className="login panel stack" style={{ ['--g' as string]: '16px' }}>
        <h1 style={{ fontSize: "1.8rem" }}>Sign in</h1>
        {error === 'not-staff' ? <p className="alert bad small">This account isn’t set up as staff. Ask the owner to add you.</p> : null}
        <LoginForm />
      </div></main>
    </>
  )
}
