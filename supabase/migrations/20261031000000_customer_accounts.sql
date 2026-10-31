-- Customer accounts (optional; guest checkout stays). Customers sign in with a 6-digit emailed code, like staff.
create table if not exists public.customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  town text not null default '',
  postcode text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_email_idx on public.customers (lower(email));

-- Only the server (service role) reads and writes customer records.
alter table public.customers enable row level security;

-- Orders placed while signed in are linked to the account. Guest orders with the same email show in history too.
alter table public.orders add column if not exists customer_id uuid references auth.users(id) on delete set null;
create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_email_idx on public.orders (lower(customer_email));
