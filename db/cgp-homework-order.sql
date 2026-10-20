-- Keep each athlete's own homework sequence, including exercises without video.
-- Existing athlete records start in their current (newest-first) display order.
do $block$
begin
 if not exists(
  select 1 from information_schema.columns
  where table_schema='public' and table_name='cgp_homework' and column_name='sort_order'
 ) then
  alter table public.cgp_homework add column sort_order integer;
  with ranked as (
   select id,
    (row_number() over(partition by client_id order by created_at desc,id desc)-1)::integer as place
   from public.cgp_homework
  )
  update public.cgp_homework h set sort_order=r.place from ranked r where h.id=r.id;
  alter table public.cgp_homework alter column sort_order set default 0;
  alter table public.cgp_homework alter column sort_order set not null;
  alter table public.cgp_homework add constraint cgp_homework_sort_order_check
   check(sort_order between 0 and 1000000);
 end if;
end;
$block$;
create index if not exists cgp_homework_order_by_client
 on public.cgp_homework(client_id,active,sort_order,created_at desc,id);

-- Append newly assigned exercises to the end of that athlete's list.
-- A per-athlete advisory lock ensures parallel assignments don't race.
create or replace function cgp_private.cgp_homework_append_position()
returns trigger language plpgsql security invoker set search_path=''
as $function$
begin
 perform pg_advisory_xact_lock(532191,hashtext(new.client_id::text));
 new.sort_order=coalesce((
  select max(h.sort_order)+1 from public.cgp_homework h where h.client_id=new.client_id
 ),0);
 return new;
end;
$function$;
drop trigger if exists cgp_homework_append_position on public.cgp_homework;
create trigger cgp_homework_append_position before insert on public.cgp_homework
 for each row execute function cgp_private.cgp_homework_append_position();

-- Atomically persist a complete order for ONE athlete, no cross-client IDs.
-- Security invoker means existing RLS continues to protect writes.
create or replace function public.cgp_homework_reorder(p_client uuid,p_order uuid[])
returns integer language plpgsql security invoker set search_path=''
as $function$
declare n integer;
begin
 if auth.uid() is null or not (select cgp_private.portal_admin()) then
  raise exception 'Coach access required';
 end if;
 if p_client is null or not exists(
  select 1 from public.cgp_profiles p where p.id=p_client and p.role='athlete'
 ) then
  raise exception 'Choose a valid athlete';
 end if;
 if p_order is null or cardinality(p_order)>1000 then
  raise exception 'Invalid exercise order';
 end if;
 perform pg_advisory_xact_lock(532191,hashtext(p_client::text));
 select count(*) into n from public.cgp_homework h where h.client_id=p_client and h.active;
 if n<>cardinality(p_order) then
  raise exception 'Homework list changed; reload before reordering';
 end if;
 if (select count(distinct x.id) from unnest(p_order) as x(id))<>n or exists(
  select 1 from unnest(p_order) as x(id)
  left join public.cgp_homework h on h.id=x.id and h.client_id=p_client and h.active
  where h.id is null
 ) then
  raise exception 'Exercise order contains duplicates or another athlete''s homework';
 end if;
 update public.cgp_homework h
 set sort_order=x.position-1
 from unnest(p_order) with ordinality as x(id,position)
 where h.id=x.id and h.client_id=p_client and h.active;
 return n;
end;
$function$;
revoke all on function public.cgp_homework_reorder(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.cgp_homework_reorder(uuid,uuid[]) to authenticated;
