-- ============================================================================
-- 038_match_cache.sql
-- Ergebnis-Cache für das Matching. Additiv & idempotent.
--
-- Erläuterung: 038_match_cache.md
-- Voraussetzungen: keine. Ohne diese Tabelle läuft das Matching wie bisher,
-- nur ohne Cache (der Code fängt die fehlende Tabelle ab).
--
-- Eine Zeile pro Arbeitsbereich und Eingabe-Fingerabdruck. Der Fingerabdruck
-- (input_hash) fasst alles zusammen, was das Ergebnis beeinflusst:
-- Lebenslauf, Anschreiben, Kandidatenfelder, Stellenfelder, Gewichtung,
-- Modelle, Prompts und Version der Matching-Logik. Gleicher Fingerabdruck,
-- gleiches Ergebnis, ohne neuen KI-Aufruf.
--
-- Löschen: Die Zeile hängt am Kandidaten, an der Stelle und am Konto, aus
-- denen sie entstanden ist (on delete cascade). Löscht der Kunde, die
-- Aufbewahrungsfrist oder die Selbstlöschung den Kandidaten, ist auch das
-- zwischengespeicherte Ergebnis weg.
--
-- Nur der Server (service_role) liest und schreibt.
-- ============================================================================

create table if not exists public.match_cache (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  candidate_id  uuid not null references public.candidates (id) on delete cascade,
  job_id        uuid not null references public.jobs (id) on delete cascade,
  input_hash    text not null,
  result        jsonb not null,
  created_at    timestamptz not null default now(),
  hits          integer not null default 0,
  last_hit_at   timestamptz
);

create unique index if not exists match_cache_key on public.match_cache (user_id, input_hash);
create index if not exists match_cache_candidate_idx on public.match_cache (candidate_id);
create index if not exists match_cache_job_idx on public.match_cache (job_id);

comment on table public.match_cache is
  'Ergebnis-Cache des Matchings je Arbeitsbereich und Eingabe-Fingerabdruck. Nur service_role. Siehe scripts/038_match_cache.md.';

alter table public.match_cache enable row level security;
alter table public.match_cache force row level security;

revoke all on table public.match_cache from anon, authenticated;
grant select, insert, update, delete on table public.match_cache to service_role;
