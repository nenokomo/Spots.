-- Isolated transaction for local PostgreSQL/PGlite or the verified Spots-Test project.
-- Auth fixture rows are SQL-only; no emails, no persisted users/events, always ROLLBACK.
begin;
set local plpgsql.check_asserts=on;
do $$ begin
 if exists(select 1 from auth.users where id in ('ffffffff-ffff-4fff-8fff-000000000001','ffffffff-ffff-4fff-8fff-000000000002','ffffffff-ffff-4fff-8fff-000000000003')) then
  raise exception 'Fixture identity collision; stop without changing existing data';
 end if;
end $$;
insert into auth.users(id,email) values
 ('ffffffff-ffff-4fff-8fff-000000000001','spots-owner@example.invalid'),
 ('ffffffff-ffff-4fff-8fff-000000000002','spots-editor@example.invalid'),
 ('ffffffff-ffff-4fff-8fff-000000000003','spots-stranger@example.invalid');
insert into public.events(id,title,source,source_event_id,starts_at,status,is_published)
 values('ffffffff-ffff-4fff-8fff-000000000100','SQL import protection fixture','goabase','999888777','2099-01-01T12:00:00Z','scheduled',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-000000000001',true);
select public.save_private_profile('Private owner name');
select public.save_private_profile('Updated private owner name');
select set_config('spots.test.organizer',public.create_organizer('spots-rls-owner-fixture','Public fixture name')::text,true);
do $$ begin
 assert (select count(*)=1 from public.user_profiles), 'Owner should only see own private profile';
 assert (select display_name='Updated private owner name' from public.user_profiles), 'Private profile upsert failed';
 assert (select count(*)=1 from public.organizer_memberships where role='owner'), 'Atomic owner missing';
end $$;

-- A different signed-in user cannot read private profiles, drafts or elevate membership.
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-000000000002',true);
do $$ declare affected integer; begin
 assert (select count(*)=0 from public.user_profiles), 'Private profile leak';
 assert (select count(*)=0 from public.organizers), 'Organizer draft leak';
 assert (select count(*)=0 from public.organizer_memberships), 'Membership leak';
 update public.organizers set display_name='Forbidden change' where id=current_setting('spots.test.organizer')::uuid;
 get diagnostics affected=row_count;assert affected=0,'Foreign profile changed';
 update public.events set title='Forbidden import change' where id='ffffffff-ffff-4fff-8fff-000000000100';
 get diagnostics affected=row_count;assert affected=0,'Imported event changed by private user';
 begin
  insert into public.user_profiles(id,display_name) values('ffffffff-ffff-4fff-8fff-000000000003','Forbidden');
  raise exception 'Foreign private profile insert permitted';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.organizer_memberships(organizer_id,user_id,role) values(current_setting('spots.test.organizer')::uuid,auth.uid(),'owner');
  raise exception 'Direct membership escalation permitted';
 exception when insufficient_privilege then null;end;
 begin
  perform public.set_organizer_editor(current_setting('spots.test.organizer')::uuid,auth.uid(),true);
  raise exception 'Non-owner membership escalation permitted';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.events(title,source,organizer_id,starts_at) values('Forbidden','spots',current_setting('spots.test.organizer')::uuid,'2099-01-01T20:00:00Z');
  raise exception 'Foreign event insert permitted';
 exception when insufficient_privilege then null;end;
end $$;

select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-000000000001',true);
select public.set_organizer_editor(current_setting('spots.test.organizer')::uuid,'ffffffff-ffff-4fff-8fff-000000000002',true);
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-000000000002',true);
update public.organizers set biography='Edited by member' where id=current_setting('spots.test.organizer')::uuid;
do $$ declare affected integer; begin
 assert (select biography='Edited by member' from public.organizers), 'Editor cannot edit own organizer';
 begin
  perform public.set_organizer_editor(current_setting('spots.test.organizer')::uuid,'ffffffff-ffff-4fff-8fff-000000000003',true);
  raise exception 'Editor can manage membership';
 exception when insufficient_privilege then null;end;
 update public.events set title='Forbidden editor import change' where source='goabase';
 get diagnostics affected=row_count;assert affected=0,'Editor modified imported events';
 begin
  insert into public.events(title,source,organizer_id,starts_at,is_published) values('Premature publication','spots',current_setting('spots.test.organizer')::uuid,'2099-01-01T20:00:00Z',true);
  raise exception 'Event published for private organizer';
 exception when insufficient_privilege then null;end;
end $$;
update public.organizers set is_published=true where id=current_setting('spots.test.organizer')::uuid;
with e as (insert into public.events(title,source,organizer_id,starts_at,is_published)
 values('Public owned fixture','spots',current_setting('spots.test.organizer')::uuid,'2099-01-01T20:00:00Z',true) returning id)
 select set_config('spots.test.event',(select id::text from e),true);
insert into public.events(title,source,organizer_id,starts_at) values('Draft owned fixture','spots',current_setting('spots.test.organizer')::uuid,'2099-02-01T20:00:00Z');
insert into public.organizer_posts(organizer_id,body,is_published) values(current_setting('spots.test.organizer')::uuid,'Public member post',true),(current_setting('spots.test.organizer')::uuid,'Private member draft',false);
do $$ begin
 assert (select count(*)=2 from public.events where source='spots'), 'Multiple owned events missing';
 begin
  update public.events set organizer_id=null where id=current_setting('spots.test.event')::uuid;
  raise exception 'Event organizer identity changed';
 exception when insufficient_privilege then null;end;
 begin
  update public.events set source='goabase' where id=current_setting('spots.test.event')::uuid;
  raise exception 'Event origin changed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.events(title,source,starts_at) values('Forged import','goabase','2099-01-01T20:00:00Z');
  raise exception 'Client forged imported event';
 exception when insufficient_privilege then null;end;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 assert (select count(*)=1 from public.organizers where slug='spots-rls-owner-fixture'), 'Public organizer missing';
 assert (select count(*)=1 from public.organizer_posts where organizer_id=current_setting('spots.test.organizer')::uuid), 'Post draft visible or published post missing';
 assert (select count(*)=1 from public.events where source='spots'), 'Event draft visible or public event missing';
 assert (select count(*)=1 from public.events where id='ffffffff-ffff-4fff-8fff-000000000100'), 'Imported public event hidden';
 begin perform 1 from public.user_profiles;raise exception 'Anonymous private profile read permitted';exception when insufficient_privilege then null;end;
 begin perform 1 from public.organizer_memberships;raise exception 'Anonymous membership read permitted';exception when insufficient_privilege then null;end;
 begin perform public.create_organizer('forbidden-creation','Forbidden');raise exception 'Anonymous organizer creation permitted';exception when insufficient_privilege then null;end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-000000000003',true);
do $$ declare affected integer; begin
 update public.events set title='Forbidden foreign event' where id=current_setting('spots.test.event')::uuid;
 get diagnostics affected=row_count;assert affected=0,'Foreign user changed public event';
 update public.organizer_posts set body='Forbidden foreign post' where organizer_id=current_setting('spots.test.organizer')::uuid;
 get diagnostics affected=row_count;assert affected=0,'Foreign user changed posts';
end $$;
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-000000000001',true);
select public.set_organizer_editor(current_setting('spots.test.organizer')::uuid,'ffffffff-ffff-4fff-8fff-000000000002',false);
do $$ begin
 begin perform public.set_organizer_editor(current_setting('spots.test.organizer')::uuid,auth.uid(),false);raise exception 'Owner removed without transfer';exception when raise_exception then if sqlerrm<>'Ownership transfer is not supported' then raise;end if;end;
end $$;
update public.organizers set is_published=false where id=current_setting('spots.test.organizer')::uuid;
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-000000000002',true);
do $$ begin assert (select count(*)=0 from public.organizers),'Revoked editor still sees draft';end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 assert (select count(*)=0 from public.events where source='spots'), 'Unpublished organizer leaked event';
 assert (select count(*)=0 from public.organizer_posts where organizer_id=current_setting('spots.test.organizer')::uuid), 'Unpublished organizer leaked post';
 assert (select count(*)=1 from public.events where id='ffffffff-ffff-4fff-8fff-000000000100'), 'Goabase read regressed';
end $$;
rollback;
