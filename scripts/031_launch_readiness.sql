-- ============================================================================
-- 031_launch_readiness.sql
-- Benachrichtigungen, Talent-Pool-Einwilligung, Google for Jobs,
-- Entscheidungsprotokoll. Additiv & idempotent.
--
-- Erläuterung: 031_launch_readiness.md
-- Voraussetzungen: 003, 012, 013 (job_candidates.source), 015. Die Spalten
-- aus 020, die der Protokoll-Trigger liest, legt die Migration selbst an.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Benachrichtigungen über neue Bewerbungen (lib/notifications)
--    Der Spaltenschutz aus 028 betrifft nur Plan und Abrechnung, diese
--    Spalten darf das Konto selbst ändern (Einstellungen).
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists notify_applications_instant boolean not null default true,
  add column if not exists notify_applications_daily   boolean not null default false;


-- ---------------------------------------------------------------------------
-- 2) Talent-Pool nur mit Einwilligung
--    Bestehende Kandidaten haben keine erfasste Einwilligung und erscheinen
--    deshalb nicht mehr in den Vorschlägen für neue Stellen. Der Zeitpunkt
--    ist der Nachweis.
-- ---------------------------------------------------------------------------
alter table public.candidates
  add column if not exists talent_pool_consent    boolean not null default false,
  add column if not exists talent_pool_consent_at timestamptz;

create index if not exists candidates_talent_pool_idx
  on public.candidates (user_id)
  where talent_pool_consent;


-- ---------------------------------------------------------------------------
-- 3) Stellenseite liefert das Veröffentlichungsdatum mit (Google for Jobs)
--    Wie in 012, ergänzt um created_at und updated_at. Nur öffentliche Felder
--    der einen gefundenen Stelle.
-- ---------------------------------------------------------------------------
create or replace function public.public_job_by_slug(p_customer_slug text, p_job_slug text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'id',                j.id,
    'title',             j.title,
    'company',           j.company,
    'location',          j.location,
    'employment_type',   j.employment_type,
    'description',       j.description,
    'required_skills',   j.required_skills,
    'years_experience',  j.years_experience,
    'is_active',         j.is_active,
    'logo_url',          p.logo_url,
    'created_at',        j.created_at,
    'updated_at',        j.updated_at
  )
  from public.jobs j
  join public.user_profiles p on p.id = j.user_id
  where p.slug = p_customer_slug
    and j.public_slug = p_job_slug
  limit 1;
$$;

grant execute on function public.public_job_by_slug(text, text) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4) Entscheidungsprotokoll (KI-Verordnung Art. 12, 14, 26)
--
--    Wer hat wann was entschieden: Statuswechsel, bewertete Gespräche,
--    abgeschlossene Stellen, Bestätigung der menschlichen Prüfung, Absagen.
--    Keine Namen oder Kontaktdaten: Wird ein Kandidat gelöscht (Löschfrist,
--    Löschantrag), bleibt der Eintrag ohne Personenbezug stehen.
--
--    Für Nutzer nur lesen und anhängen. Ändern oder löschen kann ein Konto
--    seine Einträge nicht, sonst wäre es kein Protokoll.
-- ---------------------------------------------------------------------------
create table if not exists public.decision_events (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  actor_id         uuid,
  job_id           uuid references public.jobs (id) on delete set null,
  job_candidate_id uuid references public.job_candidates (id) on delete set null,
  event            text not null,
  detail           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

comment on table public.decision_events is
  'Entscheidungsprotokoll: wer wann was entschieden hat (KI-Verordnung). Ohne Personendaten. actor_id NULL = System.';

create index if not exists decision_events_job_idx  on public.decision_events (job_id, created_at);
create index if not exists decision_events_user_idx on public.decision_events (user_id, created_at);

alter table public.decision_events enable row level security;

-- Rechte ausdrücklich statt über die Supabase-Standardrechte: Konten lesen
-- und hängen an, ändern und löschen nie. Anonyme Zugriffe gar nicht.
revoke all on public.decision_events from anon, authenticated;
grant select, insert on public.decision_events to authenticated;
grant all on public.decision_events to service_role;

drop policy if exists "decision_events_select_own" on public.decision_events;
create policy "decision_events_select_own" on public.decision_events
  for select using (user_id = auth.uid());

drop policy if exists "decision_events_insert_own" on public.decision_events;
create policy "decision_events_insert_own" on public.decision_events
  for insert with check (user_id = auth.uid() and (actor_id is null or actor_id = auth.uid()));

-- Spalten, die der Trigger liest, exakt wie in 020 (No-op, wenn vorhanden).
alter table public.job_candidates
  add column if not exists interview_score numeric,
  add column if not exists interview_completed_at timestamptz;

-- Jeder Statuswechsel und jedes abgeschlossene Gespräch landet im Protokoll,
-- egal über welchen Weg (Oberfläche, API, Abschluss der Stelle). Ein Fehler
-- beim Protokollieren darf die Änderung selbst nie verhindern.
create or replace function public.log_job_candidate_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    return new;
  end if;
  begin
    if new.status is distinct from old.status then
      insert into public.decision_events (user_id, actor_id, job_id, job_candidate_id, event, detail)
      values (new.user_id, auth.uid(), new.job_id, new.id, 'status_geaendert',
              jsonb_build_object('von', old.status, 'nach', new.status, 'match', new.match_score));
    end if;
    if new.interview_completed_at is not null
       and new.interview_completed_at is distinct from old.interview_completed_at then
      insert into public.decision_events (user_id, actor_id, job_id, job_candidate_id, event, detail)
      values (new.user_id, auth.uid(), new.job_id, new.id, 'gespraech_bewertet',
              jsonb_build_object('gespraech', new.interview_score, 'match', new.match_score));
    end if;
  exception when others then
    raise warning 'decision_events: Protokoll übersprungen (%)', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists z_log_job_candidate_decision on public.job_candidates;
create trigger z_log_job_candidate_decision
  after update on public.job_candidates
  for each row execute function public.log_job_candidate_decision();
