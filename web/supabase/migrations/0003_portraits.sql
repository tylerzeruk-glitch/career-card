-- Player portraits. One folder per user in a public bucket: anyone can view a
-- portrait (the public page needs to), only its owner can write it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portraits', 'portraits', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "portraits: anyone reads" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'portraits');

create policy "portraits: owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "portraits: owner replaces" on storage.objects
  for update to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "portraits: owner removes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);
