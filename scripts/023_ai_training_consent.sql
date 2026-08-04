-- 023_ai_training_consent.sql — Rechtsgrundlage + Datenbasis für ein eigenes,
-- feingetuntes Revetly-Modell. Additiv & idempotent.
--
-- WICHTIG (DSGVO): Trainingsdaten dürfen nur aus Konten stammen, die dem
-- Modelltraining ausdrücklich zugestimmt haben (Opt-in, jederzeit widerrufbar).
-- Deshalb wird die Einwilligung samt Zeitpunkt und Fassung der Bedingungen
-- protokolliert — nachweisbar gemäß Art. 7 Abs. 1 DSGVO.
--
-- Ebenso wichtig: In den Trainingsdaten stehen KEINE Klardaten. Der Exporter
-- pseudonymisiert vorher (Namen, Kontaktdaten, Arbeitgeber → Platzhalter);
-- gespeichert wird nur die Struktur plus das MENSCHLICHE Urteil.

-- ── Einwilligung des Kunden (Opt-in) ────────────────────────────────────────
alter table public.user_profiles
  add column if not exists ai_training_consent boolean not null default false;

alter table public.user_profiles
  add column if not exists ai_training_consent_at timestamptz;

-- Fassung der Einwilligungserklärung, der zugestimmt wurde (Nachweisbarkeit).
alter table public.user_profiles
  add column if not exists ai_training_consent_version text;

-- ── Trainingsbeispiele (pseudonymisiert) ────────────────────────────────────
create table if not exists public.ai_training_examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Welche Aufgabe das Beispiel trainiert: 'dossier' | 'judge' | 'ranking'
  task text not null,
  -- Pseudonymisierter Prompt-/Antwort-Inhalt im Chat-Format
  messages jsonb not null,
  -- Woher das Zielsignal stammt: 'interview' | 'hire' | 'reject' | 'ranking'
  label_source text not null,
  -- Stärke des menschlichen Signals (z. B. Interview-Score) — für Gewichtung
  label_strength numeric,
  -- Herkunft für Rückverfolgbarkeit/Widerruf (nicht im Export enthalten)
  job_candidate_id uuid,
  created_at timestamptz not null default now()
);

alter table public.ai_training_examples enable row level security;

-- Nur der eigene Datenbestand ist sichtbar; Schreiben macht die Anwendung
-- über den Service-Role-Key.
drop policy if exists "own training examples" on public.ai_training_examples;
create policy "own training examples" on public.ai_training_examples
  for select using (auth.uid() = user_id);

create index if not exists ai_training_examples_user_task_idx
  on public.ai_training_examples (user_id, task, created_at desc);

-- Widerruf der Einwilligung entfernt die Trainingsbeispiele des Kontos.
create or replace function public.purge_training_on_consent_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.ai_training_consent = true and new.ai_training_consent = false then
    delete from public.ai_training_examples where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_ai_training_consent_withdrawn on public.user_profiles;
create trigger on_ai_training_consent_withdrawn
  after update of ai_training_consent on public.user_profiles
  for each row execute function public.purge_training_on_consent_withdrawal();
