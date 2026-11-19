-- Share cards: cached 1200x630 JPEG link-preview images made by the `share-card` Edge Function.
-- PRIVATE bucket: cards are only ever served through the function, which re-checks that the
-- meme is still approved on every request (so removed memes stop previewing immediately).
-- No storage.objects policies are added: only the service role can read or write here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('share-cards', 'share-cards', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
