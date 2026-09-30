-- Portraits are served by public URL (the bucket is public), which needs no policy. The old
-- "anyone reads" select policy only added the ability to LIST the bucket through the storage API,
-- which let anyone enumerate every user's folder, original photo and drawing takes. Reading and
-- listing through the API is now for the folder's owner only (the draw route lists its takes, the
-- pick route downloads one, and removing a portrait needs to see it).

drop policy if exists "portraits: anyone reads" on storage.objects;

create policy "portraits: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = auth.uid()::text);
