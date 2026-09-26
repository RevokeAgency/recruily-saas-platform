-- ============================================================================
-- 030_document_findings.sql
-- Befunde der Dokumentprüfung pro Kandidat. Additiv & idempotent.
--
-- Hält fest, ob Lebenslauf oder Anschreiben Text enthalten, den ein Mensch
-- im Dokument nicht sieht (weiße oder winzige Schrift, verdeckt, in Word
-- ausgeblendet, unsichtbare Unicode-Zeichen), oder sichtbare Sätze, die sich
-- an eine KI richten. Versteckter Text wird vor jeder Analyse entfernt, die
-- Befunde sind der Beleg dafür im Dashboard.
--
-- Erläuterung: 030_document_findings.md
-- Voraussetzungen: 003 (candidates). Keine weiteren.
-- ============================================================================

-- Form: { "version": 1, "checked_at": "…", "findings": [ { "source",
-- "reason", "page"?, "excerpt" } ] }
-- NULL heißt: noch nicht geprüft. Die App prüft solche Kandidaten beim
-- nächsten Match nach, ein Backfill ist deshalb nicht nötig.
alter table public.candidates
  add column if not exists document_findings jsonb;

comment on column public.candidates.document_findings is
  'Dokumentprüfung (lib/document-guard): versteckter Text und Anweisungen an eine KI, mit Beleg. NULL = noch nicht geprüft.';
