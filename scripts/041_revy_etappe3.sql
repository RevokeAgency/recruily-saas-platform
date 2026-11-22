-- ============================================================================
-- 041_revy_etappe3.sql
-- Revy, Etappe 3: Entwürfe für Absagen und Einladungen, Freigabe mit
-- Einmal-Token, gestaffelter Versand, Zustellstatus. Additiv & idempotent.
--
-- Erläuterung: 041_revy_etappe3.md und docs/revy/PLAN.md
-- Voraussetzung: 039, 040.
--
-- Grundsatz: Revy erzeugt nur Entwürfe. Versendet wird ausschließlich über die
-- Freigaberoute nach einem Klick in der Freigabe-Ansicht. Entwürfe enthalten
-- keine Namen und keine Adressen, nur Platzhalter ({{name}}, {{stelle}},
-- {{firma}}). Eingesetzt wird erst beim Versand auf dem Server.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Stapel: eine Freigabe für mehrere Entwürfe derselben Art und Stelle
-- ---------------------------------------------------------------------------
create table if not exists public.revy_batches (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  actor_id           uuid,
  run_id             uuid references public.revy_runs (id) on delete set null,
  art                text not null check (art in ('absage', 'einladung')),
  stelle_id          uuid references public.jobs (id) on delete cascade,
  ton                text not null default 'standard',
  zusatz             text check (char_length(zusatz) <= 500),
  status             text not null default 'entwurf'
    check (status in ('entwurf', 'freigegeben', 'versendet', 'abgebrochen')),
  -- Einmal-Token der Freigabe-Ansicht: nur der Hash, kurze Gültigkeit.
  token_hash         text,
  token_bis          timestamptz,
  freigegeben_durch  uuid,
  freigegeben_am     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists revy_batches_user_idx on public.revy_batches (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Entwürfe: ein Text je Bewerbung, mit Platzhaltern statt Namen
-- ---------------------------------------------------------------------------
create table if not exists public.revy_drafts (
  id                uuid primary key default gen_random_uuid(),
  batch_id          uuid not null references public.revy_batches (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  job_candidate_id  uuid not null references public.job_candidates (id) on delete cascade,
  ref               text not null,
  betreff           text not null check (char_length(betreff) <= 200),
  text              text not null check (char_length(text) <= 5000),
  ausgewaehlt       boolean not null default true,
  pruefung          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  unique (batch_id, job_candidate_id)
);

-- ---------------------------------------------------------------------------
-- 3) Zustellungen: eine Zeile je verschickter Mail, Status vom Anbieter
-- ---------------------------------------------------------------------------
create table if not exists public.revy_deliveries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  batch_id          uuid not null references public.revy_batches (id) on delete cascade,
  draft_id          uuid not null references public.revy_drafts (id) on delete cascade,
  job_candidate_id  uuid references public.job_candidates (id) on delete set null,
  ref               text not null,
  status            text not null default 'geplant'
    check (status in ('geplant', 'in_versand', 'gesendet', 'zugestellt', 'zurueckgewiesen', 'fehler', 'abgebrochen')),
  geplant_am        timestamptz not null default now(),
  gesendet_am       timestamptz,
  zugestellt_am     timestamptz,
  anbieter_id       text,
  fehler            text check (char_length(fehler) <= 300),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (draft_id)
);
create index if not exists revy_deliveries_due_idx on public.revy_deliveries (status, geplant_am);
create index if not exists revy_deliveries_anbieter_idx on public.revy_deliveries (anbieter_id);

do $$
declare t text;
begin
  foreach t in array array['revy_batches', 'revy_drafts', 'revy_deliveries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('create policy "%s_select_own" on public.%I for select using (user_id = (select public.current_workspace()))', t, t);
  end loop;
end $$;

-- Der Token-Hash bleibt beim Server: Nutzer lesen Stapel ohne diese Spalten.
revoke select on public.revy_batches from authenticated;
grant select (id, user_id, actor_id, run_id, art, stelle_id, ton, zusatz, status, freigegeben_durch, freigegeben_am, created_at, updated_at)
  on public.revy_batches to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Kontaktierbar? Nur ja oder nein, nie die Adresse. Für Entwürfe: Ohne
--    E-Mail-Adresse gibt es keinen Entwurf.
-- ---------------------------------------------------------------------------
create or replace function revy.kontaktierbar(p_refs text[])
returns table (ref text, hat_email boolean)
language sql
stable
security invoker
set search_path = public, revy
as $$
  select c.revy_ref, coalesce(c.email, '') ~ '@'
    from public.candidates c
   where c.revy_ref = any (coalesce(p_refs, '{}'))
$$;
revoke all on function revy.kontaktierbar(text[]) from public, anon;
grant execute on function revy.kontaktierbar(text[]) to authenticated, service_role;
