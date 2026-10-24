// Creates a staff sign-in. Run once for the owner, then for any kitchen staff.
// Usage: node --env-file=.env.local scripts/add-staff.mjs owner@example.com "a-long-password" owner|kitchen
import { createClient } from '@supabase/supabase-js'

const [email, password, role = 'owner'] = process.argv.slice(2)
if (!email || !password || !['owner', 'kitchen'].includes(role)) {
  console.error('Usage: node --env-file=.env.local scripts/add-staff.mjs <email> <password> <owner|kitchen>')
  process.exit(1)
}
if (password.length < 12) throw new Error('Use a password of at least 12 characters.')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let userId
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true })
if (error) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) throw error
  userId = existing.id
  console.log('User already exists; updating their role.')
} else userId = data.user.id

const { error: e2 } = await sb.from('staff').upsert({ user_id: userId, email: email.toLowerCase(), role })
if (e2) throw e2
console.log(`${email} can now sign in at /admin as ${role}. They’ll set up two-step sign-in on first visit.`)
