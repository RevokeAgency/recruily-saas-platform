-- ============================================================================
-- 042_revy_etappe4.sql
-- Revy, Etappe 4: Terminvorschläge. Revy legt Entwürfe mit persönlichem
-- Buchungslink an; verschickt wird wie in Etappe 3 nur über die Freigabe.
-- Additiv & idempotent.
--
-- Erläuterung: 042_revy_etappe4.md und docs/revy/ETAPPE-4.md
-- Voraussetzung: 025 (Terminbuchung), 039, 040, 041.
--
-- Grundsatz: Der Buchungslink entsteht erst beim Versand auf dem Server. Er
-- steht nie im Entwurf, nie im Chat und nie beim Modell. Gespeichert wird wie
-- bisher nur der Hash (booking_invites.token_hash).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Neue Art "termin" für Stapel
-- ---------------------------------------------------------------------------
alter table public.revy_batches drop constraint if exists revy_batches_art_check;
alter table public.revy_batches
  add constraint revy_batches_art_check check (art in ('absage', 'einladung', 'termin'));

-- Terminart der Person, die den Vorschlag angelegt hat. Ohne Terminart nimmt
-- der Versand die Standard-Terminart (wie /api/scheduling/invites).
alter table public.revy_batches
  add column if not exists meeting_type_id uuid references public.meeting_types (id) on delete set null;

-- Nutzer lesen Stapel weiterhin ohne die Spalten mit dem Token-Hash.
revoke select on public.revy_batches from authenticated;
grant select (id, user_id, actor_id, run_id, art, stelle_id, ton, zusatz, status, freigegeben_durch, freigegeben_am, meeting_type_id, created_at, updated_at)
  on public.revy_batches to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Zustellung kennt den Buchungslink, den sie angelegt hat
-- ---------------------------------------------------------------------------
alter table public.revy_deliveries
  add column if not exists booking_invite_id uuid references public.booking_invites (id) on delete set null;
