-- ── Réglages de jeu par utilisateur (cross-device) ──────────────────────────
-- Table générique clé (user_id, game) → blob jsonb des préférences (échecs, dames,
-- …). localStorage reste la source instantanée côté front ; cette table = la synchro
-- entre appareils. Accès via 2 RPC SECURITY DEFINER calées sur auth.uid() (pas de
-- RLS à régler côté table : aucune écriture directe attendue). Idempotent.

create table if not exists public.game_settings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  game       text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);

alter table public.game_settings enable row level security;

-- Lecture/écriture limitées au propriétaire (défense en profondeur ; l'accès passe
-- normalement par les RPC ci-dessous).
drop policy if exists game_settings_own on public.game_settings;
create policy game_settings_own on public.game_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Lire mes réglages d'un jeu → { ok, data } (data null si rien d'enregistré).
create or replace function public.game_settings_get(p_game text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_data jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  select data into v_data from public.game_settings where user_id = v_uid and game = p_game;
  return jsonb_build_object('ok', true, 'data', v_data);
end $$;

-- Enregistrer/écraser mes réglages d'un jeu → { ok }.
create or replace function public.game_settings_set(p_game text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'auth_required'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'bad_data');
  end if;
  insert into public.game_settings (user_id, game, data, updated_at)
  values (v_uid, p_game, p_data, now())
  on conflict (user_id, game) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.game_settings_get(text) to anon, authenticated;
grant execute on function public.game_settings_set(text, jsonb) to anon, authenticated;
