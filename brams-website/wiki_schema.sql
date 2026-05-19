-- ══════════════════════════════════════════════════════════
-- BRAMS COMMUNITY — Wiki + Théories Schema
-- Coller dans Supabase > SQL Editor > Run
-- ══════════════════════════════════════════════════════════

-- 1. Catégories du wiki
CREATE TABLE IF NOT EXISTS public.wiki_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text DEFAULT '📄',
  color text DEFAULT '#e0524a',
  description text DEFAULT '',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Pages wiki
CREATE TABLE IF NOT EXISTS public.wiki_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category_id uuid REFERENCES public.wiki_categories(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  infobox jsonb DEFAULT '{}',
  cover_image text,
  status text DEFAULT 'pending' CHECK (status IN ('draft','pending','published','rejected')),
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  views int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Historique des révisions wiki
CREATE TABLE IF NOT EXISTS public.wiki_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES public.wiki_pages(id) ON DELETE CASCADE,
  content text NOT NULL,
  infobox jsonb DEFAULT '{}',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  summary text DEFAULT 'Modification',
  created_at timestamptz DEFAULT now()
);

-- 4. Théories / Forum
CREATE TABLE IF NOT EXISTS public.theories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'Autre',
  tags text[] DEFAULT '{}',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  cover_image text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','published','rejected')),
  votes_up int DEFAULT 0,
  votes_down int DEFAULT 0,
  comments_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Votes théories (1 vote par user par théorie)
CREATE TABLE IF NOT EXISTS public.theory_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theory_id uuid REFERENCES public.theories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (1,-1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(theory_id, user_id)
);

-- 6. Commentaires théories (imbriqués via parent_id)
CREATE TABLE IF NOT EXISTS public.theory_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theory_id uuid REFERENCES public.theories(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.theory_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  created_at timestamptz DEFAULT now()
);

-- 7. Profils utilisateurs (rôles + badges)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  role text DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
  points int DEFAULT 0,
  badges text[] DEFAULT '{}',
  theory_count int DEFAULT 0,
  wiki_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.wiki_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_pages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_revisions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theory_votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theory_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles     ENABLE ROW LEVEL SECURITY;

-- Catégories : lecture publique
CREATE POLICY "wiki_cat_read" ON public.wiki_categories FOR SELECT USING (true);

-- Pages wiki : lecture publique (publiées seulement), écriture auth
CREATE POLICY "wiki_pages_read"   ON public.wiki_pages FOR SELECT USING (status = 'published');
CREATE POLICY "wiki_pages_insert" ON public.wiki_pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "wiki_pages_update" ON public.wiki_pages FOR UPDATE TO authenticated USING (author_id = auth.uid());

-- Révisions : lecture publique, écriture auth
CREATE POLICY "wiki_rev_read"   ON public.wiki_revisions FOR SELECT USING (true);
CREATE POLICY "wiki_rev_insert" ON public.wiki_revisions FOR INSERT TO authenticated WITH CHECK (true);

-- Théories : lecture publique (publiées), écriture auth
CREATE POLICY "theories_read"   ON public.theories FOR SELECT USING (status = 'published');
CREATE POLICY "theories_insert" ON public.theories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "theories_update" ON public.theories FOR UPDATE TO authenticated USING (author_id = auth.uid());

-- Votes : CRUD auth (1 vote par user)
CREATE POLICY "votes_read"   ON public.theory_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON public.theory_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "votes_update" ON public.theory_votes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "votes_delete" ON public.theory_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Commentaires : lecture publique, écriture auth
CREATE POLICY "comments_read"   ON public.theory_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.theory_comments FOR INSERT TO authenticated WITH CHECK (true);

-- Profils : lecture publique, écriture propre profil
CREATE POLICY "profiles_read"   ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.user_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- ══════════════════════════════════════════════════════════
-- Triggers : mise à jour automatique des compteurs
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_theory_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  tid uuid := COALESCE(NEW.theory_id, OLD.theory_id);
BEGIN
  UPDATE public.theories SET
    votes_up   = (SELECT COUNT(*) FROM public.theory_votes WHERE theory_id = tid AND vote =  1),
    votes_down = (SELECT COUNT(*) FROM public.theory_votes WHERE theory_id = tid AND vote = -1)
  WHERE id = tid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_sync_votes ON public.theory_votes;
CREATE TRIGGER trig_sync_votes
  AFTER INSERT OR UPDATE OR DELETE ON public.theory_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_theory_votes();

CREATE OR REPLACE FUNCTION public.sync_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  tid uuid := COALESCE(NEW.theory_id, OLD.theory_id);
BEGIN
  UPDATE public.theories SET
    comments_count = (SELECT COUNT(*) FROM public.theory_comments WHERE theory_id = tid)
  WHERE id = tid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_sync_comments ON public.theory_comments;
CREATE TRIGGER trig_sync_comments
  AFTER INSERT OR DELETE ON public.theory_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_comments_count();

CREATE OR REPLACE FUNCTION public.sync_wiki_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_wiki_updated ON public.wiki_pages;
CREATE TRIGGER trig_wiki_updated
  BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW EXECUTE FUNCTION public.sync_wiki_updated();

-- ══════════════════════════════════════════════════════════
-- Seed : catégories Wiki
-- ══════════════════════════════════════════════════════════

INSERT INTO public.wiki_categories (name, slug, icon, color, description, sort_order) VALUES
  ('Personnages',    'personnages',     '👤', '#e0524a', 'Luffy, Zoro, Nami et tous les nakamas',               1),
  ('Arcs Narratifs', 'arcs',           '🗺️', '#3b82f6', 'De Romance Dawn au Siècle du Vide',                   2),
  ('Fruits du Démon','fruits-du-demon','🍎', '#9b59b6', 'Paramecia, Logia, Zoan et leurs pouvoirs',            3),
  ('Lieux & Îles',   'lieux',          '🏝️', '#2ecc71', 'Grand Line, Nouvelles-Terres, îles mystérieuses',     4),
  ('Organisations',  'organisations',  '⚔️', '#f39c12', 'Marines, Yonkou, Révolutionnaires, CP0',              5),
  ('Objets & Pouvoirs','objets',       '🗡️', '#00cec9', 'Ponéglyphes, Ryou, Haki des Rois Conquérants',       6)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════
-- Pour passer un user en admin (remplace l'email)
-- UPDATE public.user_profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'ton@email.com');
-- ══════════════════════════════════════════════════════════
