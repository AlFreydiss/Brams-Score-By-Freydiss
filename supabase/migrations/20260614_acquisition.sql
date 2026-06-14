-- ============================================================
--  Sondage "Comment avez-vous connu le site ?" (acquisition)
--  - colonnes sur analytics_sessions (réponse anonyme, RLS update anon)
--  - colonne profil (dédup cross-device pour les membres connectés)
--  - RPC dashboard staff (analytics_acquisition) gardée par staff_key
--  Idempotent (re-jouable).
-- ============================================================

alter table analytics_sessions
  add column if not exists acquisition_source text,
  add column if not exists acquisition_detail text;

alter table profile_settings
  add column if not exists acquisition_source text;

-- ── Dashboard staff : répartition des sources sur p_days ──────────
-- Garde clé identique aux autres RPC analytics (analytics_config KV).
create or replace function analytics_acquisition(p_key text, p_days int default 30)
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_sources jsonb; v_total int;
begin
  if p_key is distinct from (select v from analytics_config where k = 'staff_key') then
    raise exception 'analytics: cle invalide';
  end if;
  select
    coalesce(jsonb_agg(jsonb_build_object('source', source, 'count', cnt) order by cnt desc), '[]'::jsonb),
    coalesce(sum(cnt), 0)::int
  into v_sources, v_total
  from (
    select acquisition_source as source, count(*)::int as cnt
    from analytics_sessions
    where acquisition_source is not null
      and first_seen >= now() - (p_days || ' days')::interval
    group by acquisition_source
  ) s;
  return jsonb_build_object('total', v_total, 'sources', v_sources);
end $$;

-- ── Membre connecté : enregistre sa source (ne réécrit jamais une réponse) ──
create or replace function set_acquisition(p_source text, p_detail text default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me text := _resolve_discord_id();
begin
  if p_source is null or length(trim(p_source)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'source vide');
  end if;
  if v_me is not null then
    insert into profile_settings (discord_id, acquisition_source)
    values (v_me, left(trim(p_source), 64))
    on conflict (discord_id) do update
      set acquisition_source = coalesce(profile_settings.acquisition_source, excluded.acquisition_source);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ── Membre connecté : a-t-il déjà répondu ? (dédup cross-device) ──
create or replace function get_acquisition()
  returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_me text := _resolve_discord_id(); v_src text;
begin
  if v_me is null then return jsonb_build_object('answered', false); end if;
  select acquisition_source into v_src from profile_settings where discord_id = v_me;
  return jsonb_build_object('answered', v_src is not null, 'source', v_src);
end $$;

grant execute on function analytics_acquisition(text, int) to anon, authenticated;
grant execute on function set_acquisition(text, text)      to anon, authenticated;
grant execute on function get_acquisition()                to anon, authenticated;
