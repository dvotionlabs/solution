-- Create a written-only exercise and assign it to an athlete in one atomic action.
-- SECURITY INVOKER retains the existing exercise/homework admin RLS policies.
create or replace function public.cgp_create_text_homework(
 p_client uuid,
 p_title text,
 p_category text,
 p_cues text,
 p_prescription text,
 p_coach_note text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
 exercise_id uuid;
 assignment_id uuid;
 title_clean text := btrim(coalesce(p_title,''));
 category_clean text := btrim(coalesce(p_category,''));
 cues_clean text := btrim(coalesce(p_cues,''));
 prescription_clean text := btrim(coalesce(p_prescription,''));
 note_clean text := btrim(coalesce(p_coach_note,''));
begin
 if auth.uid() is null or not (select cgp_private.portal_admin()) then
  raise exception 'Admin access required';
 end if;
 if not exists (
  select 1 from public.cgp_profiles p
  where p.id = p_client and p.role='athlete' and p.active
 ) then
  raise exception 'Choose an active athlete';
 end if;
 if length(title_clean) not between 2 and 120 or length(category_clean) not between 1 and 60
    or length(cues_clean)>4000 or length(prescription_clean) not between 1 and 500
    or length(note_clean)>2000 then
  raise exception 'Check the exercise name, category and instructions';
 end if;
 insert into public.cgp_exercises(title,category,youtube_id,cues,active)
 values(title_clean,category_clean,null,cues_clean,true)
 returning id into exercise_id;
 insert into public.cgp_homework(client_id,exercise_id,prescription,coach_note,active)
 values(p_client,exercise_id,prescription_clean,note_clean,true)
 returning id into assignment_id;
 return assignment_id;
end;
$function$;
revoke all on function public.cgp_create_text_homework(uuid,text,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.cgp_create_text_homework(uuid,text,text,text,text,text)
 to authenticated;
