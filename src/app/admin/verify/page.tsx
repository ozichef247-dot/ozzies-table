import { redirect } from 'next/navigation'
import { authClient } from '@/lib/supabase/server'
import { VerifyForm } from './VerifyForm'

/** Second sign-in step. First visit sets up an authenticator app; after that it asks for the 6-digit code. */
export default async function Verify() {
  const sb = await authClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel === 'aal2') redirect('/admin')
  const { data: factors } = await sb.auth.mfa.listFactors()
  const totp = factors?.totp?.find((f) => f.status === 'verified')
  return (
    <>
      <header className="hdr"><div className="wrap"><span className="logo"><b>Ozzie’s Table</b><small>Staff sign-in</small></span></div></header>
      <main className="wrap"><div className="login panel stack" style={{ ['--g' as string]: '16px' }}>
        <VerifyForm factorId={totp?.id ?? null} email={user.email ?? ''} />
      </div></main>
    </>
  )
}
