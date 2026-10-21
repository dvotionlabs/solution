-- Each athlete can have their own visible homework name without modifying
-- the shared exercise library or anyone else's prescribed exercises.
alter table public.cgp_homework
 add column if not exists title_override text;
do $$
begin
 if not exists(select 1 from pg_constraint where conname='cgp_homework_title_override_check' and conrelid='public.cgp_homework'::regclass) then
  alter table public.cgp_homework
   add constraint cgp_homework_title_override_check
   check(title_override is null or (length(btrim(title_override)) between 2 and 120));
 end if;
end $$;
