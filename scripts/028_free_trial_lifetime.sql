-- ============================================================================
-- 028_free_trial_lifetime.sql
-- Free-Plan wird zur einmaligen Probestelle. Additiv & idempotent.
--
-- Regeln:
--   * Free: 1 Stelle und 25 Matches, einmal pro Konto, keine Monatserneuerung.
--   * Gezählt wird, was verbraucht bzw. angelegt wurde. Löschen gibt nichts
--     zurück.
--   * Ein Probekontingent pro Firmendomain. Freemail-Domains bekommen keins.
--     Das Konto darf trotzdem entstehen, ist dann aber nur mit einem
--     bezahlten Plan nutzbar.
--   * Bezahlte Pläne bleiben unverändert monatlich.
--
-- Erläuterung und Begründung der Entscheidungen: 028_free_trial_lifetime.md
-- Voraussetzungen: 006, 010, 018, 024 (matches_lifetime wird hier defensiv
-- mit angelegt, falls 024 fehlt).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) Spalten
-- ---------------------------------------------------------------------------

-- Gesamtzähler der verbrauchten Matches. Existiert seit 024 und wird dort von
-- consume_match() atomar mitgeführt. Hier nur defensiv angelegt.
alter table public.user_profiles
  add column if not exists matches_lifetime integer not null default 0;

-- Gesamtzähler der je angelegten Stellen. Wird von einem Trigger auf jobs
-- hochgezählt und nie verringert.
alter table public.user_profiles
  add column if not exists jobs_created_lifetime integer not null default 0;

-- Stammen aus 017. Hier defensiv mit angelegt, weil der Spaltenschutz in
-- Abschnitt 12 sie liest: Fehlten sie, bräche der Trigger jedes Update ab.
alter table public.user_profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- Anspruch auf die Probestelle. Standard ist FALSE: Ein neues Konto bekommt
-- die Probestelle erst, wenn seine Domain serverseitig geprüft und
-- eingetragen ist (siehe claim_free_trial unten).
alter table public.user_profiles
  add column if not exists trial_eligible boolean not null default false;


-- ---------------------------------------------------------------------------
-- 2) Tabellen für die Domainprüfung
-- ---------------------------------------------------------------------------

-- Welche Firmendomain ihre Probestelle schon bekommen hat.
create table if not exists public.free_trial_domains (
  domain        text primary key,
  first_user_id uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- RLS an, bewusst OHNE Policies: Nur service_role und SECURITY-DEFINER-
-- Funktionen kommen heran. Ein Client soll weder lesen, welche Firmen Revetly
-- testen, noch Domains eintragen oder freigeben können.
alter table public.free_trial_domains enable row level security;

-- Freemail-Domains. Spiegel von lib/auth/freemail-domains.ts, damit die
-- Sperre auch greift, wenn jemand signUp() am Formular vorbei direkt aufruft
-- (der Anon-Key ist öffentlich). Beide Listen zusammen pflegen.
create table if not exists public.freemail_domains (
  domain text primary key
);
alter table public.freemail_domains enable row level security;

insert into public.freemail_domains (domain) values
  ('gmail.com'), ('googlemail.com'),
  ('gmx.at'), ('gmx.de'), ('gmx.net'), ('gmx.ch'), ('gmx.com'), ('gmx.eu'),
  ('web.de'), ('email.de'), ('freenet.de'), ('arcor.de'), ('posteo.de'), ('posteo.net'),
  ('mailbox.org'), ('t-online.de'), ('online.de'), ('1und1.de'),
  ('yahoo.com'), ('yahoo.de'), ('yahoo.at'), ('ymail.com'), ('rocketmail.com'),
  ('outlook.com'), ('outlook.de'), ('outlook.at'), ('hotmail.com'), ('hotmail.de'),
  ('hotmail.at'), ('live.com'), ('live.de'), ('live.at'), ('msn.com'),
  ('icloud.com'), ('me.com'), ('mac.com'),
  ('aon.at'), ('chello.at'), ('a1.net'), ('kabsi.at'), ('liwest.at'), ('drei.at'),
  ('bluewin.ch'), ('hispeed.ch'), ('sunrise.ch'),
  ('proton.me'), ('protonmail.com'), ('protonmail.ch'), ('pm.me'), ('tutanota.com'),
  ('tutanota.de'), ('tuta.io'),
  ('mail.com'), ('aol.com'), ('aol.de'), ('zoho.com'), ('yandex.com'), ('yandex.ru'),
  ('mail.ru'), ('gmx.org')
on conflict (domain) do nothing;


-- ---------------------------------------------------------------------------
-- 3) Limitfunktionen: Free steht jetzt auf 25 / 1
--    Reine Nachschlagefunktionen Plan -> Zahl, IMMUTABLE. Die Gesamtzähler
--    gehören NICHT hier hinein: Die Funktionen speisen den Trigger
--    sync_plan_limits() und müssen ohne Nutzerbezug auskommen. Wo Free den
--    Gesamtzähler statt des Monatszählers verwendet, steht in consume_match(),
--    match_usage() und job_quota() weiter unten.
-- ---------------------------------------------------------------------------
create or replace function public.plan_match_limit(p_plan text)
returns integer language sql immutable as $$
  select case p_plan
    when 'free'    then 25
    when 'starter' then 50
    when 'growth'  then 300
    when 'pro'     then 1000
    else 25
  end;
$$;

create or replace function public.plan_job_limit(p_plan text)
returns integer language sql immutable as $$
  select case p_plan
    when 'free'    then 1
    when 'starter' then 3
    when 'growth'  then 10
    when 'pro'     then 999
    else 1
  end;
$$;


-- ---------------------------------------------------------------------------
-- 4) Plan-Trigger: rechnet die Limits aus Plan UND Probestellen-Anspruch
--
--    Für Free hält der Trigger die beiden Spalten, die die Oberfläche direkt
--    liest, in einem Zustand, der ohne Monatslogik stimmt:
--      matches_limit = 25 bei Anspruch, sonst 0
--      matches_used  = Gesamtverbrauch, gedeckelt auf das Limit
--    Damit zeigen Topbar, Sidebar, Zähler und Abo-Seite die Probestelle
--    richtig an, ohne dass jede Anzeige die Regel selbst nachrechnen muss.
--
--    Wechsel von Free in einen bezahlten Plan beginnt eine frische
--    Monatsperiode. Ohne das stünde der Kunde im ersten bezahlten Monat mit
--    dem Verbrauch aus der Probestelle da.
-- ---------------------------------------------------------------------------
create or replace function public.sync_plan_limits()
returns trigger language plpgsql as $$
begin
  if NEW.plan is distinct from 'enterprise' then
    if NEW.plan = 'free' then
      NEW.matches_limit     := case when NEW.trial_eligible then public.plan_match_limit('free') else 0 end;
      NEW.active_jobs_limit := case when NEW.trial_eligible then public.plan_job_limit('free')   else 0 end;
      NEW.matches_used      := least(coalesce(NEW.matches_lifetime, 0), NEW.matches_limit);
    else
      NEW.matches_limit     := public.plan_match_limit(NEW.plan);
      NEW.active_jobs_limit := public.plan_job_limit(NEW.plan);
      if TG_OP = 'UPDATE' and OLD.plan = 'free' then
        NEW.matches_used         := 0;
        NEW.matches_period_start := date_trunc('month', (now() at time zone 'Europe/Berlin'))::date;
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

-- Trigger neu binden, jetzt auch auf trial_eligible. So reicht es, den
-- Anspruch zu setzen, und die Limits ziehen im selben UPDATE nach.
drop trigger if exists on_plan_change on public.user_profiles;
create trigger on_plan_change
  before update of plan, trial_eligible on public.user_profiles
  for each row execute function public.sync_plan_limits();


-- ---------------------------------------------------------------------------
-- 5) Domain-Hilfen und die Vergabe der Probestelle
-- ---------------------------------------------------------------------------
create or replace function public.email_domain(p_email text)
returns text language sql immutable as $$
  select nullif(lower(trim(split_part(coalesce(p_email, ''), '@', 2))), '');
$$;

-- Vergibt die Probestelle, wenn die Domain eine Firmendomain ist und noch
-- keine Probestelle hatte. Idempotent: Wer die Domain schon besitzt, behält
-- den Anspruch. Gibt zurück, ob das Konto den Anspruch jetzt hat.
create or replace function public.claim_free_trial(p_user uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain   text := public.email_domain(p_email);
  v_eligible boolean := false;
begin
  if v_domain is not null
     and not exists (select 1 from public.freemail_domains where domain = v_domain) then
    insert into public.free_trial_domains (domain, first_user_id)
      values (v_domain, p_user)
      on conflict (domain) do nothing;
    -- Eingetragen, oder die Domain gehört schon diesem Konto (erneuter Aufruf).
    v_eligible := exists (
      select 1 from public.free_trial_domains
       where domain = v_domain and first_user_id = p_user
    );
  end if;

  -- Löst on_plan_change aus, der die Limits passend setzt.
  update public.user_profiles set trial_eligible = v_eligible where id = p_user;
  return v_eligible;
end;
$$;

revoke all on function public.claim_free_trial(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_free_trial(uuid, text) to service_role;


-- ---------------------------------------------------------------------------
-- 6) Registrierung: Profil ohne Anspruch anlegen, Anspruch erst nach
--    bestätigter E-Mail vergeben
--
--    Warum erst nach der Bestätigung: Sonst könnte jemand mit einer fremden
--    Firmenadresse ein Konto anlegen, die Bestätigung nie abschließen und
--    damit die Probestelle der ganzen Domain verbrennen. Ist die
--    E-Mail-Bestätigung abgeschaltet oder kommt das Konto über OAuth, steht
--    email_confirmed_at schon beim Anlegen, und der Anspruch wird sofort
--    geprüft.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles
    (id, first_name, last_name, plan, matches_used, matches_limit, active_jobs_limit,
     onboarded, trial_eligible)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    'free',
    0,
    0,
    0,
    false,
    false
  )
  on conflict (id) do nothing;

  if new.email_confirmed_at is not null then
    perform public.claim_free_trial(new.id, new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.claim_free_trial(new.id, new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();


-- ---------------------------------------------------------------------------
-- 7) consume_match(): Free zählt gegen den Gesamtzähler, ohne Monatsreset
--    Der bezahlte Zweig ist wortgleich zu 024.
-- ---------------------------------------------------------------------------
create or replace function public.consume_match(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used     integer;
  v_limit    integer;
  v_period   date;
  v_plan     text;
  v_lifetime integer;
  v_current  date := date_trunc('month', (now() at time zone 'Europe/Berlin'))::date;
begin
  if auth.uid() is not null and p_user <> auth.uid() then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  select matches_used, matches_limit, coalesce(matches_period_start, v_current),
         plan, coalesce(matches_lifetime, 0)
    into v_used, v_limit, v_period, v_plan, v_lifetime
    from public.user_profiles
   where id = p_user
   for update;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_profile');
  end if;

  -- Probestelle: Gesamtzähler, nie zurückgesetzt. v_limit ist 25 oder 0,
  -- gesetzt vom Plan-Trigger je nach Anspruch.
  if v_plan = 'free' then
    if v_lifetime >= v_limit then
      update public.user_profiles
         set matches_used = least(v_lifetime, v_limit)
       where id = p_user;
      return jsonb_build_object('allowed', false, 'reason', 'limit_reached',
                                'used', least(v_lifetime, v_limit), 'limit', v_limit,
                                'remaining', 0, 'quota_period', 'lifetime');
    end if;

    update public.user_profiles
       set matches_lifetime = v_lifetime + 1,
           matches_used     = v_lifetime + 1
     where id = p_user;

    return jsonb_build_object('allowed', true, 'used', v_lifetime + 1, 'limit', v_limit,
                              'remaining', v_limit - v_lifetime - 1,
                              'quota_period', 'lifetime');
  end if;

  -- Bezahlte Pläne: fauler Monatsreset wie bisher.
  if v_period < v_current then
    v_used := 0;
    v_period := v_current;
  end if;

  if v_used >= v_limit then
    update public.user_profiles
       set matches_used = v_used, matches_period_start = v_period
     where id = p_user;
    return jsonb_build_object('allowed', false, 'reason', 'limit_reached',
                              'used', v_used, 'limit', v_limit, 'remaining', 0,
                              'quota_period', 'monthly');
  end if;

  update public.user_profiles
     set matches_used         = v_used + 1,
         matches_period_start = v_period,
         matches_lifetime     = v_lifetime + 1
   where id = p_user;

  return jsonb_build_object('allowed', true, 'used', v_used + 1, 'limit', v_limit,
                            'remaining', v_limit - v_used - 1, 'quota_period', 'monthly');
end;
$$;


-- ---------------------------------------------------------------------------
-- 8) match_usage(): Lesesicht mit derselben Regel
-- ---------------------------------------------------------------------------
create or replace function public.match_usage(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer; v_limit integer; v_jobs integer; v_period date; v_plan text;
  v_lifetime integer; v_eligible boolean;
  v_current date := date_trunc('month', (now() at time zone 'Europe/Berlin'))::date;
begin
  if auth.uid() is not null and p_user <> auth.uid() then
    return null;
  end if;

  select matches_used, matches_limit, active_jobs_limit,
         coalesce(matches_period_start, v_current), plan,
         coalesce(matches_lifetime, 0), trial_eligible
    into v_used, v_limit, v_jobs, v_period, v_plan, v_lifetime, v_eligible
    from public.user_profiles where id = p_user;

  if not found then return null; end if;

  if v_plan = 'free' then
    v_used := least(v_lifetime, v_limit);
  elsif v_period < v_current then
    v_used := 0;
  end if;

  return jsonb_build_object(
    'used', v_used, 'limit', v_limit, 'remaining', greatest(v_limit - v_used, 0),
    'active_jobs_limit', v_jobs, 'plan', v_plan,
    'quota_period', case when v_plan = 'free' then 'lifetime' else 'monthly' end,
    'trial_eligible', v_eligible
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- 9) job_quota(): eine Stelle für die Stellenprüfung im App-Code
--
--    p_creating = true:  Darf eine NEUE Stelle angelegt werden?
--                        Free: gegen jobs_created_lifetime (auch Entwürfe
--                        zählen, sonst ließe sich die Grenze mit
--                        Entwurf-aktivieren-deaktivieren umgehen).
--                        Bezahlt: gegen die aktiven Stellen.
--    p_creating = false: Darf eine bestehende Stelle wieder aktiv werden?
--                        Für alle Pläne gegen die aktiven Stellen.
-- ---------------------------------------------------------------------------
create or replace function public.job_quota(p_user uuid, p_creating boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text; v_limit integer; v_created integer; v_active integer; v_used integer;
begin
  if auth.uid() is not null and p_user <> auth.uid() then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  select plan, active_jobs_limit, coalesce(jobs_created_lifetime, 0)
    into v_plan, v_limit, v_created
    from public.user_profiles where id = p_user;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_profile');
  end if;

  select count(*) into v_active
    from public.jobs where user_id = p_user and is_active = true;

  v_used := case when v_plan = 'free' and p_creating then v_created else v_active end;

  return jsonb_build_object(
    'allowed', v_used < v_limit,
    'reason', case when v_used < v_limit then null else 'job_limit_reached' end,
    'used', v_used, 'limit', v_limit, 'plan', v_plan,
    'quota_period', case when v_plan = 'free' and p_creating then 'lifetime' else 'monthly' end
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- 10) Stellen zählen und für Free hart begrenzen
--     BEFORE INSERT mit Zeilensperre auf dem Profil: Zwei gleichzeitige
--     Anlagen können die Grenze nicht gemeinsam überspringen, und die Regel
--     greift auch für jeden Weg, der am App-Code vorbei in jobs schreibt.
-- ---------------------------------------------------------------------------
create or replace function public.count_job_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text; v_limit integer; v_created integer;
begin
  select plan, active_jobs_limit, coalesce(jobs_created_lifetime, 0)
    into v_plan, v_limit, v_created
    from public.user_profiles where id = new.user_id
    for update;

  if found then
    if v_plan = 'free' and v_created >= v_limit then
      raise exception 'free_trial_job_limit'
        using errcode = 'P0001',
              hint = 'Die Probestelle ist verbraucht. Für weitere Stellen einen Plan wählen.';
    end if;

    update public.user_profiles
       set jobs_created_lifetime = v_created + 1
     where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_job_created on public.jobs;
create trigger on_job_created
  before insert on public.jobs
  for each row execute function public.count_job_creation();


-- ---------------------------------------------------------------------------
-- 11) Bestand übernehmen
-- ---------------------------------------------------------------------------

-- Angelegte Stellen nachzählen. Gelöschte Stellen sind nicht mehr zu sehen,
-- der heutige Bestand ist die beste Näherung. Läuft nur nach oben.
update public.user_profiles p
   set jobs_created_lifetime = sub.n
  from (select user_id, count(*)::integer as n from public.jobs group by user_id) sub
 where p.id = sub.user_id
   and p.jobs_created_lifetime < sub.n;

-- Bestandskonten behalten ihren Anspruch. Sie haben sich unter den alten
-- Bedingungen registriert.
--
-- Stichtag ist der Zeitpunkt des ERSTEN Laufs dieser Migration, festgehalten
-- in einer Markierungszeile. Ein fester Datumswert wäre falsch, weil die
-- Migration später ausgeführt wird als geschrieben, und now() allein wäre
-- beim zweiten Lauf zu großzügig: Er würde auch Konten nachträglich
-- freischalten, denen die neue Logik den Anspruch bewusst verweigert hat.
create table if not exists public.migration_markers (
  key        text primary key,
  applied_at timestamptz not null default now()
);
alter table public.migration_markers enable row level security;

insert into public.migration_markers (key) values ('028_free_trial')
on conflict (key) do nothing;

update public.user_profiles p
   set trial_eligible = true
  from auth.users u, public.migration_markers m
 where m.key = '028_free_trial'
   and u.id = p.id
   and p.trial_eligible = false
   and u.created_at < m.applied_at;

-- Domains der Bestandskonten eintragen, damit die Regel ab jetzt auch für
-- sie gilt. Pro Domain gewinnt das älteste Konto. Freemail bleibt draußen.
insert into public.free_trial_domains (domain, first_user_id, created_at)
select distinct on (public.email_domain(u.email))
       public.email_domain(u.email), u.id, u.created_at
  from auth.users u
 where public.email_domain(u.email) is not null
   and not exists (select 1 from public.freemail_domains f
                    where f.domain = public.email_domain(u.email))
 order by public.email_domain(u.email), u.created_at
on conflict (domain) do nothing;

-- Limits aller Nicht-Enterprise-Konten neu berechnen. Das UPDATE setzt plan
-- auf sich selbst, damit on_plan_change feuert und dieselbe Logik wie im
-- Betrieb anwendet, statt sie hier ein zweites Mal hinzuschreiben.
update public.user_profiles
   set plan = plan
 where plan <> 'enterprise';

-- Spaltenvorgaben als zweite Verteidigungslinie: Ohne Anspruch keine Matches.
alter table public.user_profiles alter column matches_limit     set default 0;
alter table public.user_profiles alter column active_jobs_limit set default 0;


-- ---------------------------------------------------------------------------
-- 12) Spaltenschutz auf user_profiles
--
--    Die Policy "user_profiles_update_own" aus 015 erlaubt jedem Konto, JEDE
--    Spalte seiner eigenen Zeile zu ändern, direkt aus dem Browser mit dem
--    öffentlichen Anon-Key. Das war schon vor dieser Migration ein Loch:
--    update({ plan: 'pro' }) genügte, und der Plan-Trigger vergab dann die
--    Pro-Limits, ohne dass je bezahlt wurde. Mit den neuen Zählern käme dazu,
--    dass sich jemand die Probestelle selbst freischaltet oder den
--    Gesamtzähler zurückdreht.
--
--    Der Schutz unterscheidet nach der Datenbankrolle des Aufrufers:
--    Direkte Client-Zugriffe laufen als "authenticated" und dürfen die
--    geschützten Spalten nicht verändern. service_role (Stripe-Sync,
--    Checkout, Cron) und SECURITY-DEFINER-Funktionen (consume_match,
--    claim_free_trial, die Trigger) laufen unter einer anderen Rolle und
--    bleiben unberührt. Deshalb ist diese Funktion selbst bewusst NICHT
--    security definer, sonst sähe sie immer die Eigentümerrolle.
--
--    stripe_customer_id steht mit drin, weil das Kundenportal genau diese
--    Kennung aus dem Profil liest. Wer sie selbst setzen kann, öffnet das
--    Abrechnungsportal eines fremden Kunden.
--
--    Geprüft gegen den App-Code: Kein Pfad, der als Nutzer schreibt, fasst
--    eine dieser Spalten an. Onboarding, Feedback, Logo und Einwilligung
--    schreiben andere Spalten; Checkout und Stripe-Sync schreiben über
--    service_role.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.plan                   is distinct from old.plan
       or new.matches_used          is distinct from old.matches_used
       or new.matches_limit         is distinct from old.matches_limit
       or new.matches_period_start  is distinct from old.matches_period_start
       or new.matches_lifetime      is distinct from old.matches_lifetime
       or new.active_jobs_limit     is distinct from old.active_jobs_limit
       or new.trial_eligible        is distinct from old.trial_eligible
       or new.jobs_created_lifetime is distinct from old.jobs_created_lifetime
       or new.stripe_customer_id    is distinct from old.stripe_customer_id
       or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    then
      raise exception 'protected_profile_columns'
        using errcode = '42501',
              hint = 'Plan, Kontingent und Abrechnung ändern sich nur serverseitig.';
    end if;
  end if;
  return new;
end;
$$;

-- Name beginnt mit "a_", damit der Schutz vor on_plan_change läuft
-- (BEFORE-Trigger feuern alphabetisch).
drop trigger if exists a_protect_profile_columns on public.user_profiles;
create trigger a_protect_profile_columns
  before update on public.user_profiles
  for each row execute function public.protect_profile_columns();


-- ---------------------------------------------------------------------------
-- 13) Rechte
-- ---------------------------------------------------------------------------
grant execute on function public.consume_match(uuid)            to authenticated, service_role;
grant execute on function public.match_usage(uuid)              to authenticated, service_role;
grant execute on function public.job_quota(uuid, boolean)       to authenticated, service_role;
grant execute on function public.plan_match_limit(text)         to authenticated, service_role;
grant execute on function public.plan_job_limit(text)           to authenticated, service_role;
grant execute on function public.email_domain(text)             to authenticated, service_role;
