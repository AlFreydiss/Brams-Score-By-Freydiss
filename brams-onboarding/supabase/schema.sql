-- =====================================================
-- Brams Community — Onboarding schema
-- Exécute ce fichier dans Supabase → SQL Editor → New query
-- =====================================================

-- 1) Table des tokens d'embarquement (1 token = 1 user Discord)
create table if not exists onboarding_tokens (
  token text primary key,
  discord_user_id text not null,
  guild_id text not null,
  created_at timestamptz default now(),
  used_at timestamptz,
  expires_at timestamptz default (now() + interval '24 hours')
);

create index if not exists onboarding_tokens_user_idx
  on onboarding_tokens (discord_user_id);

-- 2) Table des réponses
create table if not exists onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  token text references onboarding_tokens(token) on delete set null,
  discord_user_id text not null,
  guild_id text not null,
  answers jsonb not null,
  submitted_at timestamptz default now(),
  processed boolean default false,
  processed_at timestamptz
);

create index if not exists onboarding_responses_pending_idx
  on onboarding_responses (processed, submitted_at)
  where processed = false;

-- 3) RLS — on bloque tout accès direct au client. Tout passe par RPC.
alter table onboarding_tokens enable row level security;
alter table onboarding_responses enable row level security;

-- 4) RPC: validate_token — vérifie qu'un token est utilisable
create or replace function validate_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v onboarding_tokens%rowtype;
begin
  select * into v from onboarding_tokens where token = p_token;
  if not found then
    return jsonb_build_object('valid', false, 'error', 'invalid');
  end if;
  if v.used_at is not null then
    return jsonb_build_object('valid', false, 'error', 'used');
  end if;
  if v.expires_at < now() then
    return jsonb_build_object('valid', false, 'error', 'expired');
  end if;
  return jsonb_build_object('valid', true);
end;
$$;

-- 5) RPC: submit_onboarding — enregistre les réponses et brûle le token
create or replace function submit_onboarding(p_token text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v onboarding_tokens%rowtype;
begin
  select * into v from onboarding_tokens where token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  if v.used_at is not null then
    return jsonb_build_object('ok', false, 'error', 'token_used');
  end if;
  if v.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'token_expired');
  end if;

  insert into onboarding_responses (token, discord_user_id, guild_id, answers)
  values (p_token, v.discord_user_id, v.guild_id, p_answers);

  update onboarding_tokens set used_at = now() where token = p_token;

  return jsonb_build_object('ok', true);
end;
$$;

-- 6) Permissions: l'anon peut UNIQUEMENT appeler ces deux fonctions
revoke all on function validate_token(text) from public;
revoke all on function submit_onboarding(text, jsonb) from public;
grant execute on function validate_token(text) to anon;
grant execute on function submit_onboarding(text, jsonb) to anon;

-- (Le bot utilise la service_role key et a déjà tous les droits.)
