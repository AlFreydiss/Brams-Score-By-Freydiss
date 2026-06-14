-- ============================================================
--  Fix "DURÉE MOY. SESSION = —" : last_seen était écrit avec l'horloge CLIENT
--  (new Date()) vs first_seen en horloge SERVEUR (now()) → décalage → durées
--  négatives (63/76 sessions) → filtrées → moyenne 0. On ajoute un heartbeat
--  RPC qui avance last_seen avec now() (serveur), et on passe la moyenne sur 24h.
--  Idempotent.
-- ============================================================

-- Heartbeat serveur : avance last_seen avec l'horloge SERVEUR (corrige le skew).
create or replace function analytics_touch(p_session text, p_page text default null)
  returns void language sql security definer set search_path = public as $$
  update analytics_sessions
     set last_seen = now(),
         current_page = coalesce(p_page, current_page)
   where session_id = p_session;
$$;
grant execute on function analytics_touch(text, text) to anon, authenticated;

-- Re-création analytics_overview : durée moy. sur 24h glissantes (le reste identique).
create or replace function public.analytics_overview(p_key text)
  returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare res jsonb;
begin
  perform analytics_check_key(p_key);
  with
    live as (select count(*) as on_now, count(*) filter (where user_id is not null) as mem_on
             from analytics_sessions where last_seen > now() - interval '2 minutes'),
    td   as (select count(*) as v from analytics_sessions
             where (first_seen at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date),
    te   as (select count(*) as p from analytics_events
             where event_type='pageview' and (created_at at time zone 'Europe/Paris')::date=(now() at time zone 'Europe/Paris')::date),
    yd   as (select count(*) as v from analytics_sessions
             where (first_seen at time zone 'Europe/Paris')::date=(now() at time zone 'Europe/Paris')::date - 1),
    ye   as (select count(*) as p from analytics_events
             where event_type='pageview' and (created_at at time zone 'Europe/Paris')::date=(now() at time zone 'Europe/Paris')::date - 1),
    dur  as (select round(avg(extract(epoch from (last_seen-first_seen))))::int as s
             from analytics_sessions where first_seen > now()-interval '24 hours' and last_seen > first_seen+interval '5 seconds')
  select jsonb_build_object(
    'online_now',l.on_now,'members_online',l.mem_on,
    'visitors_today',td.v,'pageviews_today',te.p,
    'visitors_yesterday',yd.v,'pageviews_yesterday',ye.p,
    'avg_session_sec',coalesce(dur.s,0)
  ) into res from live l, td, te, yd, ye, dur;
  return res;
end;
$function$;
