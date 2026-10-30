// Gives someone access to the dashboard. They sign in with a 6-digit code emailed to them (no password).
// Usage: node --env-file=.env.local scripts/add-staff.mjs owner@example.com owner|kitchen
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const [email, role = 'owner'] = process.argv.slice(2)
if (!email || !['owner', 'kitchen'].includes(role)) {
  console.error('Usage: node --env-file=.env.local scripts/add-staff.mjs <email> <owner|kitchen>')
  process.exit(1)
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
const sb = createClient(url, key, { auth: { persistSession: false } })

let userId
// A random password nobody knows: sign-in is by emailed code only.
const { data, error } = await sb.auth.admin.createUser({ email, password: crypto.randomBytes(24).toString('base64url'), email_confirm: true })
if (error) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) throw error
  userId = existing.id
  console.log('User already exists; updating their role.')
} else userId = data.user.id

const { error: e2 } = await sb.from('staff').upsert({ user_id: userId, email: email.toLowerCase(), role })
if (e2) throw e2
console.log(`${email} can now sign in at /admin as ${role} with a code sent to their email.`)
