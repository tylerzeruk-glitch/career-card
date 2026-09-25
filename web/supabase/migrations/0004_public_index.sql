-- The public read also says how the card is shared, so the page is indexed only
-- when its owner chose "public" (unlisted stays out of search), and a second
-- function lists the public slugs for the sitemap. Both are definer functions,
-- the only anonymous path to the cards table, returning nothing private.

create or replace function public.public_card(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('data', data, 'visibility', visibility, 'updated_at', updated_at)
  from public.cards
  where slug = p_slug and visibility in ('unlisted', 'public');
$$;

create or replace function public.public_slugs()
returns table (slug text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select slug, updated_at
  from public.cards
  where visibility = 'public' and slug is not null;
$$;

revoke all on function public.public_slugs() from public;
grant execute on function public.public_slugs() to anon, authenticated;
