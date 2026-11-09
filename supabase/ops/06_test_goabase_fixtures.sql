-- TEST ONLY: render the placeholder via scripts/test-goabase-fixtures.cjs.
-- Fixed test project nfomkdvotqtlyymomksb. No deployments, schema changes or deletes.
-- All fixture writes and lease changes are rolled back in a PL/pgSQL subtransaction.
do $tests$
declare
  fixtures jsonb := $fixtures$__GOABASE_FIXTURE_STATES__$fixtures$::jsonb;
  original_events jsonb;
  original_versions jsonb;
  original_lease jsonb;
  results jsonb := '[]';
  lease jsonb;
  replacement jsonb;
  token uuid;
  fixture_uuid uuid;
  current_event public.events%rowtype;
  outcome jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') into original_events from public.events e;
  select coalesce(jsonb_agg(to_jsonb(v) order by source_event_id),'[]') into original_versions from spots_sync_private.goabase_versions v;
  select to_jsonb(l) into original_lease from spots_sync_private.goabase_lease l where singleton;
  if original_lease->>'token' is not null then raise exception 'Test project is busy'; end if;
  if exists(select 1 from public.events where source='goabase' and source_event_id in
    ('999990000000001','999990000000002','999990000000003')) or exists(
    select 1 from spots_sync_private.goabase_versions where source_event_id in
    ('999990000000001','999990000000002','999990000000003')) then
    raise exception 'Fixture ID collision; existing data will not be touched';
  end if;

  begin
    lease := public.spots_goabase_begin();
    token := (lease->>'token')::uuid;
    if token is null then raise exception 'Lease acquisition failed'; end if;
    if public.spots_goabase_begin() is not null then raise exception 'Concurrent acquisition accepted'; end if;
    outcome := public.spots_goabase_apply(token,jsonb_build_array(fixtures->'scheduled'));
    select * into current_event from public.events where source='goabase' and source_event_id='999990000000001';
    fixture_uuid := current_event.id;
    if outcome->>'inserted' <> '1' or not current_event.is_published or current_event.status <> 'scheduled' then
      raise exception 'Scheduled fixture failed'; end if;
    results := results || '"scheduled_insert"'::jsonb;
    outcome := public.spots_goabase_apply(token,jsonb_build_array(fixtures->'scheduled'));
    if outcome->>'unchanged' <> '1' then raise exception 'Repeated fixture changed'; end if;
    results := results || '"fixture_repeat"'::jsonb;

    outcome := public.spots_goabase_apply(token,jsonb_build_array(fixtures->'changed'));
    select * into current_event from public.events where id=fixture_uuid;
    if outcome->>'updated' <> '1' or current_event.title <> 'Changed isolated fixture'
      or current_event.city <> 'Fixture city B' or current_event.latitude <> 50.5
      or current_event.longitude <> 9.5 or current_event.starts_at <> '2099-07-01T14:00:00Z'::timestamptz
      or current_event.ends_at <> '2099-07-01T18:00:00Z'::timestamptz then
      raise exception 'Changed data/UUID fixture failed'; end if;
    results := results || '"title_city_dates_gps_update_same_uuid"'::jsonb;

    -- Even an accidentally true input flag must not publish a cancellation.
    outcome := public.spots_goabase_apply(token,jsonb_build_array(
      jsonb_set(fixtures->'cancelled','{is_published}','true'::jsonb)));
    select * into current_event from public.events where id=fixture_uuid;
    if outcome->>'cancelled' <> '1' or current_event.status <> 'cancelled' or current_event.is_published then
      raise exception 'Cancellation fixture failed'; end if;
    results := results || '"cancelled_unpublished_same_uuid"'::jsonb;
    outcome := public.spots_goabase_apply(token,jsonb_build_array(fixtures->'scheduled'));
    if outcome->>'rejected_versions' <> '1' then raise exception 'Old version accepted'; end if;
    outcome := public.spots_goabase_apply(token,jsonb_build_array(jsonb_set(fixtures->'changed',
      '{source_modified_at}',fixtures->'cancelled'->'source_modified_at')));
    if outcome->>'rejected_versions' <> '1' then raise exception 'Conflicting equal version accepted'; end if;
    results := results || '"older_and_conflicting_versions_rejected"'::jsonb;

    outcome := public.spots_goabase_apply(token,jsonb_build_array(fixtures->'postponed'));
    select * into current_event from public.events where id=fixture_uuid;
    if current_event.status <> 'postponed' or current_event.is_published then raise exception 'Postponement fixture failed'; end if;
    results := results || '"postponed_unpublished_same_uuid"'::jsonb;
    outcome := public.spots_goabase_apply(token,jsonb_build_array(fixtures->'rescheduled'));
    select * into current_event from public.events where id=fixture_uuid;
    if current_event.status <> 'scheduled' or not current_event.is_published
      or current_event.starts_at <> '2099-08-01T14:00:00Z'::timestamptz then raise exception 'Reschedule fixture failed'; end if;
    results := results || '"confirmed_reschedule_published_same_uuid"'::jsonb;

    outcome := public.spots_goabase_apply(token,'[]'::jsonb);
    if (select count(*) from public.events) <> jsonb_array_length(original_events)+1 then raise exception 'Empty batch altered inventory'; end if;
    results := results || '"empty_batch_preserves_inventory"'::jsonb;
    begin
      perform public.spots_goabase_apply(token,jsonb_build_array(fixtures->'rescheduled',fixtures->'rescheduled'));
      raise exception 'Expected duplicate rejection was missing';
    exception when others then
      if sqlerrm <> 'Duplicate source IDs in batch' then raise; end if;
    end;
    results := results || '"duplicate_batch_rejected"'::jsonb;
    begin
      perform public.spots_goabase_apply(token,jsonb_build_array(
        jsonb_set(fixtures->'scheduled','{source_event_id}','"999990000000002"'::jsonb),
        jsonb_set(jsonb_set(fixtures->'scheduled','{source_event_id}','"999990000000003"'::jsonb),'{starts_at}','"broken"'::jsonb)));
      raise exception 'Expected invalid timestamp rejection was missing';
    exception when invalid_datetime_format then null;
    end;
    if exists(select 1 from public.events where source='goabase' and source_event_id='999990000000002') then
      raise exception 'Partial batch was committed'; end if;
    results := results || '"mixed_invalid_batch_atomic_rollback"'::jsonb;

    update spots_sync_private.goabase_lease set expires_at=clock_timestamp()-interval '1 second' where singleton;
    replacement := public.spots_goabase_begin();
    if replacement->>'token' is null or replacement->>'token'=token::text then raise exception 'Lease takeover failed'; end if;
    begin
      perform public.spots_goabase_apply(token,'[]'::jsonb);
      raise exception 'Expected stale token rejection was missing';
    exception when others then
      if sqlerrm <> 'Invalid or expired Goabase lease' then raise; end if;
    end;
    perform public.spots_goabase_release(token);
    if public.spots_goabase_begin() is not null then raise exception 'Stale owner released replacement lease'; end if;
    perform public.spots_goabase_apply((replacement->>'token')::uuid,'[]'::jsonb);
    perform public.spots_goabase_release((replacement->>'token')::uuid);
    results := results || '"expired_owner_fenced_and_cannot_release_successor"'::jsonb;
    if (select count(*) from public.events where source_event_id='999990000000001') <> 1 then raise exception 'Fixture UUID lost'; end if;
    -- Intentional exception rolls back EVERYTHING in this inner block, not existing data.
    raise exception using errcode='P9901', message='Rollback successful fixture writes';
  exception when sqlstate 'P9901' then null;
  end;

  if (select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from public.events e) <> original_events
    or (select coalesce(jsonb_agg(to_jsonb(v) order by source_event_id),'[]') from spots_sync_private.goabase_versions v) <> original_versions
    or (select to_jsonb(l) from spots_sync_private.goabase_lease l where singleton) <> original_lease then
    raise exception 'Fixture rollback changed original data';
  end if;
  perform set_config('spots_test.integration_result',jsonb_build_object('passed',true,
    'cases',results,'fixture_rollback_verified',true,'original_events',jsonb_array_length(original_events))::text,true);
end;
$tests$;
select current_setting('spots_test.integration_result')::jsonb as fixture_results;
