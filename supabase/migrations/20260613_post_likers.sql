-- ── Voir qui a liké un post (Fil) — liste publique, façon Twitter ────────────
-- À exécuter dans le SQL Editor Supabase.
create or replace function list_post_likers(p_post uuid, p_limit int default 100)
returns jsonb language sql security definer stable set search_path = public, pg_temp as $$
  select jsonb_build_object('ok', true, 'likers', coalesce(jsonb_agg(row order by ts desc), '[]'::jsonb))
  from (
    select jsonb_build_object(
      'user_id', pl.user_id,
      'username', coalesce(u.data->>'username', '#' || right(pl.user_id, 5)),
      'avatar',   u.data->>'avatar_url'
    ) as row, pl.created_at as ts
    from post_likes pl
    left join users u on u.uid = pl.user_id
    where pl.post_id = p_post
    order by pl.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 300))
  ) s;
$$;
grant execute on function list_post_likers(uuid, int) to anon, authenticated;
