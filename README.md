# Ozzie's Table

Online pre-ordering for Ozzie's Table, a Nigerian home-cooking kitchen in Peterborough. Customers choose dishes by the bowl (2–5 litres), book a collection or delivery slot at least 48 hours ahead, and pay online. The owner runs everything from a dashboard at `/admin`.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, sign-in with two-step codes, photo storage) · Revolut Merchant API (cards, Apple Pay, Google Pay, Revolut Pay) · Resend (email) · hosted on Vercel.

---

## How ordering works (and why it's safe)

1. **The browser only sends choices.** Dish, size, protein, seasoning, quantity, date and slot. Every price, notice period, delivery fee, minimum order and capacity check is recalculated on the server (`src/lib/orders.ts → startCheckout`).
2. **The slot is held while the customer pays.** `reserve_order()` in Postgres takes a per-date lock, counts confirmed orders plus live holds, and refuses if the slot or day is full. The hold lasts 10 minutes (owner can change this).
3. **The card is authorised, not charged.** Revolut orders use manual capture.
4. **Revolut tells the server.** The webhook (`/api/webhooks/revolut`) is signature-checked, de-duplicated, and then the server re-reads the order from Revolut rather than trusting the message.
5. **Confirm, then charge.** `try_confirm_order()` re-checks capacity under the same lock. If the slot is still theirs the money is captured and emails go out. If the hold ran out and the slot filled, the authorisation is cancelled: the customer is never charged.
6. **Unpaid orders expire on their own.** A database job runs `expire_holds()` every 5 minutes (pg_cron); a daily Vercel cron is a backup. Expired holds stop counting immediately even before the job runs.
7. **Retries never duplicate.** A retry from the same browser reuses its unpaid order.

---

## Set-up

You need accounts with **Supabase**, **Revolut Business** (with online payments/Merchant enabled), **Resend** and **Vercel**. The business owner should own every account (see Handover).

### 1. Supabase

1. Create a project (region: London).
2. **SQL editor:** run `supabase/migrations/20261024000000_init.sql`, then `supabase/seed.sql`. (Or with the Supabase CLI: `supabase link` then `supabase db push`, and run the seed.)
3. **Database → Extensions:** make sure `pg_cron` is enabled, then re-run the last block of the migration (the `cron.schedule` call) if it reported that pg_cron was missing.
4. **Authentication → Providers:** keep Email enabled and **turn off "Allow new users to sign up"**. Staff accounts are created with the script below, so there is no public sign-up.
5. **Authentication → Multi-factor:** make sure TOTP (authenticator app) is enabled.
6. **Project settings → API:** copy the URL, anon key and service role key into your environment (step 4).

### 2. Revolut

1. In Revolut Business, open **Merchant → API** and copy the **public key** and **secret key**. Start with the **Sandbox** keys.
2. After the first deploy, register the webhook:
   ```bash
   npm run revolut:webhook -- https://your-domain.co.uk
   ```
   Put the printed signing secret in `REVOLUT_WEBHOOK_SECRET`. (You can also add the webhook in the Revolut dashboard pointing at `https://your-domain.co.uk/api/webhooks/revolut` with the order events, and copy its signing secret.)
3. **Apple Pay** needs the live domain registered with Revolut (Merchant → Apple Pay domains). Apple Pay can't be tested in sandbox; check it with a small live payment and refund it.
4. Choose which payment methods appear (cards, Apple Pay, Google Pay, Revolut Pay) in the Revolut Business dashboard.

### 3. Resend (email)

Add and verify your sending domain, create an API key, and set `RESEND_API_KEY` and `EMAIL_FROM`. Without a key, emails are still written and shown on each order in the dashboard (status "skipped") but not sent.

### 4. Environment

Copy `.env.example` to `.env.local` for local work, and add the same values in **Vercel → Project → Settings → Environment Variables**. Generate `CRON_SECRET` with `openssl rand -hex 32`.

### 5. Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # logic, payment signature and database tests
npm run typecheck
```

Locally the webhook can't reach you, so the confirmation page asks Revolut directly for the payment status. That fallback also protects live customers if a webhook is late.

### 6. Create the owner's sign-in

```bash
npm run staff:add -- owner@ozziestable.co.uk "a-long-unique-password" owner
npm run staff:add -- kitchen@ozziestable.co.uk "another-long-password" kitchen
```

On first sign-in at `/admin`, each person scans a QR code with an authenticator app. After that, every sign-in needs the 6-digit code. Kitchen accounts see orders and production lists only: no revenue, prices or refunds.

### 7. Deploy to Vercel

Import the GitHub repository, set the environment variables, and deploy. `vercel.json` adds the daily expiry backup job. Set a **staging** project (or Vercel preview environment) on Revolut sandbox keys and a separate Supabase project; production uses live keys.

---

## Going live checklist

- [ ] Owner's menu, prices, sizes, proteins, seasoning and allergens entered in **Menu**
- [ ] Dish photos (4:3), hero (3:2), story photo and logo uploaded
- [ ] Cooking days, slots, capacity, notice and hold time set in **Schedule**
- [ ] Delivery zones, fees, minimum, free-delivery threshold, collection address, phone and WhatsApp set in **Delivery**
- [ ] Policies, allergen wording, food hygiene rating and company details saved in **Content → Policies and legal**
- [ ] Page titles and descriptions checked in **Content → Search engines**
- [ ] Revolut **live** keys set, `NEXT_PUBLIC_REVOLUT_MODE=prod`, live webhook registered, Apple Pay domain registered
- [ ] Resend domain verified; a test order's confirmation email received
- [ ] Test order placed, captured, then refunded from the dashboard
- [ ] Supabase backups confirmed (daily backups are included on paid plans; enable point-in-time recovery if needed)

## Backups and recovery

- **Database:** Supabase takes daily backups on paid plans; restore from **Database → Backups**. For a manual copy: `supabase db dump > backup.sql`.
- **Photos:** stored in the Supabase `media` bucket.
- **Code:** this repository. Redeploy any earlier commit from Vercel.
- **Payments:** Revolut holds the record of every payment and refund; each order stores its Revolut order ID.

## Handover

The owner should hold: the domain, the Vercel account, the Supabase project, the Revolut Business account, the Resend account, analytics (if used) and this GitHub repository. Developers should be invited as collaborators, not owners.

---

## Where things live

| Brief requirement | Code |
|---|---|
| Lead time, capacity, cooking days, closures, deadlines (UK time) | `src/lib/schedule.ts`, `src/lib/time.ts` |
| Prices, proteins, seasoning, promo codes, delivery thresholds | `src/lib/pricing.ts` |
| Slot holds, expiry, confirm-or-cancel | `supabase/migrations/*_init.sql` (`reserve_order`, `try_confirm_order`, `expire_holds`) |
| Checkout and payment flow | `src/lib/orders.ts`, `src/app/api/checkout`, `src/components/CheckoutForm.tsx` |
| Revolut client and webhook | `src/lib/revolut.ts`, `src/lib/revolut-signature.ts`, `src/app/api/webhooks/revolut` |
| Emails | `src/lib/email.ts` |
| Same item description everywhere (basket → kitchen ticket) | `itemMeta()` in `src/lib/pricing.ts` |
| Owner dashboard | `src/app/admin` and `src/app/admin/actions.ts` |
| Postcode check, deadlines on every date | `src/components/PostcodeCheck.tsx`, `src/app/api/postcode`, `src/app/api/availability` |
| SEO: titles, descriptions, sitemap, clean URLs | page `generateMetadata`, `src/app/sitemap.ts`, `/menu/[slug]` |
| Analytics only after consent | `src/components/CookieBanner.tsx` |

## Later phases (designed for, not built)

- **SMS** for ready / out for delivery (the setting exists; needs an SMS provider, about 4p a message)
- **Seasonal dishes** between set dates
- **Bank transfer** for large catering orders
