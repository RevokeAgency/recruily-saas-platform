-- ============================================================================
-- 033_review_links.sql
-- Freigabe-Link für Fachabteilungen. Additiv & idempotent.
--
-- Erläuterung: 033_review_links.md
-- Voraussetzungen: 003 (jobs), 013 (job_candidates.user_id), 015 (RLS).
--
-- HR schickt eine Auswahl von Bewerbern einer Stelle als Link an jemanden im
-- eigenen Unternehmen (Werkstattleitung, Vertrieb). Die Person sieht die
-- Zusammenfassungen ohne Login und gibt pro Bewerber "Interessant" oder
-- "Ablehnen" mit Kommentar ab. Das Urteil ist nur eine Rückmeldung an HR,
-- es ändert keinen Status.
--
-- Gelesen und geschrieben wird von außen ausschließlich über die
-- Schnittstellen der App mit service_role. Der Link selbst steht nirgends in
-- der Datenbank, nur sein SHA-256-Abdruck.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Ein Link: wer, für welche Stelle, wie lange
-- ---------------------------------------------------------------------------
create table if not exists public.review_links (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  job_id          uuid not null references public.jobs (id) on delete cascade,
  token_hash      text not null unique,
  reviewer_name   text,
  reviewer_email  text,
  note            text,
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  first_opened_at timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  constraint review_links_note_len check (note is null or char_length(note) <= 1000),
  constraint review_links_name_len check (reviewer_name is null or char_length(reviewer_name) <= 120)
);

comment on table public.review_links is
  'Freigabe-Links für Fachabteilungen. Nur der Abdruck des Links wird gespeichert.';

create index if not exists review_links_job_idx  on public.review_links (job_id, created_at desc);
create index if not exists review_links_user_idx on public.review_links (user_id, created_at desc);


-- ---------------------------------------------------------------------------
-- 2) Bewerber im Link und das Urteil des Fachbereichs
--    Fällt eine Bewerbung weg (gelöscht, Speicherfrist abgelaufen), geht ihr
--    Eintrag mit. Der Link zeigt dann nur noch die übrigen.
-- ---------------------------------------------------------------------------
create table if not exists public.review_link_items (
  id               uuid primary key default gen_random_uuid(),
  link_id          uuid not null references public.review_links (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  job_candidate_id uuid not null references public.job_candidates (id) on delete cascade,
  position         int  not null default 0,
  verdict          text,
  comment          text,
  decided_at       timestamptz,
  constraint review_link_items_verdict check (verdict is null or verdict in ('interessant', 'ablehnen')),
  constraint review_link_items_comment_len check (comment is null or char_length(comment) <= 1000),
  constraint review_link_items_unique unique (link_id, job_candidate_id)
);

create index if not exists review_link_items_candidate_idx on public.review_link_items (job_candidate_id);
create index if not exists review_link_items_user_idx      on public.review_link_items (user_id);


-- ---------------------------------------------------------------------------
-- 3) Rechte
--    Konten lesen ihre eigenen Links und Urteile. Anlegen, Urteilen und
--    Widerrufen laufen über die App mit service_role, damit Plan, Eigentum
--    und Ablauf an einer Stelle geprüft werden.
-- ---------------------------------------------------------------------------
alter table public.review_links      enable row level security;
alter table public.review_link_items enable row level security;

revoke all on public.review_links      from anon, authenticated;
revoke all on public.review_link_items from anon, authenticated;
grant select on public.review_links      to authenticated;
grant select on public.review_link_items to authenticated;
grant all    on public.review_links      to service_role;
grant all    on public.review_link_items to service_role;

drop policy if exists "review_links_select_own" on public.review_links;
create policy "review_links_select_own" on public.review_links
  for select using (user_id = auth.uid());

drop policy if exists "review_link_items_select_own" on public.review_link_items;
create policy "review_link_items_select_own" on public.review_link_items
  for select using (user_id = auth.uid());
