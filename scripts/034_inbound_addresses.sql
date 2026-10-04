-- ============================================================================
-- 034_inbound_addresses.sql
-- Kurznamen der Kunden als Subdomain für Bewerbungsadressen. Additiv & idempotent.
--
-- Erläuterung: 034_inbound_addresses.md
-- Voraussetzungen: 007 (slugify, user_profiles.slug), 011 (company_slug_status,
-- save_company).
--
-- Neues Adressformat: kfz-mechatroniker@autohaus-berger.revetly.ai. Der
-- Kurzname des Kunden wird damit zur Subdomain. Zwei Regeln kommen dazu:
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
-- 2) Grundform eines Kurznamens: slugify, höchstens 40 Zeichen, nach
--    Möglichkeit an einem Bindestrich gekürzt statt mitten im Wort, Ersatz
--    "kunde", wenn nichts übrig bleibt.
-- ---------------------------------------------------------------------------
create or replace function public.customer_slug_base(p_value text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(both '-' from
      case
        when char_length(s) <= 40 then s
        else coalesce(substring(left(s, 41) from '^(.{20,40})-'), left(s, 40))
      end), ''),
    'kunde')
  from (select public.slugify(p_value) as s) x;
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

grant execute on function public.slug_reserved(text)          to authenticated, service_role;
grant execute on function public.customer_slug_base(text)     to authenticated, service_role;
grant execute on function public.company_slug_status(text)    to authenticated;
grant execute on function public.save_company(text, text)     to authenticated;


-- ---------------------------------------------------------------------------
-- 5) Bestehende Konten prüfen (ändert nichts). Liefert Kunden, deren
--    Kurzname reserviert oder zu lang ist. Vor dem Start sollte das leer sein;
--    sonst den Kurznamen dieser Konten von Hand ändern.
-- ---------------------------------------------------------------------------
select id, slug, company_name,
       case when public.slug_reserved(slug) then 'reserviert' else 'zu lang' end as grund
  from public.user_profiles
 where slug is not null
   and (public.slug_reserved(slug) or char_length(slug) > 40);
