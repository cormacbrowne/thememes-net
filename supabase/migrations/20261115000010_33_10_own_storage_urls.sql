-- Phase 33 task 33.10: Restrict meme media URLs strictly to our own Supabase Storage bucket or /seed/.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'memes_image_url_own_storage_check'
  ) then
    alter table public.memes
      add constraint memes_image_url_own_storage_check
      check (
        image_url ~ '^(/seed/|https://otvvphmjojqyjaznjzyo\.supabase\.co/storage/v1/object/public/memes/)[^\s]+$'
        and position('..' in image_url) = 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'memes_poster_url_own_storage_check'
  ) then
    alter table public.memes
      add constraint memes_poster_url_own_storage_check
      check (
        poster_url is null
        or (
          poster_url ~ '^(/seed/|https://otvvphmjojqyjaznjzyo\.supabase\.co/storage/v1/object/public/memes/)[^\s]+$'
          and position('..' in poster_url) = 0
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'memes_base_image_url_own_storage_check'
  ) then
    alter table public.memes
      add constraint memes_base_image_url_own_storage_check
      check (
        base_image_url is null
        or (
          base_image_url ~ '^(/seed/|https://otvvphmjojqyjaznjzyo\.supabase\.co/storage/v1/object/public/memes/)[^\s]+$'
          and position('..' in base_image_url) = 0
        )
      );
  end if;
end $$;
