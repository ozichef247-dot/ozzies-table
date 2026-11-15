-- Ozzie's Table menu from the November 2026 price list (Pricing_sheet_uploaded.xlsx).
-- Run in Supabase → SQL Editor, AFTER 20261115000000_whole_items.sql. Safe to run more than once.
-- • Dishes on the sheet are added or updated (prices, sizes, swaps, extras). Photos and "Featured" are kept.
-- • Dishes not on the sheet are hidden (Available off), not deleted, so past orders keep their link.
begin;

insert into public.categories (name, sort) select 'Specials', 5 where not exists (select 1 from public.categories where name = 'Specials');

update public.products set available = false where slug not in ('oha-soup', 'bitterleaf-soup', 'edikaikong-soup', 'ukazi-soup', 'egusi-soup', 'ogbono-soup', 'white-soup-nsala', 'chicken-stew', 'beef-stew', 'fish-stew', 'vegetable-sauce', 'ofe-akwu', 'party-jollof-rice', 'nigerian-fried-rice', 'porridge-beans', 'abacha', 'ugba', 'banana-bread');

-- Oha Soup
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'oha-soup', 'Oha Soup', coalesce('Cocoyam-thickened soup with tender oha leaves, an Igbo favourite.', ''), 'beef, assorted meat, smoked fish and stockfish', true, true, '{Fish}'::text[], 1
from public.categories c where c.name = 'Soups'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Cocoyam-thickened soup with tender oha leaves, an Igbo favourite.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'oha-soup');
delete from public.protein_options where product_id = (select id from public.products where slug = 'oha-soup');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 6500, null), ('3L', 9000, null), ('4L', 11000, null)) as s(size, price, inc) where p.slug = 'oha-soup';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to goat meat', 900, 'swap', 1), ('Swap to fish (no beef)', 700, 'swap', 2), ('Extra assorted meat', 600, 'add', 3), ('Extra stockfish', 500, 'add', 4)) as o(name, price, kind, sort) where p.slug = 'oha-soup';

-- Bitterleaf Soup
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'bitterleaf-soup', 'Bitterleaf Soup', coalesce('Ofe onugbu: washed bitterleaf in a cocoyam-thickened soup.', ''), 'beef, assorted meat, smoked fish and stockfish', true, true, '{Fish}'::text[], 2
from public.categories c where c.name = 'Soups'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Ofe onugbu: washed bitterleaf in a cocoyam-thickened soup.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'bitterleaf-soup');
delete from public.protein_options where product_id = (select id from public.products where slug = 'bitterleaf-soup');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 6000, null), ('3L', 8500, null), ('4L', 10500, null)) as s(size, price, inc) where p.slug = 'bitterleaf-soup';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to goat meat', 900, 'swap', 1), ('Swap to fish (no beef)', 700, 'swap', 2), ('Extra assorted meat', 600, 'add', 3), ('Extra stockfish', 500, 'add', 4)) as o(name, price, kind, sort) where p.slug = 'bitterleaf-soup';

-- Edikaikong Soup
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'edikaikong-soup', 'Edikaikong Soup', coalesce('Efik-style vegetable soup of ugu and waterleaf.', ''), 'beef, assorted meat, smoked fish and stockfish', true, true, '{Fish}'::text[], 3
from public.categories c where c.name = 'Soups'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Efik-style vegetable soup of ugu and waterleaf.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'edikaikong-soup');
delete from public.protein_options where product_id = (select id from public.products where slug = 'edikaikong-soup');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 7000, null), ('3L', 10000, null), ('4L', 12500, null)) as s(size, price, inc) where p.slug = 'edikaikong-soup';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to goat meat', 900, 'swap', 1), ('Swap to fish (no beef)', 700, 'swap', 2), ('Extra assorted meat', 600, 'add', 3), ('Extra stockfish', 500, 'add', 4)) as o(name, price, kind, sort) where p.slug = 'edikaikong-soup';

-- Ukazi Soup
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'ukazi-soup', 'Ukazi Soup', coalesce('Ukazi (okazi) leaf soup, thickened with cocoyam.', ''), 'beef, assorted meat, smoked fish and stockfish', true, true, '{Fish}'::text[], 4
from public.categories c where c.name = 'Soups'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Ukazi (okazi) leaf soup, thickened with cocoyam.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'ukazi-soup');
delete from public.protein_options where product_id = (select id from public.products where slug = 'ukazi-soup');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 6500, null), ('3L', 9500, null), ('4L', 11500, null)) as s(size, price, inc) where p.slug = 'ukazi-soup';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to goat meat', 900, 'swap', 1), ('Swap to fish (no beef)', 700, 'swap', 2), ('Extra assorted meat', 600, 'add', 3), ('Extra stockfish', 500, 'add', 4)) as o(name, price, kind, sort) where p.slug = 'ukazi-soup';

-- Egusi Soup
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'egusi-soup', 'Egusi Soup', coalesce(null, ''), 'beef, assorted meat, smoked fish and stockfish', true, true, '{Fish}'::text[], 5
from public.categories c where c.name = 'Soups'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce(null, public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'egusi-soup');
delete from public.protein_options where product_id = (select id from public.products where slug = 'egusi-soup');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 6000, null), ('3L', 8500, null), ('4L', 10500, null)) as s(size, price, inc) where p.slug = 'egusi-soup';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to chicken', 700, 'swap', 1), ('Swap to goat meat', 900, 'swap', 2), ('Swap to fish (no beef)', 700, 'swap', 3), ('Swap to turkey', 900, 'swap', 4), ('Extra assorted meat', 600, 'add', 5), ('Extra stockfish', 500, 'add', 6)) as o(name, price, kind, sort) where p.slug = 'egusi-soup';

-- Ogbono Soup
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'ogbono-soup', 'Ogbono Soup', coalesce(null, ''), 'beef, assorted meat, smoked fish and stockfish', true, true, '{Fish}'::text[], 6
from public.categories c where c.name = 'Soups'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce(null, public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'ogbono-soup');
delete from public.protein_options where product_id = (select id from public.products where slug = 'ogbono-soup');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 6000, null), ('3L', 8500, null), ('4L', 10500, null)) as s(size, price, inc) where p.slug = 'ogbono-soup';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to goat meat', 900, 'swap', 1), ('Swap to fish (no beef)', 700, 'swap', 2), ('Extra assorted meat', 600, 'add', 3), ('Extra stockfish', 500, 'add', 4)) as o(name, price, kind, sort) where p.slug = 'ogbono-soup';

-- White Soup (Nsala)
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'white-soup-nsala', 'White Soup (Nsala)', coalesce('Peppery Igbo white soup, thickened with yam and made without palm oil.', ''), 'beef, assorted meat, smoked fish and stockfish', true, true, '{Fish}'::text[], 7
from public.categories c where c.name = 'Soups'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Peppery Igbo white soup, thickened with yam and made without palm oil.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'white-soup-nsala');
delete from public.protein_options where product_id = (select id from public.products where slug = 'white-soup-nsala');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 7000, null), ('3L', 10000, null), ('4L', 12500, null)) as s(size, price, inc) where p.slug = 'white-soup-nsala';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to chicken', 900, 'swap', 1), ('Swap to goat meat', 900, 'swap', 2), ('Swap to fish (no beef)', 700, 'swap', 3), ('Swap to turkey', 900, 'swap', 4), ('Extra assorted meat', 600, 'add', 5), ('Extra stockfish', 500, 'add', 6)) as o(name, price, kind, sort) where p.slug = 'white-soup-nsala';

-- Chicken Stew
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'chicken-stew', 'Chicken Stew', coalesce(null, ''), 'chicken', true, true, '{}'::text[], 8
from public.categories c where c.name = 'Stews & sauces'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce(null, public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'chicken-stew');
delete from public.protein_options where product_id = (select id from public.products where slug = 'chicken-stew');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 3500, '8–10 pieces of chicken'), ('3L', 5000, '10–12 pieces of chicken'), ('4L', 6200, '12–14 pieces of chicken')) as s(size, price, inc) where p.slug = 'chicken-stew';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to turkey', 900, 'swap', 1)) as o(name, price, kind, sort) where p.slug = 'chicken-stew';

-- Beef Stew
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'beef-stew', 'Beef Stew', coalesce(null, ''), 'beef', true, true, '{}'::text[], 9
from public.categories c where c.name = 'Stews & sauces'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce(null, public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'beef-stew');
delete from public.protein_options where product_id = (select id from public.products where slug = 'beef-stew');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 4500, '8–10 pieces of beef'), ('3L', 6200, '10–12 pieces of beef'), ('4L', 7800, '12–14 pieces of beef')) as s(size, price, inc) where p.slug = 'beef-stew';

-- Fish Stew
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'fish-stew', 'Fish Stew', coalesce('Tomato and pepper stew with fried fish: croaker, hake or mackerel (Titus).', ''), 'fish (croaker, hake or mackerel)', true, true, '{Fish}'::text[], 10
from public.categories c where c.name = 'Stews & sauces'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Tomato and pepper stew with fried fish: croaker, hake or mackerel (Titus).', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'fish-stew');
delete from public.protein_options where product_id = (select id from public.products where slug = 'fish-stew');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 5000, '8–10 pieces of fish'), ('3L', 7000, '10–12 pieces of fish'), ('4L', 8500, '12–14 pieces of fish')) as s(size, price, inc) where p.slug = 'fish-stew';

-- Vegetable Sauce
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'vegetable-sauce', 'Vegetable Sauce', coalesce('Flaked mackerel in a tomato and pepper sauce.', ''), 'assorted meat and fish', true, true, '{Fish}'::text[], 11
from public.categories c where c.name = 'Stews & sauces'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Flaked mackerel in a tomato and pepper sauce.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'vegetable-sauce');
delete from public.protein_options where product_id = (select id from public.products where slug = 'vegetable-sauce');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 6000, null), ('3L', 9000, null), ('4L', 11500, null)) as s(size, price, inc) where p.slug = 'vegetable-sauce';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to goat meat', 900, 'swap', 1), ('Swap to turkey', 900, 'swap', 2)) as o(name, price, kind, sort) where p.slug = 'vegetable-sauce';

-- Ofe Akwu (Palm Nut Stew)
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'ofe-akwu', 'Ofe Akwu (Palm Nut Stew)', coalesce('Palm-nut (banga-style) stew with ugu and scent leaf.', ''), 'beef, assorted meat and dried fish', true, true, '{Fish}'::text[], 12
from public.categories c where c.name = 'Stews & sauces'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Palm-nut (banga-style) stew with ugu and scent leaf.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'ofe-akwu');
delete from public.protein_options where product_id = (select id from public.products where slug = 'ofe-akwu');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 6000, null), ('3L', 9000, null), ('4L', 11500, null)) as s(size, price, inc) where p.slug = 'ofe-akwu';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Swap to chicken', 700, 'swap', 1), ('Swap to goat meat', 900, 'swap', 2), ('Swap to fish (no beef)', 700, 'swap', 3), ('Swap to turkey', 900, 'swap', 4)) as o(name, price, kind, sort) where p.slug = 'ofe-akwu';

-- Jollof Rice
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'party-jollof-rice', 'Jollof Rice', coalesce('Party jollof rice, cooked in a smoky tomato and pepper base. Rice only: no meat, salad or plantain.', ''), '', true, true, '{}'::text[], 13
from public.categories c where c.name = 'Rice dishes'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Party jollof rice, cooked in a smoky tomato and pepper base. Rice only: no meat, salad or plantain.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'party-jollof-rice');
delete from public.protein_options where product_id = (select id from public.products where slug = 'party-jollof-rice');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 3500, null), ('3L', 4800, null), ('4L', 6000, null)) as s(size, price, inc) where p.slug = 'party-jollof-rice';

-- Fried Rice
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'nigerian-fried-rice', 'Fried Rice', coalesce('Vegetable fried rice with liver and prawns. Chicken, turkey or beef can be quoted separately.', ''), 'liver and prawns', true, true, '{Crustaceans}'::text[], 14
from public.categories c where c.name = 'Rice dishes'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Vegetable fried rice with liver and prawns. Chicken, turkey or beef can be quoted separately.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'nigerian-fried-rice');
delete from public.protein_options where product_id = (select id from public.products where slug = 'nigerian-fried-rice');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 4500, null), ('3L', 6200, null), ('4L', 7800, null)) as s(size, price, inc) where p.slug = 'nigerian-fried-rice';

-- Porridge Beans
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'porridge-beans', 'Porridge Beans', coalesce('Soft beans porridge with crayfish and small pieces of smoked fish.', ''), 'crayfish and smoked fish pieces', true, true, '{Fish,Crustaceans}'::text[], 15
from public.categories c where c.name = 'Nigerian specialities'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Soft beans porridge with crayfish and small pieces of smoked fish.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'porridge-beans');
delete from public.protein_options where product_id = (select id from public.products where slug = 'porridge-beans');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 4000, null), ('3L', 5500, null), ('4L', 7000, null)) as s(size, price, inc) where p.slug = 'porridge-beans';

-- Abacha
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'abacha', 'Abacha', coalesce('African salad: abacha with ugba, mackerel, garden egg leaf and palm-oil dressing.', ''), 'mackerel, ugba and kpomo', true, true, '{Fish}'::text[], 16
from public.categories c where c.name = 'Nigerian specialities'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('African salad: abacha with ugba, mackerel, garden egg leaf and palm-oil dressing.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'abacha');
delete from public.protein_options where product_id = (select id from public.products where slug = 'abacha');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 7000, null), ('3L', 9500, null), ('4L', 12000, null)) as s(size, price, inc) where p.slug = 'abacha';

-- Ugba
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'ugba', 'Ugba', coalesce('Ugba-led salad with dried fish, kpomo, garden egg leaf and palm-oil dressing.', ''), 'dried fish or stockfish, and kpomo', true, true, '{Fish}'::text[], 17
from public.categories c where c.name = 'Nigerian specialities'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Ugba-led salad with dried fish, kpomo, garden egg leaf and palm-oil dressing.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'ugba');
delete from public.protein_options where product_id = (select id from public.products where slug = 'ugba');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('2L', 9000, null), ('3L', 12500, null), ('4L', 15500, null)) as s(size, price, inc) where p.slug = 'ugba';

-- Home-made Banana Bread
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, 'banana-bread', 'Home-made Banana Bread', coalesce('Plain home-made banana bread: a whole loaf that serves 4 to 6.', ''), '', true, false, '{Cereals containing gluten,Eggs}'::text[], 18
from public.categories c where c.name = 'Specials'
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce('Plain home-made banana bread: a whole loaf that serves 4 to 6.', public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = 'banana-bread');
delete from public.protein_options where product_id = (select id from public.products where slug = 'banana-bread');
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values ('Whole', 1500, null)) as s(size, price, inc) where p.slug = 'banana-bread';

insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values ('Chocolate chip', 200, 'add', 1), ('Raisin', 200, 'add', 2), ('Coconut', 200, 'add', 3)) as o(name, price, kind, sort) where p.slug = 'banana-bread';

commit;
