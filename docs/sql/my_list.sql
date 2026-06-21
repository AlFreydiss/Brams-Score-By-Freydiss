-- ── Ma Liste (statut anime/scan par membre) ─────────────────────────────────
-- À lancer une fois dans Supabase (SQL Editor). Sans cette migration, la
-- fonctionnalité reste 100 % localStorage côté client (les RPC échouent en
-- silence, fallback local). Avec, "Ma Liste" se synchronise cross-device.
--
-- Sécurité : RLS stricte, un membre ne voit/écrit QUE ses lignes. L'identité
-- vient du JWT Supabase (auth.uid()), jamais d'un paramètre client.

create table if not exists public.my_list (
  user_id  uuid        not null references auth.users(id) on delete cascade,
  media_key text       not null,                       -- 'anime:onepiece' | 'scan:onepiece'
  status   text        not null check (status in ('avoir','encours','termine')),
  updated_at timestamptz not null default now(),
  primary key (user_id, media_key)
);

alter table public.my_list enable row level security;

drop policy if exists my_list_owner on public.my_list;
create policy my_list_owner on public.my_list
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Pose ou retire un statut (p_status null => suppression).
create or replace function public.set_my_list(p_key text, p_status text)
returns void
language plpgsql
security invoker            -- RLS s'applique : écrit pour auth.uid() uniquement
set search_path = public
as $$
begin
  if p_status is null then
    delete from public.my_list where user_id = auth.uid() and media_key = p_key;
  else
    insert into public.my_list (user_id, media_key, status, updated_at)
    values (auth.uid(), p_key, p_status, now())
    on conflict (user_id, media_key)
    do update set status = excluded.status, updated_at = now();
  end if;
end;
$$;

-- Liste complète du membre courant.
create or replace function public.get_my_list()
returns table (key text, status text, ts timestamptz)
language sql
security invoker
set search_path = public
as $$
  select media_key, status, updated_at
  from public.my_list
  where user_id = auth.uid()
  order by updated_at desc;
$$;

grant execute on function public.set_my_list(text, text) to authenticated;
grant execute on function public.get_my_list() to authenticated;
