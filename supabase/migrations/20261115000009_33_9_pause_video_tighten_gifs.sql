-- Phase 33 task 33.9: Switch video uploads off until they can be moderated; tighten GIFs.
-- Zero video MIME types allowed in quarantine or memes storage buckets, and any existing
-- non-rejected video memes are moved to pending for manual review.

update storage.buckets
set
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/octet-stream'],
  file_size_limit = 15728640
where id = 'quarantine';

update storage.buckets
set
  allowed_mime_types = array['image/webp', 'image/gif'],
  file_size_limit = 15728640
where id = 'memes';

update public.memes
set
  status = 'pending',
  media_type = 'video'
where (
    media_type = 'video'
    or image_url ~* '\.(mp4|webm|mov)(\?|$)'
    or image_url ilike '%/videos/%'
  )
  and status not in ('pending', 'rejected');
