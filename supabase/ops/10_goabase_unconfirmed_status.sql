-- LOCAL REVIEW CANDIDATE. Requires backend 09. No remote execution by this file.
-- Quarantine unknown/missing source statuses without fabricating source versions.
begin;
create table if not exists spots_sync_private.goabase_unconfirmed (
 source_event_id text primary key check(source_event_id ~ '^[1-9][0-9]*$'),
 observed_at timestamptz not null,
 source_modified_at timestamptz,
 reason text not null check(reason in ('missing','moved','unrecognized'))
);
alter table spots_sync_private.goabase_unconfirmed enable row level security;
revoke all on spots_sync_private.goabase_unconfirmed from public,anon,authenticated,service_role;
do $$ begin
 if to_regprocedure('spots_sync_private.goabase_apply_removals_core(uuid,jsonb,jsonb)') is null then
  alter function public.spots_goabase_apply_v2(uuid,jsonb,jsonb) set schema spots_sync_private;
  alter function spots_sync_private.spots_goabase_apply_v2(uuid,jsonb,jsonb) rename to goabase_apply_removals_core;
 end if;
end $$;
revoke all on function spots_sync_private.goabase_apply_removals_core(uuid,jsonb,jsonb) from public,anon,authenticated,service_role;

create or replace function public.spots_goabase_apply_v3(p_token uuid,p_rows jsonb,p_removed_ids jsonb,p_unconfirmed jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 lease spots_sync_private.goabase_lease%rowtype;
 quarantine spots_sync_private.goabase_unconfirmed%rowtype;
 current_event public.events%rowtype;
 item jsonb;
 accepted jsonb := '[]'::jsonb;
 result jsonb;
 source_id text;
 modified timestamptz;
 rejected integer := 0;
 quarantined integer := 0;
 quarantine_unchanged integer := 0;
 skipped integer := 0;
begin
 select * into lease from spots_sync_private.goabase_lease where singleton for update;
 if p_token is null or lease.token is distinct from p_token or lease.expires_at<=clock_timestamp() then
  raise exception 'Invalid or expired Goabase lease';
 end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_typeof(p_removed_ids) is distinct from 'array'
  or jsonb_typeof(p_unconfirmed) is distinct from 'array' then raise exception 'Invalid Goabase batch'; end if;
 if jsonb_array_length(p_rows)+jsonb_array_length(p_removed_ids)+jsonb_array_length(p_unconfirmed)>5000 then
  raise exception 'Goabase batch capacity exceeded'; end if;
 if exists(select 1 from (
  select r->>'source_event_id' id from jsonb_array_elements(p_rows) r
  union all select r #>> '{}' from jsonb_array_elements(p_removed_ids) r
  union all select r->>'source_event_id' from jsonb_array_elements(p_unconfirmed) r
 ) ids group by id having count(*)>1) then raise exception 'Duplicate source IDs in batch'; end if;

 for item in select value from jsonb_array_elements(p_rows) loop
  if item->>'source' is distinct from 'goabase' or coalesce(item->>'source_event_id','') !~ '^[1-9][0-9]*$'
   or coalesce(item->>'status','') not in ('scheduled','cancelled','postponed')
   or coalesce(trim(item->>'title'),'')='' or item->>'source_modified_at' is null
   or item->>'starts_at' is null or item->>'is_published' is null then raise exception 'Invalid Goabase row'; end if;
  modified := (item->>'source_modified_at')::timestamptz;
  select * into quarantine from spots_sync_private.goabase_unconfirmed where source_event_id=item->>'source_event_id';
  if found and (modified<=quarantine.observed_at or modified<=quarantine.source_modified_at) then
   rejected := rejected+1;
  else accepted := accepted || jsonb_build_array(item); end if;
 end loop;
 result := spots_sync_private.goabase_apply_removals_core(p_token,accepted,p_removed_ids);
 for item in select value from jsonb_array_elements(accepted) loop
  delete from spots_sync_private.goabase_unconfirmed q where q.source_event_id=item->>'source_event_id'
   and exists(select 1 from spots_sync_private.goabase_versions v join public.events e
    on e.source='goabase' and e.source_event_id=v.source_event_id
    where v.source_event_id=q.source_event_id and v.modified_at=(item->>'source_modified_at')::timestamptz
    and v.payload=item-'source_modified_at'-'is_published' and e.status in ('scheduled','cancelled','postponed'));
 end loop;
 -- A confirmed deletion supersedes uncertain status, retaining the removal fence.
 delete from spots_sync_private.goabase_unconfirmed q
  where q.source_event_id in(select value #>> '{}' from jsonb_array_elements(p_removed_ids))
  and exists(select 1 from public.events e where e.source='goabase' and e.source_event_id=q.source_event_id and e.status='source_removed');

 for item in select value from jsonb_array_elements(p_unconfirmed) loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'source_event_id','') !~ '^[1-9][0-9]*$'
   or coalesce(item->>'reason','') not in ('missing','moved','unrecognized')
   or item->>'source_modified_at' is null then raise exception 'Invalid unconfirmed source'; end if;
  modified := (item->>'source_modified_at')::timestamptz;
  source_id := item->>'source_event_id';
  select * into current_event from public.events where source='goabase' and source_event_id=source_id for update;
  if not found then skipped:=skipped+1; continue; end if;
  if current_event.status='source_removed' then quarantine_unchanged:=quarantine_unchanged+1; continue; end if;
  insert into spots_sync_private.goabase_unconfirmed(source_event_id,observed_at,source_modified_at,reason)
   values(source_id,clock_timestamp(),greatest(modified,(select modified_at from spots_sync_private.goabase_versions where source_event_id=source_id)),item->>'reason')
   on conflict(source_event_id) do update set reason=excluded.reason,
    source_modified_at=greatest(spots_sync_private.goabase_unconfirmed.source_modified_at,excluded.source_modified_at);
  if current_event.status='source_unconfirmed' and not current_event.is_published then
   quarantine_unchanged:=quarantine_unchanged+1;
  else
   update public.events set status='source_unconfirmed',is_published=false where id=current_event.id;
   quarantined:=quarantined+1;
  end if;
 end loop;
 return result || jsonb_build_object('quarantined',quarantined,'quarantined_unchanged',quarantine_unchanged,
  'skipped_unconfirmed',skipped,'rejected_versions',(result->>'rejected_versions')::integer+rejected);
end;
$$;
revoke all on function public.spots_goabase_apply_v3(uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.spots_goabase_apply_v3(uuid,jsonb,jsonb,jsonb) to service_role;
-- Older callers also pass through the quarantine fence.
create or replace function public.spots_goabase_apply_v2(p_token uuid,p_rows jsonb,p_removed_ids jsonb) returns jsonb
language sql security definer set search_path='' as $$
 select public.spots_goabase_apply_v3(p_token,p_rows,p_removed_ids,'[]'::jsonb)
  -'quarantined'-'quarantined_unchanged'-'skipped_unconfirmed';
$$;
revoke all on function public.spots_goabase_apply_v2(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.spots_goabase_apply_v2(uuid,jsonb,jsonb) to service_role;
commit;
