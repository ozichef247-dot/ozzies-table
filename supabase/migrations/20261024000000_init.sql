-- Ozzie's Table: schema, security and ordering functions.
-- Money is integer pence. Dates and slot times are UK local (Europe/London).

-- ============ Settings ============
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  general jsonb not null,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============ Menu ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int not null default 0,
  hidden boolean not null default false,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text not null default '',
  included text not null default '',
  photo_url text,
  available boolean not null default true,
  featured boolean not null default false,
  allow_notes boolean not null default true,
  lead_hours int check (lead_hours is null or lead_hours >= 0),
  cook_days int[] not null default '{}',
  seasoning_enabled boolean not null default true,
  season_prices jsonb not null default '{"Mild":0,"Medium":0,"Hot":0}',
  allergens text[] not null default '{}',
  tags text[] not null default '{}',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.products (category_id, sort);

create table public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (size in ('2L','3L','4L','5L')),
  price_pence int not null check (price_pence >= 0),
  lead_hours int check (lead_hours is null or lead_hours >= 0),
  included text,
  serves text,
  unique (product_id, size)
);

create table public.protein_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price_pence int not null default 0 check (price_pence >= 0),
  kind text not null check (kind in ('swap','add')),
  sort int not null default 0
);

-- ============ Schedule & delivery ============
create table public.slots (
  id uuid primary key default gen_random_uuid(),
  method text not null check (method in ('collection','delivery')),
  start_time time not null,
  end_time time not null,
  capacity int not null default 4 check (capacity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  slot_id uuid references public.slots(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index closures_unique on public.closures (date, coalesce(slot_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  outcodes text[] not null default '{}',
  fee_pence int not null default 0 check (fee_pence >= 0),
  sort int not null default 0
);

create table public.promos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('pct','fixed')),
  value int not null check (value >= 0),
  min_pence int not null default 0,
  starts_on date,
  ends_on date,
  usage_limit int,
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ Content ============
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null default '',
  sort int not null default 0
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  town text not null default '',
  body text not null,
  permitted boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ============ Staff ============
create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','kitchen')),
  created_at timestamptz not null default now()
);

-- ============ Orders ============
create sequence public.order_ref_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('OT-' || nextval('public.order_ref_seq')),
  view_token text not null default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'pending'
    check (status in ('pending','expired','confirmed','scheduled','preparing','ready','out','completed','cancelled')),
  method text not null check (method in ('collection','delivery')),
  fulfil_date date not null,
  slot_id uuid references public.slots(id) on delete set null,
  slot_label text not null,
  slot_start text not null,
  customer_first text not null,
  customer_last text not null,
  customer_email text not null,
  customer_phone text not null,
  address_line1 text,
  address_line2 text,
  town text,
  postcode text,
  notes text not null default '',
  subtotal_pence int not null,
  discount_pence int not null default 0,
  promo_code text,
  delivery_fee_pence int not null default 0,
  total_pence int not null,
  hold_until timestamptz,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','authorised','paid','refunded','partially_refunded','voided','failed')),
  payment_method text,
  refunded_pence int not null default 0,
  revolut_order_id text unique,
  revolut_token text,
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_date_idx on public.orders (fulfil_date, slot_id, status);
create index orders_email_idx on public.orders (lower(customer_email));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  size_label text not null,
  included_text text not null default '',
  protein_swap text not null default '',
  extras text[] not null default '{}',
  seasoning text not null default '',
  note text not null default '',
  qty int not null check (qty > 0),
  unit_pence int not null,
  line_pence int not null
);
create index on public.order_items (order_id);

create table public.order_events (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  detail text not null default '',
  actor text not null default 'system',
  at timestamptz not null default now()
);
create index on public.order_events (order_id, at);

create table public.notifications (
  id bigserial primary key,
  order_id uuid references public.orders(id) on delete cascade,
  channel text not null default 'email',
  recipient text not null,
  subject text not null,
  body text not null default '',
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  error text,
  created_at timestamptz not null default now()
);
create index on public.notifications (order_id);

-- Revolut may deliver the same webhook more than once; keep a record so each is processed once.
create table public.webhook_events (
  id text primary key,
  received_at timestamptz not null default now()
);

-- ============ Row level security ============
-- The website reads and writes through the server with the service role key.
-- Public read access is limited to the menu and published content; orders, customers and staff are never readable with the public key.
alter table public.site_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_sizes enable row level security;
alter table public.protein_options enable row level security;
alter table public.slots enable row level security;
alter table public.closures enable row level security;
alter table public.zones enable row level security;
alter table public.promos enable row level security;
alter table public.faqs enable row level security;
alter table public.reviews enable row level security;
alter table public.staff enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.notifications enable row level security;
alter table public.webhook_events enable row level security;

create policy "public read settings" on public.site_settings for select using (true);
create policy "public read categories" on public.categories for select using (not hidden);
create policy "public read products" on public.products for select using (true);
create policy "public read sizes" on public.product_sizes for select using (true);
create policy "public read proteins" on public.protein_options for select using (true);
create policy "public read slots" on public.slots for select using (active);
create policy "public read zones" on public.zones for select using (true);
create policy "public read faqs" on public.faqs for select using (true);
create policy "public read reviews" on public.reviews for select using (permitted);
create policy "staff read own row" on public.staff for select using (auth.uid() = user_id);

-- ============ Ordering functions ============
-- A place is taken by a confirmed order or by an unpaid order whose payment hold has not run out.
create or replace function public.places_taken(p_date date, p_slot uuid, p_exclude uuid)
returns int language sql stable as $$
  select count(*)::int from public.orders o
  where o.fulfil_date = p_date
    and (p_slot is null or o.slot_id = p_slot)
    and (p_exclude is null or o.id <> p_exclude)
    and (o.status in ('confirmed','scheduled','preparing','ready','out','completed')
         or (o.status = 'pending' and o.hold_until > now()));
$$;

-- Create (or replace the contents of) an unpaid order and hold its slot, atomically.
-- Raises 'SLOT_FULL' if the slot or the day has no space left.
create or replace function public.reserve_order(
  p_order jsonb,
  p_items jsonb,
  p_existing uuid,
  p_hold_minutes int,
  p_daily_cap int
) returns table (r_id uuid, r_ref text, r_view_token text, r_hold_until timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_date date := (p_order->>'fulfil_date')::date;
  v_slot uuid := (p_order->>'slot_id')::uuid;
  v_cap int;
  v_id uuid;
  v_hold timestamptz := now() + make_interval(mins => p_hold_minutes);
begin
  perform pg_advisory_xact_lock(hashtextextended('capacity:' || v_date::text, 0));

  select capacity into v_cap from public.slots where id = v_slot and active;
  if v_cap is null then raise exception 'SLOT_GONE'; end if;
  if public.places_taken(v_date, v_slot, p_existing) >= v_cap then raise exception 'SLOT_FULL'; end if;
  if public.places_taken(v_date, null, p_existing) >= p_daily_cap then raise exception 'SLOT_FULL'; end if;

  if p_existing is not null then
    update public.orders set
      method = p_order->>'method', fulfil_date = v_date, slot_id = v_slot,
      slot_label = p_order->>'slot_label', slot_start = p_order->>'slot_start',
      customer_first = p_order->>'customer_first', customer_last = p_order->>'customer_last',
      customer_email = p_order->>'customer_email', customer_phone = p_order->>'customer_phone',
      address_line1 = p_order->>'address_line1', address_line2 = p_order->>'address_line2',
      town = p_order->>'town', postcode = p_order->>'postcode', notes = coalesce(p_order->>'notes', ''),
      subtotal_pence = (p_order->>'subtotal_pence')::int, discount_pence = (p_order->>'discount_pence')::int,
      promo_code = p_order->>'promo_code', delivery_fee_pence = (p_order->>'delivery_fee_pence')::int,
      total_pence = (p_order->>'total_pence')::int, hold_until = v_hold, updated_at = now()
    where id = p_existing and status = 'pending'
    returning id into v_id;
    if v_id is null then raise exception 'ORDER_NOT_PENDING'; end if;
    delete from public.order_items where order_items.order_id = v_id;
  else
    insert into public.orders (
      method, fulfil_date, slot_id, slot_label, slot_start, customer_first, customer_last, customer_email,
      customer_phone, address_line1, address_line2, town, postcode, notes, subtotal_pence, discount_pence,
      promo_code, delivery_fee_pence, total_pence, hold_until
    ) values (
      p_order->>'method', v_date, v_slot, p_order->>'slot_label', p_order->>'slot_start',
      p_order->>'customer_first', p_order->>'customer_last', p_order->>'customer_email', p_order->>'customer_phone',
      p_order->>'address_line1', p_order->>'address_line2', p_order->>'town', p_order->>'postcode',
      coalesce(p_order->>'notes', ''), (p_order->>'subtotal_pence')::int, (p_order->>'discount_pence')::int,
      p_order->>'promo_code', (p_order->>'delivery_fee_pence')::int, (p_order->>'total_pence')::int, v_hold
    ) returning id into v_id;
    insert into public.order_events (order_id, status, detail) values (v_id, 'pending', 'Checkout started');
  end if;

  insert into public.order_items (order_id, product_id, name, size_label, included_text, protein_swap, extras, seasoning, note, qty, unit_pence, line_pence)
  select v_id, nullif(i->>'product_id','')::uuid, i->>'name', i->>'size_label', coalesce(i->>'included_text',''),
         coalesce(i->>'protein_swap',''), coalesce(array(select jsonb_array_elements_text(i->'extras')), '{}'),
         coalesce(i->>'seasoning',''), coalesce(i->>'note',''), (i->>'qty')::int, (i->>'unit_pence')::int, (i->>'line_pence')::int
  from jsonb_array_elements(p_items) as i;

  return query select o.id, o.ref, o.view_token, o.hold_until from public.orders o where o.id = v_id;
end $$;

-- Called when the payment provider says a payment is authorised.
-- Returns 'confirmed' (take the money), 'full' (cancel the authorisation, no charge), 'already' or 'cancelled'.
create or replace function public.try_confirm_order(p_order uuid, p_daily_cap int)
returns text language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  v_cap int;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then return 'missing'; end if;
  perform pg_advisory_xact_lock(hashtextextended('capacity:' || o.fulfil_date::text, 0));
  select * into o from public.orders where id = p_order for update;

  if o.status in ('confirmed','scheduled','preparing','ready','out','completed') then return 'already'; end if;
  if o.status = 'cancelled' then return 'cancelled'; end if;

  if not (o.status = 'pending' and o.hold_until > now()) then
    -- The hold ran out before payment finished: only confirm if there is still room.
    select capacity into v_cap from public.slots where id = o.slot_id;
    if v_cap is null
       or public.places_taken(o.fulfil_date, o.slot_id, o.id) >= v_cap
       or public.places_taken(o.fulfil_date, null, o.id) >= p_daily_cap then
      return 'full';
    end if;
  end if;

  update public.orders set status = 'confirmed', hold_until = null, updated_at = now() where id = o.id;
  insert into public.order_events (order_id, status, detail) values (o.id, 'confirmed', 'Payment authorised');
  if o.promo_code is not null then
    update public.promos set used_count = used_count + 1 where upper(code) = upper(o.promo_code);
  end if;
  return 'confirmed';
end $$;

-- Mark unpaid orders whose hold has run out as expired. Their places are already free (see places_taken).
create or replace function public.expire_holds()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with e as (
    update public.orders set status = 'expired', updated_at = now()
    where status = 'pending' and hold_until <= now()
    returning id
  ), ev as (
    insert into public.order_events (order_id, status, detail)
    select id, 'expired', 'Payment not completed in time; slot released' from e
    returning 1
  )
  select count(*) into n from e;
  return n;
end $$;

revoke execute on function public.reserve_order(jsonb, jsonb, uuid, int, int) from public, anon, authenticated;
revoke execute on function public.try_confirm_order(uuid, int) from public, anon, authenticated;
revoke execute on function public.expire_holds() from public, anon, authenticated;

-- Run expiry every five minutes where pg_cron is available (it is on Supabase; enable it under Database → Extensions).
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('ozzies-expire-holds', '*/5 * * * *', 'select public.expire_holds()');
exception when others then
  raise notice 'pg_cron not available; the /api/cron/expire route and on-demand checks keep holds tidy instead.';
end $$;

-- ============ Photo storage ============
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;
