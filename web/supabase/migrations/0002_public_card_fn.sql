-- Replace the definer view with a definer function. The function is the only
-- path from an anonymous request to the cards table, and it returns just the
-- career column of a row whose owner chose to share it. (A definer view was
-- auto-updatable and picked up write grants from Supabase's default
-- privileges; a function has neither problem.)

drop view if exists public.public_cards;

create or replace function public.public_card(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select data
  from public.cards
  where slug = p_slug and visibility in ('unlisted', 'public');
$$;

revoke all on function public.public_card(text) from public;
grant execute on function public.public_card(text) to anon, authenticated;
