-- 027_error_monitoring.sql — Fehler-Monitoring. Additiv & idempotent.
--
-- Bisher landete jeder Fehler in console.error und damit in den Vercel-Logs,
-- die niemand liest. Von einem kaputten Matching erfährt man dadurch erst,
-- wenn ein Kunde anruft.
--
-- Warum in der eigenen Datenbank statt bei einem Dienst: Fehlermeldungen
-- enthalten regelmäßig Bruchstücke der verarbeiteten Daten (Ausschnitte aus
-- Lebensläufen, Adressen, Kennungen). Bei Revetly sind das Bewerberdaten. Sie
-- an einen weiteren Auftragsverarbeiter zu schicken, wäre nach dem Wechsel zu
-- Mistral und Lettermint ein Rückschritt. Der Preis dafür sind schlichtere
-- Werkzeuge: keine aufgelösten Stacktraces aus minifiziertem Code, keine
-- Release-Verfolgung.
--
-- Zwei Tabellen: jedes Vorkommen einzeln, und eine Gruppe je Fingerabdruck.
-- Ohne Gruppierung ertrinkt man im ersten Fehler, der tausendmal auftritt.

-- ── Einzelne Vorkommen ──────────────────────────────────────────────────────
create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  -- sha256 aus Quelle, Route, Fehlerklasse und normalisierter Meldung.
  fingerprint text not null,
  level text not null default 'error' check (level in ('error', 'warn')),
  -- 'server' | 'client' | 'cron'
  source text not null default 'server',
  name text,
  message text not null,
  stack text,
  route text,
  method text,
  status integer,
  -- Nur die Kennung des Kontoinhabers, nie Bewerberdaten.
  user_id uuid,
  -- Zusatzangaben, vor dem Speichern pseudonymisiert.
  context jsonb,
  created_at timestamptz not null default now()
);

alter table public.error_events enable row level security;

create index if not exists error_events_fingerprint_idx
  on public.error_events (fingerprint, created_at desc);
create index if not exists error_events_created_idx
  on public.error_events (created_at desc);

-- ── Gruppen ─────────────────────────────────────────────────────────────────
create table if not exists public.error_groups (
  fingerprint text primary key,
  level text not null default 'error',
  source text not null default 'server',
  name text,
  message text not null,
  route text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  occurrences integer not null default 0,
  -- Gesetzt, sobald jemand den Fehler als erledigt markiert. Tritt er erneut
  -- auf, wird das Feld wieder geleert und erneut benachrichtigt.
  resolved_at timestamptz,
  -- Wann zuletzt eine Mail zu dieser Gruppe rausging (gegen Dauerbeschuss).
  notified_at timestamptz
);

alter table public.error_groups enable row level security;

create index if not exists error_groups_last_seen_idx
  on public.error_groups (last_seen desc);

/**
 * Schreibt ein Vorkommen und führt die Gruppe nach.
 *
 * Rückgabe enthält `is_new`: true, wenn diese Fehlerart zum ersten Mal
 * auftaucht oder nach einer Erledigung wiederkehrt. Nur dann wird sofort
 * benachrichtigt; alles andere sammelt der Tagesbericht ein.
 */
create or replace function public.record_error(
  p_fingerprint text,
  p_level text,
  p_source text,
  p_name text,
  p_message text,
  p_stack text,
  p_route text,
  p_method text,
  p_status integer,
  p_user_id uuid,
  p_context jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_war_bekannt boolean;
  v_war_erledigt boolean;
  v_occurrences integer;
begin
  select true, resolved_at is not null
    into v_war_bekannt, v_war_erledigt
    from public.error_groups where fingerprint = p_fingerprint;

  insert into public.error_events (
    fingerprint, level, source, name, message, stack, route, method, status, user_id, context
  ) values (
    p_fingerprint, coalesce(p_level, 'error'), coalesce(p_source, 'server'),
    p_name, p_message, p_stack, p_route, p_method, p_status, p_user_id, p_context
  );

  insert into public.error_groups (
    fingerprint, level, source, name, message, route, occurrences
  ) values (
    p_fingerprint, coalesce(p_level, 'error'), coalesce(p_source, 'server'),
    p_name, p_message, p_route, 1
  )
  on conflict (fingerprint) do update set
    last_seen = now(),
    occurrences = public.error_groups.occurrences + 1,
    -- Ein wiederkehrender Fehler gilt nicht mehr als erledigt.
    resolved_at = null,
    message = excluded.message
  returning occurrences into v_occurrences;

  return jsonb_build_object(
    'is_new', coalesce(v_war_bekannt, false) = false or coalesce(v_war_erledigt, false),
    'occurrences', v_occurrences
  );
end;
$$;

grant execute on function public.record_error(
  text, text, text, text, text, text, text, text, integer, uuid, jsonb
) to service_role;

/** Merkt, dass zu dieser Gruppe benachrichtigt wurde. */
create or replace function public.mark_error_notified(p_fingerprint text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.error_groups set notified_at = now() where fingerprint = p_fingerprint;
$$;

grant execute on function public.mark_error_notified(text) to service_role;

/**
 * Räumt alte Vorkommen weg. Die Gruppen bleiben: Sie sind klein und tragen die
 * Geschichte („tritt seit drei Monaten auf"). Wird vom nächtlichen Cron gerufen.
 */
create or replace function public.purge_error_events(p_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted integer;
begin
  delete from public.error_events where created_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.purge_error_events(integer) to service_role;
