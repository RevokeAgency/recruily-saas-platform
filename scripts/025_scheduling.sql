-- 025_scheduling.sql — Terminplanung und Buchung. Additiv & idempotent.
--
-- Revetly führt einen eigenen Kalender. Google Workspace und Microsoft 365
-- sind optional: Wer verbindet, bekommt Doppelbuchungsschutz gegen den echten
-- Kalender und den Termin automatisch eingetragen. Wer nicht verbindet, kann
-- trotzdem Termine anbieten und buchen lassen.
--
-- Warum keine Kopie der fremden Kalender in unserer Datenbank: Freie Zeiten
-- werden bei jeder Abfrage live beim Anbieter erfragt (Google freeBusy,
-- Microsoft getSchedule). Das erspart Synchronisation, Webhooks und veraltete
-- Stände, und es bleiben keine fremden Termindaten bei uns liegen.

-- ── Verbundene Kalenderkonten ───────────────────────────────────────────────
create table if not exists public.calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  -- Konto beim Anbieter, damit der Kunde sieht, welcher Kalender hängt.
  account_email text,
  -- Verschlüsselt (AES-256-GCM, Schlüssel aus SCHEDULING_TOKEN_KEY).
  -- Klartext-Tokens dürfen die Anwendung nie verlassen.
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  -- In welchen Kalender geschrieben wird. 'primary' ist bei beiden Anbietern
  -- der Standardkalender des Kontos.
  calendar_id text not null default 'primary',
  -- Belegtzeiten von hier abziehen?
  busy_enabled boolean not null default true,
  -- Gebuchte Termine hier eintragen?
  write_enabled boolean not null default true,
  -- Letzter Fehler beim Anbieter, damit der Kunde eine abgelaufene
  -- Verbindung sieht, statt sich über leere Slots zu wundern.
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, account_email)
);

alter table public.calendar_accounts enable row level security;

-- Der Client darf die Verbindung sehen, aber niemals die Tokens auslesen: Die
-- Anwendung selektiert Tokens ausschließlich über den Service-Role-Key. Für
-- den Client gibt es weiter unten eine View ohne Token-Spalten.
drop policy if exists "own calendar accounts" on public.calendar_accounts;
create policy "own calendar accounts" on public.calendar_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists calendar_accounts_user_idx
  on public.calendar_accounts (user_id);

-- ── Verfügbarkeitsprofil (eines pro Kunde) ──────────────────────────────────
create table if not exists public.scheduling_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Europe/Vienna',
  -- Wochenarbeitszeiten als { "mon": [{"start":"09:00","end":"17:00"}], … }.
  -- Mehrere Blöcke pro Tag sind erlaubt (Mittagspause).
  weekly_hours jsonb not null default '{
    "mon": [{"start":"09:00","end":"17:00"}],
    "tue": [{"start":"09:00","end":"17:00"}],
    "wed": [{"start":"09:00","end":"17:00"}],
    "thu": [{"start":"09:00","end":"17:00"}],
    "fri": [{"start":"09:00","end":"16:00"}],
    "sat": [],
    "sun": []
  }'::jsonb,
  -- Vorlaufzeit: so kurzfristig darf nicht gebucht werden.
  min_notice_minutes integer not null default 720,
  -- Wie weit im Voraus überhaupt Slots angezeigt werden.
  max_days_ahead integer not null default 30,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 15,
  -- Raster der Startzeiten (15 = viertelstündlich).
  slot_interval_minutes integer not null default 15,
  -- Obergrenze pro Tag, damit ein Tag nicht komplett zugebucht wird.
  max_per_day integer not null default 6,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scheduling_profiles enable row level security;

drop policy if exists "own scheduling profile" on public.scheduling_profiles;
create policy "own scheduling profile" on public.scheduling_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Terminarten ─────────────────────────────────────────────────────────────
create table if not exists public.meeting_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 30
    check (duration_minutes between 5 and 480),
  -- video_auto  = Meet/Teams-Link wird beim Buchen erzeugt
  -- custom_link = fester eigener Raum (Zoom, Whereby, Jitsi)
  -- phone       = Rückruf, Nummer gibt der Bewerber beim Buchen an
  -- onsite      = Adresse steht in location_value
  location_kind text not null default 'video_auto'
    check (location_kind in ('video_auto', 'custom_link', 'phone', 'onsite')),
  location_value text,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meeting_types enable row level security;

drop policy if exists "own meeting types" on public.meeting_types;
create policy "own meeting types" on public.meeting_types
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists meeting_types_user_idx
  on public.meeting_types (user_id, active);

-- ── Buchungen ───────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meeting_type_id uuid references public.meeting_types(id) on delete set null,
  -- Bezug zum Verfahren. Alle drei optional, damit eine Buchung eine gelöschte
  -- Bewerbung überlebt (Nachweisbarkeit) statt mitgelöscht zu werden.
  job_candidate_id uuid,
  job_id uuid,
  candidate_id uuid,

  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Zeitzone, in der gebucht wurde. Nur für die Anzeige, der Zeitpunkt selbst
  -- steht als absoluter Zeitstempel darüber.
  timezone text not null default 'Europe/Vienna',

  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),

  attendee_name text,
  attendee_email text,
  attendee_phone text,
  attendee_note text,

  location_kind text not null default 'video_auto',
  location_value text,
  meeting_url text,

  -- Spiegelung im externen Kalender, falls verbunden.
  external_provider text,
  external_calendar_id text,
  external_event_id text,

  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by is null or cancelled_by in ('recruiter', 'candidate')),
  cancel_reason text,
  -- Bei einer Umbuchung: die Buchung, die ersetzt wurde.
  rescheduled_from uuid references public.bookings(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

drop policy if exists "own bookings" on public.bookings;
create policy "own bookings" on public.bookings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists bookings_user_start_idx
  on public.bookings (user_id, starts_at);
create index if not exists bookings_job_candidate_idx
  on public.bookings (job_candidate_id);

-- ── Einladungen mit persönlichem Buchungslink ───────────────────────────────
-- Der Bewerber bekommt einen Link, der nur für ihn gilt. Gespeichert wird nur
-- der SHA-256-Abdruck: Wer die Datenbank liest, kann daraus keinen gültigen
-- Link bauen.
create table if not exists public.booking_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meeting_type_id uuid references public.meeting_types(id) on delete set null,
  job_candidate_id uuid,
  job_id uuid,
  candidate_id uuid,

  token_hash text not null unique,
  expires_at timestamptz not null,

  status text not null default 'open'
    check (status in ('open', 'booked', 'cancelled', 'expired', 'revoked')),
  booking_id uuid references public.bookings(id) on delete set null,

  -- Kopien für die Buchungsseite. Wird der Bewerber gelöscht (DSGVO), bleibt
  -- der Link damit nicht funktionsfähig — er wird beim Aufruf mitgeprüft.
  candidate_name text,
  candidate_email text,
  job_title text,
  company_name text,
  personal_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_invites enable row level security;

drop policy if exists "own booking invites" on public.booking_invites;
create policy "own booking invites" on public.booking_invites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists booking_invites_user_idx
  on public.booking_invites (user_id, created_at desc);
create index if not exists booking_invites_job_candidate_idx
  on public.booking_invites (job_candidate_id);

-- ── Wartungstrigger ─────────────────────────────────────────────────────────
-- touch_updated_at() stammt aus 016.
do $$
declare t text;
begin
  foreach t in array array['calendar_accounts', 'scheduling_profiles',
                           'meeting_types', 'bookings', 'booking_invites']
  loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ── Termin im Bewerbungsverlauf ─────────────────────────────────────────────
-- Damit die Kandidatenliste den nächsten Termin zeigen kann, ohne für jede
-- Zeile die Buchungen zu laden.
alter table public.job_candidates
  add column if not exists next_interview_at timestamptz;
