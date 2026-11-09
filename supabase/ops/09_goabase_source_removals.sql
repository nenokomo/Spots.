-- REVIEW CANDIDATE. Requires backend 03. No remote execution authorized by this file.
-- Adds source-removal observations without inventing source dateModified values.
begin;
create table if not exists spots_sync_private.goabase_removed (
  source_event_id text primary key check (source_event_id ~ '^[1-9][0-9]*$'),
  observed_at timestamptz not null,
  source_modified_at timestamptz
);
alter table spots_sync_private.goabase_removed enable row level security;
revoke all on spots_sync_private.goabase_removed from public, anon, authenticated, service_role;

-- Preserve reviewed upsert/version logic as a private implementation, and fence
-- the legacy entrypoint too: an older caller must not resurrect removed rows.
do $$ begin
  if to_regprocedure('spots_sync_private.goabase_apply_core(uuid,jsonb)') is null then
    alter function public.spots_goabase_apply(uuid,jsonb) set schema spots_sync_private;
    alter function spots_sync_private.spots_goabase_apply(uuid,jsonb) rename to goabase_apply_core;
  end if;
end $$;
revoke all on function spots_sync_private.goabase_apply_core(uuid,jsonb) from public,anon,authenticated,service_role;

create or replace function public.spots_goabase_apply_v2(p_token uuid, p_rows jsonb, p_removed_ids jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  lease spots_sync_private.goabase_lease%rowtype;
  removal spots_sync_private.goabase_removed%rowtype;
  item jsonb;
  source_id text;
  accepted jsonb := '[]'::jsonb;
  result jsonb;
  modified timestamptz;
  removed_count integer := 0;
  removed_unchanged integer := 0;
  removed_unknown integer := 0;
  rejected_removed integer := 0;
  current_event public.events%rowtype;
begin
  select * into lease from spots_sync_private.goabase_lease where singleton for update;
  if p_token is null or lease.token is distinct from p_token or lease.expires_at <= clock_timestamp() then
    raise exception 'Invalid or expired Goabase lease';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_typeof(p_removed_ids) is distinct from 'array' then
    raise exception 'Invalid Goabase batch';
  end if;
  if jsonb_array_length(p_rows) + jsonb_array_length(p_removed_ids) > 5000 then
    raise exception 'Goabase batch capacity exceeded';
  end if;
  if exists(select 1 from (
    select r->>'source_event_id' as id from jsonb_array_elements(p_rows) r
    union all select case when jsonb_typeof(r)='string' then r #>> '{}' end from jsonb_array_elements(p_removed_ids) r
  ) ids group by id having count(*)>1) then raise exception 'Duplicate source IDs in batch'; end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    -- Validate before filtering, so malformed input cannot silently disappear.
    if item->>'source' is distinct from 'goabase' or coalesce(item->>'source_event_id','') !~ '^[1-9][0-9]*$'
      or coalesce(item->>'status','') not in ('scheduled','cancelled','postponed')
      or coalesce(trim(item->>'title'),'')='' or item->>'source_modified_at' is null
      or item->>'starts_at' is null or item->>'is_published' is null then raise exception 'Invalid Goabase row'; end if;
    modified := (item->>'source_modified_at')::timestamptz;
    select * into removal from spots_sync_private.goabase_removed where source_event_id=item->>'source_event_id';
    -- A previously fetched/equal source version cannot resurrect a removed event.
    -- observed_at is an observation fence, not a fabricated source modification time.
    if found and (modified <= removal.observed_at or modified <= removal.source_modified_at) then
      rejected_removed := rejected_removed + 1;
    else
      accepted := accepted || jsonb_build_array(item);
    end if;
  end loop;

  result := spots_sync_private.goabase_apply_core(p_token, accepted);
  -- Only clear a removal fence when the original version-protected RPC accepted it.
  for item in select value from jsonb_array_elements(accepted) loop
    delete from spots_sync_private.goabase_removed d where d.source_event_id=item->>'source_event_id'
      and exists(select 1 from spots_sync_private.goabase_versions v join public.events e
        on e.source='goabase' and e.source_event_id=v.source_event_id
        where v.source_event_id=d.source_event_id and v.modified_at=(item->>'source_modified_at')::timestamptz
        and v.payload=item-'source_modified_at'-'is_published' and e.status<>'source_removed');
  end loop;

  for item in select value from jsonb_array_elements(p_removed_ids) loop
    if jsonb_typeof(item)<>'string' or (item #>> '{}') !~ '^[1-9][0-9]*$' then
      raise exception 'Invalid removed source ID';
    end if;
    source_id := item #>> '{}';
    select * into current_event from public.events where source='goabase' and source_event_id=source_id for update;
    if not found then removed_unknown := removed_unknown + 1; continue; end if;
    insert into spots_sync_private.goabase_removed(source_event_id,observed_at,source_modified_at)
      values(source_id,clock_timestamp(),(select modified_at from spots_sync_private.goabase_versions where source_event_id=source_id))
      on conflict(source_event_id) do nothing;
    if current_event.status='source_removed' and not current_event.is_published then
      removed_unchanged := removed_unchanged + 1;
    else
      update public.events set status='source_removed',is_published=false where id=current_event.id;
      removed_count := removed_count + 1;
    end if;
  end loop;
  return result || jsonb_build_object('removed',removed_count,'removed_unchanged',removed_unchanged,
    'removed_unknown',removed_unknown,'rejected_versions',(result->>'rejected_versions')::integer+rejected_removed);
end;
$$;
revoke all on function public.spots_goabase_apply_v2(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.spots_goabase_apply_v2(uuid,jsonb,jsonb) to service_role;
create or replace function public.spots_goabase_apply(p_token uuid,p_rows jsonb) returns jsonb
language sql security definer set search_path='' as $$
  select public.spots_goabase_apply_v2(p_token,p_rows,'[]'::jsonb)
    -'removed'-'removed_unchanged'-'removed_unknown';
$$;
revoke all on function public.spots_goabase_apply(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.spots_goabase_apply(uuid,jsonb) to service_role;
commit;
