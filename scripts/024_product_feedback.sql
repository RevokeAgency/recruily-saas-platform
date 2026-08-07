-- 024_product_feedback.sql — Produkt-Feedback der Kunden. Additiv & idempotent.
--
-- Zweck: Nach den ersten Matches wird der Kunde einmal gefragt, wie er Revetly
-- findet, was fehlt und welches Feature er sich wünscht. Ausgelöst wird das
-- über die LEBENSZEIT-Zahl der Matches, nicht über `matches_used` — letzteres
-- wird jeden Monatsersten auf 0 gesetzt und würde die Frage sonst immer wieder
-- neu stellen.
--
-- Abgrenzung zu 022_feedback_loop.sql: dort geht es um Einstellungs-Outcomes,
-- mit denen sich das Matching kalibriert. Hier geht es um die Meinung des
-- Kunden zum Produkt. Zwei verschiedene Dinge, die nur zufällig beide
-- „Feedback" heißen.

-- ── Lebenszeit-Zähler ───────────────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists matches_lifetime integer not null default 0;

-- Bestandskonten: der bisher im laufenden Monat verbrauchte Stand ist die beste
-- verfügbare Näherung. Läuft nur einmal, weil danach lifetime >= used gilt.
update public.user_profiles
   set matches_lifetime = matches_used
 where matches_lifetime = 0
   and matches_used > 0;

-- ── Zustand der Feedback-Abfrage ────────────────────────────────────────────
-- Wie viele Schwellen (5 / 10 / 30 Matches) bereits erledigt sind: beantwortet
-- oder weggeklickt. Die Schwellen selbst stehen in lib/feedback/prompt.ts,
-- damit sie ohne Migration nachjustierbar bleiben.
alter table public.user_profiles
  add column if not exists feedback_prompt_stage smallint not null default 0;

-- Frühestens ab diesem Zeitpunkt darf wieder gefragt werden.
alter table public.user_profiles
  add column if not exists feedback_snoozed_until timestamptz;

-- „Nicht mehr fragen". Über die Einstellungen jederzeit widerrufbar.
alter table public.user_profiles
  add column if not exists feedback_opted_out boolean not null default false;

alter table public.user_profiles
  add column if not exists feedback_last_submitted_at timestamptz;

-- ── Die Rückmeldungen selbst ────────────────────────────────────────────────
create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Schulnote von 1 (schlecht) bis 5 (sehr gut). Optional, damit auch reiner
  -- Text abgeschickt werden kann.
  rating smallint check (rating is null or (rating between 1 and 5)),
  what_works text,
  what_to_improve text,
  feature_wish text,
  -- Kontext zum Zeitpunkt der Abgabe: hilft beim Einordnen der Antwort.
  matches_at_prompt integer,
  plan text,
  -- 'prompt' = automatische Abfrage, 'settings' = selbst aufgerufen
  source text not null default 'prompt',
  created_at timestamptz not null default now()
);

alter table public.product_feedback enable row level security;

-- Jeder sieht und schreibt nur die eigenen Rückmeldungen. Geschrieben wird in
-- der Praxis über den Service-Role-Key, die Insert-Policy ist die Absicherung
-- für den Fall, dass der Client direkt schreibt.
drop policy if exists "own product feedback select" on public.product_feedback;
create policy "own product feedback select" on public.product_feedback
  for select using (auth.uid() = user_id);

drop policy if exists "own product feedback insert" on public.product_feedback;
create policy "own product feedback insert" on public.product_feedback
  for insert with check (auth.uid() = user_id);

create index if not exists product_feedback_created_idx
  on public.product_feedback (created_at desc);

-- ── consume_match() zählt zusätzlich die Lebenszeit mit ─────────────────────
-- Wortgleich zu 006_match_counter_system.sql, ergänzt um genau eine Zuweisung
-- (matches_lifetime). Der Rest bleibt unverändert: Zeilensperre, fauler
-- Monatsreset, Limitprüfung.
CREATE OR REPLACE FUNCTION public.consume_match(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used    integer;
  v_limit   integer;
  v_period  date;
  v_current date := date_trunc('month', (now() AT TIME ZONE 'Europe/Berlin'))::date;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user <> auth.uid() THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'forbidden');
  END IF;

  SELECT matches_used, matches_limit, COALESCE(matches_period_start, v_current)
    INTO v_used, v_limit, v_period
    FROM public.user_profiles
   WHERE id = p_user
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  IF v_period < v_current THEN
    v_used := 0;
    v_period := v_current;
  END IF;

  IF v_used >= v_limit THEN
    UPDATE public.user_profiles
       SET matches_used = v_used, matches_period_start = v_period
     WHERE id = p_user;
    RETURN jsonb_build_object('allowed', false, 'reason', 'limit_reached',
                              'used', v_used, 'limit', v_limit, 'remaining', 0);
  END IF;

  UPDATE public.user_profiles
     SET matches_used     = v_used + 1,
         matches_period_start = v_period,
         matches_lifetime = COALESCE(matches_lifetime, 0) + 1
   WHERE id = p_user;

  RETURN jsonb_build_object('allowed', true, 'used', v_used + 1, 'limit', v_limit,
                            'remaining', v_limit - v_used - 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_match(uuid) TO authenticated, service_role;
