import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase/admin'
import { env } from '@/lib/env'

/** Backup to the database's own five-minute schedule: marks unpaid orders past their hold as expired. */
export async function GET(req: Request) {
  const secret = env.cronSecret()
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('Unauthorised', { status: 401 })
  const { data, error } = await db().rpc('expire_holds')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expired: data })
}
