-- ============================================================================
-- 029_positionierung_v2.sql
-- Das Produkt so, wie die Positionierung v2 es zusagt. Additiv & idempotent.
--
--   A) "Das Gespräch zählt mit": Der Gesprächswert fließt in den Match ein.
--   B) "Revetly lernt nur für dein Konto, nur mit deiner Zustimmung":
--      Widerruf löscht die angepassten Gewichte, Zustimmungen zur alten
--      Fassung (gemeinsames Modell) gelten nicht weiter.
--
-- Erläuterung: 029_positionierung_v2.md
-- Voraussetzung: 003. Die Spalten aus 019 bis 023, die hier gelesen werden,
-- legt 029 selbst an (Abschnitt 0).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0) Spalten aus früheren Migrationen, defensiv
--
--    029 liest Spalten aus 019 bis 023. Fehlt eine davon, scheitert nicht nur
--    diese Migration: Der Match-Trigger unten würde danach jedes Speichern
--    eines Kandidaten abbrechen lassen. Deshalb hier angelegt, exakt so
--    definiert wie in ihrer Ursprungs-Migration. Läuft die später doch noch,
--    ist ihr "add column if not exists" für diese Spalten ein No-op und der
--    Rest der Migration greift normal.
-- ---------------------------------------------------------------------------
alter table public.job_candidates
  add column if not exists knockout boolean not null default false,   -- 019
  add column if not exists interview_score numeric,                   -- 020
  add column if not exists match_detail jsonb;                        -- 021

alter table public.user_profiles
  add column if not exists ai_training_consent boolean not null default false,  -- 023
  add column if not exists ai_training_consent_at timestamptz,                  -- 023
  add column if not exists ai_training_consent_version text;                    -- 023


-- ---------------------------------------------------------------------------
-- A) Gespräch fließt in den Match ein
-- ---------------------------------------------------------------------------

-- Reiner Analysewert (Revetly Match Analyse, nur aus den Unterlagen).
-- match_score ist ab jetzt der Match, den Nutzer sehen: ohne Gespräch gleich
-- dem Analysewert, mit Gespräch die Mischung aus beidem.
alter table public.job_candidates
  add column if not exists screening_score integer;

-- Bisher gab es keine Mischung, also ist jeder vorhandene match_score ein
-- reiner Analysewert.
update public.job_candidates
   set screening_score = match_score
 where screening_score is null
   and match_score is not null;

-- Gewicht des Gesprächs im Match. Muss mit INTERVIEW_WEIGHT in
-- lib/matching/screening.ts übereinstimmen.
create or replace function public.interview_weight()
returns numeric language sql immutable as $$ select 0.4::numeric $$;

-- Rechnet den Match bei jedem Schreiben neu. Als Trigger in der Datenbank,
-- weil mehrere Stellen im Code match_score schreiben (Scoring-Pipeline,
-- direkte Kandidatenanlage, Nachbewertung) und keine davon die Mischung
-- vergessen darf.
--
-- Woher der Analysewert kommt:
--   - Schreibt jemand screening_score ausdrücklich, gilt der.
--   - Schreiben ältere Stellen nur match_score, ist das der neue Analysewert.
--
-- Zwei Sperren, damit ein gutes Gespräch keine harte Anforderung wegrechnet:
--   - Qualifikationssperre: Der Deckel aus match_detail.zulassungsSperre gilt
--     auch für den gemischten Wert.
--   - K.O.: Ist der Bewerber ausgeschlossen, kann das Gespräch den Match nur
--     senken, nie heben. Das greift auch dort, wo match_detail fehlt.
create or replace function public.blend_match_score()
returns trigger language plpgsql as $$
declare
  v_cap   integer;
  v_blend integer;
begin
  if tg_op = 'INSERT' then
    if new.screening_score is null then
      new.screening_score := new.match_score;
    end if;
  elsif new.screening_score is not distinct from old.screening_score
        and new.match_score is distinct from old.match_score then
    new.screening_score := new.match_score;
  end if;

  if new.screening_score is null then
    return new;
  end if;

  if new.interview_score is null then
    new.match_score := new.screening_score;
    return new;
  end if;

  v_blend := round(new.screening_score * (1 - public.interview_weight())
                   + new.interview_score * public.interview_weight());

  v_cap := nullif(new.match_detail -> 'zulassungsSperre' ->> 'cap', '')::integer;
  if v_cap is not null then
    v_blend := least(v_blend, v_cap);
  end if;

  if coalesce(new.knockout, false) then
    v_blend := least(v_blend, new.screening_score);
  end if;

  new.match_score := v_blend;
  return new;
end;
$$;

drop trigger if exists on_match_blend on public.job_candidates;
create trigger on_match_blend
  before insert or update on public.job_candidates
  for each row execute function public.blend_match_score();

-- Bewerber mit bereits gewertetem Gespräch einmal neu rechnen lassen.
-- Das UPDATE ändert nichts selbst, es löst nur den Trigger aus.
update public.job_candidates
   set screening_score = screening_score
 where interview_score is not null
   and screening_score is not null;


-- ---------------------------------------------------------------------------
-- B) Lernen nur für das eigene Konto, nur mit Zustimmung
-- ---------------------------------------------------------------------------

alter table public.user_profiles
  add column if not exists imlrs_weights jsonb,
  add column if not exists match_calibration jsonb;

-- Widerruf löscht die angepassten Gewichte und den Kalibrierungsbericht sofort,
-- nicht erst beim nächsten nächtlichen Lauf. BEFORE, damit es im selben UPDATE
-- geschieht. Die gesammelten Beispiele löscht weiterhin der Trigger aus 023.
create or replace function public.clear_learning_on_withdrawal()
returns trigger language plpgsql as $$
begin
  if coalesce(old.ai_training_consent, false) = true
     and coalesce(new.ai_training_consent, false) = false then
    new.imlrs_weights     := null;
    new.match_calibration := null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_learning_consent_withdrawn on public.user_profiles;
create trigger on_learning_consent_withdrawn
  before update of ai_training_consent on public.user_profiles
  for each row execute function public.clear_learning_on_withdrawal();

-- Zustimmungen zur Fassung 2026-08-v1 betrafen ein gemeinsames Modell, also
-- einen anderen Zweck. Sie tragen die Kalibrierung pro Konto nicht. Alles,
-- was ohne gültige Zustimmung zur aktuellen Fassung gelernt wurde, fällt weg.
-- Die Fassung muss mit CONSENT_VERSION in lib/training/consent.ts
-- übereinstimmen.
update public.user_profiles
   set imlrs_weights = null,
       match_calibration = null
 where (imlrs_weights is not null or match_calibration is not null)
   and not (coalesce(ai_training_consent, false) = true
            and ai_training_consent_version = '2026-09-v2');


-- ---------------------------------------------------------------------------
-- Optional, bewusst auskommentiert: gesammelte Beispiele für das gemeinsame
-- Modell löschen.
--
-- Das gemeinsame Modelltraining ist abgeschaltet (lib/training/consent.ts).
-- Die bisher gesammelten, pseudonymisierten Beispiele werden nicht mehr
-- genutzt. Fällt der Zweck endgültig weg, sollten sie gelöscht werden
-- (Speicherbegrenzung, Art. 5 Abs. 1 lit. e DSGVO). Das ist nicht
-- rückgängig zu machen, deshalb die Entscheidung beim Einspielen:
--
-- delete from public.ai_training_examples;
-- ---------------------------------------------------------------------------


grant execute on function public.interview_weight() to authenticated, service_role;
