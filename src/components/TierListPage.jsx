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
  bg:            '#08090D',
  surface:       'rgba(255,255,255,0.04)',
  surfaceHover:  'rgba(255,255,255,0.07)',
  border:        'rgba(255,255,255,0.08)',
  borderHover:   'rgba(255,255,255,0.20)',
  gold:          '#BFA46A',
  accent:        '#c0392b',
  accentLight:   '#e05a4e',
  muted:         'rgba(255,255,255,0.45)',
  faint:         'rgba(255,255,255,0.22)',
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

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          key={msg}
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0,  x: '-50%' }}
          exit={{   opacity: 0, y: 16,  x: '-50%' }}
          style={{
            position: 'fixed', bottom: 28, left: '50%',
            background: '#16181f',
            border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${T.gold}`,
            color: '#fff', fontWeight: 700, fontSize: 13,
            padding: '12px 20px', borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,.5)',
            zIndex: 9999, whiteSpace: 'nowrap',
          }}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── FavoriteButton ─────────────────────────────────────────────
function FavoriteButton({ active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 20, lineHeight: 1, padding: '4px 6px',
        color: active ? T.accentLight : T.faint,
        transition: 'color .2s',
      }}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      {active ? '♥' : '♡'}
    </motion.button>
  )
}

// ── CategoryCard ──────────────────────────────────────────────
function CategoryCard({ cat, isFavorite, onToggle, onSelect }) {
  const [hov, setHov] = useState(false)

  if (cat.comingSoon) {
    return (
      <div style={{
        border: `1px solid ${T.border}`, background: T.surface,
        borderRadius: 18, padding: '24px 22px', opacity: .5, position: 'relative',
      }}>
        <span style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(255,255,255,0.07)', color: T.muted,
          fontSize: 10, fontWeight: 900, letterSpacing: '.12em',
          padding: '4px 9px', borderRadius: 8,
        }}>BIENTÔT</span>
        <div style={{ fontSize: 30, marginBottom: 12 }}>{cat.icon}</div>
        <div style={{ fontWeight: 900, fontSize: 17, color: T.muted, marginBottom: 5 }}>{cat.title}</div>
        <div style={{ fontSize: 13, color: T.faint, marginBottom: 16 }}>{cat.description}</div>
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)',
          color: T.faint, fontSize: 12, fontWeight: 700, textAlign: 'center',
        }}>Cette catégorie arrive bientôt</div>
      </div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      style={{
        border: `1px solid ${hov ? T.borderHover : T.border}`,
        background: hov ? T.surfaceHover : T.surface,
        borderRadius: 18, padding: '24px 22px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color .2s, background .2s, box-shadow .2s',
        boxShadow: hov ? '0 20px 60px rgba(0,0,0,.4)' : '0 6px 24px rgba(0,0,0,.2)',
      }}
      onClick={() => onSelect(cat)}
    >
      {cat.badge && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          background: cat.badgeColor || T.accent, color: '#fff',
          fontSize: 10, fontWeight: 900, letterSpacing: '.12em',
          padding: '4px 9px', borderRadius: 8,
        }}>{cat.badge}</span>
      )}
      <div style={{ fontSize: 30, marginBottom: 14 }}>{cat.icon}</div>
      <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', marginBottom: 5 }}>{cat.title}</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>{cat.description}</div>
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
        borderRadius: 10, padding: '4px 10px', fontSize: 12, fontWeight: 800,
        color: T.muted, marginBottom: 18,
      }}>{cat.count} entrées</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={e => { e.stopPropagation(); onSelect(cat) }}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg,${T.accent},${T.accentLight})`,
            color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer',
          }}
        >Créer cette tier list</button>
        <FavoriteButton active={isFavorite} onClick={() => onToggle(cat.id)} />
      </div>
    </motion.div>
  )
}

// ── Hero ──────────────────────────────────────────────────────
function Hero({ onCreate, onFavs, hasDraft, onResume }) {
  const STATS = [
    { v: '40', l: 'animes' }, { v: '30', l: 'personnages' },
    { v: '25', l: 'arcs' },   { v: '20', l: 'films & OAV' },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .5 }}
      style={{ textAlign: 'center', padding: '56px 20px 48px', maxWidth: 700, margin: '0 auto' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: .08 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: `1px solid ${T.border}`, background: T.surface,
          borderRadius: 99, padding: '6px 16px',
          fontSize: 12, fontWeight: 900, color: T.gold, letterSpacing: '.14em',
          marginBottom: 26,
        }}
      >🏆 BRAMS TIER MAKER</motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .14 }}
        style={{
          fontFamily: "'Pirata One',cursive",
          fontSize: 'clamp(42px,8vw,84px)',
          margin: '0 0 18px', lineHeight: .95, color: '#fff',
        }}
      >Crée ta tier list ultime</motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .19 }}
        style={{ fontSize: 15, color: T.muted, lineHeight: 1.7, margin: '0 auto 34px', maxWidth: 560 }}
      >
        Classe tes animes, personnages, arcs et films préférés. Sauvegarde tes favoris, partage ton classement et compare tes goûts avec la communauté.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .23 }}
        style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: hasDraft ? 18 : 36 }}
      >
        <button onClick={onCreate} style={{
          padding: '13px 28px', borderRadius: 12, border: 'none',
          background: `linear-gradient(135deg,${T.accent},${T.accentLight})`,
          color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(192,57,43,.32)',
        }}>Créer une tier list</button>
        <button onClick={onFavs} style={{
          padding: '13px 28px', borderRadius: 12,
          border: `1px solid ${T.border}`, background: T.surface,
          color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer',
        }}>Voir mes favoris</button>
      </motion.div>

      <AnimatePresence>
        {hasDraft && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 14,
              border: `1px solid rgba(191,164,106,.22)`,
              background: 'rgba(191,164,106,.05)',
              borderRadius: 12, padding: '10px 18px',
              fontSize: 13, color: T.muted, marginBottom: 28,
            }}
          >
            <span>⏳ Tu as une tier list en cours</span>
            <button onClick={onResume} style={{
              background: 'none', border: 'none',
              color: T.gold, fontWeight: 900, cursor: 'pointer', fontSize: 13,
            }}>Continuer →</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .3 }}
        style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}
      >
        {STATS.map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 950, color: '#fff' }}>{s.v}</div>
            <div style={{ fontSize: 11, color: T.faint, fontWeight: 700, letterSpacing: '.08em' }}>{s.l}</div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ── DnD Item ──────────────────────────────────────────────────
function DragItem({ item, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 8,
        border: `1px solid ${isDragging ? T.borderHover : T.border}`,
        background: isDragging ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.055)',
        color: '#fff', fontSize: 13, fontWeight: 700,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? .45 : 1, touchAction: 'none', userSelect: 'none',
        transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined,
        transition: isDragging ? 'none' : 'border-color .15s,background .15s',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.name}</span>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onDelete(item.id)}
        style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
      >×</button>
    </div>
  )
}

// ── Droppable Tier Row ────────────────────────────────────────
function TierRow({ tier, items, onLabel, onDelTier, onDelItem }) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '68px minmax(0,1fr) 34px', gap: 6, minHeight: 60 }}>
      <input
        value={tier.label} onChange={e => onLabel(tier.id, e.target.value)} maxLength={12}
        style={{
          height: '100%', boxSizing: 'border-box', borderRadius: 10, border: 'none',
          background: tier.color, color: '#06070a', textAlign: 'center',
          fontSize: 24, fontWeight: 950, outline: 'none', cursor: 'text',
        }}
      />
      <div
        ref={setNodeRef}
        style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, padding: 10,
          borderRadius: 12, minHeight: 60,
          border: `1px solid ${isOver ? T.borderHover : T.border}`,
          background: isOver ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)',
          transition: 'border-color .15s,background .15s',
        }}
      >
        {items.map(item => <DragItem key={item.id} item={item} onDelete={onDelItem} />)}
      </div>
      <button
        onClick={() => onDelTier(tier.id)}
        style={{
          borderRadius: 10, border: `1px solid ${T.border}`,
          background: 'none', color: T.faint, cursor: 'pointer', fontSize: 18,
        }}
      >×</button>
    </div>
  )
}

// ── Pool ──────────────────────────────────────────────────────
function Pool({ items, onDelItem }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ color: T.faint, fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
        Pool — non classés
      </div>
      <div
        ref={setNodeRef}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 7, padding: 14,
          borderRadius: 14, minHeight: 54,
          border: `1px dashed ${isOver ? T.borderHover : T.border}`,
          background: isOver ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.02)',
          transition: 'border-color .15s,background .15s',
        }}
      >
        {items.length === 0
          ? <span style={{ color: T.faint, fontSize: 13 }}>Glisse des items ici, ou ajoute-en via le panneau</span>
          : items.map(item => <DragItem key={item.id} item={item} onDelete={onDelItem} />)
        }
      </div>
    </div>
  )
}

// ── Sidebar style helpers ─────────────────────────────────────
const lbl = { display:'block', color: 'rgba(255,255,255,.3)', fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 7 }
const inp = { width:'100%', boxSizing:'border-box', height: 40, borderRadius: 10, border:`1px solid rgba(255,255,255,.08)`, background:'rgba(255,255,255,.05)', color:'#fff', padding:'0 12px', outline:'none', fontWeight: 700, fontSize: 13 }

function BtnPrimary({ children, onClick, style: sx }) {
  return (
    <button onClick={onClick} style={{ padding:'10px 16px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${T.accent},${T.accentLight})`, color:'#fff', fontWeight:900, fontSize:13, cursor:'pointer', width:'100%', ...sx }}>
      {children}
    </button>
  )
}
function BtnGhost({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ padding:'10px 16px', borderRadius:10, border:`1px solid rgba(255,255,255,.08)`, background:'rgba(255,255,255,.04)', color:'rgba(255,255,255,.5)', fontWeight:800, fontSize:13, cursor:'pointer', width:'100%' }}>
      {children}
    </button>
  )
}

// ── Builder ───────────────────────────────────────────────────
function Builder({ cat, initDraft, fromDraft, onBack, saveDraft, clearDraft, toast, displayName }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const boardRef = useRef(null)

  const [title, setTitle]   = useState(() => fromDraft && initDraft?.title  ? initDraft.title  : cat ? `Mes ${cat.title}` : 'Ma Tier List')
  const [tiers, setTiers]   = useState(() => fromDraft && initDraft?.tiers  ? initDraft.tiers  : DEFAULT_TIERS)
  const [items, setItems]   = useState(() => {
    if (fromDraft && initDraft?.items) return initDraft.items
    if (cat?.items) return cat.items.map(name => ({ id: uid('item'), name, tierId: null }))
    return []
  })
  const [newInput, setNew]  = useState('')
  const [newTier, setNT]    = useState('')
  const [activeId, setActId]= useState(null)
  const [imgUrl, setImg]    = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const pool       = items.filter(i => !i.tierId)
  const activeItem = items.find(i => i.id === activeId) ?? null

  // auto-save — skip first render to avoid overwriting draft on mount
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
    const lbl2 = newTier.trim().slice(0,12); if (!lbl2) return
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
    const tid = over.id === 'pool' ? null : over.id
    setItems(p => p.map(i => i.id === active.id ? { ...i, tierId: tid } : i))
  }

  async function genImg() {
    if (!boardRef.current) return null
    try {
      const url = await toPng(boardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#07090e' })
      setImg(url); toast('Image générée !'); return url
    } catch { toast('Erreur génération.'); return null }
  }

  async function publish(vis) {
    const url = imgUrl || await genImg()
    const list = { id: uid('tl'), title, theme: cat?.title || 'Custom', author: displayName || 'Pirate', createdAt: new Date().toISOString(), visibility: vis, likes: 0, tiers, items, image: url || '' }
    const my   = [list, ...sg(MY_KEY, [])]
    ss(MY_KEY, my)
    if (vis === 'public') {
      const pub = [list, ...sg(PUBLIC_KEY, [])]
      ss(PUBLIC_KEY, pub)
    }
    clearDraft()
    toast(vis === 'public' ? 'Tier List publiée !' : 'Sauvegardée en privé.')
  }

  async function share() {
    try {
      const data = { title, tiers, items, categoryId: cat?.id }
      const enc  = btoa(encodeURIComponent(JSON.stringify(data)))
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
          <a href={imgUrl} download={`${title.replace(/\s+/g,'-')}.png`}
            style={{ padding:'10px 16px', borderRadius:10, border:`1px solid rgba(255,255,255,.08)`, background:'rgba(255,255,255,.04)', color:'rgba(255,255,255,.5)', fontWeight:800, fontSize:13, cursor:'pointer', width:'100%', boxSizing:'border-box', textAlign:'center', textDecoration:'none', display:'block' }}>
            ⬇ Télécharger
          </a>
        )}
      </div>
      <div style={{ marginTop: 16, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,.02)', border:`1px solid ${T.border}` }}>
        <div style={{ color: T.faint, fontSize: 11, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:5 }}>Astuce</div>
        <div style={{ color: T.faint, fontSize: 12, lineHeight:1.55 }}>Glisse les items entre les tiers. La tier list est sauvegardée automatiquement.</div>
      </div>
    </>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22, flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, color:T.muted, fontWeight:800, cursor:'pointer', fontSize:13 }}>
          ← Retour
        </button>
        {cat && <span style={{ fontSize:13, color:T.faint }}>{cat.icon} {cat.title}</span>}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '290px minmax(0,1fr)', gap:16, alignItems:'start' }}>
        {!isMobile && (
          <aside style={{ border:`1px solid ${T.border}`, background:T.surface, borderRadius:18, padding:20, backdropFilter:'blur(16px)', position:'sticky', top:90 }}>
            {sidebarContent}
          </aside>
        )}

        <main>
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div ref={boardRef} style={{
              border:`1px solid ${T.border}`,
              background:'radial-gradient(circle at 15% 0%,rgba(192,57,43,.07),transparent 36%),linear-gradient(145deg,#11141b,#080a0f)',
              borderRadius:18, padding:22,
              boxShadow:'0 26px 90px rgba(0,0,0,.32)',
            }}>
              <div style={{ marginBottom:18 }}>
                <div style={{ color:T.gold, fontSize:11, fontWeight:950, letterSpacing:'.18em', textTransform:'uppercase' }}>{cat?.title || 'Custom'}</div>
                <h2 style={{ fontFamily:"'Pirata One',cursive", fontSize:40, margin:'4px 0 0', lineHeight:1 }}>{title}</h2>
              </div>
              <div style={{ display:'grid', gap:7 }}>
                {tiers.map(tier => (
                  <TierRow key={tier.id} tier={tier}
                    items={items.filter(i => i.tierId === tier.id)}
                    onLabel={updLabel} onDelTier={delTier} onDelItem={delItem}
                  />
                ))}
              </div>
              <Pool items={pool} onDelItem={delItem} />
            </div>

            <DragOverlay>
              {activeItem && (
                <div style={{
                  padding:'7px 12px', borderRadius:8,
                  border:`1px solid ${T.borderHover}`,
                  background:'rgba(20,22,30,.96)', color:'#fff',
                  fontSize:13, fontWeight:700,
                  boxShadow:'0 20px 60px rgba(0,0,0,.5)', cursor:'grabbing',
                }}>{activeItem.name}</div>
              )}
            </DragOverlay>
          </DndContext>

          {imgUrl && (
            <div style={{ border:`1px solid ${T.border}`, background:T.surface, borderRadius:18, padding:18, marginTop:16 }}>
              <div style={{ color:T.gold, fontWeight:950, marginBottom:10, fontSize:13 }}>Image exportée</div>
              <img src={imgUrl} alt="Export" style={{ width:'100%', borderRadius:12, border:`1px solid ${T.border}` }} />
            </div>
          )}
        </main>

        {isMobile && (
          <aside style={{ border:`1px solid ${T.border}`, background:T.surface, borderRadius:18, padding:20 }}>
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
  const [view, setView]         = useState('landing')
  const [selCat, setSelCat]     = useState(null)
  const [fromDraft, setFromDraft] = useState(false)
  const [favOnly, setFavOnly]   = useState(false)
  const { favs, toggle, isFav } = useFavorites()
  const { draft, save, clear }  = useDraft()
  const { msg, show }           = useToast()

  // handle ?share= on load — validate schema before trusting data
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('share')
    if (!p) return
    try {
      const data = JSON.parse(decodeURIComponent(atob(p)))
      if (!data || !Array.isArray(data.tiers) || !Array.isArray(data.items)) return
      const cat = CATEGORIES.find(c => c.id === data.categoryId) ?? null
      // load as transient imported state without overwriting existing draft
      setSelCat(cat); setFromDraft(true)
      save(data)
      setView('creating')
    } catch {}
  }, [])

  function selectCat(cat) { setSelCat(cat); setFromDraft(false); setView('creating') }
  function create()       { setSelCat(null); setFromDraft(false); setView('creating') }
  function resume()       {
    const cat = draft?.categoryId ? (CATEGORIES.find(c => c.id === draft.categoryId) ?? null) : null
    setSelCat(cat); setFromDraft(true); setView('creating')
  }

  const displayed = favOnly ? CATEGORIES.filter(c => isFav(c.id)) : CATEGORIES

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:'#fff', padding:'90px 20px 70px' }}>
      <Toast msg={msg} />

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <Hero
              onCreate={create}
              onFavs={() => setFavOnly(true)}
              hasDraft={!!draft}
              onResume={resume}
            />

            <div style={{ maxWidth:1100, margin:'0 auto', marginTop:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                <div>
                  <div style={{ color:T.gold, fontSize:11, fontWeight:900, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:5 }}>CHOISIR UNE CATÉGORIE</div>
                  <h2 style={{ margin:0, fontSize:24, fontWeight:950 }}>Quelle tier list tu veux faire ?</h2>
                </div>
                {favOnly && (
                  <button onClick={() => setFavOnly(false)} style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, color:T.muted, fontWeight:800, cursor:'pointer', fontSize:13 }}>
                    Toutes les catégories
                  </button>
                )}
              </div>

              {favOnly && displayed.length === 0 && (
                <div style={{ textAlign:'center', padding:'52px 0', color:T.faint }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>♡</div>
                  <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>Aucun favori pour l'instant</div>
                  <div style={{ fontSize:13 }}>Clique sur ♡ sur une catégorie pour la retrouver ici</div>
                  <button onClick={() => setFavOnly(false)} style={{ marginTop:20, padding:'10px 22px', borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, color:T.muted, fontWeight:800, cursor:'pointer' }}>
                    Voir tout
                  </button>
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
                {displayed.map((cat, i) => (
                  <motion.div key={cat.id} initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * .06 }}>
                    <CategoryCard
                      cat={cat}
                      isFavorite={isFav(cat.id)}
                      onToggle={(id) => {
                        const was = isFav(id)
                        toggle(id)
                        show(was ? 'Retiré des favoris' : 'Ajouté aux favoris ♥')
                      }}
                      onSelect={selectCat}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {view === 'creating' && (
          <motion.div key="creating" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <Builder
              cat={selCat}
              initDraft={draft}
              fromDraft={fromDraft}
              onBack={() => setView('landing')}
              saveDraft={save}
              clearDraft={clear}
              toast={show}
              displayName={displayName}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
