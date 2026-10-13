-- ============================================================================
-- 035_team.sql
-- Teamzugänge: mehrere Personen arbeiten in einem Konto. Additiv & idempotent.
--
-- Erläuterung: 035_team.md
-- Voraussetzungen: 015 (RLS), 028 (Kontingent-Funktionen), 031 (Protokoll),
-- 033 (Freigabe-Links).
--
-- Modell: Das zahlende Konto ist der Arbeitsbereich. Alle Daten gehören wie
-- bisher ihm (user_id = Inhaber). Mitglieder stehen in workspace_members und
-- sehen über current_workspace() dieselben Zeilen. Bestehende Konten ändern
-- sich nicht: Wer kein Mitglied ist, ist sein eigener Arbeitsbereich.
--
-- Plätze (inklusive Inhaber): Free 1, Starter 2, Growth 5, Pro und Enterprise
-- unbegrenzt. Starter und Growth können Zusatzplätze buchen (extra_seats,
-- gesetzt vom Stripe-Webhook). Sinkt das Limit, werden die zuletzt
-- beigetretenen Mitglieder gesperrt statt gelöscht und beim nächsten freien
-- Platz in Beitrittsreihenfolge wieder freigeschaltet.
--
-- Kalender, Buchungsseiten und Termine bleiben pro Person (025 unverändert).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Mitglieder und Einladungen
--    Eine Person ist höchstens in einem fremden Arbeitsbereich Mitglied.
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_members (
  member_id  uuid primary key references auth.users (id) on delete cascade,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  active     boolean not null default true,
  joined_at  timestamptz not null default now(),
  constraint workspace_members_not_self check (owner_id <> member_id)
);

comment on table public.workspace_members is
  'Teammitglieder. active = false heißt: über dem Platzlimit gesperrt.';
comment on column public.workspace_members.active is
  'Wird von enforce_seat_limit gesetzt, nie von Hand.';

create index if not exists workspace_members_owner_idx
  on public.workspace_members (owner_id, joined_at);

create table if not exists public.workspace_invites (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  email       text not null,
  token_hash  text not null unique,
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  constraint workspace_invites_email_lower check (email = lower(btrim(email))),
  constraint workspace_invites_email_len check (char_length(email) between 3 and 320)
);

comment on table public.workspace_invites is
  'Offene und angenommene Einladungen. Nur der SHA-256-Abdruck des Links wird gespeichert.';

-- Pro Arbeitsbereich und Adresse höchstens eine offene Einladung.
create unique index if not exists workspace_invites_open_uniq
  on public.workspace_invites (owner_id, email) where accepted_at is null;

alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

-- Gelesen und geschrieben wird nur über die App mit service_role.
revoke all on public.workspace_members from anon, authenticated;
revoke all on public.workspace_invites from anon, authenticated;
grant all on public.workspace_members to service_role;
grant all on public.workspace_invites to service_role;


-- ---------------------------------------------------------------------------
-- 2) Zusatzplätze am Profil des Inhabers
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists extra_seats integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_extra_seats_nonneg') then
    alter table public.user_profiles
      add constraint user_profiles_extra_seats_nonneg check (extra_seats >= 0);
  end if;
end $$;

-- Wie 028, zusätzlich extra_seats: nur der Webhook setzt die Zusatzplätze.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.plan                   is distinct from old.plan
       or new.matches_used          is distinct from old.matches_used
       or new.matches_limit         is distinct from old.matches_limit
       or new.matches_period_start  is distinct from old.matches_period_start
       or new.matches_lifetime      is distinct from old.matches_lifetime
       or new.active_jobs_limit     is distinct from old.active_jobs_limit
       or new.trial_eligible        is distinct from old.trial_eligible
       or new.jobs_created_lifetime is distinct from old.jobs_created_lifetime
       or new.stripe_customer_id    is distinct from old.stripe_customer_id
       or new.stripe_subscription_id is distinct from old.stripe_subscription_id
       or new.extra_seats           is distinct from old.extra_seats
    then
      raise exception 'protected_profile_columns'
        using errcode = '42501',
              hint = 'Plan, Kontingent und Abrechnung ändern sich nur serverseitig.';
    end if;
  end if;
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3) Wessen Daten sieht die angemeldete Person?
--    current_workspace(): der Inhaber, wenn die Person aktives Mitglied ist,
--    sonst sie selbst. In Policies als (select ...), damit Postgres den Wert
--    einmal pro Abfrage berechnet und den Index auf user_id nutzen kann.
-- ---------------------------------------------------------------------------
create or replace function public.current_workspace()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select owner_id from public.workspace_members where member_id = auth.uid() and active),
    auth.uid()
  );
$$;

-- Für die Oberfläche: Rolle, Inhaber und ob der Platz gesperrt ist.
create or replace function public.my_workspace()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when m.member_id is null then json_build_object('owner_id', auth.uid(), 'role', 'owner', 'active', true)
    else json_build_object('owner_id', m.owner_id, 'role', 'member', 'active', m.active)
  end
  from (select 1) one
  left join public.workspace_members m on m.member_id = auth.uid();
$$;


-- ---------------------------------------------------------------------------
-- 4) Plätze pro Plan. Muss zu PLANS[...].seats in lib/plans.ts passen,
--    tests/team.test.ts prüft das. null heißt unbegrenzt.
-- ---------------------------------------------------------------------------
create or replace function public.plan_seat_limit(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'free'    then 1
    when 'starter' then 2
    when 'growth'  then 5
    else null
  end;
$$;

-- Zusatzplätze zählen nur bei Starter und Growth.
create or replace function public.workspace_seat_limit(p_owner uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.plan_seat_limit(p.plan) is null then null
    when p.plan in ('starter', 'growth') then public.plan_seat_limit(p.plan) + coalesce(p.extra_seats, 0)
    else public.plan_seat_limit(p.plan)
  end
  from public.user_profiles p
  where p.id = p_owner;
$$;

-- Sperrt Mitglieder über dem Limit (zuletzt beigetreten zuerst) und gibt
-- frei, sobald wieder Platz ist (zuerst beigetreten zuerst).
create or replace function public.enforce_seat_limit(p_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := public.workspace_seat_limit(p_owner);
begin
  if v_limit is null then
    update public.workspace_members set active = true
     where owner_id = p_owner and not active;
    return;
  end if;

  with ranked as (
    select member_id, row_number() over (order by joined_at, member_id) as rn
      from public.workspace_members
     where owner_id = p_owner
  )
  update public.workspace_members m
     set active = (r.rn <= v_limit - 1)
    from ranked r
   where m.member_id = r.member_id
     and m.active is distinct from (r.rn <= v_limit - 1);
end;
$$;

create or replace function public.enforce_seat_limit_on_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan is distinct from old.plan or new.extra_seats is distinct from old.extra_seats then
    perform public.enforce_seat_limit(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists z_enforce_seat_limit on public.user_profiles;
create trigger z_enforce_seat_limit
  after update on public.user_profiles
  for each row execute function public.enforce_seat_limit_on_profile();

create or replace function public.enforce_seat_limit_on_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enforce_seat_limit(coalesce(new.owner_id, old.owner_id));
  return null;
end;
$$;

drop trigger if exists enforce_seat_limit_members on public.workspace_members;
create trigger enforce_seat_limit_members
  after insert or delete on public.workspace_members
  for each row execute function public.enforce_seat_limit_on_members();


-- ---------------------------------------------------------------------------
-- 5) Zugriffsregeln: user_id = auth.uid() wird zu user_id = Arbeitsbereich.
--    Für den Inhaber ändert sich nichts, current_workspace() ist er selbst.
--    Die öffentliche Leseregel für Stellenseiten (012) bleibt unberührt.
-- ---------------------------------------------------------------------------
-- jobs
drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert with check (user_id = (select public.current_workspace()));
drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
  for update using (user_id = (select public.current_workspace())) with check (user_id = (select public.current_workspace()));
drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own" on public.jobs
  for delete using (user_id = (select public.current_workspace()));

-- candidates
drop policy if exists "candidates_select_own" on public.candidates;
create policy "candidates_select_own" on public.candidates
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "candidates_insert_own" on public.candidates;
create policy "candidates_insert_own" on public.candidates
  for insert with check (user_id = (select public.current_workspace()));
drop policy if exists "candidates_update_own" on public.candidates;
create policy "candidates_update_own" on public.candidates
  for update using (user_id = (select public.current_workspace())) with check (user_id = (select public.current_workspace()));
drop policy if exists "candidates_delete_own" on public.candidates;
create policy "candidates_delete_own" on public.candidates
  for delete using (user_id = (select public.current_workspace()));

-- job_candidates
drop policy if exists "job_candidates_select_own" on public.job_candidates;
create policy "job_candidates_select_own" on public.job_candidates
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "job_candidates_insert_own" on public.job_candidates;
create policy "job_candidates_insert_own" on public.job_candidates
  for insert with check (user_id = (select public.current_workspace()));
drop policy if exists "job_candidates_update_own" on public.job_candidates;
create policy "job_candidates_update_own" on public.job_candidates
  for update using (user_id = (select public.current_workspace())) with check (user_id = (select public.current_workspace()));
drop policy if exists "job_candidates_delete_own" on public.job_candidates;
create policy "job_candidates_delete_own" on public.job_candidates
  for delete using (user_id = (select public.current_workspace()));

-- inbound_emails (Policies aus 007, ohne Anführungszeichen angelegt)
drop policy if exists "inbound_emails_select_own" on public.inbound_emails;
create policy "inbound_emails_select_own" on public.inbound_emails
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "inbound_emails_update_own" on public.inbound_emails;
create policy "inbound_emails_update_own" on public.inbound_emails
  for update using (user_id = (select public.current_workspace()));

-- decision_events: lesen im Arbeitsbereich, anhängen nur als man selbst
drop policy if exists "decision_events_select_own" on public.decision_events;
create policy "decision_events_select_own" on public.decision_events
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "decision_events_insert_own" on public.decision_events;
create policy "decision_events_insert_own" on public.decision_events
  for insert with check (user_id = (select public.current_workspace()) and (actor_id is null or actor_id = auth.uid()));

-- Freigabe-Links
drop policy if exists "review_links_select_own" on public.review_links;
create policy "review_links_select_own" on public.review_links
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "review_link_items_select_own" on public.review_link_items;
create policy "review_link_items_select_own" on public.review_link_items
  for select using (user_id = (select public.current_workspace()));

-- user_profiles: eigenes Profil wie bisher (015), dazu Lesezugriff auf das
-- Profil des Inhabers (Plan, Kontingent, Firmenname, Logo).
drop policy if exists "user_profiles_select_workspace" on public.user_profiles;
create policy "user_profiles_select_workspace" on public.user_profiles
  for select using (id = (select public.current_workspace()));


-- ---------------------------------------------------------------------------
-- 6) Kontingent-Funktionen aus 028: Mitglieder dürfen das Kontingent ihres
--    Arbeitsbereichs lesen und verbrauchen. Sonst wortgleich zu 028.
-- ---------------------------------------------------------------------------
create or replace function public.consume_match(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used     integer;
  v_limit    integer;
  v_period   date;
  v_plan     text;
  v_lifetime integer;
  v_current  date := date_trunc('month', (now() at time zone 'Europe/Berlin'))::date;
begin
  if auth.uid() is not null and p_user <> public.current_workspace() then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  select matches_used, matches_limit, coalesce(matches_period_start, v_current),
         plan, coalesce(matches_lifetime, 0)
    into v_used, v_limit, v_period, v_plan, v_lifetime
    from public.user_profiles
   where id = p_user
   for update;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_profile');
  end if;

  -- Probestelle: Gesamtzähler, nie zurückgesetzt. v_limit ist 25 oder 0,
  -- gesetzt vom Plan-Trigger je nach Anspruch.
  if v_plan = 'free' then
    if v_lifetime >= v_limit then
      update public.user_profiles
         set matches_used = least(v_lifetime, v_limit)
       where id = p_user;
      return jsonb_build_object('allowed', false, 'reason', 'limit_reached',
                                'used', least(v_lifetime, v_limit), 'limit', v_limit,
                                'remaining', 0, 'quota_period', 'lifetime');
    end if;

    update public.user_profiles
       set matches_lifetime = v_lifetime + 1,
           matches_used     = v_lifetime + 1
     where id = p_user;

    return jsonb_build_object('allowed', true, 'used', v_lifetime + 1, 'limit', v_limit,
                              'remaining', v_limit - v_lifetime - 1,
                              'quota_period', 'lifetime');
  end if;

  -- Bezahlte Pläne: fauler Monatsreset wie bisher.
  if v_period < v_current then
    v_used := 0;
    v_period := v_current;
  end if;

  if v_used >= v_limit then
    update public.user_profiles
       set matches_used = v_used, matches_period_start = v_period
     where id = p_user;
    return jsonb_build_object('allowed', false, 'reason', 'limit_reached',
                              'used', v_used, 'limit', v_limit, 'remaining', 0,
                              'quota_period', 'monthly');
  end if;

  update public.user_profiles
     set matches_used         = v_used + 1,
         matches_period_start = v_period,
         matches_lifetime     = v_lifetime + 1
   where id = p_user;

  return jsonb_build_object('allowed', true, 'used', v_used + 1, 'limit', v_limit,
                            'remaining', v_limit - v_used - 1, 'quota_period', 'monthly');
end;
$$;

create or replace function public.match_usage(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer; v_limit integer; v_jobs integer; v_period date; v_plan text;
  v_lifetime integer; v_eligible boolean;
  v_current date := date_trunc('month', (now() at time zone 'Europe/Berlin'))::date;
begin
  if auth.uid() is not null and p_user <> public.current_workspace() then
    return null;
  end if;

  select matches_used, matches_limit, active_jobs_limit,
         coalesce(matches_period_start, v_current), plan,
         coalesce(matches_lifetime, 0), trial_eligible
    into v_used, v_limit, v_jobs, v_period, v_plan, v_lifetime, v_eligible
    from public.user_profiles where id = p_user;

  if not found then return null; end if;

  if v_plan = 'free' then
    v_used := least(v_lifetime, v_limit);
  elsif v_period < v_current then
    v_used := 0;
  end if;

  return jsonb_build_object(
    'used', v_used, 'limit', v_limit, 'remaining', greatest(v_limit - v_used, 0),
    'active_jobs_limit', v_jobs, 'plan', v_plan,
    'quota_period', case when v_plan = 'free' then 'lifetime' else 'monthly' end,
    'trial_eligible', v_eligible
  );
end;
$$;

create or replace function public.job_quota(p_user uuid, p_creating boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text; v_limit integer; v_created integer; v_active integer; v_used integer;
begin
  if auth.uid() is not null and p_user <> public.current_workspace() then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  select plan, active_jobs_limit, coalesce(jobs_created_lifetime, 0)
    into v_plan, v_limit, v_created
    from public.user_profiles where id = p_user;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_profile');
  end if;

  select count(*) into v_active
    from public.jobs where user_id = p_user and is_active = true;

  v_used := case when v_plan = 'free' and p_creating then v_created else v_active end;

  return jsonb_build_object(
    'allowed', v_used < v_limit,
    'reason', case when v_used < v_limit then null else 'job_limit_reached' end,
    'used', v_used, 'limit', v_limit, 'plan', v_plan,
    'quota_period', case when v_plan = 'free' and p_creating then 'lifetime' else 'monthly' end
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- 7) Rechte
-- ---------------------------------------------------------------------------
grant execute on function public.current_workspace()          to authenticated, service_role;
grant execute on function public.my_workspace()               to authenticated, service_role;
grant execute on function public.plan_seat_limit(text)        to authenticated, service_role;
grant execute on function public.workspace_seat_limit(uuid)   to service_role;
grant execute on function public.enforce_seat_limit(uuid)     to service_role;
revoke execute on function public.workspace_seat_limit(uuid)  from anon, authenticated, public;
revoke execute on function public.enforce_seat_limit(uuid)    from anon, authenticated, public;
grant execute on function public.consume_match(uuid)          to authenticated, service_role;
grant execute on function public.match_usage(uuid)            to authenticated, service_role;
grant execute on function public.job_quota(uuid, boolean)     to authenticated, service_role;

