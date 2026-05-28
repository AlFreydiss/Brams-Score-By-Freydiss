import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import confetti from 'canvas-confetti'
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  Star, Search, Download, RotateCcw, X, Edit3, Check,
  Trash2, Crown, ArrowLeft, Plus, Shuffle, Save, Copy,
  Eye, EyeOff, ChevronDown, Palette, Grid, List,
  Upload, Link as LinkIcon, BookOpen, Layers, Heart, Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  autosaveTierList,
  fetchCloudDraft,
  fetchCommunityTierLists,
  fetchMyCloudTierLists,
  publishTierList,
  toggleTierListLike,
  deleteCommunityTierList,
  getTierListClientId,
} from '../lib/tierlists.js'
import {
  loadSavedListsIDB,
  saveListsIDB,
  loadDraftIDB,
  saveDraftIDB,
  clearDraftIDB,
  loadDraftHistoryIDB,
  saveDraftHistoryIDB,
  clearDraftHistoryIDB,
} from '../lib/tierlist-storage.js'

// ── Palette ───────────────────────────────────────────────────────────────────
const G = {
  bg:    '#08090D',
  panel: 'rgba(14,15,22,.96)',
  card:  'rgba(20,22,32,.88)',
  border:'rgba(255,255,255,.08)',
  gold:  '#BFA46A',
  rose:  '#a0445c',
  blue:  '#4a86b8',
  text:  '#e8e4de',
  muted: 'rgba(232,228,222,.36)',
}

// ── Default tiers ──────────────────────────────────────────────────────────────
const DEFAULT_TIERS = [
  { id:'god',   label:'GOD',   color:'#f5c842', bg:'linear-gradient(135deg,#7a5200,#c08800)' },
  { id:'s',     label:'S',     color:'#ff5577', bg:'linear-gradient(135deg,#880020,#cc1840)' },
  { id:'a',     label:'A',     color:'#e8a030', bg:'linear-gradient(135deg,#7a4400,#bc7000)' },
  { id:'b',     label:'B',     color:'#4aa0e8', bg:'linear-gradient(135deg,#0e3870,#1a609a)' },
  { id:'c',     label:'C',     color:'#9060d8', bg:'linear-gradient(135deg,#301068,#5020a8)' },
  { id:'d',     label:'D',     color:'#6898c0', bg:'linear-gradient(135deg,#182a40,#2a4868)' },
  { id:'f',     label:'F',     color:'#e84055', bg:'linear-gradient(135deg,#780010,#c01030)' },
  { id:'trash', label:'TRASH', color:'#7a8898', bg:'linear-gradient(135deg,#222c36,#364858)' },
]

const TIER_COLORS = [
  '#d4a017','#a0445c','#BFA46A','#4a86b8','#7b6aa8',
  '#6b8098','#b44a58','#5a6570','#34d399','#f97316',
  '#8b5cf6','#06b6d4','#ef4444','#22c55e','#f59e0b',
]

// ── Datasets ──────────────────────────────────────────────────────────────────
const ANIME_LIST = [
  { id:'a01', name:'Fullmetal Alchemist: Brotherhood', sub:'FMA',           year:2009, genres:['Action','Fantasy'],    img:'https://cdn.myanimelist.net/images/anime/1223/96541.jpg' },
  { id:'a02', name:'Attack on Titan',                  sub:'SNK',           year:2013, genres:['Action','Thriller'],   img:'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
  { id:'a03', name:'Death Note',                       sub:'デスノート',      year:2006, genres:['Thriller'],            img:'https://cdn.myanimelist.net/images/anime/9/9453.jpg' },
  { id:'a04', name:'One Piece',                        sub:'1000+ épisodes', year:1999, genres:['Action','Aventure'],   img:'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id:'a05', name:'Demon Slayer',                     sub:'Kimetsu no Yaiba',year:2019,genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
  { id:'a06', name:'Jujutsu Kaisen',                   sub:'呪術廻戦',        year:2020, genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
  { id:'a07', name:'Hunter x Hunter',                  sub:'2011',           year:2011, genres:['Action','Aventure'],   img:'https://cdn.myanimelist.net/images/anime/11/33657.jpg' },
  { id:'a08', name:'Steins;Gate',                      sub:'シュタインズ',     year:2011, genres:['Sci-Fi','Thriller'],  img:'https://cdn.myanimelist.net/images/anime/5/73199.jpg' },
  { id:'a09', name:'Code Geass',                       sub:'Lelouch',        year:2006, genres:['Action','Sci-Fi'],    img:'https://cdn.myanimelist.net/images/anime/1/30601.jpg' },
  { id:'a10', name:'Naruto Shippuden',                 sub:'ナルト',          year:2007, genres:['Action','Aventure'],   img:'https://cdn.myanimelist.net/images/anime/3/72078.jpg' },
  { id:'a11', name:'Dragon Ball Z',                    sub:'DBZ',            year:1989, genres:['Action'],             img:'https://cdn.myanimelist.net/images/anime/5/16038.jpg' },
  { id:'a12', name:'My Hero Academia',                 sub:'Boku no Hero',   year:2016, genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/10/78745.jpg' },
  { id:'a13', name:'Tokyo Ghoul',                      sub:'東京喰種',        year:2014, genres:['Action','Thriller'],  img:'https://cdn.myanimelist.net/images/anime/9/52986.jpg' },
  { id:'a14', name:'Vinland Saga',                     sub:'Vikings',        year:2019, genres:['Action','Aventure'],  img:'https://cdn.myanimelist.net/images/anime/1500/103005.jpg' },
  { id:'a15', name:'Mob Psycho 100',                   sub:'モブサイコ',       year:2016, genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/8/80356.jpg' },
  { id:'a16', name:'Chainsaw Man',                     sub:'チェンソーマン',   year:2022, genres:['Action','Thriller'],  img:'https://cdn.myanimelist.net/images/anime/1806/126216.jpg' },
  { id:'a17', name:'The Promised Neverland',           sub:'TPN',            year:2019, genres:['Thriller'],           img:'https://cdn.myanimelist.net/images/anime/1171/97397.jpg' },
  { id:'a18', name:'Re:Zero',                          sub:'Isekai',         year:2016, genres:['Fantasy','Thriller'],  img:'https://cdn.myanimelist.net/images/anime/11/79410.jpg' },
  { id:'a19', name:'Blue Lock',                        sub:'ブルーロック',     year:2022, genres:['Sport','Action'],    img:'https://cdn.myanimelist.net/images/anime/1258/122072.jpg' },
  { id:'a20', name:'Dr. Stone',                        sub:'Science',        year:2019, genres:['Action','Sci-Fi'],    img:'https://cdn.myanimelist.net/images/anime/1667/105038.jpg' },
  { id:'a21', name:'Bleach',                           sub:'TYBW',           year:2004, genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/3/20235.jpg' },
  { id:'a22', name:'Black Clover',                     sub:'ブラック',        year:2017, genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/2/88336.jpg' },
  { id:'a23', name:'Sword Art Online',                 sub:'SAO',            year:2012, genres:['Action','Romance'],   img:'https://cdn.myanimelist.net/images/anime/11/39717.jpg' },
  { id:'a24', name:'Seven Deadly Sins',                sub:'Nanatsu',        year:2014, genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/8/65409.jpg' },
  { id:'a25', name:'Fire Force',                       sub:'Enen no Shoubou',year:2019, genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/1083/105904.jpg' },
  { id:'a26', name:'Solo Leveling',                    sub:'俺だけ',          year:2024, genres:['Action','Fantasy'],   img:'https://cdn.myanimelist.net/images/anime/1987/144973.jpg' },
  { id:'a27', name:'Violet Evergarden',                sub:'KyoAni',         year:2018, genres:['Drame','Romance'],    img:'https://cdn.myanimelist.net/images/anime/1825/110716.jpg' },
  { id:'a28', name:'Made in Abyss',                    sub:'メイドインアビス', year:2017, genres:['Aventure','Fantasy'], img:'https://cdn.myanimelist.net/images/anime/6/86733.jpg' },
  { id:'a29', name:'Evangelion',                       sub:'NGE',            year:1995, genres:['Action','Sci-Fi'],   img:'https://cdn.myanimelist.net/images/anime/1314/108941.jpg' },
  { id:'a30', name:'Cowboy Bebop',                     sub:'Bebop',          year:1998, genres:['Action','Sci-Fi'],   img:'https://cdn.myanimelist.net/images/anime/4/19644.jpg' },
]

const PERSO_LIST = [
  { id:'p01', name:'Monkey D. Luffy',      sub:'One Piece',       year:1999, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/9/310307.jpg' },
  { id:'p02', name:'Naruto Uzumaki',       sub:'Naruto',          year:2002, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/14/164519.jpg' },
  { id:'p03', name:'Goku',                 sub:'Dragon Ball Z',   year:1986, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/5/37165.jpg' },
  { id:'p04', name:'Levi Ackerman',        sub:'Attack on Titan', year:2013, genres:['Seinen'], img:'https://cdn.myanimelist.net/images/characters/2/241413.jpg' },
  { id:'p05', name:'Gojo Satoru',          sub:'Jujutsu Kaisen',  year:2020, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/8/394157.jpg' },
  { id:'p06', name:'L Lawliet',            sub:'Death Note',      year:2006, genres:['Seinen'], img:'https://cdn.myanimelist.net/images/characters/10/8269.jpg' },
  { id:'p07', name:'Killua Zoldyck',       sub:'Hunter x Hunter', year:2011, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/4/60141.jpg' },
  { id:'p08', name:'Itachi Uchiha',        sub:'Naruto',          year:2002, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/14/64218.jpg' },
  { id:'p09', name:'Roronoa Zoro',         sub:'One Piece',       year:1999, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/14/324588.jpg' },
  { id:'p10', name:'Light Yagami',         sub:'Death Note',      year:2006, genres:['Seinen'], img:'https://cdn.myanimelist.net/images/characters/8/8286.jpg' },
  { id:'p11', name:'Edward Elric',         sub:'FMA Brotherhood', year:2009, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/7/97789.jpg' },
  { id:'p12', name:'Eren Yeager',          sub:'Attack on Titan', year:2013, genres:['Seinen'], img:'https://cdn.myanimelist.net/images/characters/10/216895.jpg' },
  { id:'p13', name:'Tanjiro Kamado',       sub:'Demon Slayer',    year:2019, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/1/392387.jpg' },
  { id:'p14', name:'Yuji Itadori',         sub:'Jujutsu Kaisen',  year:2020, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/9/436971.jpg' },
  { id:'p15', name:'Kakashi Hatake',       sub:'Naruto',          year:2002, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/7/284847.jpg' },
  { id:'p16', name:'Vegeta',               sub:'Dragon Ball Z',   year:1986, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/2/54540.jpg' },
  { id:'p17', name:'Lelouch vi Britannia', sub:'Code Geass',      year:2006, genres:['Sci-Fi'], img:'https://cdn.myanimelist.net/images/characters/5/183245.jpg' },
  { id:'p18', name:'Izuku Midoriya',       sub:'My Hero Academia',year:2016, genres:['Shonen'], img:'https://cdn.myanimelist.net/images/characters/3/342118.jpg' },
  { id:'p19', name:'Ken Kaneki',           sub:'Tokyo Ghoul',     year:2014, genres:['Seinen'], img:'https://cdn.myanimelist.net/images/characters/9/311090.jpg' },
  { id:'p20', name:'Okabe Rintarou',       sub:'Steins;Gate',     year:2011, genres:['Sci-Fi'], img:'https://cdn.myanimelist.net/images/characters/2/236268.jpg' },
]

// ── Tier types ─────────────────────────────────────────────────────────────────
const TIER_TYPES = [
  { id:'anime',  label:'Animes',      icon:'🎬', color:'#a0445c', items:ANIME_LIST  },
  { id:'persos', label:'Personnages', icon:'👤', color:'#BFA46A', items:PERSO_LIST  },
  { id:'custom', label:'Custom',      icon:'✨', color:'#7b6aa8', items:[]          },
]

// ── Templates ──────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id:'classic', name:'Classique S→F', emoji:'⭐',
    desc:'8 rangs classiques de GOD à TRASH',
    tiers: DEFAULT_TIERS,
  },
  {
    id:'top5', name:'Top 5', emoji:'🏆',
    desc:'Podium 5 places avec rang spécial',
    tiers:[
      { id:'t1', label:'#1', color:'#d4a017', bg:'linear-gradient(135deg,#2a1f00,#4a3800)' },
      { id:'t2', label:'#2', color:'#9e9e9e', bg:'linear-gradient(135deg,#1a1a1a,#333)' },
      { id:'t3', label:'#3', color:'#b86a42', bg:'linear-gradient(135deg,#261512,#4a2a22)' },
      { id:'t4', label:'#4', color:'#5a6570', bg:'linear-gradient(135deg,#161c22,#27313a)' },
      { id:'t5', label:'#5', color:'#5a6570', bg:'linear-gradient(135deg,#161c22,#27313a)' },
    ],
  },
  {
    id:'goodbad', name:'Bon / Mauvais', emoji:'⚖️',
    desc:'3 rangs simples : Bon, Correct, Mauvais',
    tiers:[
      { id:'bon',     label:'BON',     color:'#34d399', bg:'linear-gradient(135deg,#0a2e1a,#0f4a2a)' },
      { id:'correct', label:'OK',      color:'#BFA46A', bg:'linear-gradient(135deg,#2b2112,#55401c)' },
      { id:'mauvais', label:'MAUVAIS', color:'#a0445c', bg:'linear-gradient(135deg,#241017,#4a1b2a)' },
    ],
  },
  {
    id:'brams', name:'Style Brams', emoji:'🏴‍☠️',
    desc:'4 rangs identité Brams Community',
    tiers:[
      { id:'yonkou',  label:'YONKOU',   color:'#d4a017', bg:'linear-gradient(135deg,#2a1f00,#4a3800)' },
      { id:'capitaine',label:'CAPITAINE',color:'#BFA46A', bg:'linear-gradient(135deg,#2b2112,#55401c)' },
      { id:'marin',   label:'MARIN',    color:'#4a86b8', bg:'linear-gradient(135deg,#152330,#21384c)' },
      { id:'recrue',  label:'RECRUE',   color:'#5a6570', bg:'linear-gradient(135deg,#161c22,#27313a)' },
    ],
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
const DRAFT_SAVE_DELAY = 500
const CLOUD_SAVE_DELAY = 900
const DRAFT_BACKUP_INTERVAL = 30000
const DRAFT_HISTORY_LIMIT = 3
const CUSTOM_IMAGE_MAX_SIDE = 520
const CUSTOM_IMAGE_QUALITY = 0.72
let lastDraftBackupAt = 0
function normalizeDraft(draft) {
  if (!draft?.typeId || !draft?.board || !Array.isArray(draft?.tiers)) return null
  const type = TIER_TYPES.find(t => t.id === draft.typeId) || TIER_TYPES[0]
  const tierIds = new Set(draft.tiers.map(t => t.id))
  const knownIds = new Set([
    ...(type?.items || []).map(item => item.id),
    ...(Array.isArray(draft.customItems) ? draft.customItems : []).map(item => item.id),
  ])
  const used = new Set()
  const board = {}

  for (const tier of draft.tiers) {
    const ids = Array.isArray(draft.board[tier.id]) ? draft.board[tier.id] : []
    board[tier.id] = ids.filter(id => knownIds.has(id) && !used.has(id) && used.add(id))
  }

  const pool = Array.isArray(draft.board.pool) ? draft.board.pool : []
  board.pool = pool.filter(id => knownIds.has(id) && !used.has(id) && used.add(id))

  for (const item of type?.items || []) {
    if (!used.has(item.id)) board.pool.push(item.id)
  }
  for (const item of Array.isArray(draft.customItems) ? draft.customItems : []) {
    if (!used.has(item.id)) board.pool.push(item.id)
  }

  return {
    ...draft,
    board,
    tiers: draft.tiers.filter(t => tierIds.has(t.id)),
    customItems: Array.isArray(draft.customItems) ? draft.customItems : [],
    favorites: Array.isArray(draft.favorites) ? draft.favorites.filter(id => knownIds.has(id)) : [],
  }
}
async function loadDraft() {
  try {
    const raw = await loadDraftIDB()
    const draft = normalizeDraft(raw)
    if (draft) return draft
    const history = await loadDraftHistoryIDB()
    for (const entry of history) {
      const backup = normalizeDraft(entry)
      if (backup) return backup
    }
    return null
  } catch { return null }
}
async function saveDraft(draft) {
  try {
    const safeDraft = normalizeDraft({ ...draft, updatedAt:Date.now() })
    if (!safeDraft) return false
    await saveDraftIDB(safeDraft)
    const now = Date.now()
    if (now - lastDraftBackupAt < DRAFT_BACKUP_INTERVAL) return true
    const history = await loadDraftHistoryIDB()
    const signature = JSON.stringify({
      title:safeDraft.title,
      typeId:safeDraft.typeId,
      tiers:safeDraft.tiers,
      board:safeDraft.board,
      customItems:safeDraft.customItems?.map(item => [item.id, item.name, item.sub, item.img?.length]),
      favorites:safeDraft.favorites,
    })
    if (!Array.isArray(history) || history[0]?._signature !== signature) {
      const next = [{ ...safeDraft, _signature:signature, backupAt:now }, ...history].slice(0, DRAFT_HISTORY_LIMIT)
      await saveDraftHistoryIDB(next)
      lastDraftBackupAt = now
    }
    return true
  } catch {
    try {
      await clearDraftHistoryIDB()
      const safeDraft = normalizeDraft({ ...draft, updatedAt:Date.now() })
      if (!safeDraft) return false
      await saveDraftIDB(safeDraft)
      return true
    } catch { return false }
  }
}
async function clearDraft() {
  try { await clearDraftIDB() } catch {}
}

function toSharePayload({ title, selectedType, tiers, board, customItems, favorites }) {
  return {
    title,
    emoji: selectedType?.icon || '📋',
    category: selectedType?.label || 'Custom',
    tierCount: tiers.length,
    tierLabels: tiers.map(t => t.label),
    tierColors: tiers.map(t => t.color),
    tiers,
    board,
    customItems,
    favorites,
    typeId: selectedType?.id,
  }
}

function compressImageFile(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, CUSTOM_IMAGE_MAX_SIDE / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (!blob) return resolve(null)
        const reader = new FileReader()
        reader.onload = ev => resolve(ev.target.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      }, 'image/webp', CUSTOM_IMAGE_QUALITY)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    image.src = url
  })
}

function initBoard(tiers, items) {
  const b = Object.fromEntries(tiers.map(t => [t.id, []]))
  b.pool = items.map(a => a.id)
  return b
}

function uid() { return Math.random().toString(36).slice(2) }

function fallbackImg(name) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="112"><rect width="80" height="112" rx="8" fill="#1a1a28"/><text x="40" y="64" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-family="Arial" font-size="10">${(name||'').slice(0,8)}</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function fireConfetti() {
  confetti({ particleCount:60, spread:100, origin:{x:.5,y:.4}, colors:['#BFA46A','#a0445c','#fff'], zIndex:99999 })
}

// ── Draggable Item Card ────────────────────────────────────────────────────────
const ItemCard = memo(function ItemCard({ itemId, allById, compact=false, isDragOverlay=false }) {
  const item = allById[itemId]
  const [err, setErr] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: itemId })
  const W = compact ? 72 : 84
  const H = compact ? 102 : 118

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      style={{
        width:W, height:H, borderRadius:8, overflow:'hidden', flexShrink:0,
        cursor: isDragging ? 'grabbing' : 'grab',
        position:'relative',
        opacity: isDragging && !isDragOverlay ? 0.25 : 1,
        boxShadow: isDragOverlay
          ? '0 12px 40px rgba(0,0,0,.8), 0 0 0 2px rgba(191,164,106,.4)'
          : '0 2px 8px rgba(0,0,0,.55)',
        userSelect:'none',
        transform: isDragOverlay ? 'rotate(2deg) scale(1.06)' : undefined,
        transition: isDragOverlay ? undefined : 'box-shadow .18s',
        contain:'layout paint style',
        contentVisibility: isDragOverlay ? 'visible' : 'auto',
        containIntrinsicSize:`${W}px ${H}px`,
      }}
      className="tier-item-card"
    >
      {err ? (
        <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
          background:'linear-gradient(135deg,#1a1a2e,#16213e)', padding:6, textAlign:'center' }}>
          <span style={{ fontSize:8.5, color:'rgba(255,255,255,.45)', fontWeight:600, lineHeight:1.3 }}>{item?.name}</span>
        </div>
      ) : (
        <img
          src={item?.img || fallbackImg(item?.name)} alt={item?.name}
          onError={() => setErr(true)}
          loading="lazy" decoding="async" fetchPriority="low"
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', pointerEvents:'none' }}
          draggable={false}
        />
      )}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.82) 38%,transparent 100%)' }}>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'4px 5px' }}>
          <div style={{ fontSize:8.5, fontWeight:700, color:'#fff', lineHeight:1.25,
            overflow:'hidden', textOverflow:'ellipsis',
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {item?.name}
          </div>
        </div>
      </div>
    </div>
  )
})

// ── Droppable Tier Row ────────────────────────────────────────────────────────
function TierRow({ tier, items, allById, onRename, onColorChange, onDelete, onAddAbove, onAddBelow }) {
  const { isOver, setNodeRef } = useDroppable({ id: tier.id })
  const [editing, setEditing] = useState(false)
  const [tmpLabel, setTmpLabel] = useState(tier.label)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const inputRef = useRef(null)

  const confirmRename = () => {
    const v = tmpLabel.trim()
    if (v) onRename(tier.id, v)
    setEditing(false)
  }

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 30)
  }, [editing])

  return (
    <div style={{
      display:'flex', alignItems:'stretch',
      borderBottom:`1px solid rgba(255,255,255,.05)`,
      minHeight:90, position:'relative',
      background: isOver ? 'rgba(191,164,106,.04)' : 'transparent',
      transition:'background .2s',
    }}
    className="tier-row"
    >
      {/* Rank label */}
      <div style={{
        width:80, flexShrink:0,
        background: tier.bg,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
        borderRight:`2px solid ${tier.color}44`,
        boxShadow: isOver ? `0 0 20px ${tier.color}44` : 'none',
        transition:'box-shadow .25s',
        cursor:'pointer', position:'relative',
      }}>
        {editing ? (
          <input
            ref={inputRef}
            value={tmpLabel}
            onChange={e => setTmpLabel(e.target.value.toUpperCase())}
            onBlur={confirmRename}
            onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setEditing(false) }}
            maxLength={8}
            style={{
              width:58, textAlign:'center', background:'rgba(0,0,0,.6)',
              border:`1px solid ${tier.color}`, borderRadius:6,
              color:'#fff', fontSize:13, fontWeight:900, outline:'none', padding:'3px 4px',
            }}
          />
        ) : (
          <span
            onDoubleClick={() => { setTmpLabel(tier.label); setEditing(true) }}
            title="Double-clic pour renommer"
            style={{
              fontSize: tier.label.length > 3 ? 10 : 20,
              fontWeight:900, color:'#fff', lineHeight:1,
              fontFamily:'serif', letterSpacing: tier.label.length > 3 ? '.05em' : '-.01em',
              textShadow:`0 0 20px ${tier.color}88`,
              cursor:'text', padding:'2px 4px',
            }}
          >
            {tier.label}
          </span>
        )}

        {/* Row actions */}
        <div className="tier-row-actions" style={{
          position:'absolute', right:'-32px', top:0, bottom:0,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:2, zIndex:10, opacity:0, pointerEvents:'none',
          transition:'opacity .15s',
        }}>
          <button onClick={() => { setTmpLabel(tier.label); setEditing(true) }}
            title="Renommer" style={iconBtn('#BFA46A')}><Edit3 size={10}/></button>
          <button onClick={() => setShowColorPicker(v => !v)}
            title="Couleur" style={iconBtn(tier.color)}><Palette size={10}/></button>
          <button onClick={() => onAddAbove(tier.id)}
            title="Ajouter au-dessus" style={iconBtn('#4a86b8')}><Plus size={10}/></button>
          <button onClick={() => onDelete(tier.id)}
            title="Supprimer" style={iconBtn('#a0445c')}><Trash2 size={10}/></button>
        </div>

        {/* Color picker dropdown */}
        {showColorPicker && (
          <div style={{
            position:'absolute', right:'-120px', top:0, zIndex:100,
            background:'rgba(10,12,20,.98)', border:`1px solid ${G.border}`,
            borderRadius:12, padding:10, boxShadow:'0 12px 40px rgba(0,0,0,.7)',
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:5 }}>
              {TIER_COLORS.map(c => (
                <button key={c} onClick={() => { onColorChange(tier.id, c); setShowColorPicker(false) }}
                  style={{
                    width:20, height:20, borderRadius:4, background:c, border:'none', cursor:'pointer',
                    outline: tier.color === c ? `2px solid #fff` : 'none',
                    outlineOffset:1,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef} style={{
        flex:1, display:'flex', flexWrap:'wrap', gap:5, padding:'8px 10px',
        alignContent:'flex-start', alignItems:'flex-start', minHeight:90,
        outline: isOver ? `2px dashed ${tier.color}66` : '2px dashed transparent',
        outlineOffset:-4, borderRadius:4, transition:'outline .18s',
        position:'relative',
      }}>
        {items.length === 0 && !isOver && (
          <div style={{
            position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            color:'rgba(255,255,255,.08)', fontSize:12, pointerEvents:'none', fontStyle:'italic',
          }}>
            Glisse ici
          </div>
        )}
        {items.map(id => <ItemCard key={id} itemId={id} allById={allById} compact/>)}
      </div>
    </div>
  )
}

function iconBtn(color) {
  return {
    width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
    background:`${color}18`, border:`1px solid ${color}44`, color, cursor:'pointer', padding:0,
    transition:'background .15s',
  }
}

// ── Pool ──────────────────────────────────────────────────────────────────────
function ItemPool({ items, allById, customItems, onAddCustom, favorites, onToggleFav, search, onSearch, genre, onGenre, currentType }) {
  const { isOver, setNodeRef } = useDroppable({ id:'pool' })
  const [poolTab, setPoolTab] = useState('all')
  const [addMode, setAddMode] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [subInput, setSubInput] = useState('')
  const fileRef = useRef(null)

  const genres = useMemo(() => ['Tous', ...new Set(currentType.items.flatMap(a => a.genres||[]))], [currentType])

  const allItemsInPool = useMemo(() => {
    const offIds = new Set(items)
    return [
      ...currentType.items.filter(a => offIds.has(a.id)),
      ...customItems.filter(a => offIds.has(a.id)),
    ]
  }, [items, currentType.items, customItems])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const fav  = allItemsInPool.filter(a => favorites.includes(a.id))
    const rest = allItemsInPool.filter(a => !favorites.includes(a.id))
    const merged = [...fav, ...rest]
    return merged.filter(a => {
      const mq = !q || a.name.toLowerCase().includes(q) || (a.sub||'').toLowerCase().includes(q)
      const mg = genre === 'Tous' || (a.genres||[]).includes(genre)
      const mt = poolTab === 'all' ? true
        : poolTab === 'favs' ? favorites.includes(a.id)
        : poolTab === 'custom' ? customItems.find(c => c.id === a.id)
        : true
      return mq && mg && mt
    })
  }, [allItemsInPool, favorites, search, genre, poolTab, customItems])

  const handleFile = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    for (const file of files) {
      const compressed = await compressImageFile(file)
      if (!compressed) continue
      onAddCustom({ img: compressed, name: file.name.replace(/\.\w+$/,''), sub: subInput || 'Custom' })
    }
    setAddMode(null); setNameInput(''); setSubInput('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUrl = () => {
    if (!urlInput.trim()) return
    onAddCustom({ img: urlInput.trim(), name: nameInput || 'Custom', sub: subInput || 'Custom' })
    setUrlInput(''); setNameInput(''); setSubInput(''); setAddMode(null)
  }

  return (
    <div style={{ background:'rgba(6,7,12,.85)', backdropFilter:'blur(20px)', borderTop:`1px solid ${G.border}`, flexShrink:0 }}>

      {/* Pool header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderBottom:`1px solid ${G.border}`, flexWrap:'wrap' }}>
        {['all','favs','custom'].map(t => (
          <button key={t} onClick={() => setPoolTab(t)} style={{
            padding:'3px 10px', borderRadius:100, border:'none', cursor:'pointer', fontSize:10, fontWeight:700,
            background: poolTab === t ? `${G.gold}18` : 'rgba(255,255,255,.05)',
            color: poolTab === t ? G.gold : G.muted,
            borderColor: poolTab === t ? `${G.gold}44` : 'transparent',
          }}>
            {t === 'all' ? `Tous (${allItemsInPool.length})` : t === 'favs' ? `Favoris (${favorites.length})` : `Uploads (${customItems.length})`}
          </button>
        ))}

        <div style={{ flex:1, minWidth:100, position:'relative' }}>
          <Search size={11} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:G.muted }}/>
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Rechercher…"
            style={{ width:'100%', height:28, paddingLeft:26, paddingRight:10, background:'rgba(255,255,255,.05)',
              border:`1px solid ${G.border}`, borderRadius:8, color:'#fff', fontSize:11.5, outline:'none' }}/>
          {search && <button onClick={() => onSearch('')} style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', cursor:'pointer', color:G.muted, padding:0 }}><X size={10}/></button>}
        </div>

        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {genres.slice(0, 6).map(g => (
            <button key={g} onClick={() => onGenre(g)} style={{
              padding:'2px 8px', borderRadius:100, border:'none', cursor:'pointer', fontSize:9.5, fontWeight:700,
              background: genre === g ? `${G.gold}18` : 'rgba(255,255,255,.05)',
              color: genre === g ? G.gold : G.muted,
            }}>{g}</button>
          ))}
        </div>

        <button onClick={() => setAddMode(addMode ? null : 'url')}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:8,
            background:`rgba(191,164,106,.10)`, border:`1px solid ${G.gold}33`,
            color:G.gold, cursor:'pointer', fontSize:10.5, fontWeight:700, flexShrink:0 }}>
          <Plus size={11}/> Ajouter
        </button>
      </div>

      {/* Add item panel */}
      <AnimatePresence>
        {addMode && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ overflow:'hidden', borderBottom:`1px solid ${G.border}` }}>
            <div style={{ padding:'10px 12px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:4 }}>
                <button onClick={() => setAddMode('url')} style={{ ...tabBtn(addMode==='url') }}><LinkIcon size={10}/> URL</button>
                <button onClick={() => setAddMode('file')} style={{ ...tabBtn(addMode==='file') }}><Upload size={10}/> Fichier</button>
              </div>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Nom de l'item"
                style={miniInput}/>
              <input value={subInput} onChange={e => setSubInput(e.target.value)} placeholder="Source / Anime"
                style={miniInput}/>
              {addMode === 'url' && <>
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://…"
                  style={{ ...miniInput, flex:1, minWidth:180 }}/>
                <button onClick={handleUrl} style={actionBtn}>Ajouter</button>
              </>}
              {addMode === 'file' && <>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFile} style={{ display:'none' }}/>
                <button onClick={() => fileRef.current?.click()} style={actionBtn}><Upload size={10}/> Choisir (plusieurs)</button>
              </>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items grid */}
      <div ref={setNodeRef} style={{
        display:'flex', flexWrap:'wrap', gap:6, padding:'9px 12px',
        overflowY:'auto', maxHeight:220,
        outline: isOver ? `2px dashed ${G.gold}55` : '2px dashed transparent',
        outlineOffset:-4, borderRadius:6,
        scrollbarWidth:'thin', scrollbarColor:`rgba(191,164,106,.15) transparent`,
      }}>
        {filtered.map(item => (
          <div key={item.id} style={{ position:'relative' }}>
            <ItemCard itemId={item.id} allById={allById}/>
            <button onClick={() => onToggleFav(item.id)} style={{
              position:'absolute', top:3, right:3, width:18, height:18, borderRadius:'50%',
              background: favorites.includes(item.id) ? 'rgba(191,164,106,.9)' : 'rgba(0,0,0,.6)',
              border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <Star size={9} fill={favorites.includes(item.id)?'#fff':'none'} color="#fff"/>
            </button>
          </div>
        ))}
        {!filtered.length && (
          <div style={{ color:G.muted, fontSize:12, padding:'16px 0', width:'100%', textAlign:'center' }}>
            {poolTab === 'custom' ? 'Aucun upload — clique sur Ajouter' : 'Aucun résultat'}
          </div>
        )}
      </div>
    </div>
  )
}

const miniInput = {
  height:28, padding:'0 10px', background:'rgba(255,255,255,.05)',
  border:'1px solid rgba(255,255,255,.1)', borderRadius:8,
  color:'#fff', fontSize:11.5, outline:'none',
}
const actionBtn = {
  display:'flex', alignItems:'center', gap:4, height:28, padding:'0 12px', borderRadius:8,
  background:`rgba(191,164,106,.14)`, border:`1px solid rgba(191,164,106,.3)`,
  color:'#BFA46A', cursor:'pointer', fontSize:11, fontWeight:700,
}
function tabBtn(active) {
  return {
    display:'flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:7, border:'none', cursor:'pointer',
    background: active ? 'rgba(191,164,106,.14)' : 'rgba(255,255,255,.05)',
    color: active ? '#BFA46A' : 'rgba(255,255,255,.4)', fontSize:10, fontWeight:700,
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => { const t=setTimeout(onDone,2400); return ()=>clearTimeout(t) }, [onDone])
  return (
    <motion.div initial={{opacity:0,y:28}} animate={{opacity:1,y:0}} exit={{opacity:0,y:16}}
      style={{
        position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', zIndex:99998,
        background:'rgba(10,12,20,.97)', backdropFilter:'blur(16px)',
        border:`1px solid ${G.gold}33`, borderRadius:12,
        padding:'8px 20px', color:'#fff', fontSize:12.5, fontWeight:700,
        boxShadow:`0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(191,164,106,.1)`,
        whiteSpace:'nowrap',
      }}>
      {msg}
    </motion.div>
  )
}

// ── My Lists Card ─────────────────────────────────────────────────────────────
function SavedListCard({ list, onLoad, onDelete, onDuplicate }) {
  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      style={{
        background:G.card, border:`1px solid ${G.border}`,
        borderRadius:16, overflow:'hidden',
        display:'flex', flexDirection:'column',
        transition:'border-color .2s',
      }}
      className="saved-list-card"
    >
      <div style={{ padding:'14px 16px 10px', flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontSize:20 }}>{list.emoji || '📋'}</span>
          <div>
            <div style={{ fontSize:13.5, fontWeight:800, color:G.text }}>{list.title}</div>
            <div style={{ fontSize:10.5, color:G.muted }}>{list.category || 'Custom'} · {list.tierCount} rangs · {new Date(list.savedAt).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {(list.tierLabels||[]).slice(0,6).map((label, i) => (
            <span key={i} style={{
              fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:100,
              background:`${list.tierColors?.[i]||G.gold}14`,
              border:`1px solid ${list.tierColors?.[i]||G.gold}33`,
              color: list.tierColors?.[i]||G.gold,
            }}>{label}</span>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', borderTop:`1px solid ${G.border}` }}>
        <button onClick={() => onLoad(list)} style={listAction}>Ouvrir</button>
        <button onClick={() => onDelete(list.id)} style={{ ...listAction, color:'#a0445c', borderRight:'none' }}><Trash2 size={11}/></button>
      </div>
    </motion.div>
  )
}

function CommunityListCard({ list, onLoad, onLike, isOwner, onDelete }) {
  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      style={{
        background:G.card, border:`1px solid ${G.border}`,
        borderRadius:16, overflow:'hidden',
        display:'flex', flexDirection:'column',
        transition:'border-color .2s',
      }}
      className="saved-list-card"
    >
      <div style={{ padding:'14px 16px 10px', flex:1 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:20 }}>{list.emoji || '📋'}</span>
            <div>
              <div style={{ fontSize:13.5, fontWeight:800, color:G.text }}>{list.title}</div>
              <div style={{ fontSize:10.5, color:G.muted }}>
                par {list.authorName || 'Pirate Brams'} · {list.category || 'Custom'}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
            {isOwner && (
              <button onClick={() => onDelete(list)} title="Supprimer ma publication" style={{
                display:'flex', alignItems:'center', padding:'4px 7px',
                borderRadius:999, background:'rgba(160,68,92,.12)',
                border:'1px solid rgba(160,68,92,.3)',
                color:'#a0445c', cursor:'pointer', fontSize:11,
              }}>
                <Trash2 size={11}/>
              </button>
            )}
            <button onClick={() => onLike(list)} style={{
              display:'flex', alignItems:'center', gap:4, padding:'4px 8px',
              borderRadius:999, background:list.liked ? 'rgba(160,68,92,.18)' : 'rgba(255,255,255,.05)',
              border:`1px solid ${list.liked ? '#a0445c55' : G.border}`,
              color:list.liked ? '#ff6f91' : G.muted,
              cursor:'pointer', fontSize:10.5, fontWeight:800,
            }}>
              <Heart size={11} fill={list.liked ? 'currentColor' : 'none'}/> {list.likes || 0}
            </button>
          </div>
        </div>
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {(list.tierLabels||[]).slice(0,6).map((label, i) => (
            <span key={i} style={{
              fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:100,
              background:`${list.tierColors?.[i]||G.gold}14`,
              border:`1px solid ${list.tierColors?.[i]||G.gold}33`,
              color: list.tierColors?.[i]||G.gold,
            }}>{label}</span>
          ))}
        </div>
        <div style={{ fontSize:10, color:G.muted, marginTop:10 }}>
          Publiée le {new Date(list.savedAt || Date.now()).toLocaleDateString('fr-FR')}
        </div>
      </div>
      <div style={{ display:'flex', borderTop:`1px solid ${G.border}` }}>
        <button onClick={() => onLoad(list)} style={{ ...listAction, borderRight:'none' }}>Ouvrir dans le studio</button>
      </div>
    </motion.div>
  )
}

const listAction = {
  flex:1, padding:'8px 4px', background:'none', border:'none', cursor:'pointer',
  color:'rgba(255,255,255,.5)', fontSize:11, fontWeight:700,
  display:'flex', alignItems:'center', justifyContent:'center', gap:4,
  borderRight:'1px solid rgba(255,255,255,.05)', transition:'color .15s, background .15s',
}

// ── CSS inject ────────────────────────────────────────────────────────────────
const CSS = `
  .tier-row:hover .tier-row-actions { opacity:1 !important; pointer-events:all !important; }
  .tier-item-card:hover { box-shadow:0 6px 24px rgba(0,0,0,.7),0 0 0 1.5px rgba(191,164,106,.3) !important; transform:translateY(-2px) scale(1.03); }
  .tier-item-card { transition:transform .18s,box-shadow .18s; }
  .saved-list-card:hover { border-color:rgba(191,164,106,.28) !important; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:rgba(191,164,106,.18); border-radius:4px; }
`

// ── Main Export ───────────────────────────────────────────────────────────────
export default function TierListPage() {
  const { userId, discordId, displayName } = useAuth()
  const initialDraftRef = useRef(null)

  // ── Tab
  const [tab, setTab] = useState('studio')

  // ── Studio state
  const [selectedType, setSelectedType] = useState(null)
  const [tiers, setTiers]     = useState(DEFAULT_TIERS)
  const [board, setBoard]     = useState(null)
  const [customItems, setCustomItems] = useState([])
  const [favorites, setFavorites]   = useState([])
  const [title, setTitle]     = useState('Ma Tier List')
  const [editTitle, setEditTitle] = useState(false)
  const [tmpTitle, setTmpTitle]   = useState(title)
  const [search, setSearch]   = useState('')
  const [genre, setGenre]     = useState('Tous')
  const [activeId, setActiveId]   = useState(null)
  const [saved, setSaved]     = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [toast, setToast]     = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const boardRef = useRef(null)
  const titleRef = useRef(null)
  const latestDraftRef = useRef(null)
  const draftTimerRef = useRef(null)
  const cloudTimerRef = useRef(null)
  const cloudRestoreRef = useRef(false)
  const latestShareListRef = useRef(null)

  // ── My Lists state
  const [savedLists, setSavedLists] = useState([])
  const [editingListId, setEditingListId] = useState(null) // liste locale en cours d'édition (null = nouvelle)
  const [communityLists, setCommunityLists] = useState([])
  const [cloudLists, setCloudLists] = useState([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [cloudSaved, setCloudSaved] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    loadDraft().then(draft => {
      if (!draft) return
      initialDraftRef.current = draft
      if (draft.typeId) {
        const type = TIER_TYPES.find(t => t.id === draft.typeId)
        if (type) setSelectedType(type)
      }
      setTiers(draft.tiers || DEFAULT_TIERS)
      setBoard(draft.board || null)
      setCustomItems(draft.customItems || [])
      setFavorites(draft.favorites || [])
      setTitle(draft.title || 'Ma Tier List')
      setDraftSaved(true)
      setToast(`Brouillon restauré : "${draft.title || 'Ma Tier List'}"`)
    })
    loadSavedListsIDB().then(lists => setSavedLists(lists))
  }, [])

  const refreshCommunity = useCallback(async () => {
    setCommunityLoading(true)
    try {
      const [community, mine] = await Promise.all([
        fetchCommunityTierLists(),
        fetchMyCloudTierLists().catch(() => []),
      ])
      setCommunityLists(community)
      setCloudLists(mine)
    } catch (err) {
      setToast(err?.message || 'Communauté indisponible')
    } finally {
      setCommunityLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCommunity()
  }, [refreshCommunity, userId, discordId])

  useEffect(() => {
    if (initialDraftRef.current || cloudRestoreRef.current) return
    cloudRestoreRef.current = true
    fetchCloudDraft().then(draft => {
      if (!draft) return
      const type = TIER_TYPES.find(t => t.id === draft.typeId)
      if (type) setSelectedType(type)
      setTiers(draft.tiers || DEFAULT_TIERS)
      setBoard(draft.board || null)
      setCustomItems(draft.customItems || [])
      setFavorites(draft.favorites || [])
      setTitle(draft.title || 'Ma Tier List')
      setDraftSaved(true)
      setCloudSaved(true)
      setToast(`Brouillon cloud restauré : "${draft.title || 'Ma Tier List'}"`)
    }).catch(() => {})
  }, [userId, discordId])

  const buildDraft = useCallback((overrides = {}) => {
    if (!selectedType || !board) return null
    return {
      title,
      typeId: selectedType.id,
      tiers,
      board,
      customItems,
      favorites,
      updatedAt: Date.now(),
      ...overrides,
    }
  }, [selectedType, tiers, board, customItems, favorites, title])

  const buildShareList = useCallback((overrides = {}) => {
    if (!selectedType || !board) return null
    return {
      ...toSharePayload({ title, selectedType, tiers, board, customItems, favorites }),
      ...overrides,
    }
  }, [selectedType, tiers, board, customItems, favorites, title])

  const flushDraftNow = useCallback((overrides = {}) => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current)
      draftTimerRef.current = null
    }
    const draft = buildDraft(overrides)
    latestDraftRef.current = draft
    if (!draft) {
      setDraftSaved(false)
      return false
    }
    saveDraft(draft).then(ok => setDraftSaved(ok))
    return true
  }, [buildDraft])

  const queueDraftSave = useCallback((overrides = {}) => {
    const draft = buildDraft(overrides)
    latestDraftRef.current = draft
    if (!draft) {
      setDraftSaved(false)
      return false
    }
    setDraftSaved(false)
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      if (latestDraftRef.current) saveDraft(latestDraftRef.current).then(ok => setDraftSaved(ok))
      draftTimerRef.current = null
    }, DRAFT_SAVE_DELAY)
    return true
  }, [buildDraft])

  useEffect(() => {
    queueDraftSave()
  }, [queueDraftSave])

  useEffect(() => {
    const list = buildShareList()
    latestShareListRef.current = list
    if (!list) {
      setCloudSaved(false)
      return
    }
    setCloudSaved(false)
    if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current)
    cloudTimerRef.current = setTimeout(async () => {
      try {
        await autosaveTierList(list)
        setCloudSaved(true)
      } catch {
        setCloudSaved(false)
      } finally {
        cloudTimerRef.current = null
      }
    }, CLOUD_SAVE_DELAY)
    return () => {
      if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current)
    }
  }, [buildShareList, userId, discordId])

  useEffect(() => {
    const flushLocal = () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
      const draft = latestDraftRef.current || buildDraft()
      if (draft) saveDraft({ ...draft, updatedAt:Date.now() }).then(ok => setDraftSaved(ok))
    }
    const flushCloud = () => {
      if (cloudTimerRef.current) {
        clearTimeout(cloudTimerRef.current)
        cloudTimerRef.current = null
      }
      const list = latestShareListRef.current
      if (!list) return
      const clientId = getTierListClientId()
      try {
        fetch('/api/tierlists?action=autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientId },
          body: JSON.stringify({ clientId, list }),
          keepalive: true,
        }).catch(() => {})
      } catch {}
    }
    const flushAll = () => { flushLocal(); flushCloud() }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushAll()
    }
    window.addEventListener('pagehide', flushAll)
    window.addEventListener('beforeunload', flushLocal)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flushAll)
      window.removeEventListener('beforeunload', flushLocal)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flushLocal()
    }
  }, [])

  // ── allById (official + custom)
  const allById = useMemo(() => {
    const official = selectedType ? Object.fromEntries(selectedType.items.map(a => [a.id, a])) : {}
    const custom   = Object.fromEntries(customItems.map(a => [a.id, a]))
    return { ...official, ...custom }
  }, [selectedType, customItems])

  // ── DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint:{ distance:6 } }),
    useSensor(TouchSensor,   { activationConstraint:{ delay:250, tolerance:6 } }),
  )

  const findContainer = useCallback((id) => {
    if (!board) return null
    for (const [k, ids] of Object.entries(board)) if (ids.includes(id)) return k
    return null
  }, [board])

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || !board) return
    const dest = over.id
    const validContainers = [...tiers.map(t => t.id), 'pool']
    if (!validContainers.includes(dest)) return
    const src = findContainer(active.id)
    if (!src || src === dest) return
    const next = {}
    for (const k of Object.keys(board))
      next[k] = k === src ? board[k].filter(id => id !== active.id)
        : k === dest ? [...board[k], active.id] : [...board[k]]
    setBoard(next)
    queueDraftSave({ board:next })
    if (tiers.find(t => t.id === dest)?.label === 'GOD' || tiers.find(t => t.id === dest)?.id === 'god') fireConfetti()
    setSaved(false)
  }

  // ── Type select
  const handleTypeSelect = (type) => {
    setSelectedType(type)
    const newBoard = initBoard(tiers, type.items)
    // add custom items to pool too
    customItems.forEach(c => { if (!newBoard.pool.includes(c.id)) newBoard.pool.push(c.id) })
    setBoard(newBoard)
    setTitle(`Ma Tier List ${type.icon} ${type.label}`)
    setFavorites([])
    setSearch('')
    setGenre('Tous')
    setSaved(false)
    saveDraft({
      title:`Ma Tier List ${type.icon} ${type.label}`,
      typeId:type.id,
      tiers,
      board:newBoard,
      customItems,
      favorites:[],
      updatedAt:Date.now(),
    }).then(ok => setDraftSaved(ok))
  }

  // ── Tier row operations
  const handleRename = (tierId, label) => {
    setTiers(ts => ts.map(t => t.id === tierId ? { ...t, label } : t))
    setSaved(false)
  }
  const handleColorChange = (tierId, color) => {
    setTiers(ts => ts.map(t => t.id === tierId ? {
      ...t, color,
      bg: `linear-gradient(135deg,${color}18,${color}32)`,
    } : t))
    setSaved(false)
  }
  const handleDeleteRow = (tierId) => {
    if (tiers.length <= 1) return
    setTiers(ts => ts.filter(t => t.id !== tierId))
    setBoard(prev => {
      if (!prev) return prev
      const freed = prev[tierId] || []
      const { [tierId]: _, ...rest } = prev
      return { ...rest, pool: [...(rest.pool||[]), ...freed] }
    })
    setSaved(false)
  }
  const handleAddRowAbove = (tierId) => {
    const id = uid()
    const newRow = { id, label:'NEW', color:'#7b6aa8', bg:'linear-gradient(135deg,#1c1728,#31284b)' }
    setTiers(ts => {
      const idx = ts.findIndex(t => t.id === tierId)
      return [...ts.slice(0,idx), newRow, ...ts.slice(idx)]
    })
    setBoard(prev => prev ? { ...prev, [id]: [] } : prev)
    setSaved(false)
  }

  // ── Custom items
  const handleAddCustom = ({ img, name, sub }) => {
    const id = `custom_${uid()}`
    const newItem = { id, name, sub, img, year: new Date().getFullYear(), genres:['Custom'] }
    setCustomItems(prev => [...prev, newItem])
    setBoard(prev => prev ? { ...prev, pool: [...(prev.pool||[]), id] } : prev)
    setSaved(false)
  }

  // ── Apply template
  const applyTemplate = (tpl) => {
    setTiers(tpl.tiers)
    if (selectedType) {
      const newBoard = initBoard(tpl.tiers, selectedType.items)
      customItems.forEach(c => { if (!newBoard.pool.includes(c.id)) newBoard.pool.push(c.id) })
      setBoard(newBoard)
    }
    setShowTemplates(false)
    setSaved(false)
    setToast(`✅ Template "${tpl.name}" appliqué`)
  }

  // ── Nouvelle liste : reset complet du studio (permet de créer une 2e liste
  // sans que l'ancienne ne revienne via le brouillon).
  const resetStudio = () => {
    if (draftTimerRef.current) { clearTimeout(draftTimerRef.current); draftTimerRef.current = null }
    setEditingListId(null)
    setSelectedType(null)
    setTiers(DEFAULT_TIERS)
    setBoard(null)
    setCustomItems([])
    setFavorites([])
    setTitle('Ma Tier List')
    setSearch(''); setGenre('Tous')
    setSaved(false)
    latestDraftRef.current = null
    initialDraftRef.current = null
    clearDraftIDB()           // purge le brouillon stocké → plus de restauration de l'ancienne liste
    setTab('studio')
  }

  // ── Save / Load
  const saveList = () => {
    const base = {
      title,
      emoji: selectedType?.icon || '📋',
      category: selectedType?.label || 'Custom',
      tierCount: tiers.length,
      tierLabels: tiers.map(t => t.label),
      tierColors: tiers.map(t => t.color),
      tiers, board, customItems, favorites,
      typeId: selectedType?.id,
      savedAt: Date.now(),
    }
    let updated
    if (editingListId && savedLists.some(l => l.id === editingListId)) {
      // On édite une liste existante → on la met à jour (pas de doublon)
      updated = savedLists.map(l => l.id === editingListId ? { ...l, ...base, id: editingListId } : l)
      setToast('✅ Tier list mise à jour !')
    } else {
      // Nouvelle liste → nouvel id
      const id = uid()
      setEditingListId(id)
      updated = [{ id, ...base }, ...savedLists]
      setToast('✅ Tier list sauvegardée !')
    }
    setSavedLists(updated)
    saveListsIDB(updated)
    setSaved(true)
    flushDraftNow()
  }

  const shareList = async () => {
    const list = buildShareList()
    if (!list) {
      setToast('Crée une tier list avant de partager')
      return
    }
    setPublishing(true)
    try {
      await autosaveTierList(list)
      const result = await publishTierList(list)
      setCommunityLists(prev => [result.list, ...prev.filter(item => item.id !== result.list.id)])
      setCloudSaved(true)
      setTab('community')
      setToast(`Publié dans la communauté par ${displayName || 'toi'}`)
      fireConfetti()
    } catch (err) {
      setToast(err?.message || 'Partage impossible')
    } finally {
      setPublishing(false)
    }
  }

  const loadList = (list) => {
    const type = TIER_TYPES.find(t => t.id === list.typeId)
    if (type) setSelectedType(type)
    setTiers(list.tiers || DEFAULT_TIERS)
    setBoard(list.board || null)
    setCustomItems(list.customItems || [])
    setFavorites(list.favorites || [])
    setTitle(list.title)
    setEditingListId(list.id || null) // édite cette liste → la sauvegarde la met à jour
    setSaved(true)
    setTab('studio')
    latestDraftRef.current = {
      title:list.title,
      typeId:list.typeId,
      tiers:list.tiers || DEFAULT_TIERS,
      board:list.board || null,
      customItems:list.customItems || [],
      favorites:list.favorites || [],
      updatedAt:Date.now(),
    }
    setToast(`📂 "${list.title}" chargée`)
  }

  const likeCommunityList = async (list) => {
    try {
      const result = await toggleTierListLike(list.id)
      setCommunityLists(prev => prev.map(item => item.id === list.id ? {
        ...item,
        liked: result.liked,
        likes: result.likes,
      } : item))
    } catch (err) {
      setToast(err?.message || 'Like impossible')
    }
  }

  const deleteCommunityList = async (list) => {
    if (!window.confirm(`Supprimer "${list.title}" de la communauté ? Cette action est irréversible.`)) return
    try {
      await deleteCommunityTierList(list.id)
      setCommunityLists(prev => prev.filter(item => item.id !== list.id))
      setToast('🗑️ Liste supprimée')
    } catch (err) {
      setToast(err?.message || 'Suppression impossible')
    }
  }

  const deleteList = (id) => {
    const updated = savedLists.filter(l => l.id !== id)
    setSavedLists(updated)
    saveListsIDB(updated)
    setToast('🗑️ Supprimé')
  }

  const duplicateList = (list) => {
    const copy = { ...list, id: uid(), title: `${list.title} (copie)`, savedAt: Date.now() }
    const updated = [copy, ...savedLists]
    setSavedLists(updated)
    saveListsIDB(updated)
    setToast('📋 Dupliqué')
  }

  // ── Export PNG
  const exportPng = async () => {
    if (!boardRef.current) return
    setToast('⏳ Export…')
    try {
      const url = await toPng(boardRef.current, { backgroundColor:'#08090D', pixelRatio:2 })
      const a = document.createElement('a')
      a.download = `${title.replace(/[^a-z0-9]/gi,'_')}.png`
      a.href = url; a.click()
      setToast('🖼️ PNG exporté !')
    } catch { setToast('❌ Export échoué') }
  }

  // ── Reset
  const reset = () => {
    if (!selectedType) return
    const b = initBoard(tiers, selectedType.items)
    customItems.forEach(c => { if (!b.pool.includes(c.id)) b.pool.push(c.id) })
    setBoard(b)
    setFavorites([])
    setSaved(false)
    setToast('🔄 Remis à zéro')
  }

  // ── Shuffle
  const randomize = () => {
    if (!selectedType || !board) return
    const all = Object.values(board).flat().sort(() => Math.random() - .5)
    const perTier = Math.ceil(all.length / (tiers.length + 1))
    const newB = {}
    let i = 0
    tiers.forEach(t => { newB[t.id] = all.slice(i, i + perTier); i += perTier })
    newB.pool = all.slice(i)
    setBoard(newB)
    setSaved(false)
    setToast('🎲 Randomisé !')
  }

  // ── Stats
  const placedCount = useMemo(() => {
    if (!board) return 0
    return tiers.reduce((s, t) => s + (board[t.id]?.length || 0), 0)
  }, [board, tiers])
  const myPublishedLists = useMemo(() => cloudLists.filter(list => list.published), [cloudLists])

  const TABS = [
    { id:'studio',   label:'Créer',       icon:<Layers size={13}/> },
    { id:'community',label:'CommunautÃ©',  icon:<Users size={13}/> },
    { id:'mylists',  label:'Mes Listes',  icon:<BookOpen size={13}/> },
    { id:'templates',label:'Templates',   icon:<Grid size={13}/> },
  ]

  return (
    <div style={{ position:'relative', minHeight:'100vh', background:G.bg, color:G.text, fontFamily:"'Inter',system-ui,sans-serif", paddingTop:72 }}>
      <style>{CSS}</style>

      {/* ── Studio Header ── */}
      <header style={{
        position:'sticky', top:72, zIndex:50,
        background:'rgba(8,9,13,.95)', backdropFilter:'blur(24px)',
        borderBottom:`1px solid ${G.border}`,
        padding:'0 20px',
      }}>
        <div style={{ maxWidth:1600, margin:'0 auto', display:'flex', alignItems:'center', gap:14, height:60 }}>

          {/* Brand */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{
              width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
              background:`linear-gradient(135deg,${G.rose}22,${G.gold}22)`,
              border:`1px solid ${G.gold}33`,
              fontSize:15,
            }}>⚔️</div>
            <div>
              <div style={{ fontSize:12, fontWeight:900, letterSpacing:'.14em', color:G.gold, lineHeight:1 }}>
                BRAMS TIER STUDIO
              </div>
              {tab === 'studio' && selectedType && (
                <div style={{ fontSize:9.5, color:G.muted, letterSpacing:'.06em', lineHeight:1, marginTop:2 }}>
                  {selectedType.icon} {selectedType.label}
                  {placedCount > 0 && ` · ${placedCount} placés`}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,.04)', borderRadius:10, padding:3 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7,
                background: tab === t.id ? `rgba(191,164,106,.14)` : 'transparent',
                border: tab === t.id ? `1px solid ${G.gold}33` : '1px solid transparent',
                color: tab === t.id ? G.gold : G.muted,
                cursor:'pointer', fontSize:11, fontWeight:700, transition:'all .15s',
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex:1 }}/>

          {/* Studio actions */}
          {tab === 'studio' && selectedType && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {/* Title edit */}
              {editTitle ? (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <input ref={titleRef} value={tmpTitle} onChange={e => setTmpTitle(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter'){setTitle(tmpTitle);setEditTitle(false);setSaved(false)} if (e.key==='Escape') setEditTitle(false) }}
                    style={{ ...miniInput, width:180, fontSize:13, fontWeight:800 }}/>
                  <button onClick={() => { setTitle(tmpTitle); setEditTitle(false); setSaved(false) }}
                    style={{ ...actionBtn, padding:'4px 8px' }}><Check size={12}/></button>
                </div>
              ) : (
                <button onClick={() => { setTmpTitle(title); setEditTitle(true); setTimeout(() => titleRef.current?.focus(), 30) }}
                  style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer',
                    color:G.text, fontSize:13, fontWeight:800, padding:'4px 8px',
                    borderRadius:8, transition:'background .15s' }}>
                  {title.slice(0,24)}{title.length > 24 && '…'} <Edit3 size={11} style={{ color:G.muted }}/>
                </button>
              )}

              {/* Auto-save indicator */}
              <div style={{ fontSize:9.5, color: saved || draftSaved || cloudSaved ? '#34d399' : G.muted, fontWeight:700, minWidth:108 }}>
                {cloudSaved ? '✓ Auto-sauvé cloud' : saved ? '✓ Sauvegardé' : draftSaved ? '✓ Auto-sauvé' : '● Sauvegarde...'}
              </div>

              {/* Action buttons */}
              {[
                { icon:<Shuffle size={11}/>, label:'Shuffle',  fn:randomize, c:'#7b6aa8' },
                { icon:<RotateCcw size={11}/>, label:'Reset',  fn:reset,     c:G.rose },
                { icon:<Download size={11}/>, label:'PNG',     fn:exportPng, c:G.gold },
                { icon:<Save size={11}/>,     label:'Sauv.',   fn:saveList,  c:'#34d399' },
                { icon:<Users size={11}/>,    label:publishing ? '...' : 'Partager', fn:shareList, c:'#4a86b8' },
              ].map(b => (
                <button key={b.label} onClick={b.fn} style={{
                  display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8,
                  background:`${b.c}12`, border:`1px solid ${b.c}30`,
                  color:b.c, cursor:'pointer', fontSize:10.5, fontWeight:700,
                  transition:'background .15s, border-color .15s',
                }}>
                  {b.icon} {b.label}
                </button>
              ))}

              {/* Templates toggle */}
              <button onClick={() => setShowTemplates(v => !v)} style={{
                display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8,
                background: showTemplates ? 'rgba(191,164,106,.16)' : 'rgba(255,255,255,.05)',
                border:`1px solid ${showTemplates ? G.gold+'44' : G.border}`,
                color: showTemplates ? G.gold : G.muted, cursor:'pointer', fontSize:10.5, fontWeight:700,
              }}>
                <Grid size={11}/> Templates <ChevronDown size={10} style={{ transform: showTemplates ? 'rotate(180deg)' : undefined, transition:'transform .2s' }}/>
              </button>

              {/* Change type */}
              <button onClick={() => setSelectedType(null)} style={{
                display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8,
                background:'rgba(255,255,255,.05)', border:`1px solid ${G.border}`,
                color:G.muted, cursor:'pointer', fontSize:10.5, fontWeight:700,
              }}>
                <ArrowLeft size={11}/> Changer
              </button>
            </div>
          )}
        </div>

        {/* Templates inline panel */}
        <AnimatePresence>
          {showTemplates && tab === 'studio' && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
              style={{ borderTop:`1px solid ${G.border}`, overflow:'hidden' }}>
              <div style={{ maxWidth:1600, margin:'0 auto', padding:'12px 0', display:'flex', gap:10, flexWrap:'wrap' }}>
                {TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => applyTemplate(tpl)} style={{
                    display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10,
                    background:'rgba(255,255,255,.04)', border:`1px solid ${G.border}`,
                    color:G.text, cursor:'pointer', textAlign:'left',
                    transition:'border-color .15s, background .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=G.gold+'44'; e.currentTarget.style.background='rgba(191,164,106,.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=G.border; e.currentTarget.style.background='rgba(255,255,255,.04)' }}>
                    <span style={{ fontSize:18 }}>{tpl.emoji}</span>
                    <div>
                      <div style={{ fontSize:11.5, fontWeight:800, color:G.text }}>{tpl.name}</div>
                      <div style={{ fontSize:10, color:G.muted }}>{tpl.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Tab: STUDIO ── */}
      {tab === 'studio' && (
        <AnimatePresence mode="wait">
          {!selectedType ? (
            // Type selector
            <motion.div key="selector" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                minHeight:'calc(100vh - 132px)', padding:'24px 20px' }}>
              <div style={{ maxWidth:900, width:'100%' }}>
                <div style={{ textAlign:'center', marginBottom:36 }}>
                  <div style={{ fontSize:11, fontWeight:800, letterSpacing:'.22em', color:G.gold,
                    textTransform:'uppercase', marginBottom:12 }}>
                    Brams Tier Studio
                  </div>
                  <h1 style={{ margin:0, fontSize:'clamp(26px,4vw,42px)', fontWeight:900,
                    letterSpacing:'-.03em', color:G.text }}>
                    Quelle tier list tu veux créer ?
                  </h1>
                  <p style={{ margin:'10px 0 0', fontSize:13.5, color:G.muted }}>
                    Choisis une catégorie pour ouvrir l'atelier — ou charge une liste existante
                  </p>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14 }}>
                  {TIER_TYPES.map((type, i) => (
                    <motion.button key={type.id}
                      initial={{ y:24, opacity:0 }} animate={{ y:0, opacity:1 }}
                      transition={{ delay:i*.08, type:'spring', stiffness:280, damping:24 }}
                      onClick={() => handleTypeSelect(type)}
                      style={{
                        position:'relative', overflow:'hidden', padding:'22px 20px',
                        background:G.card, border:`1px solid ${G.border}`,
                        borderRadius:16, cursor:'pointer', textAlign:'left', color:G.text,
                        transition:'border-color .2s, box-shadow .2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=type.color+'55'; e.currentTarget.style.boxShadow=`0 8px 32px ${type.color}18` }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor=G.border; e.currentTarget.style.boxShadow='none' }}>
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
                        background:`linear-gradient(90deg,${type.color},${type.color}00)`, borderRadius:'14px 14px 0 0' }}/>
                      <div style={{ fontSize:28, marginBottom:10 }}>{type.icon}</div>
                      <div style={{ fontSize:15, fontWeight:800, marginBottom:4 }}>{type.label}</div>
                      <div style={{ fontSize:11, color:G.muted }}>{type.items.length || '∞'} entrées</div>
                    </motion.button>
                  ))}
                </div>

                {savedLists.length > 0 && (
                  <div style={{ marginTop:28, textAlign:'center' }}>
                    <button onClick={() => setTab('mylists')} style={{
                      ...actionBtn, margin:'0 auto', padding:'8px 20px', fontSize:12,
                    }}>
                      <BookOpen size={12}/> Charger une liste existante ({savedLists.length})
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // Tier editor
            <motion.div key="editor" initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex', flexDirection:'column' }}>

              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

                {/* Board */}
                <div ref={boardRef} style={{
                  background:'rgba(10,11,18,.6)', backdropFilter:'blur(12px)',
                  borderBottom:`1px solid ${G.border}`,
                }}>
                  {board && tiers.map(tier => (
                    <TierRow
                      key={tier.id} tier={tier}
                      items={board[tier.id]||[]}
                      allById={allById}
                      onRename={handleRename}
                      onColorChange={handleColorChange}
                      onDelete={handleDeleteRow}
                      onAddAbove={handleAddRowAbove}
                      onAddBelow={(id) => {
                        const idx = tiers.findIndex(t => t.id === id)
                        const newId = uid()
                        const newRow = { id:newId, label:'NEW', color:'#7b6aa8', bg:'linear-gradient(135deg,#1c1728,#31284b)' }
                        setTiers(ts => [...ts.slice(0,idx+1), newRow, ...ts.slice(idx+1)])
                        setBoard(prev => prev ? { ...prev, [newId]: [] } : prev)
                      }}
                    />
                  ))}

                  {/* Add row button */}
                  <button onClick={() => {
                    const id = uid()
                    setTiers(ts => [...ts, { id, label:'NEW', color:'#7b6aa8', bg:'linear-gradient(135deg,#1c1728,#31284b)' }])
                    setBoard(prev => prev ? { ...prev, [id]: [] } : prev)
                  }} style={{
                    width:'100%', padding:'8px', background:'none', border:'none',
                    cursor:'pointer', color:'rgba(255,255,255,.18)', fontSize:11, fontWeight:700,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    transition:'color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color=G.gold}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,.18)'}>
                    <Plus size={12}/> Ajouter un rang
                  </button>
                </div>

                {/* Pool */}
                {board && (
                  <ItemPool
                    items={board.pool||[]}
                    allById={allById}
                    customItems={customItems}
                    onAddCustom={handleAddCustom}
                    favorites={favorites}
                    onToggleFav={id => setFavorites(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id])}
                    search={search} onSearch={setSearch}
                    genre={genre} onGenre={setGenre}
                    currentType={selectedType}
                  />
                )}

                <DragOverlay>
                  {activeId ? <ItemCard itemId={activeId} allById={allById} isDragOverlay/> : null}
                </DragOverlay>
              </DndContext>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Tab: COMMUNITY ── */}
      {tab === 'community' && (
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, gap:14 }}>
            <div>
              <h2 style={{ margin:0, fontSize:22, fontWeight:900, letterSpacing:'-.02em' }}>Tier Lists Communauté</h2>
              <div style={{ fontSize:12, color:G.muted, marginTop:4 }}>
                {communityLists.length} publication{communityLists.length !== 1 && 's'} visible{communityLists.length !== 1 && 's'} · likes en direct
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={refreshCommunity} style={{ ...actionBtn }}>
                <RotateCcw size={12}/> Actualiser
              </button>
              <button onClick={shareList} disabled={publishing || !selectedType} style={{ ...actionBtn, opacity:publishing || !selectedType ? .55 : 1 }}>
                <Users size={12}/> {publishing ? 'Publication...' : 'Partager ma liste'}
              </button>
            </div>
          </div>

          {communityLoading ? (
            <div style={{ padding:'48px 20px', textAlign:'center', color:G.muted, fontSize:13 }}>Chargement de la communauté...</div>
          ) : communityLists.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'64px 20px',
              background:G.card, border:`1px solid ${G.border}`, borderRadius:20,
            }}>
              <div style={{ fontSize:40, marginBottom:16 }}>⚔️</div>
              <h3 style={{ margin:'0 0 8px', color:G.text }}>Aucune tier list publiée</h3>
              <p style={{ margin:'0 0 20px', color:G.muted, fontSize:13 }}>Crée une liste puis clique sur Partager pour lancer la communauté.</p>
              <button onClick={() => setTab('studio')} style={{ ...actionBtn, margin:'0 auto', padding:'8px 20px' }}>
                Créer une tier list
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {communityLists.map(list => (
                <CommunityListCard
                  key={list.id}
                  list={list}
                  onLoad={loadList}
                  onLike={likeCommunityList}
                  isOwner={Boolean(discordId && list.authorDiscordId && discordId === list.authorDiscordId)}
                  onDelete={deleteCommunityList}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: MY LISTS ── */}
      {tab === 'mylists' && (
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <h2 style={{ margin:0, fontSize:22, fontWeight:900, letterSpacing:'-.02em' }}>Mes Tier Lists</h2>
              <div style={{ fontSize:12, color:G.muted, marginTop:4 }}>{savedLists.length} locale{savedLists.length !== 1 && 's'} · {myPublishedLists.length} partagée{myPublishedLists.length !== 1 && 's'}</div>
            </div>
            <button onClick={resetStudio} style={{ ...actionBtn }}>
              <Plus size={12}/> Nouvelle liste
            </button>
          </div>

          {savedLists.length === 0 ? (
            <div style={{
              textAlign:'center', padding:'64px 20px',
              background:G.card, border:`1px solid ${G.border}`, borderRadius:20,
            }}>
              <div style={{ fontSize:40, marginBottom:16 }}>📋</div>
              <h3 style={{ margin:'0 0 8px', color:G.text }}>Aucune tier list sauvegardée</h3>
              <p style={{ margin:'0 0 20px', color:G.muted, fontSize:13 }}>Crée ta première tier list dans l'onglet Créer</p>
              <button onClick={() => setTab('studio')} style={{ ...actionBtn, margin:'0 auto', padding:'8px 20px' }}>
                Commencer
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
              {savedLists.map(list => (
                <SavedListCard
                  key={list.id} list={list}
                  onLoad={loadList} onDelete={deleteList} onDuplicate={duplicateList}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: TEMPLATES ── */}
      {tab === 'templates' && (
        <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 20px' }}>
          <div style={{ marginBottom:24 }}>
            <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:900, letterSpacing:'-.02em' }}>Templates</h2>
            <p style={{ margin:0, color:G.muted, fontSize:12.5 }}>Choisis un template pour démarrer rapidement avec des rangs préconfigurés</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
            {TEMPLATES.map(tpl => (
              <div key={tpl.id} style={{
                background:G.card, border:`1px solid ${G.border}`, borderRadius:18, overflow:'hidden',
                transition:'border-color .2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor=`${G.gold}33`}
              onMouseLeave={e => e.currentTarget.style.borderColor=G.border}>
                <div style={{ padding:'18px 18px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <span style={{ fontSize:28 }}>{tpl.emoji}</span>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:G.text }}>{tpl.name}</div>
                      <div style={{ fontSize:11, color:G.muted }}>{tpl.desc}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {tpl.tiers.map(t => (
                      <span key={t.id} style={{
                        fontSize:9.5, fontWeight:800, padding:'2px 8px', borderRadius:100,
                        background:`${t.color}14`, border:`1px solid ${t.color}33`, color:t.color,
                      }}>{t.label}</span>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop:`1px solid ${G.border}`, padding:'10px 18px', display:'flex', gap:8 }}>
                  <button onClick={() => { applyTemplate(tpl); setTab('studio') }} style={{ ...actionBtn, flex:1, justifyContent:'center' }}>
                    Utiliser ce template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key={toast} msg={toast} onDone={() => setToast(null)}/>}
      </AnimatePresence>
    </div>
  )
}
