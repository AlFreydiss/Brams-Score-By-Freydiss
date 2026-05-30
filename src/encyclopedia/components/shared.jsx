import { useEffect, useRef, useState } from 'react'
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform,
} from 'framer-motion'
import { Shield, Lock, Star, Eye, EyeOff, Heart, Tag, Zap, BookOpen, Swords, ChevronRight, Search, X } from 'lucide-react'
import { rarityLabels, rarityConfig } from '../data/rarityStyles'

// ─── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg:       '#050507',
  surface:  '#0c0c0f',
  surface2: '#111114',
  surface3: '#181820',
  border:   'rgba(255,255,255,0.07)',
  border2:  'rgba(255,255,255,0.12)',
  text:     'rgba(255,255,255,0.90)',
  textDim:  'rgba(255,255,255,0.42)',
  textMid:  'rgba(255,255,255,0.65)',
  red:      '#c91f2e',
  redSoft:  'rgba(201,31,46,0.18)',
  orange:   '#f59e0b',
  gold:     '#d4af37',
  goldSoft: 'rgba(212,175,55,0.15)',
}

// ─── Utilities ──────────────────────────────────────────────────────────────
const fmtId = i => `#${String(i + 1).padStart(4, '0')}`

export function hexToRgba(hex, alpha = 1) {
  const clean = String(hex || '#ffffff').replace('#', '')
  const value = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, 'f').slice(0, 6)
  const n = Number.parseInt(value, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function isSpoilerHiddenArc(item, spoilerSafe, revealed = []) {
  return spoilerSafe && (item.isMajorSpoiler || item.spoilerLevel >= 4 || item.badge === 'Spoiler') && !revealed.includes(item.id)
}

function statLabel(key) {
  const map = {
    rawPower: 'Puissance brute', mobility: 'Mobilité', defense: 'Défense',
    utility: 'Utilité', rarity: 'Rareté', awakeningPotential: 'Potentiel éveil',
    combatDanger: 'Danger combat', versatility: 'Polyvalence',
  }
  return map[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

const CATEGORY_ICONS = {
  'devil-fruits': '🍎', characters: '👤', crews: '⚓', arcs: '🗺️',
  haki: '⚡', islands: '🏝️', mysteries: '🔍', 'secret-files': '🔒',
  clans: '🏯', jutsu: '🌀', villages: '🏘️', biju: '🐉', organizations: '🕶️',
  'kekkei-genkai': '🧬', transformations: '✨', techniques: '💥', races: '🌌',
  planets: '🪐', objects: '💎', gods: '☯️', zanpakuto: '⚔️', shikai: '🌊',
  bankai: '🔥', espadas: '💀', hollows: '👁️', quincy: '🏹', captains: '🎖️',
  alchemy: '⚗️', homunculus: '🧪', transmutations: '🔄', quirks: '⚡',
  heroes: '🦸', villains: '🦹', farms: '🌿', demons: '😈', places: '📍',
  inventions: '💡', science: '🔬', kingdoms: '👑',
}

// ─── Rarity badge premium ────────────────────────────────────────────────────
export function RarityBadge({ rarity, size = 'sm' }) {
  const cfg = rarityConfig[rarity] || rarityConfig.common
  const isLarge = size === 'lg'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: isLarge ? '5px 14px' : '3px 10px',
      borderRadius: 100,
      background: `linear-gradient(135deg, ${hexToRgba(cfg.accent, 0.18)}, ${hexToRgba(cfg.accent, 0.08)})`,
      border: `1px solid ${hexToRgba(cfg.accent, 0.45)}`,
      color: cfg.accent,
      fontSize: isLarge ? 12 : 10,
      fontWeight: 800, letterSpacing: '.10em', textTransform: 'uppercase',
      boxShadow: `0 0 12px ${hexToRgba(cfg.accent, 0.22)}`,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: isLarge ? 13 : 11 }}>{cfg.icon}</span>
      {rarityLabels[rarity] || rarity}
    </span>
  )
}

export function SectionTitle({ label, text }) {
  return (
    <header className="enc-section-title">
      <span>{label}</span>
      {text && <p>{text}</p>}
    </header>
  )
}

// ─── Animated stat bar ───────────────────────────────────────────────────────
function StatBar({ label, value, color, index = 0 }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textDim, letterSpacing: '.04em' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: color || T.orange, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }}
          transition={{ duration: 0.9, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '100%', borderRadius: 100,
            background: color
              ? `linear-gradient(90deg, ${hexToRgba(color, 0.7)}, ${color})`
              : `linear-gradient(90deg, ${T.orange}99, ${T.orange})`,
            boxShadow: `0 0 8px ${color || T.orange}55`,
          }}
        />
      </div>
    </div>
  )
}

// ─── Classified red particles ────────────────────────────────────────────────
function ClassifiedParticles() {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: 10 + (i * 11.5) % 90,
    dur: 1.2 + (i * 0.3) % 1.4,
    del: (i * 0.18) % 1.2,
    size: 2 + (i % 3),
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 12 }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -28, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', bottom: 6, left: `${p.x}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: T.red,
            boxShadow: `0 0 6px ${T.red}`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Universe Rail ───────────────────────────────────────────────────────────
export function UniverseRail({ animes, activeId, entriesByAnime, onSelect, onClose }) {
  return (
    <nav className="arc-rail" aria-label="Sélection univers" style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
      <div className="arc-rail-brand" style={{ color: T.textMid }}>
        <span style={{ color: T.red, fontSize: 16 }}>☠</span>
        <span style={{ fontWeight: 800, letterSpacing: '.12em', fontSize: 11 }}>BRAMS ARCHIVES</span>
        <span style={{ color: T.border2 }}>·</span>
        <span style={{ color: T.textDim, fontSize: 10, letterSpacing: '.18em' }}>CLASSIFIÉ</span>
      </div>
      <div className="arc-rail-universes">
        {animes.map(anime => {
          const active = anime.id === activeId
          const accent = anime.theme?.accent || '#fff'
          return (
            <motion.button
              key={anime.id}
              type="button"
              onClick={() => onSelect(anime.id)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? hexToRgba(accent, 0.14) : 'transparent',
                borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
                color: active ? accent : T.textDim,
                fontSize: 12, fontWeight: 700, transition: 'color .15s',
              }}
            >
              <span>{anime.emoji || '·'}</span>
              <span>{anime.shortName || anime.name.split(' ')[0].toUpperCase()}</span>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 100,
                background: active ? hexToRgba(accent, 0.22) : 'rgba(255,255,255,0.07)',
                color: active ? accent : T.textDim, fontWeight: 800,
              }}>
                {entriesByAnime[anime.id] || 0}
              </span>
            </motion.button>
          )
        })}
      </div>
      <motion.button
        className="arc-rail-close" type="button" onClick={onClose}
        whileHover={{ color: '#fff' }} whileTap={{ scale: 0.95 }}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <X size={14} />
        <span>Fermer</span>
      </motion.button>
    </nav>
  )
}

// ─── Control Panel ───────────────────────────────────────────────────────────
export function ControlPanel({
  anime, entryCount, secretCount,
  categories, categoryCounts, activeCategory, onCategoryChange,
  query, onQueryChange, spoilerSafe, onSpoilerToggle,
}) {
  const visible = (categories || []).filter(c => !['world-map', 'coming-soon', 'comparator'].includes(c.id))
  const allCount = categoryCounts.all ?? entryCount
  const accent = anime?.theme?.accent || T.red

  return (
    <aside className="arc-panel" style={{ background: T.surface, borderRight: `1px solid ${T.border}` }}>
      {/* Classification badge */}
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 6,
          background: T.redSoft, border: `1px solid rgba(201,31,46,0.30)`,
          fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: T.red, textTransform: 'uppercase', marginBottom: 12,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.red, display: 'inline-block', boxShadow: `0 0 6px ${T.red}` }} />
          NIVEAU 5 — RESTREINT
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Shield size={14} color={accent} />
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: T.text, letterSpacing: '-.01em' }}>{anime.name}</h2>
        </div>
        {anime.description && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textDim, lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {anime.description.slice(0, 130)}
          </p>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T.textDim }} />
          <input
            className="arc-search-input"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Interroger les archives…"
            style={{
              width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, boxSizing: 'border-box',
              background: T.surface2, border: `1px solid ${T.border}`, color: T.text,
              fontSize: 12, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Folder nav */}
      <div style={{ padding: '0 14px 8px', fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: T.textDim, textTransform: 'uppercase' }}>
        Registre de dossiers
      </div>

      <nav style={{ padding: '0 8px' }}>
        {[{ id: 'all', label: 'Tout consulter', icon: '📁', count: allCount }, ...visible.map(c => ({ ...c, count: categoryCounts[c.id] || 0, icon: CATEGORY_ICONS[c.id] || '·' }))].map(cat => {
          const active = activeCategory === cat.id
          return (
            <motion.button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              whileHover={{ x: active ? 0 : 3 }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: active ? hexToRgba(accent, 0.12) : 'transparent',
                marginBottom: 2, transition: 'background .15s',
              }}
            >
              {active && (
                <motion.span
                  layoutId="folderBar"
                  style={{ position: 'absolute', left: 8, width: 3, height: 22, borderRadius: 2, background: accent }}
                />
              )}
              <span style={{ fontSize: 14 }}>{cat.icon}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: active ? 700 : 500, color: active ? T.text : T.textMid }}>{cat.label}</span>
              <span style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 100, fontWeight: 700,
                background: active ? hexToRgba(accent, 0.20) : 'rgba(255,255,255,0.06)',
                color: active ? accent : T.textDim,
              }}>{cat.count}</span>
            </motion.button>
          )
        })}
      </nav>

      {/* Spoiler toggle */}
      <div style={{ margin: '12px 14px 0', padding: '12px 14px', borderRadius: 12, background: T.surface2, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {spoilerSafe ? <Lock size={13} color={T.red} /> : <EyeOff size={13} color={T.textDim} />}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Mode Spoiler</div>
            <div style={{ fontSize: 10, color: T.textDim }}>Censure les dossiers</div>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={onSpoilerToggle}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 40, height: 22, borderRadius: 100, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: spoilerSafe ? T.red : 'rgba(255,255,255,0.12)',
            position: 'relative', transition: 'background .2s',
          }}
        >
          <motion.span
            animate={{ x: spoilerSafe ? 19 : 2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            style={{ position: 'absolute', top: 3, left: 0, width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'block' }}
          />
        </motion.button>
      </div>
    </aside>
  )
}

// ─── Archive Hero + Tabs ─────────────────────────────────────────────────────
export function ArchiveHero({ anime, activeTab, tabs, onTabChange, onClose, entryCount = 0, favoritesCount = 0, classifiedCount = 0, legendaryCount = 0 }) {
  const accent = anime?.theme?.accent || T.red

  return (
    <div className="arc-hero" style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 24px' }}>
      {/* Watermark */}
      <div className="arc-hero-watermark" style={{ color: hexToRgba(accent, 0.04), fontWeight: 900, userSelect: 'none' }}>{anime.name}</div>

      {/* Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0 10px' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.20em', color: T.red, textTransform: 'uppercase', marginBottom: 3 }}>
            ⛨ Gouvernement Mondial · Archives Restreintes
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--display, serif)', fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 900, color: T.text, letterSpacing: '-.01em', lineHeight: 1 }}>
            {anime.name}
          </h1>
        </div>

        {/* Vline */}
        <div style={{ width: 1, height: 40, background: T.border2, margin: '0 8px' }} />

        {/* Stats chips — hero display */}
        {[
          { val: entryCount,     label: 'Dossiers',     color: T.text    },
          { val: legendaryCount, label: 'Légendaires',  color: T.gold    },
          { val: classifiedCount,label: 'Classifiés',   color: T.red     },
          { val: favoritesCount, label: 'Favoris',      color: T.orange  },
        ].map(s => (
          <motion.div
            key={s.label}
            whileHover={{ scale: 1.05 }}
            style={{ textAlign: 'center', padding: '6px 14px' }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: 'var(--display, serif)' }}>{s.val}</div>
            <div style={{ fontSize: 9, fontWeight: 800, color: T.textDim, letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
          </motion.div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }} role="tablist">
          {tabs.map(tab => {
            const active = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  border: `1px solid ${active ? hexToRgba(accent, 0.45) : T.border}`,
                  background: active ? hexToRgba(accent, 0.14) : 'transparent',
                  color: active ? accent : T.textDim,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  boxShadow: active ? `0 0 16px ${hexToRgba(accent, 0.20)}` : 'none',
                  transition: 'color .15s, background .15s',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </motion.button>
            )
          })}
        </div>

        <motion.button
          type="button" onClick={onClose}
          whileHover={{ scale: 1.1, color: T.red }} whileTap={{ scale: 0.9 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, marginLeft: 8 }}
        >
          <X size={18} />
        </motion.button>
      </div>
    </div>
  )
}

// ─── Archive Register ────────────────────────────────────────────────────────
export function ArchiveRegister({
  entries, selectedEntry, onSelectEntry,
  favorites, onToggleFavorite,
  spoilerSafe, revealed, onReveal,
  onTagClick, activeTag, onClearTag,
}) {
  return (
    <div className="arc-fiches-layout">
      {/* LEFT: file register */}
      <div className="arc-register" style={{ background: T.bg }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: `1px solid ${T.border}`,
          background: T.surface,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e88', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: T.text, letterSpacing: '.06em' }}>Registre d'Archives Actif</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AnimatePresence>
              {activeTag && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  type="button" onClick={onClearTag}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, border: `1px solid ${T.orange}55`, background: hexToRgba(T.orange, 0.10), color: T.orange, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Tag size={10} /> {activeTag} <X size={10} />
                </motion.button>
              )}
            </AnimatePresence>
            <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600 }}>{entries.length} dossier{entries.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        {!entries.length ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textDim }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
            <strong style={{ display: 'block', color: T.textMid, marginBottom: 6 }}>Aucun dossier trouvé</strong>
            <span style={{ fontSize: 12 }}>Modifiez les filtres ou la recherche.</span>
          </div>
        ) : (
          <motion.div
            className="arc-rows-list"
            variants={{ visible: { transition: { staggerChildren: 0.035 } } }}
            initial="hidden"
            animate="visible"
          >
            {entries.map((entry, i) => (
              <ArchiveRow
                key={entry.id}
                entry={entry}
                index={i}
                isActive={selectedEntry?.id === entry.id}
                isFavorite={favorites.includes(entry.slug)}
                spoilerSafe={spoilerSafe}
                revealed={revealed}
                onSelect={onSelectEntry}
                onToggleFavorite={onToggleFavorite}
                onTagClick={onTagClick}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* RIGHT: inspection panel */}
      <div className="arc-inspection" style={{ background: T.bg, borderLeft: `1px solid ${T.border}` }}>
        <AnimatePresence mode="wait">
          {!selectedEntry ? (
            <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
              <DefaultInspectionPanel entries={entries} />
            </motion.div>
          ) : (
            <motion.div key={selectedEntry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%' }}>
              <ArchiveInspection
                entry={selectedEntry}
                index={entries.indexOf(selectedEntry)}
                isFavorite={favorites.includes(selectedEntry.slug)}
                spoilerSafe={spoilerSafe}
                revealed={revealed}
                onReveal={onReveal}
                onToggleFavorite={onToggleFavorite}
                onTagClick={onTagClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Archive Row ─────────────────────────────────────────────────────────────
function ArchiveRow({ entry, index, isActive, isFavorite, spoilerSafe, revealed, onSelect, onToggleFavorite }) {
  const cfg = rarityConfig[entry.rarity] || rarityConfig.common
  const hidden = isSpoilerHiddenArc(entry, spoilerSafe, revealed)
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -12 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
      }}
      whileHover={{ x: 3 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onSelect(entry)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(entry) }}
      aria-label={hidden ? 'Dossier classifié' : `Ouvrir dossier ${entry.name}`}
      style={{
        position: 'relative', cursor: 'pointer',
        display: 'grid', gridTemplateColumns: '52px 1fr auto 36px',
        alignItems: 'center', gap: 0,
        padding: '0 18px',
        minHeight: 66,
        background: isActive
          ? `linear-gradient(90deg, ${hexToRgba(cfg.accent, 0.10)}, ${hexToRgba(cfg.accent, 0.04)})`
          : hovered
          ? `linear-gradient(90deg, rgba(255,255,255,0.025), transparent)`
          : 'transparent',
        borderBottom: `1px solid ${T.border}`,
        transition: 'background .18s',
        boxShadow: isActive ? `inset 3px 0 0 ${cfg.accent}` : hovered ? `inset 2px 0 0 ${hexToRgba(cfg.accent, 0.5)}` : 'none',
      }}
    >
      {/* Particles on classified hover */}
      {hidden && hovered && <ClassifiedParticles />}

      {/* Ref + icon */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>{fmtId(index)}</span>
        {!hidden && (
          <span style={{ fontSize: 13 }}>{CATEGORY_ICONS[entry.category] || '·'}</span>
        )}
      </div>

      {/* Name / classified */}
      <div style={{ padding: '0 10px', overflow: 'hidden' }}>
        {hidden ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <motion.div
                animate={hovered ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.7 }}
                transition={{ duration: 0.8, repeat: hovered ? Infinity : 0 }}
                style={{
                  fontSize: 12, fontWeight: 800, letterSpacing: '.10em',
                  color: T.red, fontFamily: 'monospace',
                  textShadow: `0 0 10px ${T.red}88`,
                }}
              >
                ██████████ CLASSIFIÉ ██████████
              </motion.div>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(201,31,46,0.55)', letterSpacing: '.08em', fontWeight: 600 }}>
              ACCÈS RESTREINT — GOUVERNEMENT MONDIAL
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</div>
            <div style={{ fontSize: 11, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.subtitle || entry.category}
              {entry.knownUser ? ` · ${entry.knownUser}` : ''}
            </div>
          </>
        )}
      </div>

      {/* Rarity badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <motion.div
          whileHover={{ scale: 1.06 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 100,
            background: `linear-gradient(135deg, ${hexToRgba(cfg.accent, 0.16)}, ${hexToRgba(cfg.accent, 0.06)})`,
            border: `1px solid ${hexToRgba(cfg.accent, 0.38)}`,
            color: cfg.accent, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
            boxShadow: isActive || hovered ? `0 0 14px ${hexToRgba(cfg.accent, 0.28)}` : 'none',
            transition: 'box-shadow .2s',
          }}
        >
          <span>{cfg.icon}</span>
          <span>{rarityLabels[entry.rarity] || entry.rarity}</span>
        </motion.div>
      </div>

      {/* Fav button */}
      <motion.button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleFavorite(entry.slug) }}
        whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
          color: isFavorite ? '#f43f5e' : T.textDim, fontSize: 14,
          transition: 'color .15s',
        }}
      >
        <Heart size={14} fill={isFavorite ? '#f43f5e' : 'none'} />
      </motion.button>
    </motion.div>
  )
}

// ─── Default Inspection Panel ─────────────────────────────────────────────────
function DefaultInspectionPanel({ entries }) {
  const featured = entries.find(e =>
    !e.isMajorSpoiler && !isSpoilerHiddenArc(e, true, []) &&
    (e.rarity === 'legendary' || e.rarity === 'mythic')
  ) || entries.find(e => !e.isMajorSpoiler) || entries[0]

  if (!featured) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>☠</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textMid }}>Archives Confidentielles</div>
        <div style={{ fontSize: 12, color: T.textDim, marginTop: 6 }}>Aucun dossier disponible.</div>
      </div>
    )
  }

  const cfg = rarityConfig[featured.rarity] || rarityConfig.common
  const statEntries = Object.entries(featured.stats || {}).slice(0, 5)

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* Sticky classified stamp header */}
      <div style={{
        flexShrink: 0, padding: '14px 20px 12px',
        background: `linear-gradient(160deg, ${hexToRgba(cfg.accent, 0.16)}, ${hexToRgba(cfg.accent, 0.05)}, transparent)`,
        borderBottom: `1px solid ${hexToRgba(cfg.accent, 0.18)}`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Watermark */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-20deg)',
          fontSize: 72, fontWeight: 900, color: hexToRgba(cfg.accent, 0.05),
          fontFamily: 'serif', userSelect: 'none', whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: '.08em',
        }}>CLASSIFIÉ</div>

        {/* Animated scanner line */}
        <motion.div
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${hexToRgba(cfg.accent, 0.55)}, transparent)`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, boxShadow: `0 0 8px ${T.red}` }}
            />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: T.red, textTransform: 'uppercase' }}>
              Gouvernement Mondial · Division Renseignement
            </span>
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, color: T.textDim, letterSpacing: '.12em' }}>
            ACCÈS NIV.5
          </span>
        </div>

        {/* Featured entry identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.div
            animate={{ boxShadow: [`0 0 18px ${hexToRgba(cfg.accent, 0.25)}`, `0 0 36px ${hexToRgba(cfg.accent, 0.50)}`, `0 0 18px ${hexToRgba(cfg.accent, 0.25)}`] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              flexShrink: 0, width: 64, height: 64, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `radial-gradient(circle at 35% 35%, ${hexToRgba(cfg.accent, 0.30)}, ${hexToRgba(cfg.accent, 0.08)})`,
              border: `2px solid ${hexToRgba(cfg.accent, 0.50)}`,
              fontSize: 30,
            }}
          >
            {cfg.icon}
          </motion.div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.20em', color: T.textDim, textTransform: 'uppercase', marginBottom: 4 }}>
              Dossier prioritaire
            </div>
            <div style={{ fontSize: 17, fontWeight: 900, color: T.text, lineHeight: 1.2, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {featured.name}
            </div>
            <RarityBadge rarity={featured.rarity} size="sm" />
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        {/* Stats */}
        {statEntries.length > 0 && (
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: T.textDim, textTransform: 'uppercase' }}>
              <Zap size={11} color={T.orange} /> Indices de capacité
            </div>
            {statEntries.map(([key, val], i) => (
              <StatBar key={key} label={statLabel(key)} value={val} color={cfg.accent} index={i} />
            ))}
          </div>
        )}

        {featured.description && (
          <div style={{ padding: '12px 20px', fontSize: 12, color: T.textDim, lineHeight: 1.70, borderTop: `1px solid ${T.border}` }}>
            {featured.description.slice(0, 200)}…
          </div>
        )}

        {featured.subtitle && !featured.description && (
          <div style={{ padding: '12px 20px', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>
            {featured.subtitle}
          </div>
        )}

        {/* CTA */}
        <div style={{
          margin: '12px 20px 20px',
          padding: '14px 16px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.02)',
          border: `1px dashed rgba(255,255,255,0.09)`,
          textAlign: 'center',
        }}>
          <ChevronRight size={16} style={{ color: T.textDim, marginBottom: 6, display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, marginBottom: 3 }}>Sélectionner un dossier</div>
          <div style={{ fontSize: 10, color: T.textDim }}>Cliquez sur une ligne pour consulter l'archive complète</div>
        </div>
      </div>
    </div>
  )
}

// ─── Archive Inspection Panel ─────────────────────────────────────────────────
function ArchiveInspection({ entry, index, isFavorite, spoilerSafe, revealed, onReveal, onToggleFavorite, onTagClick }) {
  const cfg = rarityConfig[entry.rarity] || rarityConfig.common
  const hidden = isSpoilerHiddenArc(entry, spoilerSafe, revealed)
  const catIcon = CATEGORY_ICONS[entry.category] || '·'

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '22px 20px 20px',
        background: `linear-gradient(155deg, ${hexToRgba(cfg.accent, 0.20)}, ${hexToRgba(cfg.accent, 0.06)}, transparent 70%)`,
        borderBottom: `1px solid ${hexToRgba(cfg.accent, 0.22)}`,
        flexShrink: 0,
      }}>
        {/* Scanline */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)', pointerEvents: 'none' }} />

        {/* Gov row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Shield size={12} color={T.red} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', color: T.textDim, textTransform: 'uppercase' }}>
              Gouvernement Mondial · Naval
            </span>
          </div>
          <RarityBadge rarity={entry.rarity} />
        </div>

        {/* Central icon */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 90, height: 90, borderRadius: '50%', position: 'relative',
              background: `radial-gradient(circle at 35% 35%, ${hexToRgba(cfg.accent, 0.30)}, ${hexToRgba(cfg.accent, 0.08)})`,
              border: `2px solid ${hexToRgba(cfg.accent, 0.50)}`,
              boxShadow: `0 0 40px ${hexToRgba(cfg.accent, 0.35)}, inset 0 0 24px ${hexToRgba(cfg.accent, 0.12)}`,
              fontSize: 42,
            }}
          >
            {cfg.icon}
            <span style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 16 }}>{catIcon}</span>
          </motion.div>
        </div>

        {/* Name block */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: T.textDim, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
            {fmtId(index >= 0 ? index : 0)} · {(entry.category || '').replace(/-/g, ' ').toUpperCase()}
          </div>
          <h2 style={{ margin: '0 0 6px', fontFamily: 'var(--display, serif)', fontSize: 'clamp(16px,2vw,22px)', fontWeight: 900, color: hidden ? 'transparent' : T.text, lineHeight: 1.15, textShadow: hidden ? 'none' : `0 0 30px ${hexToRgba(cfg.accent, 0.25)}` }}>
            {hidden ? <span style={{ background: T.red, borderRadius: 4, display: 'inline-block', width: '70%', height: '1.1em' }} /> : entry.name}
          </h2>
          {entry.subtitle && !hidden && <div style={{ fontSize: 12, color: T.textDim }}>{entry.subtitle}</div>}
          {entry.knownUser && !hidden && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8, fontSize: 12, color: T.textMid }}>
              <Eye size={12} color={cfg.accent} /> {entry.knownUser}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {hidden ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
          {/* Animated scanner */}
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ fontSize: 36, marginBottom: 16 }}
          >🔒</motion.div>

          <div style={{ fontSize: 14, fontWeight: 800, color: T.red, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            ACCÈS RESTREINT
          </div>
          <div style={{ fontSize: 12, color: T.textDim, marginBottom: 24, lineHeight: 1.6 }}>
            Archive classifiée — Spoiler majeur détecté.<br />Autorisation requise.
          </div>

          {/* Redacted bars */}
          <div style={{ width: '100%', marginBottom: 24 }}>
            {[100, 75, 88, 60, 92].map((w, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity }}
                style={{ height: 10, borderRadius: 4, background: `linear-gradient(90deg, ${T.red}, rgba(201,31,46,0.3))`, width: `${w}%`, marginBottom: 8 }}
              />
            ))}
          </div>

          <motion.button
            type="button" onClick={() => onReveal(entry.id)}
            whileHover={{ scale: 1.04, boxShadow: `0 0 24px ${T.redSoft}` }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '12px 28px', borderRadius: 10, border: `1px solid ${hexToRgba(T.red, 0.45)}`,
              background: T.redSoft, color: T.red, fontSize: 13, fontWeight: 800,
              cursor: 'pointer', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <EyeOff size={14} /> Déclassifier le dossier
          </motion.button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px 16px 20px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

          {/* Description */}
          {entry.description && (
            <Section icon={<BookOpen size={13} />} title="Rapport de situation">
              <p style={{ margin: 0, fontSize: 13, color: T.textMid, lineHeight: 1.70 }}>{entry.description}</p>
            </Section>
          )}

          {/* Stats */}
          {!!Object.keys(entry.stats || {}).length && (
            <Section icon={<Zap size={13} color={T.orange} />} title="Indices de capacité">
              {Object.entries(entry.stats).map(([key, value], i) => (
                <StatBar key={key} label={statLabel(key)} value={value} color={cfg.accent} index={i} />
              ))}
            </Section>
          )}

          {/* Strengths / Weaknesses */}
          {entry.strengths && (
            <Section icon={<Swords size={13} />} title="Analyse tactique">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.20)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#22c55e', letterSpacing: '.10em', marginBottom: 8 }}>⊕ FORCES</div>
                  <ul style={{ margin: 0, padding: '0 0 0 14px', listStyle: 'disc' }}>
                    {(entry.strengths || []).map(s => <li key={s} style={{ fontSize: 11, color: T.textMid, marginBottom: 4, lineHeight: 1.5 }}>{s}</li>)}
                  </ul>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', letterSpacing: '.10em', marginBottom: 8 }}>⊖ FAIBLESSES</div>
                  <ul style={{ margin: 0, padding: '0 0 0 14px', listStyle: 'disc' }}>
                    {(entry.weaknesses || []).map(w => <li key={w} style={{ fontSize: 11, color: T.textMid, marginBottom: 4, lineHeight: 1.5 }}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </Section>
          )}

          {/* Awakening */}
          {entry.awakening && (
            <Section icon={<Star size={13} color={T.gold} />} title="Éveil · Classification spéciale">
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: hexToRgba(T.gold, 0.07), border: `1px solid ${hexToRgba(T.gold, 0.22)}`,
                fontSize: 12, color: T.textMid, lineHeight: 1.65,
              }}>
                {entry.awakening}
              </div>
            </Section>
          )}

          {/* Tags */}
          {!!(entry.tags || []).length && (
            <Section icon={<Tag size={13} />} title="Mots-clés d'archive">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(entry.tags || []).map(tag => (
                  <motion.span
                    key={tag}
                    whileHover={{ scale: 1.06 }}
                    onClick={() => onTagClick?.(tag)}
                    role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') onTagClick?.(tag) }}
                    style={{
                      padding: '4px 12px', borderRadius: 100, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`,
                      fontSize: 11, color: T.textMid, fontWeight: 600,
                      transition: 'background .14s, border-color .14s',
                    }}
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '12px 20px', borderTop: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: T.surface, flexShrink: 0,
      }}>
        <motion.button
          type="button"
          onClick={() => onToggleFavorite(entry.slug)}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 8,
            border: `1px solid ${isFavorite ? 'rgba(244,63,94,0.40)' : T.border}`,
            background: isFavorite ? 'rgba(244,63,94,0.10)' : 'rgba(255,255,255,0.04)',
            color: isFavorite ? '#f43f5e' : T.textDim,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
          }}
        >
          <Heart size={13} fill={isFavorite ? '#f43f5e' : 'none'} />
          {isFavorite ? 'Favori' : 'Ajouter'}
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>{fmtId(index >= 0 ? index : 0)}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.accent }}>{rarityLabels[entry.rarity]}</span>
        </div>
      </div>
    </div>
  )
}

// Section wrapper
function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
        <span style={{ color: T.textDim }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: T.textDim, textTransform: 'uppercase' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Exportés mais moins utilisés ────────────────────────────────────────────
export const rarityColors = {
  common: '#a8b0bd', rare: '#4ea8ff', epic: '#a855f7',
  legendary: '#f8c14a', mythic: '#d8a7ff', secret: '#c94bff', forbidden: '#ff3d4d',
}

export function EntryDetailPanel({ entry, onClose }) {
  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '90vw', maxWidth: 480, background: T.surface, zIndex: 9999, borderLeft: `1px solid ${T.border}`, overflowY: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
        <motion.button type="button" onClick={onClose} whileHover={{ scale: 1.1 }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim }}>
          <X size={20} />
        </motion.button>
      </div>
      <ArchiveInspection entry={entry} index={-1} isFavorite={false} spoilerSafe={false} revealed={[]} onReveal={() => {}} onToggleFavorite={() => {}} onTagClick={() => {}} />
    </motion.div>
  )
}

export function Sidebar({ animes, activeId, entriesByAnime, query, onQueryChange, spoilerSafe, onSpoilerToggle, onSelect, onClose }) {
  return (
    <aside className="enc-sidebar" style={{ background: T.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
        <strong style={{ color: T.red }}>☠ Archives</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim }}><X size={16} /></button>
      </div>
      <nav style={{ padding: '8px' }}>
        {animes.map((anime, i) => {
          const active = anime.id === activeId
          const accent = anime.theme?.accent || '#fff'
          return (
            <motion.button key={anime.id} type="button" onClick={() => onSelect(anime.id)} whileHover={{ x: 3 }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', background: active ? hexToRgba(accent, 0.10) : 'transparent', color: active ? accent : T.textMid, fontSize: 13, fontWeight: active ? 700 : 500, marginBottom: 2 }}
            >
              <span>{anime.emoji || anime.shortName}</span>
              <span style={{ flex: 1 }}>{anime.name}</span>
              <span style={{ fontSize: 10, color: T.textDim }}>{entriesByAnime[anime.id] || 0}</span>
            </motion.button>
          )
        })}
      </nav>
    </aside>
  )
}

export function MainTopbar({ anime, activeTab, tabs, onTabChange, onClose }) {
  const accent = anime?.theme?.accent || T.red
  return (
    <header className="enc-main-topbar" style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 12, color: T.textDim }}>Archives · <strong style={{ color: T.text }}>{anime.name}</strong></div>
      <div style={{ display: 'flex', gap: 4 }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <motion.button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} whileHover={{ scale: 1.03 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${active ? hexToRgba(accent, 0.40) : T.border}`, background: active ? hexToRgba(accent, 0.12) : 'transparent', color: active ? accent : T.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
            </motion.button>
          )
        })}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim }}><X size={16} /></button>
    </header>
  )
}

export function AnimeHeroStrip({ anime }) {
  return <div className="enc-hero-strip" />
}

export function TimelineTab({ items, spoilerSafe, revealed, onReveal }) {
  return (
    <div>
      {items.map((item, i) => {
        const hidden = isSpoilerHidden(item, spoilerSafe, revealed)
        return (
          <motion.div key={item.id || i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-start' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ padding: '4px 10px', borderRadius: 6, background: T.redSoft, border: `1px solid ${hexToRgba(T.red, 0.35)}`, fontSize: 10, fontWeight: 800, color: T.red, letterSpacing: '.10em', marginBottom: 8 }}>ARCHIVE</div>
              <div style={{ width: 1, flex: 1, background: T.border2, minHeight: 40 }} />
            </div>
            <div style={{ flex: 1, padding: '14px 18px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}` }}>
              {hidden ? (
                <div style={{ color: T.textDim, fontSize: 12 }}>████ CLASSIFIÉ ████</div>
              ) : (
                <>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 6 }}>{item.title || item.name}</div>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>{item.description || item.summary}</p>
                  {item.arc && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 100, background: T.surface2, border: `1px solid ${T.border}`, color: T.textDim }}>{item.arc}</span>}
                </>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function isSpoilerHidden(item, spoilerSafe, revealed = []) {
  return spoilerSafe && (item.isMajorSpoiler || item.spoilerLevel >= 4 || item.badge === 'Spoiler') && !revealed.includes(item.id)
}

export function SecretFilesTab({ files, spoilerSafe, revealed, onReveal }) {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.20em', color: T.red, textTransform: 'uppercase', marginBottom: 8 }}>Brams Archives</div>
        <h2 style={{ margin: '0 0 6px', fontFamily: 'var(--display,serif)', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 900, color: T.text }}>Archives Classifiées</h2>
        <p style={{ margin: 0, fontSize: 13, color: T.textDim }}>Dossiers sensibles protégés par le mode spoiler.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        {files.map((file, i) => {
          const hidden = isSpoilerHidden(file, spoilerSafe, revealed)
          const isInterdit = file.badge === 'Interdit'
          const badgeColor = isInterdit ? T.red : '#7c3aed'
          return (
            <motion.div key={file.id || i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2, boxShadow: `0 8px 30px ${hexToRgba(badgeColor, 0.22)}` }}
              style={{ borderRadius: 14, border: `1px solid ${hexToRgba(badgeColor, 0.28)}`, background: hexToRgba(badgeColor, 0.06), padding: '18px', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 100, background: hexToRgba(badgeColor, 0.18), border: `1px solid ${hexToRgba(badgeColor, 0.40)}`, color: badgeColor, letterSpacing: '.10em' }}>
                  {file.badge || 'SECRET'}
                </span>
                <span style={{ fontSize: 10, color: T.textDim, fontWeight: 700, letterSpacing: '.10em' }}>CLASSIFIÉ</span>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800, color: T.text }}>{hidden ? 'Dossier Protégé' : file.title}</h3>
              {!hidden && file.description && <p style={{ margin: '0 0 14px', fontSize: 12, color: T.textDim, lineHeight: 1.65 }}>{file.description}</p>}
              {hidden && <div style={{ height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${badgeColor}, transparent)`, marginBottom: 14 }} />}
              {hidden ? (
                <>
                  <div style={{ fontSize: 10, padding: '3px 10px', display: 'inline-block', borderRadius: 100, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, color: T.textDim, marginBottom: 12 }}>archive interdite</div>
                  <motion.button type="button" onClick={() => onReveal(file.id)}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    style={{ display: 'block', padding: '8px 18px', borderRadius: 8, border: `1px solid ${hexToRgba(badgeColor, 0.40)}`, background: hexToRgba(badgeColor, 0.12), color: badgeColor, fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '.06em' }}
                  >
                    RÉVÉLER
                  </motion.button>
                </>
              ) : (
                <div style={{ fontSize: 10, padding: '3px 10px', display: 'inline-block', borderRadius: 100, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, color: T.textDim }}>
                  {file.arc || 'archive déclassifiée'}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export function ToolsTab({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {children}
    </div>
  )
}
