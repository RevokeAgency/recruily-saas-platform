-- ============================================================================
-- 036_job_visibility.sql
-- Sichtbarkeit von Stellen im Team. Additiv & idempotent.
--
-- Erläuterung: 036_job_visibility.md
-- Voraussetzungen: 035 (Teamzugänge). Nach 035 einspielen.
--
-- Jede Stelle hat eine Erstellerin oder einen Ersteller (created_by) und eine
-- Sichtbarkeit:
--   private  nur die Person, die sie angelegt hat, und der Inhaber
--   team     alle im Team sehen und bearbeiten sie
--
-- Neue Stellen sind privat (Entscheidung des Inhabers, 16.10.2026). Bestand:
-- Ersteller ist der Inhaber, Sichtbarkeit privat. Für Konten ohne Team ändert
-- sich nichts, der Inhaber sieht immer alles.
--
-- Bewerber privater Stellen sind ebenfalls nur für diese Personen sichtbar,
-- auch in der Kandidatenliste und im Talent-Pool.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Spalten
-- ---------------------------------------------------------------------------
alter table public.jobs
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists visibility text not null default 'private';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_visibility_check') then
    alter table public.jobs
      add constraint jobs_visibility_check check (visibility in ('private', 'team'));
  end if;
end $$;

alter table public.candidates
  add column if not exists created_by uuid references auth.users (id) on delete set null;

-- Bestand: Ersteller ist der Inhaber.
update public.jobs       set created_by = user_id where created_by is null and user_id is not null;
update public.candidates set created_by = user_id where created_by is null and user_id is not null;

alter table public.jobs       alter column created_by set default auth.uid();
alter table public.candidates alter column created_by set default auth.uid();

create index if not exists jobs_user_visibility_idx on public.jobs (user_id, visibility, created_by);
create index if not exists job_candidates_candidate_idx on public.job_candidates (candidate_id);

comment on column public.jobs.visibility is
  'private: nur Ersteller und Inhaber. team: alle im Team.';


-- ---------------------------------------------------------------------------
-- 2) Wer darf eine Stelle sehen?
--    Der Inhaber immer, Mitglieder bei team oder als Ersteller. security
--    definer, damit die Prüfung in den Policies von job_candidates und
--    candidates nicht ihrerseits an RLS hängt.
-- ---------------------------------------------------------------------------
create or replace function public.job_visible(p_job uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jobs j
     where j.id = p_job
       and j.user_id = public.current_workspace()
       and (j.user_id = auth.uid() or j.visibility = 'team' or j.created_by = auth.uid())
  );
$$;

-- Bewerber: sichtbar über eine sichtbare Stelle, oder wenn man sie selbst
-- angelegt hat (noch ohne Stelle), oder als Inhaber.
create or replace function public.candidate_visible(p_candidate uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.candidates c
     where c.id = p_candidate
       and c.user_id = public.current_workspace()
       and (c.user_id = auth.uid() or c.created_by = auth.uid())
  ) or exists (
    select 1 from public.job_candidates jc
     where jc.candidate_id = p_candidate
       and public.job_visible(jc.job_id)
  );
$$;


-- ---------------------------------------------------------------------------
-- 3) Ersteller fest, Sichtbarkeit nur durch Ersteller oder Inhaber
-- ---------------------------------------------------------------------------
create or replace function public.protect_job_ownership()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
    else
      if new.created_by is distinct from old.created_by then
        raise exception 'job_created_by_fixed'
          using errcode = '42501', hint = 'Wer eine Stelle angelegt hat, ändert sich nicht.';
      end if;
      if new.visibility is distinct from old.visibility
         and auth.uid() is distinct from old.created_by
         and auth.uid() is distinct from old.user_id then
        raise exception 'job_visibility_forbidden'
          using errcode = '42501', hint = 'Die Sichtbarkeit ändert nur, wer die Stelle angelegt hat, oder der Inhaber.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists a_protect_job_ownership on public.jobs;
create trigger a_protect_job_ownership
  before insert or update on public.jobs
  for each row execute function public.protect_job_ownership();

create or replace function public.protect_candidate_creator()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from old.created_by then
      raise exception 'candidate_created_by_fixed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists a_protect_candidate_creator on public.candidates;
create trigger a_protect_candidate_creator
  before insert or update on public.candidates
  for each row execute function public.protect_candidate_creator();


-- ---------------------------------------------------------------------------
-- 4) Zugriffsregeln (ersetzen die aus 035)
-- ---------------------------------------------------------------------------
-- jobs
drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
  for select using (user_id = (select public.current_workspace())
    and (user_id = auth.uid() or visibility = 'team' or created_by = auth.uid()));
drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert with check (user_id = (select public.current_workspace()));
drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
  for update using (user_id = (select public.current_workspace())
    and (user_id = auth.uid() or visibility = 'team' or created_by = auth.uid()))
  with check (user_id = (select public.current_workspace()));
drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own" on public.jobs
  for delete using (user_id = (select public.current_workspace())
    and (user_id = auth.uid() or visibility = 'team' or created_by = auth.uid()));

-- job_candidates
drop policy if exists "job_candidates_select_own" on public.job_candidates;
create policy "job_candidates_select_own" on public.job_candidates
  for select using (user_id = (select public.current_workspace()) and public.job_visible(job_id));
drop policy if exists "job_candidates_insert_own" on public.job_candidates;
create policy "job_candidates_insert_own" on public.job_candidates
  for insert with check (user_id = (select public.current_workspace()) and public.job_visible(job_id));
drop policy if exists "job_candidates_update_own" on public.job_candidates;
create policy "job_candidates_update_own" on public.job_candidates
  for update using (user_id = (select public.current_workspace()) and public.job_visible(job_id))
  with check (user_id = (select public.current_workspace()) and public.job_visible(job_id));
drop policy if exists "job_candidates_delete_own" on public.job_candidates;
create policy "job_candidates_delete_own" on public.job_candidates
  for delete using (user_id = (select public.current_workspace()) and public.job_visible(job_id));

-- candidates
drop policy if exists "candidates_select_own" on public.candidates;
create policy "candidates_select_own" on public.candidates
  for select using (user_id = (select public.current_workspace()) and public.candidate_visible(id));
drop policy if exists "candidates_insert_own" on public.candidates;
create policy "candidates_insert_own" on public.candidates
  for insert with check (user_id = (select public.current_workspace()));
drop policy if exists "candidates_update_own" on public.candidates;
create policy "candidates_update_own" on public.candidates
  for update using (user_id = (select public.current_workspace()) and public.candidate_visible(id))
  with check (user_id = (select public.current_workspace()));
drop policy if exists "candidates_delete_own" on public.candidates;
create policy "candidates_delete_own" on public.candidates
  for delete using (user_id = (select public.current_workspace()) and public.candidate_visible(id));

-- Entscheidungsprotokoll: Ereignisse zu Stellen nur, wer die Stelle sieht.
drop policy if exists "decision_events_select_own" on public.decision_events;
create policy "decision_events_select_own" on public.decision_events
  for select using (user_id = (select public.current_workspace())
    and (job_id is null or public.job_visible(job_id)));
drop policy if exists "decision_events_insert_own" on public.decision_events;
create policy "decision_events_insert_own" on public.decision_events
  for insert with check (user_id = (select public.current_workspace())
    and (job_id is null or public.job_visible(job_id))
    and (actor_id is null or actor_id = auth.uid()));

-- Freigabe-Links
drop policy if exists "review_links_select_own" on public.review_links;
create policy "review_links_select_own" on public.review_links
  for select using (user_id = (select public.current_workspace()) and public.job_visible(job_id));
drop policy if exists "review_link_items_select_own" on public.review_link_items;
create policy "review_link_items_select_own" on public.review_link_items
  for select using (user_id = (select public.current_workspace())
    and exists (select 1 from public.review_links l where l.id = link_id));


-- ---------------------------------------------------------------------------
-- 5) my_workspace mit Teamgröße, damit die Oberfläche die Auswahl der
--    Sichtbarkeit nur zeigt, wenn es ein Team gibt.
-- ---------------------------------------------------------------------------
create or replace function public.my_workspace()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when m.member_id is null then json_build_object(
      'owner_id', auth.uid(), 'role', 'owner', 'active', true,
      'members', (select count(*) from public.workspace_members w where w.owner_id = auth.uid()))
    else json_build_object(
      'owner_id', m.owner_id, 'role', 'member', 'active', m.active,
      'members', (select count(*) from public.workspace_members w where w.owner_id = m.owner_id))
  end
  from (select 1) one
  left join public.workspace_members m on m.member_id = auth.uid();
$$;


-- ---------------------------------------------------------------------------
-- 6) Rechte
-- ---------------------------------------------------------------------------
grant execute on function public.job_visible(uuid)       to authenticated, service_role;
grant execute on function public.candidate_visible(uuid) to authenticated, service_role;
grant execute on function public.my_workspace()          to authenticated, service_role;
