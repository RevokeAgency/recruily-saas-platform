-- ============================================================================
-- 034_inbound_addresses.sql
-- Kurznamen der Kunden als Subdomain für Bewerbungsadressen. Additiv & idempotent.
--
-- Erläuterung: 034_inbound_addresses.md
-- Voraussetzungen: 007 (slugify, user_profiles.slug), 011 (company_slug_status,
-- save_company).
--
-- Adressformat: stelle@firma.revetly.ai, z. B.
--   kfz-mechatroniker@autohaus-berger.revetly.ai
-- Vor dem @ ein kurzer, fester Adressname pro Stelle (jobs.inbound_alias,
-- Abschnitt 5), die Subdomain ist der Kurzname des Kunden. Dafür gelten:
--   1. Belegte oder vorgesehene Subdomains (www, mail, app, …) sind keine
--      Kurznamen. Sonst gingen Bewerbungen an diese Adressen verloren, weil
--      dort andere DNS-Einträge gelten als der Wildcard-MX.
--   2. Höchstens 40 Zeichen. Eine Subdomain darf 63 haben, der Rest bleibt
--      Luft für Lesbarkeit.
-- Die Liste steht gleich in lib/email/routing.ts (RESERVED_SUBDOMAINS);
-- tests/routing.test.ts prüft, dass beide übereinstimmen.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Reservierte Kurznamen
-- ---------------------------------------------------------------------------
create or replace function public.slug_reserved(p_slug text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_slug, '')) = any (array[
    'www', 'app', 'api', 'admin', 'auth', 'login', 'dashboard', 'mail',
    'email', 'webmail', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'autodiscover',
    'autoconfig', 'bounce', 'bounces', 'return', 'noreply', 'no-reply', 'postmaster', 'abuse',
    'jobs', 'job', 'bewerbung', 'bewerbungen', 'apply', 'karriere', 'careers', 'termin',
    'freigabe', 'report', 'status', 'help', 'hilfe', 'support', 'docs', 'blog',
    'cdn', 'static', 'assets', 'media', 'files', 'dev', 'staging', 'test',
    'preview', 'demo', 'beta', 'ftp', 'ns', 'ns1', 'ns2', 'vpn',
    'billing', 'revetly'
  ]);
$$;


-- ---------------------------------------------------------------------------
-- 1b) Umlaute ausschreiben (ä → ae, ß → ss), wie man sie in einer Adresse
--     erwartet. slugify aus 007 macht aus ä nur a und aus ß nur s.
-- ---------------------------------------------------------------------------
create or replace function public.germanize(p_value text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(replace(replace(replace(coalesce(p_value, ''),
    'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'Ä', 'Ae'), 'Ö', 'Oe'), 'Ü', 'Ue'), 'ß', 'ss');
$$;


-- ---------------------------------------------------------------------------
-- 2) Grundform eines Kurznamens: slugify ohne Rechtsform (GmbH, KG, e.U. …),
--    höchstens 40 Zeichen, nach Möglichkeit an einem Bindestrich gekürzt,
--    Ersatz "kunde", wenn nichts übrig bleibt. Gleiche Regeln wie
--    customerSlugSuggestion in lib/email/routing.ts.
-- ---------------------------------------------------------------------------
create or replace function public.customer_slug_base(p_value text)
returns text
language sql
immutable
as $$
  with w as (
    select array_remove(string_to_array(public.slugify(public.germanize(p_value)), '-'), '') as all_words
  ), k as (
    select all_words,
           array(select x from unnest(all_words) x where not (x = any (array[
    'gmbh', 'gesmbh', 'mbh', 'ag', 'kg', 'og', 'ohg', 'ug', 'se', 'gbr',
    'co', 'eu', 'ev', 'e', 'u', 'v', 'ltd', 'limited', 'inc', 'haftungsbeschrankt'
           ]))) as kept
      from w
  ), j as (
    select array_to_string(case when cardinality(kept) > 0 then kept else all_words end, '-') as s from k
  )
  select coalesce(
    nullif(trim(both '-' from
      case
        when char_length(s) <= 40 then s
        else coalesce(substring(left(s, 41) from '^(.{20,40})-'), left(s, 40))
      end), ''),
    'kunde')
  from j;
$$;


-- ---------------------------------------------------------------------------
-- 3) Verfügbarkeit prüfen (live beim Tippen). Wie in 011, dazu: reservierte
--    Namen gelten als vergeben, Länge begrenzt.
-- ---------------------------------------------------------------------------
create or replace function public.company_slug_status(p_value text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_base      text := public.customer_slug_base(p_value);
  v_candidate text := v_base;
  v_n         int  := 1;
  v_taken     boolean;
begin
  if v_uid is null then
    return json_build_object('available', false, 'suggestion', '');
  end if;

  select public.slug_reserved(v_base) or exists(
    select 1 from public.user_profiles where slug = v_base and id <> v_uid
  ) into v_taken;

  if not v_taken then
    return json_build_object('available', true, 'suggestion', v_base);
  end if;

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


-- ---------------------------------------------------------------------------
-- 4) Firma speichern. Wie in 011, mit denselben zwei Regeln.
-- ---------------------------------------------------------------------------
create or replace function public.save_company(p_company_name text, p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_base      text := public.customer_slug_base(coalesce(nullif(p_slug, ''), p_company_name));
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

  select public.slug_reserved(v_candidate) or exists(
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

-- ---------------------------------------------------------------------------
-- 5) Adressname pro Stelle: jobs.inbound_alias
--    Die ersten zwei aussagekräftigen Wörter des Titels, ohne
--    Geschlechterzusatz, Seniorität und Füllwörter, höchstens 28 Zeichen,
--    Umlaute ausgeschrieben (ä → ae, ß → ss).
--    Pro Kunde eindeutig, bei Gleichstand mit Laufnummer (-2, -3 …). Beim
--    Anlegen vergeben und danach fest, damit eine veröffentlichte Adresse
--    gültig bleibt, auch wenn der Titel geändert wird.
--      "Kfz-Mechatroniker:in (m/w/d)"               → kfz-mechatroniker
--      "Senior Fachkraft für Lagerlogistik (m/w/d)" → fachkraft-lagerlogistik
--    Gleiche Regeln wie jobAliasBase in lib/email/routing.ts.
-- ---------------------------------------------------------------------------
create or replace function public.job_alias_base(p_title text)
returns text
language plpgsql
immutable
as $$
declare
  v_words text[];
  v_out   text := '';
  v_next  text;
  v_n     int := 0;
  w       text;
begin
  v_words := array(
    select x from unnest(string_to_array(public.slugify(public.germanize(p_title)), '-')) with ordinality as t(x, i)
     where x <> '' and not (x = any (array[
    'm', 'w', 'd', 'x', 'f', 'in', 'innen', 'all', 'alle', 'gender',
    'genders', 'geschlechter', 'und', 'oder', 'fur', 'fuer', 'mit', 'im', 'am', 'an',
    'der', 'die', 'das', 'den', 'zur', 'zum', 'bei', 'als', 'senior', 'junior',
    'lead', 'head', 'chief', 'praktikum', 'werkstudent', 'trainee', 'vollzeit', 'teilzeit', 'ab', 'sofort',
    'befristet', 'unbefristet'
     ]))
     order by i
  );
  foreach w in array v_words loop
    exit when v_n >= 2;
    v_next := case when v_out = '' then w else v_out || '-' || w end;
    exit when char_length(v_next) > 28;
    v_out := v_next;
    v_n := v_n + 1;
  end loop;
  if v_out = '' and cardinality(v_words) > 0 then
    v_out := left(v_words[1], 28);
  end if;
  return coalesce(nullif(v_out, ''), 'bewerbung');
end;
$$;

alter table public.jobs add column if not exists inbound_alias text;

create unique index if not exists jobs_user_inbound_alias_idx
  on public.jobs (user_id, inbound_alias)
  where inbound_alias is not null;

-- Freien Adressnamen für eine Stelle finden: Grundform, sonst mit Laufnummer.
create or replace function public.next_job_alias(p_user uuid, p_title text, p_job uuid)
returns text
language plpgsql
as $$
declare
  v_base text := public.job_alias_base(p_title);
  v_try  text := v_base;
  v_n    int  := 1;
begin
  while exists (
    select 1 from public.jobs
     where user_id = p_user and inbound_alias = v_try and id is distinct from p_job
  ) loop
    v_n := v_n + 1;
    v_try := v_base || '-' || v_n;
  end loop;
  return v_try;
end;
$$;

create or replace function public.set_job_inbound_alias()
returns trigger
language plpgsql
as $$
begin
  if new.inbound_alias is null and new.user_id is not null then
    new.inbound_alias := public.next_job_alias(new.user_id, new.title, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists set_job_inbound_alias on public.jobs;
create trigger set_job_inbound_alias
  before insert on public.jobs
  for each row execute function public.set_job_inbound_alias();

-- Bestehende Stellen nachziehen, älteste zuerst (die bekommt die Grundform).
do $$
declare r record;
begin
  for r in select id, user_id, title from public.jobs
            where inbound_alias is null and user_id is not null
            order by created_at, id
  loop
    update public.jobs
       set inbound_alias = public.next_job_alias(r.user_id, r.title, r.id)
     where id = r.id;
  end loop;
end $$;

-- Der Adressname gehört zur Adresse, nicht zum Formular: Konten dürfen ihn
-- nicht direkt ändern. Die App schreibt ihn nie, nur der Trigger oben.
create or replace function public.protect_job_inbound_alias()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and new.inbound_alias is distinct from old.inbound_alias then
    raise exception 'inbound_alias ist fest'
      using errcode = '42501', hint = 'Der Adressname einer Stelle wird beim Anlegen vergeben.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_job_inbound_alias on public.jobs;
create trigger protect_job_inbound_alias
  before update on public.jobs
  for each row execute function public.protect_job_inbound_alias();


grant execute on function public.slug_reserved(text)          to authenticated, service_role;
grant execute on function public.customer_slug_base(text)     to authenticated, service_role;
grant execute on function public.job_alias_base(text)         to authenticated, service_role;
grant execute on function public.germanize(text)              to authenticated, service_role;
grant execute on function public.company_slug_status(text)    to authenticated;
grant execute on function public.save_company(text, text)     to authenticated;


-- ---------------------------------------------------------------------------
-- 6) Bestehende Konten prüfen (ändert nichts). Liefert Kunden, deren
--    Kurzname reserviert oder zu lang ist. Vor dem Start sollte das leer sein;
--    sonst den Kurznamen dieser Konten von Hand ändern.
-- ---------------------------------------------------------------------------
select id, slug, company_name,
       case when public.slug_reserved(slug) then 'reserviert' else 'zu lang' end as grund
  from public.user_profiles
 where slug is not null
   and (public.slug_reserved(slug) or char_length(slug) > 40);
