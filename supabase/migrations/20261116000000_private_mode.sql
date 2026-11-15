-- Private mode: when on, visitors must enter a shared password to see the website.
-- Kept apart from site_settings (which the public can read) so the password is never exposed.
create table if not exists public.site_access (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  password text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.site_access (id) values (1) on conflict (id) do nothing;
alter table public.site_access enable row level security; -- no policies: only the server can read it
