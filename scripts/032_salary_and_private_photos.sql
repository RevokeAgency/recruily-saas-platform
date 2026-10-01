-- ============================================================================
-- 032_salary_and_private_photos.sql
-- Gehalt auf der Stellenseite, Bewerberfotos privat. Additiv & idempotent.
--
-- Erläuterung: 032_salary_and_private_photos.md
-- Voraussetzungen: 012 (public_job_by_slug), 014 (Bucket candidate-photos).
-- Setzt 031 nicht voraus: Die Funktion unten enthält alles aus 031 plus das
-- Gehalt, die Reihenfolge der beiden ist egal.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Stellenseite liefert das Gehalt mit
--    In Österreich muss jede Stellenanzeige das Mindestentgelt nennen
--    (§ 9 Abs. 2 GlBG). Das Feld gab es im Formular, die öffentliche Seite
--    hat es nie abgefragt. Wie in 031 (mit Datum für Google for Jobs),
--    ergänzt um salary_range.
-- ---------------------------------------------------------------------------
create or replace function public.public_job_by_slug(p_customer_slug text, p_job_slug text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'id',                j.id,
    'title',             j.title,
    'company',           j.company,
    'location',          j.location,
    'employment_type',   j.employment_type,
    'salary_range',      j.salary_range,
    'description',       j.description,
    'required_skills',   j.required_skills,
    'years_experience',  j.years_experience,
    'is_active',         j.is_active,
    'logo_url',          p.logo_url,
    'created_at',        j.created_at,
    'updated_at',        j.updated_at
  )
  from public.jobs j
  join public.user_profiles p on p.id = j.user_id
  where p.slug = p_customer_slug
    and j.public_slug = p_job_slug
  limit 1;
$$;

grant execute on function public.public_job_by_slug(text, text) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 2) Bewerberfotos privat
--    Bis jetzt öffentlich (014): Wer den Link zu einem Foto hatte, konnte es
--    ohne Anmeldung öffnen. Ab jetzt liefert die App Fotos nur über die
--    eigene Route /api/candidates/<id>/photo aus, mit Prüfung des Kontos und
--    einem signierten Link (lib/candidate-photo.ts).
--
--    Reihenfolge beim Ausrollen ist egal: Der neue Code schreibt bereits
--    Routen-Pfade, und signierte Links funktionieren auch, solange der
--    Speicher noch öffentlich ist.
-- ---------------------------------------------------------------------------
update storage.buckets set public = false where id = 'candidate-photos';

drop policy if exists "candidate_photos_public_read" on storage.objects;

-- Bestehende öffentliche Adressen auf die Route umschreiben. Nur Zeilen, die
-- noch auf den Speicher zeigen, der Rest bleibt unberührt.
update public.candidates
   set photo_url = '/api/candidates/' || id || '/photo'
 where photo_url like '%/candidate-photos/%';
