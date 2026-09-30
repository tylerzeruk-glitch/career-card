-- Card styles still being tried out (the app's TRIAL list, in src/lib/styles.ts) are granted per account.
-- A row here lets that account pick the style for its card and share links in it. Rows are made by the
-- project owner (SQL editor or service role); the app can read an account's own rows and never write them.
-- This replaces the NEXT_PUBLIC_STYLE_TESTERS list, which was built into the site's public code.

create table public.style_access (
  user_id    uuid not null references auth.users (id) on delete cascade,
  style      text not null check (style ~ '^[a-z0-9-]{1,24}$'),
  granted_at timestamptz not null default now(),
  primary key (user_id, style)
);

alter table public.style_access enable row level security;

create policy "style_access: owner reads" on public.style_access
  for select using (auth.uid() = user_id);

-- The public read also says which trial styles the card's owner has, so a page can honour a link's ?style=
-- only when the owner may use it. It returns the styles, never the owner's id.
create or replace function public.public_card(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'data', c.data,
    'visibility', c.visibility,
    'updated_at', c.updated_at,
    'styles', coalesce((select jsonb_agg(a.style order by a.style) from public.style_access a where a.user_id = c.user_id), '[]'::jsonb)
  )
  from public.cards c
  where c.slug = p_slug and c.visibility in ('unlisted', 'public');
$$;

-- the testers so far: the owner (/u/tzeruk) and Pete (/u/pete)
insert into public.style_access (user_id, style) values
  ('6938d939-3564-48c6-83d0-13e22a5e09fb', 'chrome'),
  ('ba4120d4-8c15-4b07-af4a-cad15b39e84b', 'chrome')
on conflict do nothing;
