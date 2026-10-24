import 'server-only'

function required(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`)
  return v
}

export const env = {
  siteUrl: () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  revolutMode: () => (process.env.NEXT_PUBLIC_REVOLUT_MODE === 'prod' ? 'prod' : 'sandbox') as 'prod' | 'sandbox',
  revolutSecret: () => required('REVOLUT_SECRET_KEY'),
  revolutWebhookSecret: () => process.env.REVOLUT_WEBHOOK_SECRET || '',
  resendKey: () => process.env.RESEND_API_KEY || '',
  emailFrom: () => process.env.EMAIL_FROM || "Ozzie's Table <orders@example.com>",
  cronSecret: () => process.env.CRON_SECRET || '',
}
