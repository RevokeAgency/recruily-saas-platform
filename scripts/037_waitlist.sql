-- ============================================================================
-- 037_waitlist.sql
-- Warteliste vor dem Start. Additiv & idempotent.
--
-- Erläuterung: 037_waitlist.md
-- Voraussetzungen: keine. Unabhängig von 035/036.
--
-- Eine Zeile pro Adresse. Eingetragen ist jemand erst nach dem Klick auf den
-- Bestätigungslink (Double-Opt-in), vorher steht die Zeile auf 'pending'.
-- Vom Bestätigungslink ist nur der SHA-256-Abdruck gespeichert. Der Link zum
-- Austragen braucht keine Spalte: Er ist mit einem Server-Schlüssel aus der
-- id signiert (lib/waitlist/token.ts) und bleibt so in jeder Mail gültig.
--
-- Wer sich austrägt, wird gelöscht, nicht markiert. Unbestätigte Einträge
-- löscht der Server, sobald ihr Link abgelaufen ist (beim nächsten Eintrag).
--
-- Nur der Server (service_role) liest und schreibt. Kein Zugriff für
-- angemeldete oder anonyme Nutzer, auch nicht lesend.
-- ============================================================================

create table if not exists public.waitlist (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null,
  status                 text not null default 'pending',
  confirm_token_hash     text,
  confirm_expires_at     timestamptz,
  consent_version        text not null,
  source                 text,
  created_at             timestamptz not null default now(),
  requested_at           timestamptz not null default now(),
  confirmed_at           timestamptz,
  constraint waitlist_email_lower check (email = lower(email)),
  constraint waitlist_status_check check (status in ('pending', 'confirmed'))
);

create unique index if not exists waitlist_email_key on public.waitlist (email);
create unique index if not exists waitlist_confirm_token_key on public.waitlist (confirm_token_hash)
  where confirm_token_hash is not null;
create index if not exists waitlist_status_idx on public.waitlist (status, confirm_expires_at);

comment on table public.waitlist is
  'Warteliste vor dem Start. Double-Opt-in, nur service_role. Siehe scripts/037_waitlist.md.';
comment on column public.waitlist.consent_version is
  'Stand des Einwilligungstexts beim Eintragen, als Nachweis nach Art. 7 Abs. 1 DSGVO.';

alter table public.waitlist enable row level security;
alter table public.waitlist force row level security;

-- Keine Policy für anon und authenticated: RLS sperrt damit alles. Zusätzlich
-- die Tabellenrechte entziehen, falls ein Standard-Grant sie vergeben hat.
revoke all on table public.waitlist from anon, authenticated;
grant select, insert, update, delete on table public.waitlist to service_role;
