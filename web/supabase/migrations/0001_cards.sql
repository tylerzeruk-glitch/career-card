-- Career Card: one row per user. The career (profile, roles, colours) lives in
-- `data`; the job hunt (events, view settings) lives in `hunt` and is never
-- exposed to anyone but the owner.

create table public.cards (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  slug        text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$'),
  visibility  text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  data        jsonb not null default '{}'::jsonb,
  hunt        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.cards enable row level security;

-- Owners can do anything with their own row; nobody else can touch the table directly.
create policy "cards: owner" on public.cards
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The public page reads through this view, which exposes only the career half
-- of rows the owner has chosen to share. It runs with the definer's rights so
-- the table's RLS does not apply; the where clause is the gate.
create view public.public_cards
  with (security_invoker = false) as
  select slug, visibility, data, updated_at
  from public.cards
  where visibility in ('unlisted', 'public') and slug is not null;

revoke all on public.cards from anon;
grant select on public.public_cards to anon, authenticated;
