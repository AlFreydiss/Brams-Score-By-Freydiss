-- ═══════════════════════════════════════════════════════════════════════════
-- Échecs Brams — schéma + RLS + RPC (à exécuter dans Supabase)
-- Autorité serveur : horloges (now() postgres), appariement, ELO.
-- La légalité des coups reste vérifiée par chess.js des deux côtés (v1).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tables ───────────────────────────────────────────────────────────────────
create table if not exists echecs_profils (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  pseudo         text,
  avatar         text,
  elo            integer not null default 1200,
  parties        integer not null default 0,
  victoires      integer not null default 0,
  defaites       integer not null default 0,
  nulles         integer not null default 0,
  plus_haut_elo  integer not null default 1200,
  updated_at     timestamptz not null default now()
);

create table if not exists echecs_parties (
  id              uuid primary key default gen_random_uuid(),
  blanc_id        uuid not null references auth.users(id),
  noir_id         uuid not null references auth.users(id),
  blanc_pseudo    text, blanc_avatar text, blanc_elo integer,
  noir_pseudo     text, noir_avatar  text, noir_elo  integer,
  fen             text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn             text not null default '',
  statut          text not null default 'en_cours',  -- en_cours | termine | abandonnee
  resultat        text,                              -- blanc | noir | nulle
  gagnant_id      uuid references auth.users(id),
  cause           text,                              -- mat | pat | abandon | temps | nulle_accord | repetition | materiel | cinquante_coups
  cadence         text not null,
  increment_ms    integer not null default 0,
  temps_blanc_ms  integer not null,
  temps_noir_ms   integer not null,
  trait           text not null default 'blanc',     -- blanc | noir
  nb_demi_coups   integer not null default 0,
  dernier_coup_at timestamptz not null default now(),
  elo_traite      boolean not null default false,
  delta_blanc     integer, delta_noir integer,       -- mémorisés pour l'idempotence
  revanche_id     uuid references echecs_parties(id),
  created_at      timestamptz not null default now()
);
create index if not exists echecs_parties_statut_idx on echecs_parties (statut);
create index if not exists echecs_parties_blanc_idx  on echecs_parties (blanc_id) where statut = 'en_cours';
create index if not exists echecs_parties_noir_idx   on echecs_parties (noir_id)  where statut = 'en_cours';

create table if not exists echecs_file (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  pseudo     text,
  avatar     text,
  elo        integer not null,
  cadence    text not null,
  created_at timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table echecs_profils enable row level security;
alter table echecs_parties enable row level security;
alter table echecs_file    enable row level security;

drop policy if exists echecs_profils_select on echecs_profils;
create policy echecs_profils_select on echecs_profils
  for select to anon, authenticated using (true);
-- aucune policy insert/update : tout passe par les RPC security definer

drop policy if exists echecs_parties_select on echecs_parties;
create policy echecs_parties_select on echecs_parties
  for select to authenticated
  using (auth.uid() = blanc_id or auth.uid() = noir_id);
-- insert/update : RPC uniquement

drop policy if exists echecs_file_select on echecs_file;
create policy echecs_file_select on echecs_file
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists echecs_file_delete on echecs_file;
create policy echecs_file_delete on echecs_file
  for delete to authenticated using (auth.uid() = user_id);

-- ── Realtime ─────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table echecs_parties;
exception when duplicate_object then null; end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RPC
-- ═══════════════════════════════════════════════════════════════════════════

-- Crée / rafraîchit mon profil échecs (pseudo + avatar)
create or replace function echecs_assurer_profil(p_pseudo text, p_avatar text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'non_connecte'; end if;
  insert into echecs_profils (user_id, pseudo, avatar)
  values (auth.uid(), coalesce(nullif(trim(p_pseudo), ''), 'Pirate'), p_avatar)
  on conflict (user_id) do update
    set pseudo = excluded.pseudo, avatar = excluded.avatar, updated_at = now();
end $$;

-- Quitte la file d'attente
create or replace function echecs_quitter_file()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from echecs_file where user_id = auth.uid();
end $$;

-- Appariement : adversaire même cadence à l'ELO le plus proche, sinon mise en file.
-- Retourne l'uuid de la partie créée/en cours, ou null si en attente.
create or replace function echecs_apparier_ou_attendre(p_cadence text, p_elo integer, p_pseudo text, p_avatar text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_moi   uuid := auth.uid();
  v_elo   integer;
  v_adv   echecs_file%rowtype;
  v_id    uuid;
  v_base  integer;
  v_inc   integer;
  v_blanc uuid; v_noir uuid;
begin
  if v_moi is null then raise exception 'non_connecte'; end if;
  if p_cadence not in ('1+0','3+2','5+0','10+0','15+10') then raise exception 'cadence_invalide'; end if;

  -- profil à jour (l'ELO de référence vient de la DB, pas du client)
  insert into echecs_profils (user_id, pseudo, avatar)
  values (v_moi, coalesce(nullif(trim(p_pseudo), ''), 'Pirate'), p_avatar)
  on conflict (user_id) do update
    set pseudo = excluded.pseudo, avatar = excluded.avatar, updated_at = now();
  select elo into v_elo from echecs_profils where user_id = v_moi;

  -- une partie est déjà en cours → la reprendre (double clic, reconnexion)
  select id into v_id from echecs_parties
   where statut = 'en_cours' and (blanc_id = v_moi or noir_id = v_moi)
   order by created_at desc limit 1;
  if v_id is not null then
    delete from echecs_file where user_id = v_moi;
    return v_id;
  end if;

  -- adversaire le plus proche en ELO (verrou anti-course)
  select * into v_adv from echecs_file
   where cadence = p_cadence and user_id <> v_moi
   order by abs(elo - v_elo) asc, created_at asc
   limit 1
   for update skip locked;

  if found then
    delete from echecs_file where user_id in (v_moi, v_adv.user_id);
    v_base := split_part(p_cadence, '+', 1)::int * 60000;
    v_inc  := split_part(p_cadence, '+', 2)::int * 1000;
    if random() < 0.5 then v_blanc := v_moi; v_noir := v_adv.user_id;
    else v_blanc := v_adv.user_id; v_noir := v_moi; end if;

    insert into echecs_parties (
      blanc_id, noir_id,
      blanc_pseudo, blanc_avatar, blanc_elo,
      noir_pseudo,  noir_avatar,  noir_elo,
      cadence, increment_ms, temps_blanc_ms, temps_noir_ms
    )
    select v_blanc, v_noir,
           pb.pseudo, pb.avatar, pb.elo,
           pn.pseudo, pn.avatar, pn.elo,
           p_cadence, v_inc, v_base, v_base
      from echecs_profils pb, echecs_profils pn
     where pb.user_id = v_blanc and pn.user_id = v_noir
    returning id into v_id;
    return v_id;
  end if;

  -- personne : on s'inscrit dans la file
  insert into echecs_file (user_id, pseudo, avatar, elo, cadence)
  values (v_moi, coalesce(nullif(trim(p_pseudo), ''), 'Pirate'), p_avatar, v_elo, p_cadence)
  on conflict (user_id) do update
    set cadence = excluded.cadence, elo = excluded.elo,
        pseudo = excluded.pseudo, avatar = excluded.avatar, created_at = now();
  return null;
end $$;

-- Joue un coup : horloge décomptée avec les timestamps SERVEUR, incrément ajouté,
-- trait basculé. Les 2 premiers demi-coups ne décomptent pas (l'horloge démarre après).
-- Retourne la ligne à jour (json). Si le temps était écoulé → défaite au temps.
create or replace function echecs_jouer_coup(p_partie_id uuid, p_fen text, p_pgn text, p_san text)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v echecs_parties%rowtype;
  v_now    timestamptz := now();
  v_ecoule integer;
  v_restant integer;
begin
  select * into v from echecs_parties where id = p_partie_id for update;
  if not found then raise exception 'partie_introuvable'; end if;
  if auth.uid() not in (v.blanc_id, v.noir_id) then raise exception 'pas_participant'; end if;
  if v.statut <> 'en_cours' then return row_to_json(v); end if;
  if (v.trait = 'blanc' and auth.uid() <> v.blanc_id)
     or (v.trait = 'noir' and auth.uid() <> v.noir_id) then
    raise exception 'pas_ton_tour';
  end if;

  v_ecoule := greatest(0, (extract(epoch from (v_now - v.dernier_coup_at)) * 1000)::int);
  if v.nb_demi_coups < 2 then v_ecoule := 0; end if;

  v_restant := case when v.trait = 'blanc' then v.temps_blanc_ms else v.temps_noir_ms end - v_ecoule;
  if v_restant <= 0 then
    -- drapeau tombé avant le coup : défaite au temps du joueur au trait
    update echecs_parties set
      statut = 'termine',
      resultat = case when v.trait = 'blanc' then 'noir' else 'blanc' end,
      gagnant_id = case when v.trait = 'blanc' then v.noir_id else v.blanc_id end,
      cause = 'temps',
      temps_blanc_ms = case when v.trait = 'blanc' then 0 else temps_blanc_ms end,
      temps_noir_ms  = case when v.trait = 'noir'  then 0 else temps_noir_ms  end
    where id = p_partie_id
    returning * into v;
    return row_to_json(v);
  end if;

  update echecs_parties set
    fen = p_fen,
    pgn = p_pgn,
    temps_blanc_ms = case when v.trait = 'blanc' then v_restant + increment_ms else temps_blanc_ms end,
    temps_noir_ms  = case when v.trait = 'noir'  then v_restant + increment_ms else temps_noir_ms  end,
    trait = case when v.trait = 'blanc' then 'noir' else 'blanc' end,
    nb_demi_coups = nb_demi_coups + 1,
    dernier_coup_at = v_now
  where id = p_partie_id
  returning * into v;
  return row_to_json(v);
end $$;

-- Fin détectée côté client (mat / pat / nulles automatiques)
create or replace function echecs_terminer(p_partie_id uuid, p_resultat text, p_cause text, p_fen text, p_pgn text)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare v echecs_parties%rowtype;
begin
  if p_resultat not in ('blanc','noir','nulle') then raise exception 'resultat_invalide'; end if;
  if p_cause not in ('mat','pat','repetition','materiel','cinquante_coups') then raise exception 'cause_invalide'; end if;
  select * into v from echecs_parties where id = p_partie_id for update;
  if not found then raise exception 'partie_introuvable'; end if;
  if auth.uid() not in (v.blanc_id, v.noir_id) then raise exception 'pas_participant'; end if;
  if v.statut <> 'en_cours' then return row_to_json(v); end if;

  update echecs_parties set
    statut = 'termine', resultat = p_resultat, cause = p_cause,
    gagnant_id = case p_resultat when 'blanc' then v.blanc_id when 'noir' then v.noir_id else null end,
    fen = coalesce(p_fen, fen), pgn = coalesce(p_pgn, pgn)
  where id = p_partie_id
  returning * into v;
  return row_to_json(v);
end $$;

-- Abandon : l'appelant perd
create or replace function echecs_abandonner(p_partie_id uuid)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare v echecs_parties%rowtype;
begin
  select * into v from echecs_parties where id = p_partie_id for update;
  if not found then raise exception 'partie_introuvable'; end if;
  if auth.uid() not in (v.blanc_id, v.noir_id) then raise exception 'pas_participant'; end if;
  if v.statut <> 'en_cours' then return row_to_json(v); end if;

  update echecs_parties set
    statut = 'abandonnee',
    resultat = case when auth.uid() = v.blanc_id then 'noir' else 'blanc' end,
    gagnant_id = case when auth.uid() = v.blanc_id then v.noir_id else v.blanc_id end,
    cause = 'abandon'
  where id = p_partie_id
  returning * into v;
  return row_to_json(v);
end $$;

-- Nulle sur accord (l'accepteur appelle après la proposition broadcast)
create or replace function echecs_nulle_accord(p_partie_id uuid)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare v echecs_parties%rowtype;
begin
  select * into v from echecs_parties where id = p_partie_id for update;
  if not found then raise exception 'partie_introuvable'; end if;
  if auth.uid() not in (v.blanc_id, v.noir_id) then raise exception 'pas_participant'; end if;
  if v.statut <> 'en_cours' then return row_to_json(v); end if;

  update echecs_parties set statut = 'termine', resultat = 'nulle', cause = 'nulle_accord'
  where id = p_partie_id
  returning * into v;
  return row_to_json(v);
end $$;

-- Drapeau : le serveur revérifie le temps réel du joueur au trait
create or replace function echecs_reclamer_temps(p_partie_id uuid)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v echecs_parties%rowtype;
  v_restant integer;
begin
  select * into v from echecs_parties where id = p_partie_id for update;
  if not found then raise exception 'partie_introuvable'; end if;
  if auth.uid() not in (v.blanc_id, v.noir_id) then raise exception 'pas_participant'; end if;
  if v.statut <> 'en_cours' then return row_to_json(v); end if;
  if v.nb_demi_coups < 2 then return row_to_json(v); end if;  -- horloge pas démarrée

  v_restant := case when v.trait = 'blanc' then v.temps_blanc_ms else v.temps_noir_ms end
               - greatest(0, (extract(epoch from (now() - v.dernier_coup_at)) * 1000)::int);
  if v_restant > 0 then return row_to_json(v); end if;        -- pas encore tombé

  update echecs_parties set
    statut = 'termine',
    resultat = case when v.trait = 'blanc' then 'noir' else 'blanc' end,
    gagnant_id = case when v.trait = 'blanc' then v.noir_id else v.blanc_id end,
    cause = 'temps',
    temps_blanc_ms = case when v.trait = 'blanc' then 0 else temps_blanc_ms end,
    temps_noir_ms  = case when v.trait = 'noir'  then 0 else temps_noir_ms  end
  where id = p_partie_id
  returning * into v;
  return row_to_json(v);
end $$;

-- Revanche : couleurs inversées, ELO actuels. Idempotent (renvoie l'existante).
create or replace function echecs_revanche(p_partie_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v echecs_parties%rowtype;
  v_id uuid;
  v_base integer;
begin
  select * into v from echecs_parties where id = p_partie_id for update;
  if not found then raise exception 'partie_introuvable'; end if;
  if auth.uid() not in (v.blanc_id, v.noir_id) then raise exception 'pas_participant'; end if;
  if v.statut = 'en_cours' then raise exception 'partie_en_cours'; end if;
  if v.revanche_id is not null then return v.revanche_id; end if;

  v_base := split_part(v.cadence, '+', 1)::int * 60000;
  insert into echecs_parties (
    blanc_id, noir_id,
    blanc_pseudo, blanc_avatar, blanc_elo,
    noir_pseudo,  noir_avatar,  noir_elo,
    cadence, increment_ms, temps_blanc_ms, temps_noir_ms
  )
  select v.noir_id, v.blanc_id,
         v.noir_pseudo, v.noir_avatar, coalesce(pn.elo, v.noir_elo),
         v.blanc_pseudo, v.blanc_avatar, coalesce(pb.elo, v.blanc_elo),
         v.cadence, v.increment_ms, v_base, v_base
    from (select elo from echecs_profils where user_id = v.blanc_id) pb,
         (select elo from echecs_profils where user_id = v.noir_id) pn
  returning id into v_id;

  update echecs_parties set revanche_id = v_id where id = p_partie_id;
  return v_id;
end $$;

-- ELO officiel — idempotent (elo_traite + deltas mémorisés)
create or replace function echecs_finaliser_partie(p_partie_id uuid)
returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v  echecs_parties%rowtype;
  pb echecs_profils%rowtype;
  pn echecs_profils%rowtype;
  e_blanc double precision;
  s_blanc double precision;
  k_blanc integer; k_noir integer;
  d_blanc integer; d_noir integer;
begin
  select * into v from echecs_parties where id = p_partie_id for update;
  if not found then raise exception 'partie_introuvable'; end if;
  if auth.uid() not in (v.blanc_id, v.noir_id) then raise exception 'pas_participant'; end if;
  if v.statut = 'en_cours' then raise exception 'partie_en_cours'; end if;

  if v.elo_traite then
    return json_build_object(
      'delta_blanc', v.delta_blanc, 'delta_noir', v.delta_noir,
      'elo_blanc', (select elo from echecs_profils where user_id = v.blanc_id),
      'elo_noir',  (select elo from echecs_profils where user_id = v.noir_id),
      'deja_traite', true);
  end if;

  insert into echecs_profils (user_id, pseudo, avatar) values (v.blanc_id, v.blanc_pseudo, v.blanc_avatar)
  on conflict (user_id) do nothing;
  insert into echecs_profils (user_id, pseudo, avatar) values (v.noir_id, v.noir_pseudo, v.noir_avatar)
  on conflict (user_id) do nothing;

  select * into pb from echecs_profils where user_id = v.blanc_id for update;
  select * into pn from echecs_profils where user_id = v.noir_id for update;

  e_blanc := 1.0 / (1.0 + power(10::double precision, (pn.elo - pb.elo) / 400.0));
  s_blanc := case v.resultat when 'blanc' then 1.0 when 'noir' then 0.0 else 0.5 end;
  k_blanc := case when pb.parties < 30 then 40 when pb.elo < 2100 then 20 else 10 end;
  k_noir  := case when pn.parties < 30 then 40 when pn.elo < 2100 then 20 else 10 end;
  d_blanc := round(k_blanc * (s_blanc - e_blanc))::integer;
  d_noir  := round(k_noir * ((1.0 - s_blanc) - (1.0 - e_blanc)))::integer;

  update echecs_profils set
    elo = pb.elo + d_blanc,
    parties = parties + 1,
    victoires = victoires + (v.resultat = 'blanc')::int,
    defaites  = defaites  + (v.resultat = 'noir')::int,
    nulles    = nulles    + (v.resultat = 'nulle')::int,
    plus_haut_elo = greatest(plus_haut_elo, pb.elo + d_blanc),
    updated_at = now()
  where user_id = v.blanc_id;

  update echecs_profils set
    elo = pn.elo + d_noir,
    parties = parties + 1,
    victoires = victoires + (v.resultat = 'noir')::int,
    defaites  = defaites  + (v.resultat = 'blanc')::int,
    nulles    = nulles    + (v.resultat = 'nulle')::int,
    plus_haut_elo = greatest(plus_haut_elo, pn.elo + d_noir),
    updated_at = now()
  where user_id = v.noir_id;

  update echecs_parties set elo_traite = true, delta_blanc = d_blanc, delta_noir = d_noir
  where id = p_partie_id;

  return json_build_object(
    'delta_blanc', d_blanc, 'delta_noir', d_noir,
    'elo_blanc', pb.elo + d_blanc, 'elo_noir', pn.elo + d_noir);
end $$;

-- ── Droits d'exécution ───────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'echecs_assurer_profil(text,text)',
    'echecs_quitter_file()',
    'echecs_apparier_ou_attendre(text,integer,text,text)',
    'echecs_jouer_coup(uuid,text,text,text)',
    'echecs_terminer(uuid,text,text,text,text)',
    'echecs_abandonner(uuid)',
    'echecs_nulle_accord(uuid)',
    'echecs_reclamer_temps(uuid)',
    'echecs_revanche(uuid)',
    'echecs_finaliser_partie(uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
