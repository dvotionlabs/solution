-- Integration assertions run entirely within a transaction; no test accounts or data persist.
begin;
do $$
declare au uuid:=gen_random_uuid(); u1 uuid:=gen_random_uuid(); u2 uuid:=gen_random_uuid(); a uuid; c1 uuid; c2 uuid; pack uuid; ex uuid;
begin
 insert into auth.users(id,aud,role,email,email_confirmed_at) values
 (au,'authenticated','authenticated',au::text||'@portal-test.invalid',now()),
 (u1,'authenticated','authenticated',u1::text||'@portal-test.invalid',now()),
 (u2,'authenticated','authenticated',u2::text||'@portal-test.invalid',now());
 insert into public.cgp_profiles(user_id,email,name,role) values(au,au::text||'@portal-test.invalid','Test coach','admin') returning id into a;
 insert into public.cgp_profiles(user_id,email,name) values(u1,u1::text||'@portal-test.invalid','Test athlete one') returning id into c1;
 insert into public.cgp_profiles(user_id,email,name) values(u2,u2::text||'@portal-test.invalid','Test athlete two') returning id into c2;
 insert into public.cgp_session_credits(client_id,label,quantity,starts_on,expires_on) values(c1,'Test pack',2,'2026-01-01','2026-12-31') returning id into pack;
 insert into public.cgp_exercises(title,youtube_id) values('Test exercise','abcdefghijk') returning id into ex;
 insert into public.cgp_homework(client_id,exercise_id,prescription) values(c1,ex,'Three sets'),(c2,ex,'Two sets');
 perform set_config('cgp_test.admin_user',au::text,true);perform set_config('cgp_test.user1',u1::text,true);perform set_config('cgp_test.user2',u2::text,true);
 perform set_config('cgp_test.client1',c1::text,true);perform set_config('cgp_test.client2',c2::text,true);perform set_config('cgp_test.pack',pack::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('cgp_test.admin_user'),'role','authenticated')::text,true);
do $$
declare c1 uuid:=current_setting('cgp_test.client1')::uuid; c2 uuid:=current_setting('cgp_test.client2')::uuid; p uuid:=current_setting('cgp_test.pack')::uuid; b1 uuid; b2 uuid; rejected boolean;
begin
 assert cgp_private.portal_admin(),'Admin role not recognised';
 insert into public.cgp_bookings(client_id,credit_id,starts_at,ends_at) values(c1,p,'2026-11-01T10:00:00Z','2026-11-01T11:00:00Z') returning id into b1;
 rejected:=false;begin insert into public.cgp_bookings(client_id,starts_at,ends_at) values(c2,'2026-11-01T10:30:00Z','2026-11-01T11:30:00Z');exception when raise_exception then rejected:=true;end;assert rejected,'Overlapping booking accepted';
 insert into public.cgp_bookings(client_id,credit_id,starts_at,ends_at,status) values(c1,p,'2026-11-02T10:00:00Z','2026-11-02T11:00:00Z','completed');
 rejected:=false;begin insert into public.cgp_bookings(client_id,credit_id,starts_at,ends_at) values(c1,p,'2026-11-03T10:00:00Z','2026-11-03T11:00:00Z');exception when raise_exception then rejected:=true;end;assert rejected,'Overbooked pack accepted';
 update public.cgp_bookings set status='cancelled' where id=b1;
 insert into public.cgp_bookings(client_id,credit_id,starts_at,ends_at) values(c1,p,'2026-11-03T10:00:00Z','2026-11-03T11:00:00Z') returning id into b2;
 update public.cgp_bookings set status='no_show' where id=b2;
 rejected:=false;begin update public.cgp_bookings set status='scheduled' where id=b1;exception when raise_exception then rejected:=true;end;assert rejected,'Reinstating an overbooked session accepted';
 rejected:=false;begin insert into public.cgp_bookings(client_id,credit_id,starts_at,ends_at) values(c2,p,'2026-11-04T10:00:00Z','2026-11-04T11:00:00Z');exception when raise_exception then rejected:=true;end;assert rejected,'Another client used this pack';
 rejected:=false;begin update public.cgp_session_credits set quantity=1 where id=p;exception when raise_exception then rejected:=true;end;assert rejected,'Pack reduced below usage';
 rejected:=false;begin update public.cgp_session_credits set expires_on='2026-10-01' where id=p;exception when raise_exception then rejected:=true;end;assert rejected,'Pack dates exclude existing usage';
 assert (select count(*) from public.cgp_bookings where credit_id=p and status in ('completed','no_show'))=2,'Used total wrong';
 perform set_config('cgp_test.invite',public.cgp_issue_portal_invite(c1),true);
 assert length(current_setting('cgp_test.invite'))=64,'Invitation missing';
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('cgp_test.user1'),'role','authenticated')::text,true);
do $$
declare rejected boolean; affected integer; h uuid; conn uuid;
begin
 assert not cgp_private.portal_admin(),'Athlete recognised as admin';
 assert (select count(*) from public.cgp_profiles)=1,'Athlete can see another profile';
 assert (select count(*) from public.cgp_homework)=1,'Athlete can see another homework';
 assert (select count(*) from public.cgp_bookings where client_id<>current_setting('cgp_test.client1')::uuid)=0,'Cross-client bookings visible';
 update public.cgp_profiles set role='admin' where id=current_setting('cgp_test.client1')::uuid;get diagnostics affected=row_count;assert affected=0,'Athlete promoted themself';
 update public.cgp_bookings set status='cancelled';get diagnostics affected=row_count;assert affected=0,'Athlete changed session balance';
 rejected:=false;begin insert into public.cgp_session_credits(client_id,label,quantity) values(current_setting('cgp_test.client1')::uuid,'Unpaid credit',8);exception when insufficient_privilege then rejected:=true;end;assert rejected,'Athlete awarded credits';
 rejected:=false;begin perform public.cgp_issue_portal_invite(current_setting('cgp_test.client2')::uuid);exception when raise_exception then rejected:=true;end;assert rejected,'Athlete issued an invitation';
 rejected:=false;begin perform public.cgp_redeem_portal_invite(repeat('a',64),current_setting('cgp_test.user1')::uuid);exception when insufficient_privilege then rejected:=true;end;assert rejected,'Athlete can invoke service redemption';
 select id into h from public.cgp_homework limit 1;
 insert into public.cgp_homework_logs(homework_id,client_id) values(h,current_setting('cgp_test.client1')::uuid);
 rejected:=false;begin insert into public.cgp_homework_logs(homework_id,client_id,done_on) values(h,current_setting('cgp_test.client1')::uuid,current_date-20);exception when insufficient_privilege then rejected:=true;end;assert rejected,'Athlete forged an old completion';
 conn:=public.cgp_start_wearable('OURA');
 assert (select count(*) from public.cgp_wearable_connections)=1,'Own connection missing';
 perform set_config('cgp_test.connection',conn::text,true);
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('cgp_test.user2'),'role','authenticated')::text,true);
do $$ declare rejected boolean;begin
 assert (select count(*) from public.cgp_bookings)=0,'Second athlete can see first bookings';
 assert (select count(*) from public.cgp_session_credits)=0,'Second athlete can see first balance';
 assert (select count(*) from public.cgp_homework_logs)=0,'Second athlete can see first completion';
 assert (select count(*) from public.cgp_wearable_connections)=0,'Second athlete can see first wearable';
 rejected:=false;begin perform public.cgp_disconnect_wearable(current_setting('cgp_test.connection')::uuid);exception when raise_exception then rejected:=true;end;assert rejected,'Second athlete disconnected another client';
end $$;
reset role;
-- The temporary credential change is rolled back together with every fixture.
insert into cgp_private.portal_ingest_credentials(name,key_hash) values('terra',encode(sha256(convert_to('portal-test-only','UTF8')),'hex')) on conflict(name) do update set key_hash=excluded.key_hash;
set local role anon;
do $$ declare rejected boolean; event jsonb; begin
 rejected:=false;begin perform public.cgp_ingest_wearable('wrong','{"type":"healthcheck"}');exception when raise_exception then rejected:=true;end;assert rejected,'Invalid webhook credential accepted';
 perform public.cgp_ingest_wearable('portal-test-only',jsonb_build_object('type','auth','user_id','portal-test-external','provider','OURA','reference_id',current_setting('cgp_test.connection')));
 event:=jsonb_build_object('type','daily','user_id','portal-test-external','metrics',jsonb_build_array(jsonb_build_object('day',current_date::text,'source_id',current_date::text,'steps',8123,'hrv_rmssd',52,'hrv_sdnn',null,'sleep_seconds',null,'resting_hr',58,'measured_at',now()::text)));
 perform public.cgp_ingest_wearable('portal-test-only',event);perform public.cgp_ingest_wearable('portal-test-only',event);
end $$;
reset role;
do $$ declare rejected boolean;begin
 assert (select count(*) from public.cgp_wearable_metrics where connection_id=current_setting('cgp_test.connection')::uuid)=1,'Duplicate webhook counted twice';
 assert (select steps from public.cgp_wearable_metrics where connection_id=current_setting('cgp_test.connection')::uuid)=8123,'Wearable value changed';
 rejected:=false;begin perform public.cgp_redeem_portal_invite(current_setting('cgp_test.invite'),current_setting('cgp_test.user2')::uuid);exception when raise_exception then rejected:=true;end;assert rejected,'Wrong account redeemed invitation';
 perform public.cgp_redeem_portal_invite(current_setting('cgp_test.invite'),current_setting('cgp_test.user1')::uuid);
 rejected:=false;begin perform public.cgp_redeem_portal_invite(current_setting('cgp_test.invite'),current_setting('cgp_test.user1')::uuid);exception when raise_exception then rejected:=true;end;assert rejected,'Invitation replay accepted';
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('cgp_test.user2'),'role','authenticated')::text,true);
do $$ begin assert (select count(*) from public.cgp_wearable_metrics)=0,'Health data visible to another athlete'; end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('cgp_test.user1'),'role','authenticated')::text,true);
do $$ begin
 assert (select count(*) from public.cgp_wearable_metrics)=1,'Athlete cannot see their own readings';
 perform public.cgp_disconnect_wearable(current_setting('cgp_test.connection')::uuid);
end $$;
set local role anon;
do $$ begin
 perform public.cgp_ingest_wearable('portal-test-only',jsonb_build_object('type','daily','user_id','portal-test-external','metrics',jsonb_build_array(jsonb_build_object('day',current_date::text,'source_id',current_date::text,'steps',99,'measured_at',now()::text))));
end $$;
reset role;
do $$ begin
 assert (select count(*) from public.cgp_wearable_metrics where connection_id=current_setting('cgp_test.connection')::uuid)=0,'Revoked data was retained or recollected';
 assert not has_table_privilege('anon','public.cgp_profiles','select'),'Anonymous profiles exposed';
 assert not has_table_privilege('authenticated','public.cgp_portal_invites','select'),'Invitation hashes exposed';
 assert not has_table_privilege('authenticated','cgp_private.portal_ingest_credentials','select'),'Ingest credential exposed';
 assert not has_function_privilege('anon','public.cgp_start_wearable(text)','execute'),'Anonymous connect RPC exposed';
 assert not has_function_privilege('anon','public.cgp_issue_portal_invite(uuid)','execute'),'Anonymous invite RPC exposed';
end $$;
rollback;
select 'PASS: diary, credits, client isolation, roles, homework, invitation replay, consented ingestion, idempotency, health-data isolation and revocation; all fixtures rolled back' as result;
