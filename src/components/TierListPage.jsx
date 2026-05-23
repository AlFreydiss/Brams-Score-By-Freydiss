import { useState, useEffect, useRef, useCallback } from 'react'
import { toPng } from 'html-to-image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  rectIntersection,
} from '@dnd-kit/core'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'

// ── Tokens ────────────────────────────────────────────────────
const T = {
  bg:           '#111214',
  surface:      '#18191c',
  card:         '#1e2024',
  card2:        '#242629',
  border:       'rgba(255,255,255,0.06)',
  borderHover:  'rgba(255,255,255,0.18)',
  borderPurple: 'rgba(155,89,182,0.38)',
  borderGold:   'rgba(255,215,0,0.22)',
  purple:       '#9b59b6',
  violet:       '#A66CFF',
  gold:         '#ffd700',
  goldMuted:    'rgba(235,207,157,.62)',
  accent:       '#e0524a',
  text:         '#e8e9ea',
  muted:        '#7c7f8a',
  faint:        'rgba(255,255,255,0.22)',
}

// ── Storage ───────────────────────────────────────────────────
const FAV_KEY    = 'brams-tier-favorites'
const DRAFT_KEY  = 'brams-tier-drafts'
const PUBLIC_KEY = 'brams_tierlists_public'
const MY_KEY     = 'brams_tierlists_my'

function sg(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) ?? '') ?? fb } catch { return fb }
}
function ss(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

// ── Utils ─────────────────────────────────────────────────────
function uid(p = 'id') {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
function splitItems(v) {
  return v.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
}

// ── Data ──────────────────────────────────────────────────────
const DEFAULT_TIERS = [
  { id: 's', label: 'S', color: '#ef4444' },
  { id: 'a', label: 'A', color: '#f97316' },
  { id: 'b', label: 'B', color: '#eab308' },
  { id: 'c', label: 'C', color: '#22c55e' },
  { id: 'd', label: 'D', color: '#3b82f6' },
  { id: 'e', label: 'E', color: '#a855f7' },
  { id: 'f', label: 'F', color: '#64748b' },
]

const CATEGORIES = [
  {
    id: 'animes', title: 'Animes', icon: '🎬',
    description: '40 séries légendaires', count: 40,
    badge: 'POPULAIRE', badgeColor: '#c0392b',
    items: ['One Piece','Naruto','Bleach','Dragon Ball Z','Attack on Titan','Fullmetal Alchemist: Brotherhood','Hunter x Hunter','Death Note','Demon Slayer','Jujutsu Kaisen','My Hero Academia','Tokyo Ghoul','Sword Art Online','Code Geass','Steins;Gate','Vinland Saga','Kingdom','Berserk','Blue Lock','Chainsaw Man','Spy x Family','Mob Psycho 100','The Promised Neverland','Re:Zero','Overlord','Black Clover','Seven Deadly Sins','Fairy Tail','Gintama','Haikyuu!!','Kuroko no Basket','Slam Dunk','Dr. Stone','Fire Force','Mushishi','Akira','Ghost in the Shell','Cowboy Bebop','Neon Genesis Evangelion','Trigun'],
  },
  {
    id: 'personnages', title: 'Personnages', icon: '⚔️',
    description: '30 héros & antagonistes', count: 30,
    badge: 'NOUVEAU', badgeColor: '#3b82f6',
    items: ['Monkey D. Luffy','Roronoa Zoro','Sanji','Portgas D. Ace','Shanks','Whitebeard','Gol D. Roger','Naruto Uzumaki','Sasuke Uchiha','Madara Uchiha','Ichigo Kurosaki','Aizen Sosuke','Goku','Vegeta','Levi Ackerman','Eren Yeager','Edward Elric','Killua Zoldyck','Gon Freecss','Light Yagami','L Lawliet','Tanjiro Kamado','Muzan Kibutsuji','Itadori Yuji','Ryomen Sukuna','Deku Izuku','All Might','Ken Kaneki','Griffith','Guts'],
  },
  {
    id: 'arcs', title: 'Arcs', icon: '📖',
    description: '25 arcs épiques', count: 25,
    items: ['Marineford','Enies Lobby','Whole Cake Island','Wano','Dressrosa','Alabasta','Skypiea','Water 7','Thriller Bark','Impel Down','Punk Hazard','Zou','Sabaody Archipelago','East Blue','Baratie','Loguetown','Little Garden','Drum Island','Amazon Lily','Fish-Man Island','Reverie','Egghead','Paramount War','Mock Town','Long Ring Long Land'],
  },
  {
    id: 'films', title: 'Films & OAV', icon: '🎥',
    description: "20 films d'animation", count: 20,
    items: ['One Piece Film: Red','One Piece Film: Gold','One Piece Stampede','One Piece: Strong World','One Piece: Z','One Piece: Baron Omatsuri','Demon Slayer: Mugen Train','Dragon Ball Super: Broly','Dragon Ball Super: Super Hero','Jujutsu Kaisen 0','My Hero Academia: Two Heroes','Naruto: Road to Ninja','SAO: Ordinal Scale',"Fate/Stay Night: Heaven's Feel","Spirited Away",'Princess Mononoke','Akira','Ghost in the Shell','Cowboy Bebop: The Movie','Your Name'],
  },
  { id: 'combats', title: 'Combats',       icon: '💥', description: 'Les meilleures batailles', count: 0, comingSoon: true },
  { id: 'ost',     title: 'OST & Openings', icon: '🎵', description: 'Musiques légendaires',      count: 0, comingSoon: true },
]

const TABS = ['Création', 'Favoris', 'Partagées', 'Historique']

// ── Hooks ─────────────────────────────────────────────────────
function useFavorites() {
  const [favs, setFavs] = useState(() => sg(FAV_KEY, []))
  const toggle = useCallback((id) => {
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      ss(FAV_KEY, next)
      return next
    })
  }, [])
  const isFav = useCallback((id) => favs.includes(id), [favs])
  return { favs, toggle, isFav }
}

function useDraft() {
  const [draft, setDraft] = useState(() => sg(DRAFT_KEY, null))
  const save  = useCallback((d) => { ss(DRAFT_KEY, d); setDraft(d) }, [])
  const clear = useCallback(()  => { localStorage.removeItem(DRAFT_KEY); setDraft(null) }, [])
  return { draft, save, clear }
}

function useToast() {
  const [msg, setMsg] = useState(null)
  const t = useRef(null)
  const show = useCallback((m, ms = 2800) => {
    clearTimeout(t.current)
    setMsg(m)
    t.current = setTimeout(() => setMsg(null), ms)
  }, [])
  useEffect(() => () => clearTimeout(t.current), [])
  return { msg, show }
}

function useItemImages(items, categoryId) {
  const SKEY = `brams-tier-imgs-${categoryId}`
  const [cache, setCache] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SKEY) || '{}') } catch { return {} }
  })
  const fetching = useRef(false)
  const endpoint = categoryId === 'personnages' ? 'characters' : 'anime'

  useEffect(() => {
    if (!items.length || fetching.current) return
    const missing = items.filter(i => !cache[i.name])
    if (!missing.length) return
    fetching.current = true

    async function go() {
      const next = { ...cache }
      const BATCH = 3
      for (let i = 0; i < missing.length; i += BATCH) {
        await Promise.all(
          missing.slice(i, i + BATCH).map(async ({ name }) => {
            try {
              const res = await fetch(
                `https://api.jikan.moe/v4/${endpoint}?q=${encodeURIComponent(name)}&limit=1`,
                { signal: AbortSignal.timeout(6000) }
              )
              if (!res.ok) return
              const data = await res.json()
              const img = data.data?.[0]?.images?.jpg?.image_url
              if (img) next[name] = img
            } catch {}
          })
        )
        setCache({ ...next })
        try { sessionStorage.setItem(SKEY, JSON.stringify(next)) } catch {}
        if (i + BATCH < missing.length) await new Promise(r => setTimeout(r, 1100))
      }
      fetching.current = false
    }
    go()
  }, [items.length, categoryId])

  return cache
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div key={msg}
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0,  x: '-50%' }}
          exit={{   opacity: 0, y: 16,  x: '-50%' }}
          style={{
            position: 'fixed', bottom: 28, left: '50%',
            background: T.card2, border: `1px solid ${T.borderPurple}`,
            borderLeft: `3px solid ${T.violet}`,
            color: T.text, fontWeight: 700, fontSize: 13,
            padding: '12px 20px', borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,.6)',
            zIndex: 9999, whiteSpace: 'nowrap',
          }}
        >{msg}</motion.div>
      )}
    </AnimatePresence>
  )
}

// ── FavoriteButton ─────────────────────────────────────────────
function FavoriteButton({ active, onClick }) {
  return (
    <motion.button whileTap={{ scale: .75 }}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        background: active ? 'rgba(224,82,74,.1)' : 'none',
        border: `1px solid ${active ? 'rgba(224,82,74,.3)' : T.border}`,
        borderRadius: 8, cursor: 'pointer',
        fontSize: 16, lineHeight: 1, padding: '5px 8px',
        color: active ? T.accent : T.muted,
        transition: 'all .2s', flexShrink: 0,
      }}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >{active ? '♥' : '♡'}</motion.button>
  )
}

// ── TierCreatorCard (left column hero) ────────────────────────
function TierCreatorCard({ draft, favCount }) {
  const PREVIEW = [
    { label: 'S', color: '#ef4444', slots: 2 },
    { label: 'A', color: '#f97316', slots: 3 },
    { label: 'B', color: '#eab308', slots: 2 },
    { label: 'C', color: '#22c55e', slots: 1 },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2, duration: .4 }}
      style={{
        background: 'rgba(0,0,0,.22)',
        border: `1px solid rgba(155,89,182,.14)`,
        borderRadius: 18, padding: '20px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      {/* Label */}
      <div style={{
        fontSize: 10, fontWeight: 900, letterSpacing: '.18em',
        textTransform: 'uppercase', color: T.muted, textAlign: 'center',
      }}>PROFIL TIER MAKER</div>

      {/* Badge */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          border: `1px solid rgba(166,108,255,.28)`, background: 'rgba(166,108,255,.08)',
          borderRadius: 99, padding: '5px 14px',
          fontSize: 11, fontWeight: 900, color: T.violet, letterSpacing: '.06em',
        }}>🏆 NOUVEAU</span>
      </div>

      {/* Mini tier preview */}
      <div style={{
        background: 'rgba(0,0,0,.35)', borderRadius: 12,
        padding: '12px 10px', border: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {PREVIEW.map(t => (
          <div key={t.label} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, background: t.color, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 950, color: '#000',
            }}>{t.label}</div>
            <div style={{ display: 'flex', gap: 3, flex: 1 }}>
              {Array.from({ length: t.slots }).map((_, i) => (
                <div key={i} style={{
                  height: 26, flex: 1, borderRadius: 5,
                  background: `${t.color}1a`, border: `1px solid ${t.color}33`,
                }} />
              ))}
              <div style={{
                height: 26, flex: 2, borderRadius: 5,
                background: 'rgba(255,255,255,.025)',
                border: '1px dashed rgba(255,255,255,.05)',
              }} />
            </div>
          </div>
        ))}
        <div style={{
          marginTop: 4, padding: '5px', borderRadius: 8,
          background: 'rgba(155,89,182,.06)', border: '1px solid rgba(155,89,182,.14)',
          fontSize: 10, fontWeight: 700, color: T.violet, textAlign: 'center', letterSpacing: '.06em',
        }}>Glisse et classe</div>
      </div>

      {/* Mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{
          background: 'rgba(255,215,0,.05)', border: 'rgba(255,215,0,.15) 1px solid',
          borderRadius: 12, padding: '10px 0', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 950, color: T.gold, lineHeight: 1 }}>{favCount}</div>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 3 }}>Favoris</div>
        </div>
        <div style={{
          background: 'rgba(155,89,182,.05)', border: 'rgba(155,89,182,.17) 1px solid',
          borderRadius: 12, padding: '10px 0', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 950, color: T.violet, lineHeight: 1 }}>{draft ? '1' : '0'}</div>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 3 }}>Brouillon</div>
        </div>
      </div>
    </motion.div>
  )
}

// ── TierMainInfo (right column hero) ─────────────────────────
function TierMainInfo({ onCreate, onFavs, onResume, draft, catsUsed }) {
  const STATS = [
    { v: '40', l: 'Animes',     color: T.violet,  bg: 'rgba(155,89,182,.07)',  border: 'rgba(155,89,182,.2)'  },
    { v: '30', l: 'Personnages', color: T.gold,    bg: 'rgba(255,215,0,.06)',   border: 'rgba(255,215,0,.18)'  },
    { v: '25', l: 'Arcs',       color: '#4F8CFF', bg: 'rgba(79,140,255,.06)',  border: 'rgba(79,140,255,.18)' },
    { v: '20', l: 'Films',      color: '#2ECC71', bg: 'rgba(46,204,113,.06)',  border: 'rgba(46,204,113,.18)' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .22, duration: .4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Badge pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          border: '1px solid rgba(166,108,255,.3)', background: 'rgba(166,108,255,.1)',
          borderRadius: 99, padding: '5px 14px',
          fontSize: 11, fontWeight: 900, color: T.violet, letterSpacing: '.06em',
        }}>🏆 BRAMS TIER MAKER</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          border: `1px solid rgba(255,255,255,.1)`, background: 'rgba(255,255,255,.05)',
          borderRadius: 99, padding: '5px 14px',
          fontSize: 11, fontWeight: 700, color: T.muted,
        }}>MON CLASSEMENT</span>
      </div>

      {/* Title + desc */}
      <div>
        <h1 style={{
          fontFamily: "'Pirata One', cursive",
          fontSize: 'clamp(32px, 4.5vw, 56px)',
          margin: '0 0 10px', lineHeight: .94,
          background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,.82) 55%, #ffd700 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Crée ta tier list ultime</h1>
        <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.72, margin: 0, maxWidth: 500 }}>
          Classe tes animes, personnages, arcs et films préférés. Sauvegarde, partage et compare avec la communauté.
        </p>
      </div>

      {/* Stat cards — like Vocal / Berrys / Position */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {STATS.map(s => (
          <div key={s.l} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 14, padding: '14px 12px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 8, right: 8,
              width: 20, height: 20, borderRadius: 6,
              background: `${s.color}1c`, border: `1px solid ${s.color}2e`,
            }} />
            <div style={{ fontSize: 26, fontWeight: 950, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: T.muted, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Progress — like "Progression vers Roi des Pirates" */}
      <div style={{
        background: 'rgba(255,255,255,.03)', border: `1px solid ${T.border}`,
        borderRadius: 14, padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: T.text, fontWeight: 700 }}>Catégories explorées</span>
          <span style={{ fontSize: 13, color: T.violet, fontWeight: 900 }}>{catsUsed}/6</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${catsUsed > 0 ? Math.max((catsUsed / 6) * 100, 5) : 0}%` }}
            transition={{ duration: .9, delay: .4, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${T.purple}, ${T.violet})` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {draft
            ? <span style={{ fontSize: 12, color: T.goldMuted }}>⏳ Brouillon : {draft.title || 'Sans titre'}</span>
            : <span style={{ fontSize: 12, color: T.muted }}>Pirate depuis {catsUsed} tier list{catsUsed !== 1 ? 's' : ''}</span>
          }
          <span style={{ fontSize: 12, color: T.violet }}>
            {catsUsed < 6 ? `${6 - catsUsed} restante${6 - catsUsed !== 1 ? 's' : ''}` : '✓ Complété'}
          </span>
        </div>
      </div>

      {/* CTAs — like "Partager le profil" / "Ouvrir Discord" */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={onCreate} style={{
          padding: '13px', borderRadius: 12, border: 'none',
          background: `linear-gradient(135deg, ${T.purple}, ${T.violet})`,
          color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer',
          boxShadow: `0 6px 24px rgba(155,89,182,.3)`,
        }}>Créer une tier list</motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .97 }} onClick={onFavs} style={{
          padding: '13px', borderRadius: 12,
          border: `1px solid ${T.border}`, background: 'rgba(255,255,255,.05)',
          color: T.text, fontWeight: 800, fontSize: 14, cursor: 'pointer',
        }}>♡ Mes favoris</motion.button>
      </div>
      {draft && (
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} onClick={onResume} style={{
          padding: '12px 16px', borderRadius: 12, width: '100%',
          border: `1px solid ${T.borderGold}`, background: 'rgba(255,215,0,.04)',
          color: T.gold, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
        }}>
          <span>⏳</span>
          <span>Reprendre : <strong style={{ fontWeight: 950 }}>{draft.title || 'Sans titre'}</strong></span>
          <span style={{ marginLeft: 'auto', opacity: .6 }}>→</span>
        </motion.button>
      )}
    </motion.div>
  )
}

// ── MainPanel (profil-style shell) ────────────────────────────
function MainPanel({ leftCard, rightPanel, tab, setTab, tabsRef, children, isMobile }) {
  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 20px 80px', position: 'relative', zIndex: 1 }}>
      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08, duration: .45 }}
        style={{
          background: T.surface,
          border: '1px solid rgba(155,89,182,.12)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)',
          position: 'relative',
        }}
      >
        {/* Diagonal texture (like profile page) */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `repeating-linear-gradient(
            -55deg, transparent, transparent 58px,
            rgba(255,255,255,.008) 58px, rgba(255,255,255,.008) 59px
          )`,
        }} />

        {/* Hero — two columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '210px 1fr',
          gap: isMobile ? 20 : 24,
          padding: isMobile ? '24px 20px 20px' : '32px 32px 28px',
          position: 'relative', zIndex: 1,
        }}>
          {leftCard}
          {rightPanel}
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: T.border, margin: '0 28px', position: 'relative', zIndex: 1 }} />

        {/* Pill tabs — exactly like profile "Statistiques / Inventaire / Historique" */}
        <div ref={tabsRef} style={{
          display: 'flex', gap: 8,
          padding: isMobile ? '18px 20px' : '22px 32px',
          justifyContent: isMobile ? 'center' : 'flex-start',
          overflowX: 'auto', position: 'relative', zIndex: 1,
        }}>
          {TABS.map(t => (
            <motion.button key={t} onClick={() => setTab(t)} whileTap={{ scale: .93 }} style={{
              padding: '9px 22px', borderRadius: 99, cursor: 'pointer', whiteSpace: 'nowrap',
              background: tab === t ? 'rgba(155,89,182,.15)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${tab === t ? 'rgba(155,89,182,.4)' : T.border}`,
              color: tab === t ? T.violet : T.muted,
              fontWeight: tab === t ? 800 : 500, fontSize: 13,
              transition: 'all .22s', outline: 'none',
            }}>
              {{
                'Création':  '✦ Création',
                'Favoris':   '♡ Favoris',
                'Partagées': '🌍 Partagées',
                'Historique':'📋 Historique',
              }[t]}
            </motion.button>
          ))}
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: T.border, margin: '0 28px', position: 'relative', zIndex: 1 }} />

        {/* Tab content */}
        <div style={{ padding: isMobile ? '24px 20px 36px' : '28px 32px 44px', position: 'relative', zIndex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: .2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

// ── CategoryCard ──────────────────────────────────────────────
function CategoryCard({ cat, isFavorite, onToggle, onSelect }) {
  const [hov, setHov] = useState(false)

  if (cat.comingSoon) {
    return (
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 20, padding: '24px 22px', opacity: .38, position: 'relative',
      }}>
        <span style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(255,255,255,.05)', color: T.muted,
          fontSize: 9.5, fontWeight: 900, letterSpacing: '.14em', padding: '4px 10px', borderRadius: 8,
        }}>BIENTÔT</span>
        <div style={{
          width: 50, height: 50, borderRadius: 14,
          background: 'rgba(255,255,255,.04)', border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, marginBottom: 14,
        }}>{cat.icon}</div>
        <div style={{ fontWeight: 800, fontSize: 16, color: T.muted, marginBottom: 6 }}>{cat.title}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.18)', marginBottom: 18, lineHeight: 1.5 }}>{cat.description}</div>
        <div style={{
          padding: '10px', borderRadius: 10, border: `1px solid ${T.border}`,
          background: 'rgba(255,255,255,.02)', color: 'rgba(255,255,255,.16)',
          fontSize: 12, fontWeight: 700, textAlign: 'center',
        }}>Arrive bientôt</div>
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -6 }}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      style={{
        background: hov ? T.card2 : T.card,
        border: `1px solid ${hov ? T.borderPurple : T.border}`,
        borderRadius: 20, padding: '24px 22px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color .25s, background .2s, box-shadow .25s',
        boxShadow: hov
          ? `0 0 0 1px rgba(155,89,182,.1), 0 24px 64px rgba(0,0,0,.45), inset 0 1px 0 rgba(155,89,182,.08)`
          : '0 4px 20px rgba(0,0,0,.2)',
      }}
      onClick={() => onSelect(cat)}
    >
      {hov && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(155,89,182,.5), transparent)',
          pointerEvents: 'none',
        }} />
      )}
      {cat.badge && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          background: cat.badgeColor || T.accent, color: '#fff',
          fontSize: 9.5, fontWeight: 900, letterSpacing: '.12em', padding: '4px 10px', borderRadius: 8,
        }}>{cat.badge}</span>
      )}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: hov ? 'rgba(155,89,182,.12)' : 'rgba(255,255,255,.05)',
        border: `1px solid ${hov ? 'rgba(155,89,182,.28)' : T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, marginBottom: 16, transition: 'background .2s, border-color .2s',
      }}>{cat.icon}</div>
      <div style={{ fontWeight: 800, fontSize: 17, color: T.text, marginBottom: 6, paddingRight: cat.badge ? 70 : 0 }}>{cat.title}</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 1.55 }}>{cat.description}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(255,255,255,.04)', border: `1px solid ${T.border}`,
          borderRadius: 99, padding: '4px 12px',
          fontSize: 12, fontWeight: 700, color: T.muted,
        }}>{cat.count} entrées</div>
        <FavoriteButton active={isFavorite} onClick={() => onToggle(cat.id)} />
      </div>
      <button onClick={e => { e.stopPropagation(); onSelect(cat) }} style={{
        width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
        background: hov ? `linear-gradient(135deg, ${T.purple}, ${T.violet})` : 'rgba(255,255,255,.05)',
        color: hov ? '#fff' : T.muted,
        fontWeight: 900, fontSize: 13, cursor: 'pointer',
        transition: 'background .25s, color .2s',
        boxShadow: hov ? `0 6px 24px rgba(155,89,182,.3)` : 'none',
      }}>Créer cette tier list</button>
    </motion.div>
  )
}

// ── ListsGrid ─────────────────────────────────────────────────
function ListsGrid({ lists, emptyIcon, emptyText, emptyDesc, onTabSwitch }) {
  if (!lists || !lists.length) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
      <div style={{ fontSize: 44, marginBottom: 16, opacity: .3 }}>{emptyIcon}</div>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: T.text }}>{emptyText}</div>
      <div style={{ fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>{emptyDesc}</div>
      {onTabSwitch && (
        <button onClick={onTabSwitch} style={{
          padding: '10px 24px', borderRadius: 10,
          border: `1px solid ${T.borderPurple}`, background: 'rgba(155,89,182,.08)',
          color: T.violet, fontWeight: 800, cursor: 'pointer', fontSize: 13,
        }}>Créer une tier list</button>
      )}
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
      {lists.map((list, i) => (
        <motion.div key={list.id}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 18, padding: '20px 18px',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 15, color: T.text, marginBottom: 5 }}>{list.title}</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
            {list.theme} · {new Date(list.createdAt).toLocaleDateString('fr-FR')}
          </div>
          {list.image && (
            <img src={list.image} alt={list.title} style={{
              width: '100%', borderRadius: 10, marginBottom: 12,
              border: `1px solid ${T.border}`, display: 'block',
            }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              background: list.visibility === 'public' ? 'rgba(155,89,182,.12)' : 'rgba(255,255,255,.04)',
              color: list.visibility === 'public' ? T.violet : T.muted,
              border: `1px solid ${list.visibility === 'public' ? 'rgba(155,89,182,.28)' : T.border}`,
              borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 800,
            }}>
              {list.visibility === 'public' ? '🌍 Public' : '🔒 Privé'}
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>{list.tiers?.length || 0} tiers</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── DnD Item ──────────────────────────────────────────────────
function DragItem({ item, img, onDelete }) {
  const [imgErr, setImgErr] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const showImg = img && !imgErr

  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      style={{
        width: 86, flexShrink: 0, borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${isDragging ? T.borderPurple : T.border}`,
        background: isDragging ? 'rgba(155,89,182,.18)' : 'rgba(255,255,255,.05)',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? .45 : 1, touchAction: 'none', userSelect: 'none',
        transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
        transition: isDragging ? 'none' : 'border-color .15s,background .15s',
        position: 'relative',
      }}
    >
      <button onPointerDown={e => e.stopPropagation()} onClick={() => onDelete(item.id)} style={{
        position: 'absolute', top: 3, right: 3, zIndex: 2,
        width: 18, height: 18, borderRadius: 5, background: 'rgba(0,0,0,.7)',
        border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>×</button>
      {showImg ? (
        <img src={img} alt={item.name} onError={() => setImgErr(true)}
          style={{ width: '100%', height: 86, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{
          width: '100%', height: 86,
          background: 'linear-gradient(135deg, rgba(155,89,182,.22), rgba(166,108,255,.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 950, color: T.violet, userSelect: 'none',
        }}>{item.name[0]}</div>
      )}
      <div style={{
        padding: '4px 5px', fontSize: 10, fontWeight: 700, color: T.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'center', background: 'rgba(0,0,0,.5)',
      }}>{item.name}</div>
    </div>
  )
}

// ── TierRow ───────────────────────────────────────────────────
function TierRow({ tier, items, imgCache, onLabel, onDelTier, onDelItem }) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '68px minmax(0,1fr) 34px', gap: 6, minHeight: 100 }}>
      <input
        value={tier.label} onChange={e => onLabel(tier.id, e.target.value)} maxLength={12}
        style={{
          height: '100%', boxSizing: 'border-box', borderRadius: 10, border: 'none',
          background: tier.color, color: '#06070a', textAlign: 'center',
          fontSize: 24, fontWeight: 950, outline: 'none', cursor: 'text',
        }}
      />
      <div ref={setNodeRef} style={{
        display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 7, padding: 10,
        borderRadius: 12, minHeight: 100,
        border: `1px solid ${isOver ? T.borderPurple : T.border}`,
        background: isOver ? 'rgba(155,89,182,.07)' : 'rgba(255,255,255,.03)',
        transition: 'border-color .15s,background .15s',
      }}>
        {items.map(item => (
          <DragItem key={item.id} item={item} img={imgCache?.[item.name]} onDelete={onDelItem} />
        ))}
      </div>
      <button onClick={() => onDelTier(tier.id)} style={{
        borderRadius: 10, border: `1px solid ${T.border}`,
        background: 'none', color: T.muted, cursor: 'pointer', fontSize: 18,
      }}>×</button>
    </div>
  )
}

// ── Pool ──────────────────────────────────────────────────────
function Pool({ items, imgCache, onDelItem }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ color: T.muted, fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
        Pool — non classés
      </div>
      <div ref={setNodeRef} style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 7, padding: 14,
        borderRadius: 14, minHeight: 110,
        border: `1px dashed ${isOver ? T.borderPurple : T.border}`,
        background: isOver ? 'rgba(155,89,182,.05)' : 'rgba(255,255,255,.02)',
        transition: 'border-color .15s,background .15s',
      }}>
        {items.length === 0
          ? <span style={{ color: T.muted, fontSize: 13, alignSelf: 'center' }}>Glisse des items ici, ou ajoute-en via le panneau</span>
          : items.map(item => (
              <DragItem key={item.id} item={item} img={imgCache?.[item.name]} onDelete={onDelItem} />
            ))
        }
      </div>
    </div>
  )
}

// ── Sidebar helpers ───────────────────────────────────────────
const lbl = { display: 'block', color: T.muted, fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 7 }
const inp = { width: '100%', boxSizing: 'border-box', height: 40, borderRadius: 10, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,.05)', color: T.text, padding: '0 12px', outline: 'none', fontWeight: 700, fontSize: 13 }

function BtnPrimary({ children, onClick, style: sx }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px', borderRadius: 10, border: 'none',
      background: `linear-gradient(135deg, ${T.purple}, ${T.violet})`,
      color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer',
      width: '100%', boxShadow: `0 4px 16px rgba(155,89,182,.28)`, ...sx,
    }}>{children}</button>
  )
}
function BtnGhost({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px', borderRadius: 10,
      border: `1px solid ${T.border}`, background: 'rgba(255,255,255,.04)',
      color: T.muted, fontWeight: 800, fontSize: 13, cursor: 'pointer', width: '100%',
    }}>{children}</button>
  )
}

// ── Builder ───────────────────────────────────────────────────
function Builder({ cat, initDraft, fromDraft, onBack, saveDraft, clearDraft, toast, displayName }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const boardRef = useRef(null)

  const [title, setTitle]    = useState(() => fromDraft && initDraft?.title ? initDraft.title : cat ? `Mes ${cat.title}` : 'Ma Tier List')
  const [tiers, setTiers]    = useState(() => fromDraft && initDraft?.tiers ? initDraft.tiers : DEFAULT_TIERS)
  const [items, setItems]    = useState(() => {
    if (fromDraft && initDraft?.items) return initDraft.items
    if (cat?.items) return cat.items.map(name => ({ id: uid('item'), name, tierId: null }))
    return []
  })
  const [newInput, setNew]   = useState('')
  const [newTier, setNT]     = useState('')
  const [activeId, setActId] = useState(null)
  const [imgUrl, setImg]     = useState('')
  const sensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const imgCache = useItemImages(items, cat?.id ?? 'custom')

  const pool       = items.filter(i => !i.tierId)
  const activeItem = items.find(i => i.id === activeId) ?? null

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    saveDraft({ title, tiers, items, categoryId: cat?.id })
  }, [title, tiers, items])

  function addItems() {
    const names = splitItems(newInput); if (!names.length) return
    setItems(p => [...p, ...names.map(n => ({ id: uid('item'), name: n, tierId: null }))])
    setNew('')
  }
  function delItem(id) { setItems(p => p.filter(i => i.id !== id)) }
  function addTier() {
    const lbl2 = newTier.trim().slice(0, 12); if (!lbl2) return
    const cols = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#64748b']
    setTiers(p => [...p, { id: uid('tier'), label: lbl2, color: cols[p.length % cols.length] }])
    setNT('')
  }
  function updLabel(tid, l) { setTiers(p => p.map(t => t.id === tid ? { ...t, label: l } : t)) }
  function delTier(tid) {
    setTiers(p => p.filter(t => t.id !== tid))
    setItems(p => p.map(i => i.tierId === tid ? { ...i, tierId: null } : i))
  }

  function onDragStart({ active }) { setActId(active.id) }
  function onDragEnd({ active, over }) {
    setActId(null)
    if (!over) return
    setItems(p => p.map(i => i.id === active.id ? { ...i, tierId: over.id === 'pool' ? null : over.id } : i))
  }

  async function genImg() {
    if (!boardRef.current) return null
    try {
      const url = await toPng(boardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#111214' })
      setImg(url); toast('Image générée !'); return url
    } catch { toast('Erreur génération.'); return null }
  }

  async function publish(vis) {
    const url = imgUrl || await genImg()
    const list = {
      id: uid('tl'), title, theme: cat?.title || 'Custom', categoryId: cat?.id,
      author: displayName || 'Pirate', createdAt: new Date().toISOString(),
      visibility: vis, likes: 0, tiers, items, image: url || '',
    }
    ss(MY_KEY, [list, ...sg(MY_KEY, [])])
    if (vis === 'public') ss(PUBLIC_KEY, [list, ...sg(PUBLIC_KEY, [])])
    clearDraft()
    toast(vis === 'public' ? 'Tier List publiée !' : 'Sauvegardée en privé.')
  }

  async function share() {
    try {
      const enc = btoa(encodeURIComponent(JSON.stringify({ title, tiers, items, categoryId: cat?.id })))
      await navigator.clipboard.writeText(`${window.location.origin}/tier-list?share=${enc}`)
      toast('Lien copié !')
    } catch { toast('Impossible de copier le lien.') }
  }

  const sidebarContent = (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={lbl}>Titre</div>
        <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={lbl}>Ajouter des éléments</div>
        <textarea value={newInput} onChange={e => setNew(e.target.value)}
          placeholder="Un par ligne ou séparés par virgules"
          style={{ ...inp, height: 80, paddingTop: 10, resize: 'vertical' }}
        />
        <BtnPrimary onClick={addItems} style={{ marginTop: 8 }}>+ Ajouter</BtnPrimary>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={lbl}>Nouveau tier</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input value={newTier} onChange={e => setNT(e.target.value)} placeholder="Ex: GOAT" style={inp}
            onKeyDown={e => e.key === 'Enter' && addTier()} />
          <BtnPrimary onClick={addTier} style={{ width: 40 }}>+</BtnPrimary>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <BtnGhost onClick={genImg}>📷 Générer l'image</BtnGhost>
        <BtnGhost onClick={() => publish('public')}>🌍 Publier</BtnGhost>
        <BtnGhost onClick={() => publish('private')}>🔒 Sauvegarder</BtnGhost>
        <BtnGhost onClick={share}>🔗 Copier le lien</BtnGhost>
        {imgUrl && (
          <a href={imgUrl} download={`${title.replace(/\s+/g, '-')}.png`} style={{
            padding: '10px 16px', borderRadius: 10, border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,.04)', color: T.muted, fontWeight: 800,
            fontSize: 13, width: '100%', boxSizing: 'border-box',
            textAlign: 'center', textDecoration: 'none', display: 'block',
          }}>⬇ Télécharger</a>
        )}
      </div>
      <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(155,89,182,.05)', border: '1px solid rgba(155,89,182,.12)' }}>
        <div style={{ color: T.violet, fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 5 }}>Astuce</div>
        <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.55 }}>Glisse les items entre les tiers. La tier list est sauvegardée automatiquement.</div>
      </div>
    </>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 1180, margin: '0 auto', padding: '90px 20px 80px', position: 'relative', zIndex: 1 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{
          padding: '8px 18px', borderRadius: 10, border: `1px solid ${T.border}`,
          background: 'rgba(255,255,255,.04)', color: T.muted, fontWeight: 800, cursor: 'pointer', fontSize: 13,
        }}>← Retour</button>
        {cat && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(155,89,182,.22)', background: 'rgba(155,89,182,.07)',
            borderRadius: 99, padding: '5px 14px',
            fontSize: 12, fontWeight: 700, color: T.violet,
          }}>{cat.icon} {cat.title}</span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '290px minmax(0,1fr)',
        gap: 16, alignItems: 'start',
      }}>
        {!isMobile && (
          <aside style={{
            border: '1px solid rgba(155,89,182,.12)', background: T.surface,
            borderRadius: 18, padding: 20, backdropFilter: 'blur(16px)',
            position: 'sticky', top: 90,
          }}>{sidebarContent}</aside>
        )}

        <main>
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div ref={boardRef} style={{
              border: '1px solid rgba(155,89,182,.14)',
              background: `radial-gradient(ellipse 60% 40% at 50% 0%, rgba(155,89,182,.07), transparent 55%), ${T.surface}`,
              borderRadius: 18, padding: 22, boxShadow: '0 24px 80px rgba(0,0,0,.35)',
            }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: T.violet, fontSize: 11, fontWeight: 950, letterSpacing: '.18em', textTransform: 'uppercase' }}>{cat?.title || 'Custom'}</div>
                <h2 style={{
                  fontFamily: "'Pirata One', cursive", fontSize: 40, margin: '4px 0 0', lineHeight: 1,
                  background: 'linear-gradient(135deg, #fff, rgba(255,255,255,.78), #ffd700)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{title}</h2>
              </div>
              <div style={{ display: 'grid', gap: 7 }}>
                {tiers.map(tier => (
                  <TierRow key={tier.id} tier={tier}
                    items={items.filter(i => i.tierId === tier.id)}
                    imgCache={imgCache} onLabel={updLabel} onDelTier={delTier} onDelItem={delItem}
                  />
                ))}
              </div>
              <Pool items={pool} imgCache={imgCache} onDelItem={delItem} />
            </div>

            <DragOverlay>
              {activeItem && (
                <div style={{
                  width: 86, borderRadius: 10, overflow: 'hidden',
                  border: `1px solid ${T.borderPurple}`,
                  boxShadow: `0 20px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(155,89,182,.2)`,
                  cursor: 'grabbing', opacity: .94,
                }}>
                  {imgCache[activeItem.name] ? (
                    <img src={imgCache[activeItem.name]} alt={activeItem.name}
                      style={{ width: '100%', height: 86, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: 86,
                      background: 'linear-gradient(135deg, rgba(155,89,182,.3), rgba(166,108,255,.2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 30, fontWeight: 950, color: T.violet,
                    }}>{activeItem.name[0]}</div>
                  )}
                  <div style={{
                    padding: '4px 5px', fontSize: 10, fontWeight: 700, color: T.text,
                    textAlign: 'center', background: 'rgba(0,0,0,.55)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{activeItem.name}</div>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {imgUrl && (
            <div style={{ border: `1px solid ${T.borderGold}`, background: T.surface, borderRadius: 18, padding: 18, marginTop: 16 }}>
              <div style={{ color: T.gold, fontWeight: 950, marginBottom: 10, fontSize: 13 }}>Image exportée</div>
              <img src={imgUrl} alt="Export" style={{ width: '100%', borderRadius: 12, border: `1px solid ${T.border}` }} />
            </div>
          )}
        </main>

        {isMobile && (
          <aside style={{ border: '1px solid rgba(155,89,182,.12)', background: T.surface, borderRadius: 18, padding: 20 }}>
            {sidebarContent}
          </aside>
        )}
      </div>
    </motion.div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function TierListPage() {
  const { displayName } = useAuth()
  const isMobile = useMediaQuery('(max-width: 920px)')
  const [view, setView]           = useState('landing')
  const [selCat, setSelCat]       = useState(null)
  const [fromDraft, setFromDraft] = useState(false)
  const [tab, setTab]             = useState('Création')
  const { favs, toggle, isFav }   = useFavorites()
  const { draft, save, clear }    = useDraft()
  const { msg, show }             = useToast()
  const tabsRef                   = useRef(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('share')
    if (!p) return
    try {
      const data = JSON.parse(decodeURIComponent(atob(p)))
      if (!data || !Array.isArray(data.tiers) || !Array.isArray(data.items)) return
      save(data)
      setSelCat(CATEGORIES.find(c => c.id === data.categoryId) ?? null)
      setFromDraft(true)
      setView('creating')
    } catch {}
  }, [])

  function selectCat(cat) { setSelCat(cat); setFromDraft(false); setView('creating') }
  function create()        { setSelCat(null); setFromDraft(false); setView('creating') }
  function resume() {
    setSelCat(draft?.categoryId ? (CATEGORIES.find(c => c.id === draft.categoryId) ?? null) : null)
    setFromDraft(true); setView('creating')
  }
  function goFavs() {
    setTab('Favoris')
    setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60)
  }

  const myLists     = sg(MY_KEY, [])
  const publicLists = sg(PUBLIC_KEY, [])
  const favCats     = CATEGORIES.filter(c => isFav(c.id))
  const MAIN_TITLES = new Set(CATEGORIES.filter(c => !c.comingSoon).map(c => c.title))
  const catsUsed    = new Set(myLists.map(l => l.theme).filter(t => MAIN_TITLES.has(t))).size

  const tabContent = (
    <>
      {tab === 'Création' && (
        <div>
          <div style={{ marginBottom: 26 }}>
            <div style={{ color: T.violet, fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 7 }}>CHOISIR UNE CATÉGORIE</div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 950, color: T.text }}>Quelle tier list tu veux faire ?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 16 }}>
            {CATEGORIES.map((cat, i) => (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }}>
                <CategoryCard cat={cat} isFavorite={isFav(cat.id)}
                  onToggle={(id) => { const was = isFav(id); toggle(id); show(was ? 'Retiré des favoris' : 'Ajouté aux favoris ♥') }}
                  onSelect={selectCat}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Favoris' && (
        <div>
          <div style={{ marginBottom: 26 }}>
            <div style={{ color: T.violet, fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 7 }}>MES FAVORIS</div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 950, color: T.text }}>Catégories sauvegardées</h2>
          </div>
          {favCats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: T.muted }}>
              <div style={{ fontSize: 44, marginBottom: 16, opacity: .3 }}>♡</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: T.text }}>Aucun favori pour l'instant</div>
              <div style={{ fontSize: 13, marginBottom: 24 }}>Clique sur ♡ sur une catégorie pour la retrouver ici</div>
              <button onClick={() => setTab('Création')} style={{
                padding: '10px 24px', borderRadius: 10,
                border: `1px solid ${T.borderPurple}`, background: 'rgba(155,89,182,.08)',
                color: T.violet, fontWeight: 800, cursor: 'pointer', fontSize: 13,
              }}>Voir les catégories</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 16 }}>
              {favCats.map((cat, i) => (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .05 }}>
                  <CategoryCard cat={cat} isFavorite
                    onToggle={(id) => { toggle(id); show('Retiré des favoris') }}
                    onSelect={selectCat}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Partagées' && (
        <div>
          <div style={{ marginBottom: 26 }}>
            <div style={{ color: T.violet, fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 7 }}>TIER LISTS PUBLIQUES</div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 950, color: T.text }}>Partagées avec la communauté</h2>
          </div>
          <ListsGrid lists={publicLists} emptyIcon="🌍" emptyText="Aucune tier list publiée"
            emptyDesc="Crée une tier list et publie-la pour qu'elle apparaisse ici"
            onTabSwitch={() => setTab('Création')} />
        </div>
      )}

      {tab === 'Historique' && (
        <div>
          <div style={{ marginBottom: 26 }}>
            <div style={{ color: T.violet, fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 7 }}>MON HISTORIQUE</div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 950, color: T.text }}>Mes tier lists sauvegardées</h2>
          </div>
          <ListsGrid lists={myLists} emptyIcon="📋" emptyText="Aucune tier list sauvegardée"
            emptyDesc="Crée et sauvegarde une tier list pour la retrouver ici"
            onTabSwitch={() => setTab('Création')} />
        </div>
      )}
    </>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text }}>
      {/* Atmospheric bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 85% 55% at 50% -5%, rgba(155,89,182,0.16) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 88% 70%, rgba(166,108,255,0.05) 0%, transparent 50%)
        `,
      }} />

      <Toast msg={msg} />

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'relative', zIndex: 1, paddingTop: 80 }}
          >
            <MainPanel
              leftCard={<TierCreatorCard draft={draft} favCount={favs.length} />}
              rightPanel={<TierMainInfo onCreate={create} onFavs={goFavs} onResume={resume} draft={draft} catsUsed={catsUsed} />}
              tab={tab} setTab={setTab} tabsRef={tabsRef} isMobile={isMobile}
            >
              {tabContent}
            </MainPanel>
          </motion.div>
        )}

        {view === 'creating' && (
          <motion.div key="creating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Builder
              cat={selCat} initDraft={draft} fromDraft={fromDraft}
              onBack={() => setView('landing')}
              saveDraft={save} clearDraft={clear} toast={show} displayName={displayName}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
