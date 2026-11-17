-- Phase 36.V Stage 1: re-open video memes (owner decision 17 Nov 2026).
-- Videos are re-recorded in the browser, checked + metadata-neutralised by publish-meme
-- (_shared/videoInspect.js) and ALWAYS held `pending` until a moderator approves them.
-- Only the Edge Function (service role) writes to either bucket; browsers upload to quarantine
-- through signed URLs the function issues.

update storage.buckets
set
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/octet-stream',
    'video/mp4', 'video/webm'
  ],
  file_size_limit = 26214400
where id = 'quarantine';

update storage.buckets
set
  allowed_mime_types = array['image/webp', 'image/gif', 'video/mp4', 'video/webm'],
  file_size_limit = 26214400
where id = 'memes';
