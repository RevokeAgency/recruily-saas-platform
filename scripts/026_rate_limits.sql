-- 026_rate_limits.sql — Missbrauchsschutz für die öffentlichen Endpunkte.
-- Additiv & idempotent.
--
-- Warum in Postgres und nicht im Speicher: Die Anwendung läuft serverless.
-- Jede Anfrage kann in einer anderen Instanz landen, ein Zähler im
-- Arbeitsspeicher zählt also pro Instanz und schützt damit gar nichts. Redis
-- wäre der übliche Weg, kostet aber einen weiteren Dienst; bei den erwarteten
-- Mengen (einzelne Bewerbungen, keine Lastspitzen) reicht eine Tabelle mit
-- einem atomaren Upsert.
--
-- Verfahren: festes Zeitfenster. Der Fensterbeginn wird aus der Uhrzeit
-- errechnet, nicht gespeichert, dadurch braucht es keinen Aufräumlauf zwischen
-- den Fenstern. Alte Zeilen räumt der nächtliche Cron mit weg.

create table if not exists public.rate_limits (
  -- Wofür gezählt wird, z. B. 'apply_ip' oder 'deletion_email'.
  bucket text not null,
  -- Wer gezählt wird. Bei IP-Adressen ein Hash, nie die Adresse selbst:
  -- Eine IP ist ein personenbezogenes Datum und hat hier nichts verloren.
  subject text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, subject, window_start)
);

-- Kein Zugriff für angemeldete Clients. Geschrieben wird ausschließlich über
-- die SECURITY-DEFINER-Funktion unten bzw. den Service-Role-Key.
alter table public.rate_limits enable row level security;

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

/**
 * Zählt einen Zugriff und meldet, ob er noch erlaubt ist.
 *
 * Atomar über insert … on conflict do update … returning: Zwei gleichzeitige
 * Anfragen können sich nicht gegenseitig überholen, wie schon bei
 * consume_match().
 *
 * Rückgabe: { allowed, hits, limit, remaining, retry_after_seconds }
 */
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_subject is null or p_subject = '' or p_limit <= 0 or p_window_seconds <= 0 then
    -- Ohne brauchbaren Schlüssel wird nicht gezählt, aber auch nicht gesperrt.
    return jsonb_build_object('allowed', true, 'hits', 0, 'limit', p_limit, 'remaining', p_limit);
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (bucket, subject, window_start, hits)
  values (p_bucket, p_subject, v_window_start, 1)
  on conflict (bucket, subject, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  return jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'hits', v_hits,
    'limit', p_limit,
    'remaining', greatest(p_limit - v_hits, 0),
    'retry_after_seconds',
      greatest(ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - now())))::integer, 1)
  );
end;
$$;

grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

/** Räumt abgelaufene Zähler weg. Wird vom nächtlichen Cron aufgerufen. */
create or replace function public.purge_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_deleted integer;
begin
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.purge_rate_limits() to service_role;

-- ── Doppelbewerbungen ───────────────────────────────────────────────────────
-- Verhindert, dass dieselbe Person durch mehrfaches Absenden mehrere Datensätze
-- und mehrere Matches im selben Job erzeugt. Teilindex, damit Kandidaten ohne
-- E-Mail-Adresse (Inbound ohne Absender) davon unberührt bleiben.
create index if not exists candidates_owner_email_idx
  on public.candidates (user_id, lower(email))
  where email is not null;
