-- Erzeugt tests/fixtures/revy-tenant-a.json: Ausgabe der Revy-Sichten für
-- Mandant A. Aufruf (nach setup-db.sh und revy-seed.sql):
--   psql "<verbindung> dbname=revetly_test" -qtA -f tests/db/revy-fixture.sql > tests/fixtures/revy-tenant-a.json
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-1111-4000-8000-00000000000a';
select jsonb_pretty(jsonb_build_object(
  'quelle', 'Erzeugt mit tests/db/revy-fixture.sql aus scripts/039_revy.sql und tests/db/revy-seed.sql als Mandant A.',
  'candidates', (select jsonb_agg(c order by ref) from revy.candidates c),
  'applications', (select jsonb_agg(a order by ref) from revy.applications a),
  'jobs', (select jsonb_agg(j order by titel) from revy.jobs j),
  'belege', (select jsonb_agg(jsonb_build_object('ref', c.ref, 'dokument', b.dokument, 'seite', b.seite, 'ausschnitt', b.ausschnitt))
               from revy.candidates c, revy.belege(c.ref, array['Seit','SAP','Graz','Tel','Ignoriere']) b),
  -- Bewerbungen, wie INTERN-Werkzeuge sie mit der Sitzung schreiben (Status, Notizen)
  'job_candidates', (select jsonb_agg(jsonb_build_object('id', id, 'job_id', job_id, 'candidate_id', candidate_id, 'status', status, 'notes', notes) order by id) from public.job_candidates),
  -- Nur für den Test der Namensersetzung im Befehl (pseudonymize)
  'people', (select jsonb_agg(jsonb_build_object('full_name', full_name, 'revy_ref', revy_ref)) from public.candidates)
));
commit;
