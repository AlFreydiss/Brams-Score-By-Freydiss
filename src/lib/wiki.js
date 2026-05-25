import { supabase } from './supabase.js'

// ── Wiki Categories ──────────────────────────────────────────────────────────

export async function fetchWikiCategories() {
  if (!supabase) return []
  const { data } = await supabase
    .from('wiki_categories')
    .select('*')
    .order('sort_order')
  return data ?? []
}

// ── Wiki Pages ───────────────────────────────────────────────────────────────

export async function fetchWikiPages({ categorySlug, search, limit = 20 } = {}) {
  if (!supabase) return []
  let q = supabase
    .from('wiki_pages')
    .select('id,slug,title,cover_image,author_name,created_at,updated_at,views,wiki_categories(name,slug,icon,color)')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (categorySlug) {
    const { data: cat } = await supabase.from('wiki_categories').select('id').eq('slug', categorySlug).single()
    if (cat) q = q.eq('category_id', cat.id)
  }
  if (search) q = q.ilike('title', `%${search}%`)

  const { data } = await q
  return data ?? []
}

export async function fetchWikiPage(slug) {
  if (!supabase) return null
  const { data } = await supabase
    .from('wiki_pages')
    .select('*,wiki_categories(name,slug,icon,color)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (data) {
    supabase.from('wiki_pages').update({ views: (data.views || 0) + 1 }).eq('id', data.id)
  }
  return data
}

export async function fetchWikiRevisions(pageId) {
  if (!supabase) return []
  const { data } = await supabase
    .from('wiki_revisions')
    .select('id,author_name,summary,created_at')
    .eq('page_id', pageId)
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

export async function createWikiPage({ slug, title, category_id, content, infobox, cover_image, author_id, author_name }) {
  if (!supabase) return { error: 'No client' }
  const payload = {
    slug,
    title,
    category_id,
    content,
    infobox: infobox ?? {},
    cover_image,
    author_id,
    author_name,
    status: 'pending',
  }

  const { error } = await supabase.from('wiki_pages').insert(payload)
  if (error) return { data: null, error }

  let data = null
  const lookup = await supabase
    .from('wiki_pages')
    .select('id,slug,title')
    .eq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lookup.error && lookup.data) {
    data = lookup.data
    await supabase.from('wiki_revisions').insert({
      page_id: data.id,
      content,
      infobox: infobox ?? {},
      author_id,
      author_name,
      summary: 'Création initiale',
    })
  }

  return { data, error: null }
}

export async function updateWikiPage({ id, content, infobox, cover_image, author_id, author_name, summary }) {
  if (!supabase) return { error: 'No client' }
  const { error } = await supabase.from('wiki_pages')
    .update({ content, infobox: infobox ?? {}, cover_image, updated_at: new Date().toISOString(), status: 'pending' })
    .eq('id', id)
  if (!error) {
    await supabase.from('wiki_revisions').insert({ page_id: id, content, infobox: infobox ?? {}, author_id, author_name, summary: summary || 'Modification' })
  }
  return { data: null, error }
}

// ── Theories ─────────────────────────────────────────────────────────────────

export async function fetchTheories({ category, sort = 'recent', limit = 20, offset = 0 } = {}) {
  if (!supabase) return []
  let q = supabase
    .from('theories')
    .select('id,title,category,tags,author_name,votes_up,votes_down,comments_count,created_at,cover_image')
    .eq('status', 'published')
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (category && category !== 'Tous') q = q.eq('category', category)

  if (sort === 'top')     q = q.order('votes_up', { ascending: false })
  else if (sort === 'hot') q = q.order('comments_count', { ascending: false })
  else                     q = q.order('created_at', { ascending: false })

  const { data } = await q
  return data ?? []
}

export async function fetchTheory(id) {
  if (!supabase) return null
  const { data } = await supabase
    .from('theories')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()
  return data
}

export async function createTheory({ title, content, category, tags, author_id, author_name, cover_image }) {
  if (!supabase) return { error: 'No client' }
  const { error } = await supabase.from('theories').insert({
    title,
    content,
    category,
    tags: tags ?? [],
    author_id,
    author_name,
    cover_image,
    status: 'pending',
  })
  return { data: null, error }
}

// ── Votes ────────────────────────────────────────────────────────────────────

export async function fetchUserVote(theoryId, userId) {
  if (!supabase || !userId) return null
  const { data } = await supabase
    .from('theory_votes')
    .select('vote')
    .eq('theory_id', theoryId)
    .eq('user_id', userId)
    .single()
  return data?.vote ?? null
}

export async function castVote(theoryId, userId, vote, currentVote) {
  if (!supabase) return { error: 'No client' }
  // Use passed currentVote to avoid extra round-trip and stale-read race
  const current = currentVote !== undefined ? currentVote : await fetchUserVote(theoryId, userId)
  if (current === vote) {
    const { error } = await supabase.from('theory_votes').delete()
      .eq('theory_id', theoryId).eq('user_id', userId)
    return { removed: true, error }
  }
  const { data, error } = await supabase.from('theory_votes').upsert(
    { theory_id: theoryId, user_id: userId, vote },
    { onConflict: 'theory_id,user_id' }
  )
  return { data, error }
}

// ── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(theoryId) {
  if (!supabase) return []
  const { data } = await supabase
    .from('theory_comments')
    .select('*')
    .eq('theory_id', theoryId)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function postComment({ theory_id, parent_id, content, author_id, author_name }) {
  if (!supabase) return { error: 'No client' }
  const { error } = await supabase.from('theory_comments').insert({
    theory_id,
    parent_id: parent_id ?? null,
    content,
    author_id,
    author_name,
  })
  return { data: null, error }
}

// ── User profile ─────────────────────────────────────────────────────────────

export async function fetchUserProfile(userId) {
  if (!supabase || !userId) return null
  const { data } = await supabase.from('user_profiles').select('*').eq('id', userId).single()
  return data
}

export async function upsertUserProfile({ id, username, role }) {
  if (!supabase) return
  await supabase.from('user_profiles').upsert({ id, username, role: role ?? 'member' }, { onConflict: 'id' })
}

// ── Modération (admin/mod) ───────────────────────────────────────────────────

export async function fetchPending() {
  if (!supabase) return { pages: [], theories: [] }
  const [{ data: pages }, { data: theories }] = await Promise.all([
    supabase.from('wiki_pages').select('id,title,author_name,created_at').eq('status', 'pending').order('created_at'),
    supabase.from('theories').select('id,title,author_name,created_at').eq('status', 'pending').order('created_at'),
  ])
  return { pages: pages ?? [], theories: theories ?? [] }
}

export async function moderateItem(table, id, status) {
  if (!supabase) return
  await supabase.from(table).update({ status }).eq('id', id)
}
