import openpyxl, sys, re
wb = openpyxl.load_workbook(sys.argv[1], data_only=True); ws = wb.active
rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if r[0]]
sheet = {r[0].strip(): r for r in rows if isinstance(r[1], (int, float))}

# name on site, slug (existing slugs kept so photos and order history stay linked), category, description
D = [
 ('Oha soup','Oha Soup','oha-soup','Soups','Cocoyam-thickened soup with tender oha leaves, an Igbo favourite.'),
 ('Bitterleaf soup','Bitterleaf Soup','bitterleaf-soup','Soups','Ofe onugbu: washed bitterleaf in a cocoyam-thickened soup.'),
 ('Edikaikong soup','Edikaikong Soup','edikaikong-soup','Soups','Efik-style vegetable soup of ugu and waterleaf.'),
 ('Ukazi soup','Ukazi Soup','ukazi-soup','Soups','Ukazi (okazi) leaf soup, thickened with cocoyam.'),
 ('Egusi soup','Egusi Soup','egusi-soup','Soups',None),
 ('Ogbono soup','Ogbono Soup','ogbono-soup','Soups',None),
 ('White soup (nsala)','White Soup (Nsala)','white-soup-nsala','Soups','Peppery Igbo white soup, thickened with yam and made without palm oil.'),
 ('Chicken Stew','Chicken Stew','chicken-stew','Stews & sauces',None),
 ('Beef Stew','Beef Stew','beef-stew','Stews & sauces',None),
 ('Fish Stew','Fish Stew','fish-stew','Stews & sauces','Tomato and pepper stew with fried fish: croaker, hake or mackerel (Titus).'),
 ('Vegetable sauce/stew','Vegetable Sauce','vegetable-sauce','Stews & sauces','Flaked mackerel in a tomato and pepper sauce.'),
 ('Ofe Akwu(Palm nut stew)','Ofe Akwu (Palm Nut Stew)','ofe-akwu','Stews & sauces','Palm-nut (banga-style) stew with ugu and scent leaf.'),
 ('Jollof rice','Jollof Rice','party-jollof-rice','Rice dishes','Party jollof rice, cooked in a smoky tomato and pepper base. Rice only: no meat, salad or plantain.'),
 ('Fried rice','Fried Rice','nigerian-fried-rice','Rice dishes','Vegetable fried rice with liver and prawns. Chicken, turkey or beef can be quoted separately.'),
 ('Porridge beans','Porridge Beans','porridge-beans','Nigerian specialities','Soft beans porridge with crayfish and small pieces of smoked fish.'),
 ('Abacha','Abacha','abacha','Nigerian specialities','African salad: abacha with ugba, mackerel, garden egg leaf and palm-oil dressing.'),
 ('Ugba','Ugba','ugba','Nigerian specialities','Ugba-led salad with dried fish, kpomo, garden egg leaf and palm-oil dressing.'),
 ('Home made Banana bread','Home-made Banana Bread','banana-bread','Specials','Plain home-made banana bread: a whole loaf that serves 4 to 6.'),
]
# included protein (base price) text, lower-cased for "Includes …"
INC = {
 'Beef, Assorted, smoked fish & stockfish': 'beef, assorted meat, smoked fish and stockfish',
 'Fish (croaker / hake / Mackerel(Titus))': 'fish (croaker, hake or mackerel)',
 'Assorted meat & fish': 'assorted meat and fish',
 'Beef, assorted & dried fish': 'beef, assorted meat and dried fish',
 'Liver & prawns (no chicken/beef)': 'liver and prawns',
 'Crayfish & smoked fish pieces': 'crayfish and smoked fish pieces',
 'Mackerel & ugba garnish & kpomo': 'mackerel, ugba and kpomo',
 'Dried fish / stockfish & kpomo': 'dried fish or stockfish, and kpomo',
}
SWAPS = [(5,'Swap to chicken'),(6,'Swap to goat meat'),(7,'Swap to fish (no beef)'),(8,'Swap to turkey')]
ADDS = [(9,'Extra assorted meat'),(10,'Extra stockfish')]

def allergens(text):
    t = text.lower(); a = []
    if re.search(r'fish|mackerel|croaker|hake|titus', t): a.append('Fish')
    if re.search(r'crayfish|prawn', t): a.append('Crustaceans')
    return a

q = lambda s: "'" + s.replace("'", "''") + "'" if s is not None else 'null'
arr = lambda xs: "'{" + ",".join(xs) + "}'::text[]"
out = []
for i,(key,name,slug,cat,desc) in enumerate(D, 1):
    r = sheet[key]
    base = str(r[4]).strip(); recipe = str(r[11] or '').strip()
    whole = key.startswith('Home made Banana')
    inc = '' if whole or base.lower().startswith('none') else INC.get(base, base[0].lower() + base[1:]).replace(' & ', ' and ')
    al = allergens(base + ' ' + recipe + ' ' + name)
    if whole: al = ['Cereals containing gluten','Eggs']
    sizes = []
    if whole: sizes.append(('Whole', int(r[1]*100), None))
    else:
        per = {}
        m = re.findall(r'(\d)L:\s*([\d\-–]+)\s*pcs', recipe)
        noun = re.search(r'pcs of (\w+)', recipe)
        for sz, pcs in m: per[sz+'L'] = f"{pcs.replace('-', '–')} pieces of {noun.group(1)}"
        for col, sz in ((1,'2L'),(2,'3L'),(3,'4L')):
            if isinstance(r[col], (int,float)): sizes.append((sz, int(round(r[col]*100)), per.get(sz)))
    opts = []
    for col, label in SWAPS:
        v = r[col]
        if isinstance(v,(int,float)): opts.append((label, int(round(v*100)), 'swap'))
    for col, label in ADDS:
        v = r[col]
        if isinstance(v,(int,float)): opts.append((label, int(round(v*100)), 'add'))
    if whole:
        opts = [(f, 200, 'add') for f in ('Chocolate chip','Raisin','Coconut')]
    out.append(dict(i=i,key=key,name=name,slug=slug,cat=cat,desc=desc,inc=inc,al=al,sizes=sizes,opts=opts,season=not whole))

L = []
L.append("""-- Ozzie's Table menu from the November 2026 price list (Pricing_sheet_uploaded.xlsx).
-- Run in Supabase → SQL Editor, AFTER 20261115000000_whole_items.sql. Safe to run more than once.
-- • Dishes on the sheet are added or updated (prices, sizes, swaps, extras). Photos and "Featured" are kept.
-- • Dishes not on the sheet are hidden (Available off), not deleted, so past orders keep their link.
begin;

insert into public.categories (name, sort) select 'Specials', 5 where not exists (select 1 from public.categories where name = 'Specials');
""")
L.append("update public.products set available = false where slug not in (" + ", ".join(q(d['slug']) for d in out) + ");\n")
for d in out:
    desc_set = q(d['desc']) if d['desc'] else 'null'
    L.append(f"""-- {d['name']}
insert into public.products (category_id, slug, name, description, included, available, seasoning_enabled, allergens, sort)
select c.id, {q(d['slug'])}, {q(d['name'])}, coalesce({desc_set}, ''), {q(d['inc'])}, true, {str(d['season']).lower()}, {arr(d['al'])}, {d['i']}
from public.categories c where c.name = {q(d['cat'])}
on conflict (slug) do update set
  category_id = excluded.category_id, name = excluded.name,
  description = coalesce({desc_set}, public.products.description),
  included = excluded.included, available = true, seasoning_enabled = excluded.seasoning_enabled,
  allergens = (select array(select distinct unnest(public.products.allergens || excluded.allergens))),
  sort = excluded.sort;
delete from public.product_sizes where product_id = (select id from public.products where slug = {q(d['slug'])});
delete from public.protein_options where product_id = (select id from public.products where slug = {q(d['slug'])});
insert into public.product_sizes (product_id, size, price_pence, included)
select p.id, s.size, s.price, s.inc from public.products p, (values {", ".join(f"({q(s[0])}, {s[1]}, {q(s[2])})" for s in d['sizes'])}) as s(size, price, inc) where p.slug = {q(d['slug'])};
""")
    if d['opts']:
        L.append(f"""insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from public.products p, (values {", ".join(f"({q(o[0])}, {o[1]}, {q(o[2])}, {k})" for k,o in enumerate(d['opts'],1))}) as o(name, price, kind, sort) where p.slug = {q(d['slug'])};
""")
L.append("commit;\n")
open(sys.argv[2],'w').write("\n".join(L))
for d in out: print(d['name'], d['cat'], [ (s[0], s[1]/100) for s in d['sizes']], [(o[0], o[1]/100) for o in d['opts']], d['al'], '|', d['inc'])
