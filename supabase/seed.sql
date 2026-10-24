-- Starter data for Ozzie's Table. Every value here is a placeholder the owner replaces in the dashboard.

insert into public.site_settings (id, general, content) values (1,
'{
  "leadHours": 48, "cancelHours": 48, "holdMinutes": 10, "dailyCap": 24,
  "cookingDays": [5, 6, 0],
  "minDeliveryPence": 3000, "freeOverPence": 8000, "thresholdBasis": "after",
  "showServes": false,
  "notify": { "ready": true, "out": true, "sms": false },
  "contact": { "phone": "01733 000000", "whatsapp": "447700900000", "whatsappDisplay": "07700 900000", "email": "orders@ozziestable.example" },
  "collection": { "address": "Ozzie’s kitchen, Peterborough PE2 (full address from owner)", "instructions": "Give your order number at the door. Please bring a bag for larger bowls." }
}'::jsonb,
'{
  "themeLine": "Tradition in every bite, from our pot to your table",
  "headline": "A taste of home, by the bowl.",
  "intro": "Traditional Nigerian soups, rice and family favourites, prepared to order for collection and delivery around Peterborough.",
  "notice": "Now taking orders for this weekend.",
  "story": "This is where Ozzie’s story goes: who she is, where her recipes come from, and why every bowl is cooked to order. Edit this text and add a photo of Ozzie or the kitchen in the owner dashboard under Content.",
  "storyPhoto": null, "heroPhoto": null, "logo": null, "fontPairing": "a",
  "legal": {
    "sample": true,
    "allergenNote": "Allergy requests can’t be handled through order notes. If you have an allergy, call us on {phone} before ordering.",
    "kitchen": "Our kitchen also handles fish, shellfish, eggs, celery and nuts, so traces may be present in any dish.",
    "cancellation": "Cancel up to {cancel} hours before your slot for a full refund to your original payment method. After that, ingredients have usually been bought, so orders can’t be refunded. If we have to cancel, you get a full refund.",
    "privacy": "We collect your name, contact details and address only to fulfil and support your order. Payments are handled by our payment provider; we never see or store card details.",
    "terms": "Prices include VAT where applicable. Food should be eaten on the day, or chilled within two hours and reheated once until piping hot.",
    "cookies": "Essential cookies keep your basket working. Analytics cookies are only set if you accept them.",
    "hygiene": "", "company": ""
  },
  "seo": {
    "home": { "title": "Ozzie’s Table · Nigerian food cooked to order in Peterborough", "description": "Traditional Nigerian soups, rice and family favourites, prepared to order for collection and delivery around Peterborough." },
    "menu": { "title": "Menu · Ozzie’s Table", "description": "Egusi, oha, jollof and more, by the bowl in 2 to 5 litres." },
    "info": { "title": "How ordering works · Ozzie’s Table", "description": "Notice periods, delivery areas, cancellations and allergens." }
  }
}'::jsonb)
on conflict (id) do nothing;

insert into public.categories (name, sort) values
  ('Soups', 1), ('Rice dishes', 2), ('Stews & sauces', 3), ('Nigerian specialities', 4);

with p(cat, slug, name, description, included, featured, available, seasoning, allergens, tags, cook_days, sort) as (values
  ('Soups','egusi-soup','Egusi Soup','Ground melon seed soup with spinach, cooked slowly in palm oil.','assorted beef and stockfish',true,true,true,'{Fish,Crustaceans}'::text[],'{}'::text[],'{}'::int[],1),
  ('Soups','oha-soup','Oha Soup','Cocoyam-thickened soup with tender oha leaves, an Igbo favourite.','assorted beef, stockfish and ponmo',true,true,true,'{Fish,Crustaceans}','{}','{}',2),
  ('Soups','ogbono-soup','Ogbono Soup','Draw soup made with ground wild mango seed and leafy greens.','assorted beef and dried fish',false,true,true,'{Fish,Crustaceans}','{}','{}',3),
  ('Soups','efo-riro','Efo Riro','Yoruba spinach stew with peppers and iru (locust beans).','assorted beef and smoked turkey',false,true,true,'{Fish}','{}','{}',4),
  ('Soups','goat-meat-pepper-soup','Goat Meat Pepper Soup','Light, fiery broth with goat on the bone and scent leaf.','goat meat on the bone',false,true,true,'{}','{}','{6,0}',5),
  ('Rice dishes','party-jollof-rice','Party Jollof Rice','Long-grain rice cooked slowly in a smoky tomato and pepper base.','',true,true,true,'{Celery}','{Vegan}','{}',1),
  ('Rice dishes','nigerian-fried-rice','Nigerian Fried Rice','Curry and thyme rice with mixed vegetables and diced liver.','diced beef liver',false,true,true,'{Celery}','{}','{}',2),
  ('Rice dishes','coconut-rice','Coconut Rice','Rice simmered in coconut milk with crayfish and peppers.','crayfish',false,true,true,'{Crustaceans}','{}','{}',3),
  ('Stews & sauces','ayamase','Ayamase (Ofada Stew)','Green pepper stew fried in bleached palm oil. Rich and properly hot.','assorted beef, shaki and boiled eggs',false,true,true,'{Eggs,Crustaceans}','{}','{}',1),
  ('Stews & sauces','chicken-stew','Chicken Stew','Tomato and pepper stew with fried chicken pieces.','chicken',false,true,true,'{Celery}','{}','{}',2),
  ('Stews & sauces','beef-stew','Beef Stew','Slow-cooked beef in a classic Nigerian tomato stew.','beef',false,true,true,'{Celery}','{}','{}',3),
  ('Nigerian specialities','abacha-and-ugba','Abacha & Ugba','African salad: shredded cassava and oil bean slices in a spiced palm-oil dressing.','ponmo and fried mackerel',true,true,true,'{Fish,Crustaceans}','{}','{}',1),
  ('Nigerian specialities','nkwobi','Nkwobi','Cow foot in a thick, spiced palm-oil and utazi sauce.','cow foot',false,true,true,'{}','{}','{}',2),
  ('Nigerian specialities','moi-moi','Moi Moi','Steamed bean pudding with peppers, egg and fish.','boiled egg and mackerel',false,true,false,'{Eggs,Fish}','{}','{}',3),
  ('Nigerian specialities','asun','Asun','Smoky grilled goat tossed in hot peppers and onions.','goat meat',false,true,true,'{}','{}','{}',4)
)
insert into public.products (category_id, slug, name, description, included, featured, available, seasoning_enabled, allergens, tags, cook_days, sort)
select c.id, p.slug, p.name, p.description, p.included, p.featured, p.available, p.seasoning, p.allergens, p.tags, p.cook_days, p.sort
from p join public.categories c on c.name = p.cat;

with s(slug, size, price, serves, included, lead) as (values
  ('egusi-soup','2L',3800,'Serves 4–5',null,null::int),('egusi-soup','3L',5400,'Serves 6–8',null,null),('egusi-soup','4L',7000,'Serves 9–11',null,null),('egusi-soup','5L',8600,'Serves 12–14',null,72),
  ('oha-soup','2L',4200,'Serves 4–5',null,null),('oha-soup','3L',6000,'Serves 6–8',null,null),('oha-soup','4L',7800,'Serves 9–11',null,null),('oha-soup','5L',9500,'Serves 12–14',null,72),
  ('ogbono-soup','2L',3600,'Serves 4–5',null,null),('ogbono-soup','3L',5200,'Serves 6–8',null,null),('ogbono-soup','4L',6800,'Serves 9–11',null,null),
  ('efo-riro','2L',3600,'Serves 4–5',null,null),('efo-riro','3L',5200,'Serves 6–8',null,null),('efo-riro','4L',6800,'Serves 9–11',null,null),
  ('goat-meat-pepper-soup','2L',3400,'Serves 3–4',null,null),('goat-meat-pepper-soup','3L',4800,'Serves 5–6',null,null),
  ('party-jollof-rice','2L',2800,'Serves 5–6',null,null),('party-jollof-rice','3L',3800,'Serves 8–9',null,null),('party-jollof-rice','4L',4800,'Serves 10–12',null,null),('party-jollof-rice','5L',5800,'Serves 13–15',null,72),
  ('nigerian-fried-rice','2L',3000,'Serves 5–6',null,null),('nigerian-fried-rice','3L',4200,'Serves 8–9',null,null),('nigerian-fried-rice','4L',5400,'Serves 10–12',null,null),('nigerian-fried-rice','5L',6600,'Serves 13–15',null,72),
  ('coconut-rice','2L',3000,'Serves 5–6',null,null),('coconut-rice','3L',4200,'Serves 8–9',null,null),('coconut-rice','4L',5400,'Serves 10–12',null,null),
  ('ayamase','2L',4000,'Serves 6–8',null,null),('ayamase','3L',5600,'Serves 9–12',null,null),('ayamase','4L',7200,'Serves 13–16',null,null),
  ('chicken-stew','2L',3600,'Serves 4','8 pieces of chicken',null),('chicken-stew','3L',5000,'Serves 6','12 pieces of chicken',null),('chicken-stew','4L',6400,'Serves 8','16 pieces of chicken',null),('chicken-stew','5L',7800,'Serves 10','20 pieces of chicken',72),
  ('beef-stew','2L',3800,'Serves 4','1kg of beef',null),('beef-stew','3L',5400,'Serves 6','1.5kg of beef',null),('beef-stew','4L',7000,'Serves 8','2kg of beef',null),
  ('abacha-and-ugba','2L',3200,'Serves 4–5',null,null),('abacha-and-ugba','3L',4600,'Serves 6–8',null,null),
  ('nkwobi','2L',3800,'Serves 4–5',null,null),('nkwobi','3L',5400,'Serves 6–8',null,null),
  ('moi-moi','2L',2400,'About 8 wraps',null,null),('moi-moi','3L',3400,'About 12 wraps',null,null),
  ('asun','2L',4000,'Serves 4–5',null,null),('asun','3L',5600,'Serves 6–8',null,null)
)
insert into public.product_sizes (product_id, size, price_pence, serves, included, lead_hours)
select p.id, s.size, s.price, s.serves, s.included, s.lead from s join public.products p on p.slug = s.slug;

with o(slug, name, price, kind, sort) as (values
  ('egusi-soup','Swap to goat meat',400,'swap',1),('egusi-soup','Swap to fish only (no beef)',200,'swap',2),('egusi-soup','Extra assorted beef',600,'add',3),('egusi-soup','Extra stockfish',500,'add',4),
  ('oha-soup','Swap to goat meat',400,'swap',1),('oha-soup','Extra stockfish',500,'add',2),('oha-soup','Extra ponmo',300,'add',3),
  ('ogbono-soup','Extra assorted beef',600,'add',1),
  ('efo-riro','Swap to all smoked turkey',300,'swap',1),
  ('party-jollof-rice','Add peppered chicken (6 pieces)',1200,'add',1),('party-jollof-rice','Add peppered beef',1000,'add',2),('party-jollof-rice','Add turkey wings (4)',1400,'add',3),
  ('nigerian-fried-rice','No liver',0,'swap',1),('nigerian-fried-rice','Add peppered chicken (6 pieces)',1200,'add',2),
  ('coconut-rice','Add peppered chicken (6 pieces)',1200,'add',1),
  ('ayamase','Extra assorted beef',600,'add',1),
  ('chicken-stew','Swap to turkey',500,'swap',1),
  ('abacha-and-ugba','Extra fried mackerel',400,'add',1)
)
insert into public.protein_options (product_id, name, price_pence, kind, sort)
select p.id, o.name, o.price, o.kind, o.sort from o join public.products p on p.slug = o.slug;

insert into public.slots (method, start_time, end_time, capacity) values
  ('collection','11:00','12:00',5), ('collection','12:00','13:00',4), ('collection','14:00','15:00',5), ('collection','16:00','17:00',5),
  ('delivery','12:00','14:00',4), ('delivery','15:00','17:00',4), ('delivery','17:00','19:00',4);

insert into public.zones (name, outcodes, fee_pence, sort) values
  ('Central Peterborough', '{PE1,PE2,PE3,PE4}', 400, 1),
  ('Outer Peterborough', '{PE6,PE7,PE8}', 700, 2);

insert into public.promos (code, kind, value, min_pence, starts_on, ends_on, usage_limit, active)
values ('FIRSTBOWL', 'pct', 10, 4000, current_date, current_date + 60, 200, false);

insert into public.faqs (question, answer, sort) values
  ('How far ahead do I need to order?', 'Most dishes need at least {notice} hours’ notice. Larger bowls can need longer, and each size shows its notice. The calendar at checkout only shows dates you can still book, with the order deadline for each.', 1),
  ('Where do you deliver?', 'We deliver to {areas}. Delivery starts at {fee}, with a {min} minimum order and free delivery over {free}. You can check your postcode before you start.', 2),
  ('Can I change or cancel my order?', 'You can change or cancel for a full refund up to {cancel} hours before your slot. Call or WhatsApp us with your order number.', 3),
  ('Can I order by phone or WhatsApp?', 'Please order on the website so your slot is booked and paid. Phone and WhatsApp are for questions only.', 4),
  ('How should I reheat the food?', 'Reheat soups and stews gently in a pan until piping hot. Rice reheats best covered in the oven. Reheat only once.', 5),
  ('Do you cater for allergies?', 'Every dish lists which of the 14 major allergens it contains. We can’t remove allergens through order notes. If you have an allergy, call us on {phone} before ordering.', 6);
