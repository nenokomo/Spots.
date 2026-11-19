-- Team-Mitglieder für Veranstalter: Einladung per Code statt per Konto-ID.
-- Manueller Betriebsschritt, transaktional. Voraussetzung: 15 und 28. Ändert keine Event-Zeilen.
--  * Der Besitzer erzeugt einen Einladungscode (7 Tage gültig, einmal nutzbar, höchstens 5 offene Codes).
--  * Die eingeladene Person löst den Code mit ihrem eigenen Veranstalter-Konto ein und wird Mitglied („editor“).
--    Niemand wird ohne eigenes Zutun Mitglied; es wird nie verraten, ob es zu einer E-Mail ein Konto gibt.
--  * Private Konten können keinen Code einlösen (Kontoart steht seit der Registrierung fest, SQL 28).
--  * Entfernen von Mitgliedern wie bisher über set_organizer_editor (SQL 15).
begin;
do $$ begin
  if to_regprocedure('public.set_organizer_editor(uuid, uuid, boolean)') is null
    or to_regprocedure('public.spots_my_account_type()') is null then
    raise exception 'SQL 15 and 28 required first';
  end if;
  if to_regclass('spots_accounts_private.organizer_invites') is not null then
    raise exception 'Organizer invites already exist; inspect instead of replaying';
  end if;
end $$;

create table spots_accounts_private.organizer_invites (
  code text primary key check (code ~ '^[0-9A-F]{12}$'),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);
create index organizer_invites_organizer_idx on spots_accounts_private.organizer_invites(organizer_id);
-- Fehlversuche pro Konto (Schutz gegen Durchprobieren von Codes).
create table spots_accounts_private.invite_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index invite_attempts_user_idx on spots_accounts_private.invite_attempts(user_id, attempted_at);
alter table spots_accounts_private.organizer_invites enable row level security;
alter table spots_accounts_private.invite_attempts enable row level security;
revoke all on spots_accounts_private.organizer_invites, spots_accounts_private.invite_attempts from public, anon, authenticated;

-- Neuer Code (nur Besitzer). 12 Zeichen aus einer sicheren Zufallsquelle (gen_random_uuid).
create function public.spots_organizer_create_invite(p_organizer_id uuid) returns table(code text, expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_code text; v_expires timestamptz;
begin
  if not spots_accounts_private.is_owner(p_organizer_id) then raise insufficient_privilege using message = 'Owner required'; end if;
  delete from spots_accounts_private.organizer_invites i where i.organizer_id = p_organizer_id and i.used_at is null and i.expires_at <= now();
  if (select count(*) from spots_accounts_private.organizer_invites i where i.organizer_id = p_organizer_id and i.used_at is null) >= 5 then
    raise exception 'Invite limit reached';
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into spots_accounts_private.organizer_invites(code, organizer_id, created_by) values (v_code, p_organizer_id, auth.uid())
    returning organizer_invites.expires_at into v_expires;
  return query select v_code, v_expires;
end $$;

-- Offene Codes (nur Besitzer).
create function public.spots_organizer_invites(p_organizer_id uuid) returns table(code text, created_at timestamptz, expires_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not spots_accounts_private.is_owner(p_organizer_id) then raise insufficient_privilege using message = 'Owner required'; end if;
  return query select i.code, i.created_at, i.expires_at from spots_accounts_private.organizer_invites i
    where i.organizer_id = p_organizer_id and i.used_at is null and i.expires_at > now() order by i.created_at desc;
end $$;

create function public.spots_organizer_revoke_invite(p_code text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_organizer uuid;
begin
  select i.organizer_id into v_organizer from spots_accounts_private.organizer_invites i where i.code = upper(btrim(p_code)) and i.used_at is null;
  if v_organizer is null or not spots_accounts_private.is_owner(v_organizer) then raise insufficient_privilege using message = 'Owner required'; end if;
  delete from spots_accounts_private.organizer_invites i where i.code = upper(btrim(p_code)) and i.used_at is null;
  return true;
end $$;

-- Code einlösen: nur Veranstalter-Konten. Liefert den Veranstalter oder null bei ungültigem/abgelaufenem Code
-- (kein Fehler, damit der Fehlversuch gespeichert bleibt). Nach 10 Fehlversuchen pro Stunde ist Pause.
create function public.spots_organizer_redeem_invite(p_code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare caller uuid := auth.uid(); v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Fa-f]', '', 'g')); v_organizer uuid;
begin
  if caller is null then raise insufficient_privilege using message = 'Sign in required'; end if;
  if not exists(select 1 from public.user_profiles where id = caller and account_type = 'organizer') then
    raise insufficient_privilege using message = 'Organizer account required';
  end if;
  if (select count(*) from spots_accounts_private.invite_attempts a where a.user_id = caller and a.attempted_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many attempts';
  end if;
  select i.organizer_id into v_organizer from spots_accounts_private.organizer_invites i
    where i.code = v_code and i.used_at is null and i.expires_at > now() for update;
  if v_organizer is null then
    insert into spots_accounts_private.invite_attempts(user_id) values (caller);
    return null;
  end if;
  insert into public.organizer_memberships(organizer_id, user_id, role) values (v_organizer, caller, 'editor')
    on conflict (organizer_id, user_id) do nothing;
  update spots_accounts_private.organizer_invites set used_by = caller, used_at = now() where code = v_code;
  delete from spots_accounts_private.invite_attempts a where a.user_id = caller;
  return v_organizer;
end $$;

-- Mitgliederliste mit E-Mail: nur für den Besitzer (er hat die Personen selbst eingeladen).
create function public.spots_organizer_members(p_organizer_id uuid)
returns table(user_id uuid, email text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not spots_accounts_private.is_owner(p_organizer_id) then raise insufficient_privilege using message = 'Owner required'; end if;
  return query select m.user_id, u.email::text, m.role, m.created_at
    from public.organizer_memberships m join auth.users u on u.id = m.user_id
    where m.organizer_id = p_organizer_id order by (m.role = 'owner') desc, m.created_at;
end $$;

revoke all on function public.spots_organizer_create_invite(uuid), public.spots_organizer_invites(uuid),
  public.spots_organizer_revoke_invite(text), public.spots_organizer_redeem_invite(text),
  public.spots_organizer_members(uuid) from public, anon, authenticated;
grant execute on function public.spots_organizer_create_invite(uuid), public.spots_organizer_invites(uuid),
  public.spots_organizer_revoke_invite(text), public.spots_organizer_redeem_invite(text),
  public.spots_organizer_members(uuid) to authenticated;
commit;
