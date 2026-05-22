import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import confetti from 'canvas-confetti'
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  Star, Search, Download, Shuffle, RotateCcw,
  Save, Upload, X, Edit3, Check, Filter, Trash2, Crown,
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'brams_tierlist_v3'

const TIERS = [
  { id: 'top10', label: 'TOP 10', color: '#FF1744', bg: 'linear-gradient(135deg,#b71c1c,#880e4f)', glow: 'rgba(255,23,68,0.55)',  icon: <Crown size={14} /> },
  { id: 's',    label: 'S',      color: '#FFD700', bg: 'linear-gradient(135deg,#f59f00,#e65100)', glow: 'rgba(255,215,0,0.60)',  icon: '⭐' },
  { id: 'a',    label: 'A',      color: '#00E676', bg: 'linear-gradient(135deg,#1b5e20,#2e7d32)', glow: 'rgba(0,230,118,0.45)', icon: '🔥' },
  { id: 'b',    label: 'B',      color: '#40C4FF', bg: 'linear-gradient(135deg,#01579b,#0277bd)', glow: 'rgba(64,196,255,0.40)', icon: '💫' },
  { id: 'c',    label: 'C',      color: '#CE93D8', bg: 'linear-gradient(135deg,#4a148c,#6a1b9a)', glow: 'rgba(206,147,216,0.38)',icon: '⚡' },
  { id: 'd',    label: 'D',      color: '#FFAB40', bg: 'linear-gradient(135deg,#bf360c,#e65100)', glow: 'rgba(255,171,64,0.38)', icon: '💢' },
  { id: 'f',    label: 'F',      color: '#FF5252', bg: 'linear-gradient(135deg,#880e4f,#b71c1c)', glow: 'rgba(255,82,82,0.38)',  icon: '💀' },
  { id: 'trash',label: 'TRASH',  color: '#78909C', bg: 'linear-gradient(135deg,#263238,#37474f)', glow: 'rgba(120,144,156,0.28)',icon: <Trash2 size={13} /> },
]

const ANIME_LIST = [
  { id:'a01', name:'Fullmetal Alchemist', sub:'Brotherhood', year:2009, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/1223/96541.jpg' },
  { id:'a02', name:'Attack on Titan',     sub:'Shingeki no Kyojin', year:2013, genres:['Action','Thriller'], img:'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
  { id:'a03', name:'Death Note',          sub:'デスノート',     year:2006, genres:['Thriller'],       img:'https://cdn.myanimelist.net/images/anime/9/9453.jpg' },
  { id:'a04', name:'One Piece',           sub:'1000+ épisodes', year:1999, genres:['Action','Aventure'], img:'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id:'a05', name:'Demon Slayer',        sub:'Kimetsu no Yaiba', year:2019, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
  { id:'a06', name:'Jujutsu Kaisen',      sub:'呪術廻戦',       year:2020, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
  { id:'a07', name:'Hunter x Hunter',     sub:'2011',           year:2011, genres:['Action','Aventure'], img:'https://cdn.myanimelist.net/images/anime/11/33657.jpg' },
  { id:'a08', name:'Steins;Gate',         sub:'シュタインズ・ゲート', year:2011, genres:['Sci-Fi','Thriller'], img:'https://cdn.myanimelist.net/images/anime/5/73199.jpg' },
  { id:'a09', name:'Code Geass',          sub:'Lelouch of the Rebellion', year:2006, genres:['Action','Sci-Fi'], img:'https://cdn.myanimelist.net/images/anime/1/30601.jpg' },
  { id:'a10', name:'Naruto Shippuden',    sub:'ナルト 疾風伝',  year:2007, genres:['Action','Aventure'], img:'https://cdn.myanimelist.net/images/anime/3/72078.jpg' },
  { id:'a11', name:'Dragon Ball Z',       sub:'ドラゴンボールZ', year:1989, genres:['Action'],          img:'https://cdn.myanimelist.net/images/anime/5/16038.jpg' },
  { id:'a12', name:'My Hero Academia',    sub:'Boku no Hero',   year:2016, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/10/78745.jpg' },
  { id:'a13', name:'Tokyo Ghoul',         sub:'東京喰種',       year:2014, genres:['Action','Thriller'], img:'https://cdn.myanimelist.net/images/anime/9/52986.jpg' },
  { id:'a14', name:'Vinland Saga',        sub:'ヴィンランド・サガ', year:2019, genres:['Action','Aventure'], img:'https://cdn.myanimelist.net/images/anime/1500/103005.jpg' },
  { id:'a15', name:'Mob Psycho 100',      sub:'モブサイコ100',  year:2016, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/8/80356.jpg' },
  { id:'a16', name:'Chainsaw Man',        sub:'チェンソーマン', year:2022, genres:['Action','Thriller'], img:'https://cdn.myanimelist.net/images/anime/1806/126216.jpg' },
  { id:'a17', name:'Promised Neverland',  sub:'Yakusoku no Neverland', year:2019, genres:['Thriller'], img:'https://cdn.myanimelist.net/images/anime/1171/97397.jpg' },
  { id:'a18', name:'Re:Zero',             sub:'Starting Life in Another World', year:2016, genres:['Fantasy','Thriller'], img:'https://cdn.myanimelist.net/images/anime/11/79410.jpg' },
  { id:'a19', name:'Blue Lock',           sub:'ブルーロック',   year:2022, genres:['Sport','Action'],   img:'https://cdn.myanimelist.net/images/anime/1258/122072.jpg' },
  { id:'a20', name:'Dr. Stone',           sub:'ドクターストーン', year:2019, genres:['Action','Sci-Fi'], img:'https://cdn.myanimelist.net/images/anime/1667/105038.jpg' },
  { id:'a21', name:'Bleach',              sub:'ブリーチ',       year:2004, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/3/20235.jpg' },
  { id:'a22', name:'Black Clover',        sub:'ブラッククローバー', year:2017, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/2/88336.jpg' },
  { id:'a23', name:'Sword Art Online',    sub:'ソードアート・オンライン', year:2012, genres:['Action','Fantasy','Romance'], img:'https://cdn.myanimelist.net/images/anime/11/39717.jpg' },
  { id:'a24', name:'Seven Deadly Sins',   sub:'Nanatsu no Taizai', year:2014, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/8/65409.jpg' },
  { id:'a25', name:'Fire Force',          sub:'Enen no Shouboutai', year:2019, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/1083/105904.jpg' },
  { id:'a26', name:'Solo Leveling',       sub:'俺だけレベルアップな件', year:2024, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/1987/144973.jpg' },
  { id:'a27', name:'Overlord',            sub:'オーバーロード', year:2015, genres:['Action','Fantasy'],  img:'https://cdn.myanimelist.net/images/anime/7/88636.jpg' },
  { id:'a28', name:'Violet Evergarden',   sub:'ヴァイオレット・エヴァーガーデン', year:2018, genres:['Fantasy','Romance'], img:'https://cdn.myanimelist.net/images/anime/1825/110716.jpg' },
  { id:'a29', name:'Made in Abyss',       sub:'メイドインアビス', year:2017, genres:['Aventure','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/6/86733.jpg' },
  { id:'a30', name:'Neon Genesis Evangelion', sub:'エヴァンゲリオン', year:1995, genres:['Action','Sci-Fi'], img:'https://cdn.myanimelist.net/images/anime/1314/108941.jpg' },
  { id:'a31', name:'Cowboy Bebop',        sub:'カウボーイビバップ', year:1998, genres:['Action','Sci-Fi'], img:'https://cdn.myanimelist.net/images/anime/4/19644.jpg' },
  { id:'a32', name:'Gurren Lagann',       sub:'天元突破グレンラガン', year:2007, genres:['Action','Sci-Fi'], img:'https://cdn.myanimelist.net/images/anime/4/26551.jpg' },
  { id:'a33', name:"JoJo's Bizarre Adventure", sub:'ジョジョの奇妙な冒険', year:2012, genres:['Action','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/3/40409.jpg' },
  { id:'a34', name:'Spy x Family',        sub:'スパイファミリー', year:2022, genres:['Action','Romance'],  img:'https://cdn.myanimelist.net/images/anime/1441/122795.jpg' },
  { id:'a35', name:'Oshi no Ko',          sub:'推しの子',       year:2023, genres:['Thriller'],         img:'https://cdn.myanimelist.net/images/anime/1812/134736.jpg' },
  { id:'a36', name:'Kingdom',             sub:'キングダム',     year:2012, genres:['Action','Aventure'], img:'https://cdn.myanimelist.net/images/anime/3/57491.jpg' },
  { id:'a37', name:'Naruto',              sub:'ナルト',         year:2002, genres:['Action','Aventure'], img:'https://cdn.myanimelist.net/images/anime/13/17405.jpg' },
  { id:'a38', name:'Dragon Ball Super',   sub:'ドラゴンボール超', year:2015, genres:['Action'],           img:'https://cdn.myanimelist.net/images/anime/1015/63974.jpg' },
  { id:'a39', name:'Hellsing Ultimate',   sub:'ヘルシング',     year:2006, genres:['Action','Thriller'], img:'https://cdn.myanimelist.net/images/anime/11/11636.jpg' },
  { id:'a40', name:'Your Name',           sub:'君の名は。',     year:2016, genres:['Romance','Sci-Fi'],  img:'https://cdn.myanimelist.net/images/anime/5/87048.jpg' },
]

const ANIME_BY_ID = Object.fromEntries(ANIME_LIST.map(a => [a.id, a]))
const ALL_GENRES = ['Tous', ...new Set(ANIME_LIST.flatMap(a => a.genres))]

function initBoard() {
  return {
    top10: [], s: [], a: [], b: [], c: [], d: [], f: [], trash: [],
    pool: ANIME_LIST.map(a => a.id),
  }
}

// ── Confetti burst for S tier ────────────────────────────────────────────────

function fireSTierConfetti() {
  const end = Date.now() + 2800
  const colors = ['#FFD700', '#FF1744', '#ffffff', '#f59f00', '#FFD700']
  const shoot = () => {
    confetti({ particleCount: 4, angle: 60,  spread: 60, origin: { x: 0 }, colors, zIndex: 99999 })
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors, zIndex: 99999 })
    if (Date.now() < end) requestAnimationFrame(shoot)
  }
  shoot()
  confetti({ particleCount: 60, spread: 100, origin: { x: 0.5, y: 0.4 }, colors, zIndex: 99999 })
}

// ── Background particles canvas ──────────────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const PAL = ['#FFD70033', '#FF174433', '#40C4FF33', '#CE93D833', '#00E67633', '#FFAB4033']

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = 90
    const pts = Array.from({ length: COUNT }, () => ({
      x:   Math.random() * window.innerWidth,
      y:   Math.random() * window.innerHeight,
      vx:  (Math.random() - .5) * .25,
      vy:  (Math.random() - .5) * .18,
      r:   Math.random() * 1.6 + .4,
      col: PAL[Math.floor(Math.random() * PAL.length)],
      ph:  Math.random() * Math.PI * 2,
      sp:  Math.random() * .015 + .008,
    }))

    let raf, t = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += .01
      for (const p of pts) {
        const dx = p.x - mouseRef.current.x
        const dy = p.y - mouseRef.current.y
        const d2 = dx * dx + dy * dy
        if (d2 < 10000) {
          const d = Math.sqrt(d2), f = (100 - d) / 100
          p.vx += (dx / d) * f * .08
          p.vy += (dy / d) * f * .08
        }
        p.vx *= .975
        p.vy *= .975
        p.x += p.vx + Math.sin(t + p.ph) * .18
        p.y += p.vy + Math.cos(t * .7 + p.ph) * .12
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        // core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.col
        ctx.fill()

        // glow halo
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5)
        grd.addColorStop(0, p.col)
        grd.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    const onMove = e => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: .65 }}
    />
  )
}

// ── Anime card (draggable) ───────────────────────────────────────────────────

function AnimeCard({ animeId, compact = false, isDragOverlay = false }) {
  const anime = ANIME_BY_ID[animeId]
  const [imgErr, setImgErr] = useState(false)
  const [hovered, setHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: animeId })

  const W = compact ? 76 : 88
  const H = compact ? 108 : 124

  return (
    <motion.div
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={isDragOverlay ? { scale: 1.08, rotate: 2 } : { scale: 1, rotate: 0 }}
      whileHover={isDragOverlay ? {} : { scale: 1.07, y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{
        width: W, height: H,
        borderRadius: 10, overflow: 'hidden', flexShrink: 0,
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        opacity: isDragging && !isDragOverlay ? 0.35 : 1,
        transform: transform && !isDragOverlay
          ? `translate3d(${transform.x}px,${transform.y}px,0)`
          : undefined,
        boxShadow: hovered || isDragOverlay
          ? '0 8px 30px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.2)'
          : '0 2px 10px rgba(0,0,0,0.5)',
        userSelect: 'none',
        zIndex: isDragging && !isDragOverlay ? 1000 : 'auto',
      }}
    >
      {imgErr ? (
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg,#1a1a2e,#16213e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 6, textAlign: 'center',
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, lineHeight: 1.3 }}>
            {anime?.name}
          </span>
        </div>
      ) : (
        <img
          src={anime?.img}
          alt={anime?.name}
          onError={() => setImgErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          draggable={false}
        />
      )}

      {/* Name overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: hovered
          ? 'linear-gradient(to top, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.1) 100%)'
          : 'linear-gradient(to top, rgba(0,0,0,0.80) 40%, transparent 100%)',
        transition: 'background .2s',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, padding: '5px 5px 5px',
        }}>
          <div style={{
            fontSize: hovered ? 9.5 : 9, fontWeight: 700,
            color: '#fff', lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            transition: 'font-size .2s',
          }}>
            {anime?.name}
          </div>
          {hovered && (
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              {anime?.year}
            </div>
          )}
        </div>
      </div>

      {/* Shine effect */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: [0, 0.4, 0], x: ['-100%', '200%'] }}
          transition={{ duration: 0.55 }}
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  )
}

// ── Droppable Tier Row ───────────────────────────────────────────────────────

function TierRow({ tier, items, isExport }) {
  const { isOver, setNodeRef } = useDroppable({ id: tier.id })

  return (
    <div
      style={{
        display: 'flex', alignItems: 'stretch',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        minHeight: 100,
        transition: 'background .2s',
        background: isOver ? `rgba(255,255,255,0.04)` : 'transparent',
      }}
    >
      {/* Tier label */}
      <div style={{
        width: 80, flexShrink: 0,
        background: tier.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        boxShadow: isOver ? `0 0 22px ${tier.glow}, inset 0 0 20px rgba(0,0,0,0.2)` : 'none',
        transition: 'box-shadow .25s',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Shimmer line */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: 1, left: 0,
          background: `linear-gradient(to bottom, transparent, ${tier.color}88, transparent)`,
        }} />
        <span style={{
          fontSize: typeof tier.icon === 'string' ? 16 : 13,
          lineHeight: 1,
        }}>
          {tier.icon}
        </span>
        <span style={{
          fontSize: tier.label.length > 2 ? 11 : 22, fontWeight: 900,
          color: '#fff',
          textShadow: `0 0 20px ${tier.glow}, 0 2px 8px rgba(0,0,0,0.6)`,
          letterSpacing: tier.label.length > 2 ? '.05em' : '-.01em',
          fontFamily: 'serif',
          lineHeight: 1,
        }}>
          {tier.label}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1, display: 'flex', flexWrap: 'wrap',
          gap: 6, padding: '8px 12px', alignContent: 'flex-start',
          alignItems: 'flex-start',
          minHeight: 100,
          outline: isOver ? `2px dashed ${tier.color}88` : '2px dashed transparent',
          outlineOffset: -4,
          borderRadius: 4,
          transition: 'outline .2s',
          position: 'relative',
        }}
      >
        {items.length === 0 && !isOver && !isExport && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.12)', fontSize: 12, fontWeight: 600,
            pointerEvents: 'none', letterSpacing: '.08em',
          }}>
            Glisse ici
          </div>
        )}
        {items.map(id => (
          <AnimeCard key={id} animeId={id} compact />
        ))}
      </div>
    </div>
  )
}

// ── Anime Pool ───────────────────────────────────────────────────────────────

function AnimePool({ items, favorites, onToggleFavorite, search, onSearch, genre, onGenre }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool' })

  const filtered = useMemo(() => {
    const fav = items.filter(id => favorites.includes(id))
    const rest = items.filter(id => !favorites.includes(id))
    const list = [...fav, ...rest]
    const q = search.toLowerCase()
    return list.filter(id => {
      const a = ANIME_BY_ID[id]
      if (!a) return false
      const matchQ = !q || a.name.toLowerCase().includes(q) || (a.sub || '').toLowerCase().includes(q)
      const matchG = genre === 'Tous' || a.genres.includes(genre)
      return matchQ && matchG
    })
  }, [items, favorites, search, genre])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* Pool header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '.12em',
          color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          🎬 Pool · {filtered.length} animes
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 120, maxWidth: 260 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{
              width: '100%', height: 32, paddingLeft: 28, paddingRight: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none',
            }}
          />
          {search && (
            <button onClick={() => onSearch('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Genre filter */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {ALL_GENRES.map(g => (
            <button
              key={g}
              onClick={() => onGenre(g)}
              style={{
                padding: '3px 10px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                background: genre === g ? '#FF1744' : 'rgba(255,255,255,0.07)',
                color: genre === g ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'all .15s',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div
        ref={setNodeRef}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 7, padding: '10px 14px',
          overflowY: 'auto', maxHeight: 260,
          outline: isOver ? '2px dashed rgba(255,255,255,0.25)' : '2px dashed transparent',
          outlineOffset: -4, borderRadius: 6,
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent',
        }}
      >
        {filtered.map(id => (
          <div key={id} style={{ position: 'relative' }}>
            <AnimeCard animeId={id} />
            {/* Fav star */}
            <button
              onClick={() => onToggleFavorite(id)}
              style={{
                position: 'absolute', top: 4, right: 4,
                background: favorites.includes(id) ? 'rgba(255,215,0,0.85)' : 'rgba(0,0,0,0.55)',
                border: 'none', borderRadius: '50%', cursor: 'pointer',
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .18s',
              }}
            >
              <Star size={10} fill={favorites.includes(id) ? '#fff' : 'none'} color={favorites.includes(id) ? '#fff' : 'rgba(255,255,255,0.6)'} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, padding: '20px 0', width: '100%', textAlign: 'center' }}>
            Aucun anime trouvé
          </div>
        )}
      </div>
    </div>
  )
}

// ── Toast notification ───────────────────────────────────────────────────────

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t) }, [onDone])
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: .9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: .9 }}
      style={{
        position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
        padding: '10px 22px', color: '#fff', fontSize: 13, fontWeight: 600,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 99998, whiteSpace: 'nowrap',
      }}
    >
      {msg}
    </motion.div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TierListPage() {
  const [board, setBoard] = useState(initBoard)
  const [favorites, setFavorites] = useState([])
  const [title, setTitle] = useState('Ma Tier List Anime 🔥')
  const [editTitle, setEditTitle] = useState(false)
  const [tmpTitle, setTmpTitle] = useState(title)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('Tous')
  const [activeId, setActiveId] = useState(null)
  const [toast, setToast] = useState(null)
  const boardRef = useRef(null)
  const titleInputRef = useRef(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved?.board) setBoard(saved.board)
      if (saved?.favorites) setFavorites(saved.favorites)
      if (saved?.title) setTitle(saved.title)
    } catch {}
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 6 } }),
  )

  const findContainer = useCallback((animeId) => {
    for (const [key, ids] of Object.entries(board)) {
      if (ids.includes(animeId)) return key
    }
    return null
  }, [board])

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over) return
    const itemId = active.id
    const dest   = over.id

    // Ignore if dropping on a card (not a container)
    const isContainer = [...TIERS.map(t => t.id), 'pool'].includes(dest)
    if (!isContainer) return

    const src = findContainer(itemId)
    if (!src || src === dest) return

    setBoard(prev => {
      const next = {}
      for (const k of Object.keys(prev)) {
        next[k] = k === src
          ? prev[k].filter(id => id !== itemId)
          : k === dest
          ? [...prev[k], itemId]
          : [...prev[k]]
      }
      return next
    })

    if (dest === 's') fireSTierConfetti()
  }

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ board, favorites, title }))
      setToast('✅ Tier list sauvegardée !')
    } catch { setToast('❌ Erreur sauvegarde') }
  }

  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved?.board) { setBoard(saved.board); setFavorites(saved.favorites || []); setTitle(saved.title || title) }
      setToast('📂 Tier list chargée !')
    } catch { setToast('❌ Aucune sauvegarde') }
  }

  const reset = () => { setBoard(initBoard()); setFavorites([]); setToast('🔄 Reset effectué') }

  const randomize = () => {
    const allIds = ANIME_LIST.map(a => a.id)
    const shuffled = [...allIds].sort(() => Math.random() - .5)
    const tierIds = TIERS.map(t => t.id)
    const sizes = [2, 3, 4, 5, 5, 5, 3, 2] // top10 s a b c d f trash
    const newBoard = {}
    let i = 0
    for (let j = 0; j < tierIds.length; j++) {
      newBoard[tierIds[j]] = shuffled.slice(i, i + sizes[j])
      i += sizes[j]
    }
    newBoard.pool = shuffled.slice(i)
    setBoard(newBoard)
    setToast('🎲 Randomisé !')
  }

  const exportPng = async () => {
    if (!boardRef.current) return
    try {
      setToast('⏳ Export en cours…')
      const dataUrl = await toPng(boardRef.current, {
        backgroundColor: '#080810',
        pixelRatio: 2,
        style: { borderRadius: '0' },
      })
      const a = document.createElement('a')
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_tierlist.png`
      a.href = dataUrl
      a.click()
      setToast('🖼️ PNG exporté !')
    } catch { setToast('❌ Export échoué') }
  }

  const startEditTitle = () => { setTmpTitle(title); setEditTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50) }
  const confirmTitle   = () => { setTitle(tmpTitle); setEditTitle(false) }
  const toggleFav = (id) => setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const BG = {
    position: 'fixed', inset: 0,
    background: 'radial-gradient(ellipse 120% 80% at 20% 0%, rgba(201,31,46,0.06) 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 80% 100%, rgba(64,196,255,0.05) 0%, transparent 50%), #080810',
    zIndex: 0,
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: '#fff' }}>
      {/* Backgrounds */}
      <div style={BG} />
      <ParticleCanvas />

      {/* MAIN CONTENT */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: 72 }}>

        {/* HEADER */}
        <header style={{
          position: 'sticky', top: 72, zIndex: 50,
          background: 'rgba(8,8,16,0.82)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '0 20px',
          display: 'flex', alignItems: 'center', gap: 12, height: 58,
          flexWrap: 'wrap',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 6 }}>
            <span style={{ fontSize: 22 }}>⚔️</span>
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '.06em', color: 'rgba(255,255,255,0.9)' }}>
              BRAMS<span style={{ color: '#FF1744' }}>.TIER</span>
            </span>
          </div>

          {/* Title edit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 160 }}>
            {editTitle ? (
              <>
                <input
                  ref={titleInputRef}
                  value={tmpTitle}
                  onChange={e => setTmpTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmTitle(); if (e.key === 'Escape') setEditTitle(false) }}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 14, fontWeight: 700,
                    outline: 'none', maxWidth: 320,
                  }}
                />
                <button onClick={confirmTitle} style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#22c55e' }}>
                  <Check size={13} />
                </button>
                <button onClick={() => setEditTitle(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.45)' }}>
                  <X size={13} />
                </button>
              </>
            ) : (
              <button onClick={startEditTitle} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '-.01em', padding: 0 }}>
                {title}
                <Edit3 size={12} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {[
              { icon: <Save size={13} />,     label: 'Sauver',   action: save,     color: '#22c55e' },
              { icon: <Upload size={13} />,   label: 'Charger',  action: load,     color: '#60a5fa' },
              { icon: <Download size={13} />, label: 'Exporter', action: exportPng,color: '#FFD700' },
              { icon: <Shuffle size={13} />,  label: 'Random',   action: randomize,color: '#CE93D8' },
              { icon: <RotateCcw size={13} />,label: 'Reset',    action: reset,    color: '#FF5252' },
            ].map(btn => (
              <motion.button
                key={btn.label}
                onClick={btn.action}
                whileHover={{ scale: 1.07, y: -1 }}
                whileTap={{ scale: .95 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8,
                  background: `${btn.color}15`,
                  border: `1px solid ${btn.color}30`,
                  color: btn.color, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {btn.icon}
                <span style={{ display: window.innerWidth < 768 ? 'none' : 'inline' }}>{btn.label}</span>
              </motion.button>
            ))}
          </div>
        </header>

        {/* DND CONTEXT */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* TIER BOARD */}
          <div
            ref={boardRef}
            style={{
              flex: 1,
              background: 'rgba(8,8,16,0.45)', backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Export title bar (only in exported PNG) */}
            <div style={{ display: 'none' }} data-export-title>{title}</div>

            {TIERS.map(tier => (
              <TierRow
                key={tier.id}
                tier={tier}
                items={board[tier.id] || []}
              />
            ))}
          </div>

          {/* POOL */}
          <AnimePool
            items={board.pool || []}
            favorites={favorites}
            onToggleFavorite={toggleFav}
            search={search}
            onSearch={setSearch}
            genre={genre}
            onGenre={setGenre}
          />

          {/* DRAG OVERLAY */}
          <DragOverlay>
            {activeId ? <AnimeCard animeId={activeId} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>

        {/* TOAST */}
        <AnimatePresence>
          {toast && <Toast key={toast} msg={toast} onDone={() => setToast(null)} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
