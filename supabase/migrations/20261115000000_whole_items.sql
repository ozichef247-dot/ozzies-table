-- Allow items sold whole (a loaf or cake) alongside 2L–5L bowls.
alter table public.product_sizes drop constraint if exists product_sizes_size_check;
alter table public.product_sizes add constraint product_sizes_size_check check (size in ('2L','3L','4L','5L','Whole'));
