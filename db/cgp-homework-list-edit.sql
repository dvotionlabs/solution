-- A display name belongs to this athlete's assignment, not the shared exercise library.
-- Existing programmes are unchanged; NULL falls back to the exercise name.
alter table public.cgp_homework
 add column if not exists display_title text;
do $$
begin
 if not exists(
  select 1 from pg_constraint where conrelid='public.cgp_homework'::regclass
   and conname='cgp_homework_display_title_check'
 ) then
  alter table public.cgp_homework
   add constraint cgp_homework_display_title_check
    check (display_title is null or
       (length(btrim(display_title)) between 2 and 120
        and display_title=btrim(display_title)));
 end if;
end $$;
