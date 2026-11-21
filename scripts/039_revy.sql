-- ============================================================================
-- 039_revy.sql
-- Revy, Etappe 1: Datenschicht, Protokoll, Kontingent, Cache. Additiv &
-- idempotent.
--
-- Erläuterung: 039_revy.md und docs/revy/PLAN.md
-- Voraussetzungen: 035 (current_workspace) und 036 (job_visible,
-- candidate_visible).
--
-- Grundsatz: Revy liest AUSSCHLIESSLICH aus dem Schema `revy`. Die Sichten
-- dort enthalten die gesperrten Merkmale nicht: kein Name, kein Foto, keine
-- Kontaktdaten, keine Adresse unter Stadtebene, keine Freitexte, die Alter,
-- Geschlecht, Herkunft, Familienstand, Religion, Gesundheit oder Behinderung
-- tragen können. Eine Spalte, die es nicht gibt, kann auch kein Prompt
-- herausholen.
--
-- Alle Sichten sind security_invoker: Es greift die RLS der Grundtabellen mit
-- der Sitzung des angemeldeten Nutzers, also Mandant und Sichtbarkeit im Team.
-- Revy liest nie mit der Service-Rolle.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Pseudonyme Kennung pro Kandidat
-- ---------------------------------------------------------------------------
alter table public.candidates
  add column if not exists revy_ref text;

update public.candidates
   set revy_ref = 'K-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))
 where revy_ref is null;

alter table public.candidates
  alter column revy_ref set default ('K-' || upper(substr(md5(gen_random_uuid()::text), 1, 8)));
alter table public.candidates
  alter column revy_ref set not null;

create unique index if not exists candidates_revy_ref_key on public.candidates (revy_ref);

comment on column public.candidates.revy_ref is
  'Pseudonyme Kennung für Revy. Stabil, nie geändert. Die Auflösung zum Namen passiert nur im Frontend über die normale RLS.';

-- ---------------------------------------------------------------------------
-- 2) Seitenweiser Text der Unterlagen, für Belegstellen mit Seitenzahl
--    Befüllt vom Server (Service-Rolle) aus dem privaten Storage. Lesbar nur
--    im eigenen Mandanten und nur für sichtbare Kandidaten (wie der
--    Lebenslauf selbst). Revy liest die Tabelle nie direkt, sondern bekommt
--    nur geschwärzte Ausschnitte über revy.belege().
-- ---------------------------------------------------------------------------
create table if not exists public.candidate_document_pages (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  candidate_id  uuid not null references public.candidates (id) on delete cascade,
  dokument      text not null check (dokument in ('lebenslauf', 'anschreiben')),
  seite         integer not null check (seite >= 1),
  text          text not null,
  created_at    timestamptz not null default now(),
  unique (candidate_id, dokument, seite)
);

alter table public.candidate_document_pages enable row level security;
revoke all on public.candidate_document_pages from anon, authenticated;
grant select on public.candidate_document_pages to authenticated;
grant all on public.candidate_document_pages to service_role;

drop policy if exists "candidate_document_pages_select_own" on public.candidate_document_pages;
create policy "candidate_document_pages_select_own" on public.candidate_document_pages
  for select using (user_id = (select public.current_workspace()) and public.candidate_visible(candidate_id));

-- ---------------------------------------------------------------------------
-- 3) Schema revy und Hilfsfunktionen für die Bereinigung
-- ---------------------------------------------------------------------------
create schema if not exists revy;
revoke all on schema revy from public, anon;
grant usage on schema revy to authenticated, service_role;

-- Muster für gesperrte Merkmale in Freitext (Deutsch und Englisch). Ein Satz,
-- der eines davon enthält, wird aus Freitext ganz entfernt.
create or replace function revy.blocked_pattern()
returns text
language sql
immutable
as $$
  select '(\malter\M|jahre alt|\mgeb\.|\mgeboren|geburt|jahrgang|\mage\M|\mborn\M|years old|'
      || 'verheiratet|\mledig|geschieden|verwitwet|partnerschaft|\mmarried|\msingle\M|divorced|'
      || '\mkind\M|\mkinder|\msohn|tochter|\mmutter|\mvater\M|elternzeit|karenz|mutterschutz|'
      || 'schwanger|pregnan|maternity|paternity|parental|'
      || 'religion|konfession|katholisch|evangelisch|protestant|muslim|islam|jüdisch|jewish|christ|kirche|church|moschee|mosque|'
      || 'staatsangehörig|staatsbürger|nationalität|nationality|citizenship|herkunft|abstammung|migration|ethni|'
      || 'behinder|\mgdb\M|disab|handicap|'
      || '\mkrank|erkrank|gesundheit|\mhealth|therapie|diagnose|\mreha\M|burn-?out|illness|'
      || 'geschlecht|gender|weiblich|männlich|\mfemale|\mmale\M|divers\M|'
      || 'sexuell|orientierung|\mgay\M|lesbi|transgender)'
$$;

-- Freitext: Sätze mit gesperrten Merkmalen fallen ganz weg.
create or replace function revy.scrub(p text)
returns text
language plpgsql
immutable
as $$
declare
  satz text;
  ergebnis text := '';
begin
  if p is null then return null; end if;
  foreach satz in array regexp_split_to_array(p, '(?<=[.!?;\n])\s+') loop
    if satz !~* revy.blocked_pattern() then
      ergebnis := ergebnis || case when ergebnis = '' then '' else ' ' end || satz;
    end if;
  end loop;
  return nullif(btrim(ergebnis), '');
end;
$$;

-- Kontaktdaten und genaue Datumsangaben entfernen (ein Datum mit Tag kann ein
-- Geburtsdatum sein; Monat und Jahr von Stationen bleiben).
create or replace function revy.scrub_contact(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(coalesce(p, ''),
           '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[E-Mail]', 'g'),
           '(https?://|www\.)[^[:space:]]+', '[Link]', 'g'),
           '((\+|\m00)[0-9][0-9 ()/.-]{6,}[0-9]|\m0[0-9]{2,4}[ /-]?[0-9]{4,}[0-9 ]*)', '[Nummer]', 'g'),
           '\m[0-9]{1,2}\.[ ]?[0-9]{1,2}\.[ ]?[0-9]{2,4}\M', '[Datum]', 'g'),
           '[[:alpha:]ÄÖÜäöüß.-]+(straße|strasse|str\.|gasse|weg|platz|allee|ring|damm|ufer)[ ]*[0-9]+[a-z]?', '[Adresse]', 'gi'),
           -- Postleitzahl vor einem Ortsnamen (vier oder fünf Ziffern, keine Jahreszahl)
           '\m([0-9]{5}|(?!19|20)[0-9]{4})[ ]+(?=[[:upper:]])', '', 'g')
$$;

-- Gegenderte Berufsbezeichnungen neutralisieren (Floristin, Projektleiterin,
-- Kauffrau …). Deckt die häufigen Endungen ab, keine vollständige Garantie.
create or replace function revy.neutral(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(coalesce(p, ''),
           '\mÄrztin(nen)?\M', 'Arzt', 'g'),
           '\m([[:alpha:]äöüß]+?)(er|ist|ant|ent|eur|or|ar|og|at|är|on)in(nen)?\M', '\1\2', 'g'),
           '([[:alpha:]äöüß]*?)ärztin(nen)?\M', '\1arzt', 'g'),
           '\m([[:alpha:]äöüß]+?)(frau|mann)\M', '\1mann/-frau', 'g'),
           '\m(Frau|Herr|Mrs?\.?|Ms\.?)\M[ ]*', '', 'g')
$$;

-- Ort nur auf Stadt- bzw. Regionsebene: Teile mit Hausnummer, Postleitzahl
-- oder Straßenwort fallen weg, der erste verbleibende Teil zählt.
create or replace function revy.city_only(p text)
returns text
language sql
immutable
as $$
  select nullif(btrim((
    select t from (
      select btrim(regexp_replace(part, '\m[0-9]{4,5}\M', '', 'g')) as t, ord
        from unnest(string_to_array(coalesce(p, ''), ',')) with ordinality as u(part, ord)
    ) s
    where t <> '' and t !~ '[0-9]' and t !~* '(straße|strasse|str\.|gasse|weg\M|platz|allee)'
    order by ord
    limit 1
  )), '')
$$;

-- Dossier ohne Freitext mit Personenbezug: Stationen ohne Arbeitgeber,
-- Sprachniveau ohne Unterscheidung Muttersprache (sonst ein Hinweis auf
-- Herkunft), Erfolge und Führung bereinigt. summary, gaps und redFlags fehlen.
create or replace function revy.dossier_public(d jsonb)
returns jsonb
language sql
immutable
as $$
  select case when d is null then null else jsonb_build_object(
    'gesamtjahre', d -> 'totalYearsExperience',
    'verlauf', d -> 'trajectory',
    'stationen', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rolle', revy.neutral(s ->> 'role'),
        'branche', s ->> 'industry',
        'von', s ->> 'from',
        'bis', s ->> 'to',
        'stufe', s ->> 'seniority',
        'erfolge', coalesce((
          select jsonb_agg(revy.neutral(revy.scrub(revy.scrub_contact(a))))
            from jsonb_array_elements_text(coalesce(s -> 'achievements', '[]'::jsonb)) a
           where revy.scrub(a) is not null
        ), '[]'::jsonb)
      ))
      from jsonb_array_elements(coalesce(d -> 'stations', '[]'::jsonb)) s
    ), '[]'::jsonb),
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object(
        'skill', k ->> 'skill',
        'tiefe', k ->> 'depth',
        'beleg', revy.neutral(revy.scrub(revy.scrub_contact(k ->> 'evidence')))
      ))
      from jsonb_array_elements(coalesce(d -> 'skills', '[]'::jsonb)) k
    ), '[]'::jsonb),
    'sprachen', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sprache', l ->> 'language',
        'niveau', case when l ->> 'level' in ('muttersprache', 'verhandlungssicher')
                       then 'verhandlungssicher_oder_muttersprache' else l ->> 'level' end
      ))
      from jsonb_array_elements(coalesce(d -> 'languages', '[]'::jsonb)) l
    ), '[]'::jsonb),
    'abschluesse', coalesce((
      select jsonb_agg(revy.neutral(regexp_replace(e, '\m(19|20)[0-9]{2}\M', '', 'g')))
        from jsonb_array_elements_text(coalesce(d -> 'education', '[]'::jsonb)) e
    ), '[]'::jsonb),
    'zertifikate', coalesce(d -> 'certifications', '[]'::jsonb),
    'branchen', coalesce(d -> 'industries', '[]'::jsonb),
    'fuehrung', revy.neutral(revy.scrub(revy.scrub_contact(d ->> 'leadership')))
  ) end
$$;

-- Konfidenz je Kategorie aus dem Matching (hoch, mittel, niedrig), ohne die
-- freien Begründungen des Modells (sie können gegenderte Wörter enthalten).
create or replace function revy.match_public(m jsonb)
returns jsonb
language sql
immutable
as $$
  select case when m is null or m -> 'categories' is null then null else (
    select jsonb_object_agg(key, jsonb_build_object(
      'konfidenz', value ->> 'konfidenz',
      'belege', coalesce((
        select jsonb_agg(revy.neutral(revy.scrub(revy.scrub_contact(b))))
          from jsonb_array_elements_text(coalesce(value -> 'belege', '[]'::jsonb)) b
         where revy.scrub(b) is not null
      ), '[]'::jsonb)
    ))
    from jsonb_each(m -> 'categories')
  ) end
$$;

-- ---------------------------------------------------------------------------
-- 4) Sichten für Revy (security_invoker: RLS der Grundtabellen greift)
-- ---------------------------------------------------------------------------
drop view if exists revy.applications;
drop view if exists revy.candidates;
drop view if exists revy.jobs;

create view revy.candidates with (security_invoker = true) as
select
  c.id                                     as candidate_id,
  c.revy_ref                               as ref,
  revy.city_only(c.location)               as ort,
  revy.neutral(c.job_title)                as position,
  c.years_of_experience                    as berufsjahre,
  c.experience_level                       as stufe,
  coalesce(c.skills, '{}')                 as skills,
  revy.neutral(regexp_replace(coalesce(c.education, ''), '\m(19|20)[0-9]{2}\M', '', 'g')) as ausbildung,
  revy.dossier_public(c.dossier)           as dossier,
  coalesce(c.talent_pool_consent, false)   as talent_pool,
  c.created_at::date                       as eingang
from public.candidates c;

create view revy.jobs with (security_invoker = true) as
select
  j.id                                     as stelle_id,
  j.title                                  as titel,
  j.location                               as ort,
  j.employment_type                        as anstellung,
  coalesce(j.required_skills, '{}')        as muss_skills,
  coalesce(j.nice_to_have_skills, '{}')    as kann_skills,
  j.years_experience                       as erfahrung,
  j.education                              as ausbildung,
  coalesce(j.languages, '{}')              as sprachen,
  coalesce(j.ko_criteria, '{}')            as ko_kriterien,
  j.description                            as beschreibung,
  j.is_active                              as aktiv,
  j.created_at::date                       as angelegt
from public.jobs j;

create view revy.applications with (security_invoker = true) as
select
  jc.id                                    as bewerbung_id,
  jc.job_id                                as stelle_id,
  jc.candidate_id                          as candidate_id,
  c.revy_ref                               as ref,
  jc.status                                as status,
  jc.match_score                           as score,
  jc.screening_score                       as analyse_score,
  jsonb_build_object(
    'fachlich', jc.hard_skills_score, 'erfahrung', jc.experience_score,
    'ausbildung', jc.education_score, 'soft_skills', jc.soft_skills_score,
    'sprachen', jc.languages_score, 'standort', jc.location_score,
    'branche', jc.industry_score, 'gehalt', jc.salary_score, 'kultur', jc.culture_score
  )                                        as kategorien,
  revy.match_public(jc.match_detail)       as detail,
  coalesce(jc.knockout, false)             as ko,
  jc.source                                as quelle,
  jc.created_at::date                      as eingang,
  jc.updated_at                            as geaendert
from public.job_candidates jc
join public.candidates c on c.id = jc.candidate_id;

revoke all on all tables in schema revy from public, anon;
grant select on revy.candidates, revy.jobs, revy.applications to authenticated;

-- Belegstellen: Ausschnitte rund um die Suchbegriffe, mit Seite. Name,
-- Kontaktdaten, Adressen, Daten mit Tag und Sätze mit gesperrten Merkmalen
-- sind entfernt. security invoker: RLS auf candidates und
-- candidate_document_pages greift.
create or replace function revy.belege(p_ref text, p_begriffe text[])
returns table (dokument text, seite integer, ausschnitt text)
language plpgsql
stable
security invoker
set search_path = public, revy
as $$
declare
  v_id uuid;
  v_name text;
  r record;
  begriff text;
  pos int;
  roh text;
  teil text;
  anzahl int := 0;
  fenster int[];
  start int;
begin
  select c.id, c.full_name into v_id, v_name from public.candidates c where c.revy_ref = p_ref;
  if v_id is null then return; end if;
  for r in
    select p.dokument, p.seite, p.text from public.candidate_document_pages p
     where p.candidate_id = v_id order by p.dokument, p.seite
  loop
    fenster := '{}';
    foreach begriff in array coalesce(p_begriffe, '{}') loop
      continue when length(btrim(begriff)) < 2 or length(begriff) > 60;
      pos := strpos(lower(r.text), lower(btrim(begriff)));
      continue when pos = 0;
      start := greatest(pos - 160, 1);
      -- Liegt der Treffer schon in einem Ausschnitt dieser Seite, keinen zweiten
      continue when exists (select 1 from unnest(fenster) f where pos >= f and pos < f + 360);
      fenster := fenster || start;
      roh := substr(r.text, start, 360);
      -- Namensteile (ab drei Buchstaben) schwärzen
      foreach teil in array regexp_split_to_array(coalesce(v_name, ''), '\s+') loop
        if length(teil) >= 3 then
          roh := regexp_replace(roh, '\m' || regexp_replace(teil, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M', '[Name]', 'gi');
        end if;
      end loop;
      roh := revy.neutral(revy.scrub(revy.scrub_contact(roh)));
      continue when roh is null or roh = '';
      dokument := r.dokument; seite := r.seite; ausschnitt := roh;
      return next;
      anzahl := anzahl + 1;
      exit when anzahl >= 8;
    end loop;
    exit when anzahl >= 8;
  end loop;
end;
$$;

-- Datenstand für den Cache: ändert sich, sobald sich im Sichtbereich etwas
-- ändert (neue Bewerbung, Status, Score, Dossier, Stelle).
create or replace function revy.datenstand(p_stelle uuid default null)
returns text
language sql
stable
security invoker
set search_path = public, revy
as $$
  select md5(
    coalesce((select string_agg(a.bewerbung_id::text || a.status || coalesce(a.score::text, '') || a.geaendert::text, ',' order by a.bewerbung_id)
                from revy.applications a where p_stelle is null or a.stelle_id = p_stelle), '') || '|' ||
    coalesce((select count(*)::text || max(c.created_at)::text || coalesce(max(c.dossier_updated_at)::text, '')
                from public.candidates c), '') || '|' ||
    coalesce((select max(j.updated_at)::text from public.jobs j), '')
  )
$$;

revoke all on all functions in schema revy from public, anon;
grant execute on function revy.belege(text, text[]) to authenticated;
grant execute on function revy.datenstand(uuid) to authenticated;
grant execute on function revy.scrub(text), revy.scrub_contact(text), revy.neutral(text),
  revy.city_only(text), revy.dossier_public(jsonb), revy.match_public(jsonb), revy.blocked_pattern()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Läufe, Protokoll, Sperren, Vorfälle, Kontingent, Cache
--    Geschrieben nur vom Server (Service-Rolle) nach eigener Prüfung.
--    Nutzer lesen ihren Mandanten.
-- ---------------------------------------------------------------------------
create table if not exists public.revy_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  actor_id      uuid,
  session_id    uuid not null,
  scope         jsonb not null default '{}'::jsonb,
  befehl        text,
  status        text not null default 'geplant'
    check (status in ('geplant', 'wartet_auf_kosten', 'fertig', 'gesperrt', 'fehler', 'abgebrochen')),
  plan          jsonb,
  kosten_matches integer not null default 0,
  ergebnis      jsonb,
  modell_plan   text,
  modell_text   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists revy_runs_session_idx on public.revy_runs (user_id, session_id, created_at desc);

create table if not exists public.revy_audit (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  actor_id        uuid,
  run_id          uuid references public.revy_runs (id) on delete set null,
  created_at      timestamptz not null default now(),
  befehl          text,
  plan            jsonb,
  werkzeug        text,
  parameter       jsonb,
  wirkung         text check (wirkung in ('LESEND', 'INTERN', 'NACH_AUSSEN', 'SYSTEM')),
  refs            text[] not null default '{}',
  freigabe_durch  uuid,
  freigabe_am     timestamptz,
  modell          text,
  modell_version  text,
  ergebnis        jsonb
);
create index if not exists revy_audit_user_idx on public.revy_audit (user_id, created_at);
comment on table public.revy_audit is
  'Revy-Protokoll für die KI-Verordnung. Nur anhängen. Kandidaten nur pseudonym (refs).';

create table if not exists public.revy_blocked_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kategorie   text not null,
  created_at  timestamptz not null default now()
);
comment on table public.revy_blocked_requests is
  'Nachweis, dass Anfragen nach gesperrten Merkmalen vorkamen. Nur Kategorie und Zeit, kein Text, keine Person.';

create table if not exists public.revy_incidents (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  run_id      uuid references public.revy_runs (id) on delete set null,
  art         text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
comment on table public.revy_incidents is
  'Sicherheitsvorfälle, etwa Anweisungen in Bewerberunterlagen oder ungeplante Aktionen. Ohne Dokumenttext.';

create table if not exists public.revy_usage (
  user_id   uuid not null references auth.users (id) on delete cascade,
  periode   date not null,
  anfragen  integer not null default 0,
  primary key (user_id, periode)
);

create table if not exists public.revy_cache (
  user_id     uuid not null references auth.users (id) on delete cascade,
  cache_key   text not null,
  antwort     jsonb not null,
  treffer     integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (user_id, cache_key)
);

do $$
declare t text;
begin
  foreach t in array array['revy_runs', 'revy_audit', 'revy_blocked_requests', 'revy_incidents', 'revy_usage', 'revy_cache'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

grant select on public.revy_runs, public.revy_audit, public.revy_blocked_requests, public.revy_incidents to authenticated;

drop policy if exists "revy_runs_select_own" on public.revy_runs;
create policy "revy_runs_select_own" on public.revy_runs
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "revy_audit_select_own" on public.revy_audit;
create policy "revy_audit_select_own" on public.revy_audit
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "revy_blocked_select_own" on public.revy_blocked_requests;
create policy "revy_blocked_select_own" on public.revy_blocked_requests
  for select using (user_id = (select public.current_workspace()));
drop policy if exists "revy_incidents_select_own" on public.revy_incidents;
create policy "revy_incidents_select_own" on public.revy_incidents
  for select using (user_id = (select public.current_workspace()));

-- Service-Rolle umgeht RLS, braucht aber trotzdem Policies, wenn FORCE aktiv
-- ist und sie nicht Eigentümer ist. In Supabase ist service_role BYPASSRLS.

-- Protokoll, Sperren und Vorfälle: nur anhängen, auch für die Service-Rolle.
create or replace function public.revy_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception '% ist nur zum Anhängen', tg_table_name;
end;
$$;

drop trigger if exists revy_audit_append_only on public.revy_audit;
create trigger revy_audit_append_only before update or delete on public.revy_audit
  for each row execute function public.revy_append_only();
drop trigger if exists revy_blocked_append_only on public.revy_blocked_requests;
create trigger revy_blocked_append_only before update or delete on public.revy_blocked_requests
  for each row execute function public.revy_append_only();
drop trigger if exists revy_incidents_append_only on public.revy_incidents;
create trigger revy_incidents_append_only before update or delete on public.revy_incidents
  for each row execute function public.revy_append_only();

-- Kontingent: zählt eine Anfrage, wenn das Monatslimit es erlaubt. NULL als
-- Limit heißt unbegrenzt. Atomar über die Zeilensperre.
create or replace function public.revy_consume_request(p_owner uuid, p_limit integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periode date := date_trunc('month', (now() at time zone 'Europe/Berlin'))::date;
  v_used integer;
begin
  insert into public.revy_usage (user_id, periode, anfragen) values (p_owner, v_periode, 0)
    on conflict (user_id, periode) do nothing;
  select anfragen into v_used from public.revy_usage
   where user_id = p_owner and periode = v_periode for update;
  if p_limit is not null and v_used >= p_limit then
    return json_build_object('allowed', false, 'used', v_used, 'limit', p_limit);
  end if;
  update public.revy_usage set anfragen = anfragen + 1 where user_id = p_owner and periode = v_periode;
  return json_build_object('allowed', true, 'used', v_used + 1, 'limit', p_limit);
end;
$$;
revoke all on function public.revy_consume_request(uuid, integer) from public, anon, authenticated;
grant execute on function public.revy_consume_request(uuid, integer) to service_role;
