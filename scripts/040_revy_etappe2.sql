-- ============================================================================
-- 040_revy_etappe2.sql
-- Revy, Etappe 2: Tags, rücknehmbare Aktionen, Korrekturen als
-- Trainingsmaterial, Volltextsuche. Additiv & idempotent.
--
-- Erläuterung: 040_revy_etappe2.md und docs/revy/PLAN.md
-- Voraussetzung: 039.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Neuer Laufstatus: Bestätigung vor Änderungen an mehr als 10 Kandidaten
-- ---------------------------------------------------------------------------
alter table public.revy_runs drop constraint if exists revy_runs_status_check;
alter table public.revy_runs add constraint revy_runs_status_check
  check (status in ('geplant', 'wartet_auf_kosten', 'wartet_auf_bestaetigung', 'fertig', 'gesperrt', 'fehler', 'abgebrochen'));

-- ---------------------------------------------------------------------------
-- 1b) Gesperrte Merkmale ergänzt um Aussehen, Kleidung mit religiösem Bezug,
--     Hautfarbe und Weltanschauung (gleiche Kategorien wie lib/revy/policy.ts).
-- ---------------------------------------------------------------------------
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
      || 'kopftuch|hijab|kippa|turban|'
      || 'staatsangehörig|staatsbürger|nationalität|nationality|citizenship|herkunft|abstammung|migration|ethni|hautfarbe|\mrasse\M|'
      || 'behinder|\mgdb\M|disab|handicap|'
      || '\mkrank|erkrank|gesundheit|\mhealth|therapie|diagnose|\mreha\M|burn-?out|illness|'
      || 'geschlecht|gender|weiblich|männlich|\mfemale|\mmale\M|divers\M|'
      || 'sexuell|orientierung|\mgay\M|lesbi|transgender|'
      || 'aussehen|attraktiv|hübsch|übergewicht|tattoo|piercing|'
      || '\mpartei|politisch|gewerkschaft|weltanschau)'
$$;

-- ---------------------------------------------------------------------------
-- 2) Tags. Pro Kandidat, optional an eine Stelle gebunden (etwa "Runde 2").
--    Schreiben und Löschen mit der Sitzung des Nutzers, nur für sichtbare
--    Kandidaten und Stellen.
-- ---------------------------------------------------------------------------
create table if not exists public.candidate_tags (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  candidate_id  uuid not null references public.candidates (id) on delete cascade,
  job_id        uuid references public.jobs (id) on delete cascade,
  tag           text not null check (char_length(tag) between 1 and 40),
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create unique index if not exists candidate_tags_unique
  on public.candidate_tags (candidate_id, coalesce(job_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(tag));
create index if not exists candidate_tags_user_idx on public.candidate_tags (user_id, lower(tag));

alter table public.candidate_tags enable row level security;
revoke all on public.candidate_tags from anon;
grant select, insert, delete on public.candidate_tags to authenticated;
grant all on public.candidate_tags to service_role;

drop policy if exists "candidate_tags_select" on public.candidate_tags;
create policy "candidate_tags_select" on public.candidate_tags
  for select using (
    user_id = (select public.current_workspace())
    and public.candidate_visible(candidate_id)
    and (job_id is null or public.job_visible(job_id))
  );
drop policy if exists "candidate_tags_insert" on public.candidate_tags;
create policy "candidate_tags_insert" on public.candidate_tags
  for insert with check (
    user_id = (select public.current_workspace())
    and public.candidate_visible(candidate_id)
    and (job_id is null or public.job_visible(job_id))
  );
drop policy if exists "candidate_tags_delete" on public.candidate_tags;
create policy "candidate_tags_delete" on public.candidate_tags
  for delete using (
    user_id = (select public.current_workspace())
    and public.candidate_visible(candidate_id)
    and (job_id is null or public.job_visible(job_id))
  );

-- Tags sind vom Nutzer frei gewählt. Revy sieht sie nur, wenn sie kein
-- gesperrtes Merkmal tragen (Etikett wie "jung" oder "Kopftuch" kommt nie
-- beim Modell an).
create or replace view revy.tags with (security_invoker = true) as
select c.revy_ref as ref, t.job_id as stelle_id, t.tag, t.created_at::date as gesetzt
  from public.candidate_tags t
  join public.candidates c on c.id = t.candidate_id
 where revy.scrub(t.tag) is not null and revy.scrub(t.tag) <> '';
grant select on revy.tags to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Rücknehmbare Aktionen (INTERN). Je Änderung vorher und nachher.
--    Geschrieben nur vom Server, gelesen im eigenen Mandanten.
-- ---------------------------------------------------------------------------
create table if not exists public.revy_actions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  actor_id                uuid,
  run_id                  uuid references public.revy_runs (id) on delete set null,
  werkzeug                text not null,
  ref                     text not null,
  ziel                    jsonb not null,
  vorher                  jsonb,
  nachher                 jsonb,
  created_at              timestamptz not null default now(),
  zurueckgenommen_am      timestamptz,
  zurueckgenommen_durch   uuid
);
create index if not exists revy_actions_user_idx on public.revy_actions (user_id, created_at desc);
alter table public.revy_actions enable row level security;
alter table public.revy_actions force row level security;
revoke all on public.revy_actions from anon, authenticated;
grant select on public.revy_actions to authenticated;
grant all on public.revy_actions to service_role;
drop policy if exists "revy_actions_select_own" on public.revy_actions;
create policy "revy_actions_select_own" on public.revy_actions
  for select using (user_id = (select public.current_workspace()));

-- ---------------------------------------------------------------------------
-- 4) Korrekturen als Trainingsmaterial. Widerspricht ein Nutzer Revy, steht
--    hier Kategorie, Bewertung vorher und nachher und eine geschwärzte
--    Belegstelle. Ohne Namen, ohne Firmennamen, ohne Volltext, ohne Kürzel.
--    Nur anhängen.
-- ---------------------------------------------------------------------------
create table if not exists public.revy_corrections (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  kategorie      text not null check (kategorie in ('fachlich', 'erfahrung', 'ausbildung', 'soft_skills', 'sprachen', 'standort', 'branche', 'gehalt', 'kultur')),
  score_vorher   integer check (score_vorher between 0 and 100),
  score_nachher  integer check (score_nachher between 0 and 100),
  belegstelle    text check (char_length(belegstelle) <= 300),
  created_at     timestamptz not null default now()
);
comment on table public.revy_corrections is
  'Korrekturen an Revy als Trainingsmaterial (pro Konto). Ohne Namen, Firmennamen, Volltext und Kürzel. Nur anhängen.';
alter table public.revy_corrections enable row level security;
alter table public.revy_corrections force row level security;
revoke all on public.revy_corrections from anon, authenticated;
grant select on public.revy_corrections to authenticated;
grant all on public.revy_corrections to service_role;
drop policy if exists "revy_corrections_select_own" on public.revy_corrections;
create policy "revy_corrections_select_own" on public.revy_corrections
  for select using (user_id = (select public.current_workspace()));

drop trigger if exists revy_corrections_append_only on public.revy_corrections;
create trigger revy_corrections_append_only before update or delete on public.revy_corrections
  for each row execute function public.revy_append_only();

-- Belegstelle für das Trainingsmaterial schwärzen: Kontaktdaten, gesperrte
-- Merkmale, Namen des Kandidaten, Firmen aus seinen Stationen und alles mit
-- Rechtsform. Höchstens 300 Zeichen. security invoker: Der Aufrufer muss den
-- Kandidaten sehen dürfen.
create or replace function revy.korrektur_text(p_ref text, p_text text)
returns text
language plpgsql
stable
security invoker
set search_path = public, revy
as $$
declare
  v_name text;
  v_dossier jsonb;
  t text := coalesce(p_text, '');
  teil text;
  firma text;
begin
  select c.full_name, c.dossier into v_name, v_dossier from public.candidates c where c.revy_ref = p_ref;
  foreach teil in array regexp_split_to_array(coalesce(v_name, ''), '\s+') loop
    if length(teil) >= 3 then
      t := regexp_replace(t, '\m' || regexp_replace(teil, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M', '[Name]', 'gi');
    end if;
  end loop;
  for firma in
    select s ->> 'company' from jsonb_array_elements(coalesce(v_dossier -> 'stations', '[]'::jsonb)) s
     where length(coalesce(s ->> 'company', '')) >= 3
  loop
    t := replace(t, firma, '[Firma]');
  end loop;
  -- Bis zu drei großgeschriebene Wörter vor einer Rechtsform
  t := regexp_replace(t, '(\m[[:upper:]][[:alnum:]ÄÖÜäöüß&.-]*[ ]){0,3}(GmbH|AG|KG|OG|e\.U\.|e\.V\.|SE|Ltd\.?|Inc\.?|LLC|GesmbH|Gesellschaft m\.b\.H\.)', '[Firma]', 'g');
  t := revy.neutral(revy.scrub(revy.scrub_contact(t)));
  return left(btrim(coalesce(t, '')), 300);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Volltextsuche über Lebenslauf, Anschreiben und Seitentext. Gibt nur das
--    Kürzel und die gefundenen Begriffe zurück, nie Text. security invoker:
--    RLS auf candidates greift.
-- ---------------------------------------------------------------------------
create or replace function revy.suche(p_begriffe text[])
returns table (ref text, begriffe text[])
language sql
stable
security invoker
set search_path = public, revy
as $$
  with b as (
    select distinct lower(btrim(x)) as begriff
      from unnest(coalesce(p_begriffe, '{}')) x
     where length(btrim(x)) between 2 and 60
       -- Begriffe mit gesperrten Merkmalen werden nie gesucht ("Kopftuch").
       and coalesce(revy.scrub(x), '') <> ''
     limit 12
  ),
  texte as (
    select c.id, c.revy_ref,
           lower(coalesce(c.resume_text, '') || ' ' || coalesce(c.cover_letter_text, '') || ' ' ||
                 coalesce((select string_agg(p.text, ' ') from public.candidate_document_pages p where p.candidate_id = c.id), '')) as t
      from public.candidates c
  )
  select texte.revy_ref, array_agg(b.begriff order by b.begriff)
    from texte join b on strpos(texte.t, b.begriff) > 0
   group by texte.revy_ref
$$;

-- Datenstand: Tags und Notizen gehören dazu (Notizen ändern updated_at der
-- Bewerbung, das deckt revy.applications schon ab).
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
    coalesce((select max(j.updated_at)::text from public.jobs j), '') || '|' ||
    coalesce((select count(*)::text || coalesce(max(t.created_at)::text, '') from public.candidate_tags t), '')
  )
$$;

revoke all on function revy.suche(text[]), revy.korrektur_text(text, text) from public, anon;
grant execute on function revy.suche(text[]), revy.korrektur_text(text, text), revy.datenstand(uuid) to authenticated, service_role;
