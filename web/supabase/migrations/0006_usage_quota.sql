-- Daily usage of the paid routes (portrait drawing, resume and spreadsheet reading), counted where the
-- user cannot reach it. The old portrait cap counted files in the user's own takes folder, which the
-- user may delete, and read the count before the upload landed, so parallel requests all passed.
--
-- The server calls bump_usage() with the signed-in user's session before each paid call; the count goes
-- up atomically and the new value comes back, and the server compares it with the day's cap. Calling
-- the function directly only ever raises the caller's own count.

create table if not exists public.usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('portrait', 'resume', 'tracker')),
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  primary key (user_id, kind, day)
);

alter table public.usage enable row level security;
-- no policies: nobody reads or writes the table directly; only the function below touches it
revoke all on public.usage from anon, authenticated;

create or replace function public.bump_usage(p_kind text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  insert into public.usage (user_id, kind, day, count)
  values (uid, p_kind, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, kind, day) do update set count = public.usage.count + 1
  returning count into n;
  return n;
end;
$$;

revoke all on function public.bump_usage(text) from public, anon;
grant execute on function public.bump_usage(text) to authenticated;
