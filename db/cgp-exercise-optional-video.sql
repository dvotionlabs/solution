-- Allow written-only exercises in CGP without losing any existing video links.
-- The existing regex CHECK still validates Youtube IDs when a link is present:
-- CHECK(youtube_id ~ '^[A-Za-z0-9_-]{11}$')
alter table public.cgp_exercises alter column youtube_id drop not null;
