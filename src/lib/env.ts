import 'server-only'

function required(name: string, ...alternatives: string[]) {
  for (const n of [name, ...alternatives]) {
    const v = process.env[n]
    if (v) return v
  }
  throw new Error(`Missing environment variable ${name}. See .env.example.`)
}

export const env = {
  siteUrl: () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ozziestable.com').replace(/\/$/, ''),
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'),
  // Names set by the Vercel–Supabase integration are accepted as well as our own.
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY'),
  supabaseServiceKey: () => required('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'),
  // Revolut settings work with or without the NEXT_PUBLIC_ prefix; the server passes the public key to the payment form.
  revolutMode: () => ((process.env.REVOLUT_MODE || process.env.NEXT_PUBLIC_REVOLUT_MODE) === 'prod' ? 'prod' : 'sandbox') as 'prod' | 'sandbox',
  revolutPublicKey: () => process.env.REVOLUT_PUBLIC_KEY || process.env.NEXT_PUBLIC_REVOLUT_PUBLIC_KEY || '',
  revolutSecret: () => required('REVOLUT_SECRET_KEY'),
  revolutWebhookSecret: () => process.env.REVOLUT_WEBHOOK_SECRET || '',
  resendKey: () => process.env.RESEND_API_KEY || '',
  emailFrom: () => process.env.EMAIL_FROM || "Ozzie's Table <orders@example.com>",
  cronSecret: () => process.env.CRON_SECRET || '',
}
