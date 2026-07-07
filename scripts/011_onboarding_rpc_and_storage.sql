-- ============================================================================
-- 011 — Onboarding without the service-role key (bugfix)
--
-- Problem: onboarding (save company + slug) and the logo upload used the
-- Supabase SERVICE_ROLE key from the Next.js server. When that env var is
-- missing/invalid the customer sees "Invalid API key" on "Weiter" and
-- "Upload fehlgeschlagen" on the logo, and is stuck.
--
-- Every onboarding action is the signed-in user editing THEIR OWN row, so
-- there is no reason to hold the master key in the app for it. This migration
-- moves the two operations that legitimately need cross-row visibility
-- (slug uniqueness) into SECURITY DEFINER functions the authenticated client
-- can call, and sets up a `logos` Storage bucket with RLS so the same client
-- can upload. After this, onboarding works with only the anon key.
--
-- Requires: 007 (slugify + user_profiles.slug), 009 (company_name).
-- Idempotent — safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Slug availability check (live, as the user types)
--    Returns { available, suggestion }. Excludes the caller's own row so
--    re-checking your own slug never reports "taken".
-- ----------------------------------------------------------------------------
create or replace function public.company_slug_status(p_value text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_base      text := coalesce(nullif(public.slugify(p_value), ''), 'kunde');
  v_candidate text := v_base;
  v_n         int  := 1;
  v_taken     boolean;
begin
  if v_uid is null then
    return json_build_object('available', false, 'suggestion', '');
  end if;

  select exists(
    select 1 from public.user_profiles where slug = v_base and id <> v_uid
  ) into v_taken;

  if not v_taken then
    return json_build_object('available', true, 'suggestion', v_base);
  end if;

  -- Base is taken: find the first free "-N" suffix.
  for i in 1..50 loop
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
    select exists(
      select 1 from public.user_profiles where slug = v_candidate and id <> v_uid
    ) into v_taken;
    exit when not v_taken;
  end loop;

  if v_taken then
    v_candidate := v_base || '-' || floor(extract(epoch from now()))::bigint;
  end if;

  return json_build_object('available', false, 'suggestion', v_candidate);
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Save the company: resolve a guaranteed-unique slug and write it plus the
--    company name onto the caller's own row. Returns the final slug.
--    The unique index on user_profiles.slug is the ultimate backstop; on the
--    (rare) concurrent collision we retry once with a timestamp suffix.
-- ----------------------------------------------------------------------------
create or replace function public.save_company(p_company_name text, p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_base      text := coalesce(
                        nullif(public.slugify(coalesce(nullif(p_slug, ''), p_company_name)), ''),
                        'kunde');
  v_candidate text := v_base;
  v_n         int  := 1;
  v_taken     boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(btrim(p_company_name), '') = '' then
    raise exception 'company name required';
  end if;

  select exists(
    select 1 from public.user_profiles where slug = v_candidate and id <> v_uid
  ) into v_taken;
  while v_taken and v_n < 50 loop
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
    select exists(
      select 1 from public.user_profiles where slug = v_candidate and id <> v_uid
    ) into v_taken;
  end loop;
  if v_taken then
    v_candidate := v_base || '-' || floor(extract(epoch from now()))::bigint;
  end if;

  begin
    update public.user_profiles
      set company_name = btrim(p_company_name), slug = v_candidate
      where id = v_uid;
  exception when unique_violation then
    v_candidate := v_base || '-' || floor(extract(epoch from now()))::bigint;
    update public.user_profiles
      set company_name = btrim(p_company_name), slug = v_candidate
      where id = v_uid;
  end;

  return v_candidate;
end;
$$;

grant execute on function public.company_slug_status(text) to authenticated;
grant execute on function public.save_company(text, text)   to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Logo Storage bucket + RLS
--    Public bucket (logos are shown on public job pages). Authenticated users
--    may write only inside a folder named after their own user id; everyone
--    may read. Replaces the "create the bucket by hand" step in the 009
--    runbook.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

drop policy if exists "logos_public_read"  on storage.objects;
drop policy if exists "logos_insert_own"   on storage.objects;
drop policy if exists "logos_update_own"   on storage.objects;
drop policy if exists "logos_delete_own"   on storage.objects;

create policy "logos_public_read" on storage.objects
  for select
  using (bucket_id = 'logos');

create policy "logos_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logos_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logos_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
