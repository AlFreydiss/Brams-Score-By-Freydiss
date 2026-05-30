import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Tag, Search, X } from 'lucide-react'
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

// ─── Universe Rail ───────────────────────────────────────────────────────────
// Recâblé sur le design system CSS (.arc-rail-*) : accent par univers piloté par
// la variable --anime-accent ; hover/active/soulignement gérés en CSS.
export function UniverseRail({ animes, activeId, entriesByAnime, onSelect, onClose }) {
  return (
    <nav className="arc-rail" aria-label="Sélection univers">
      <div className="arc-rail-brand">
        <span className="arc-rail-brand-skull">☠</span>
        <span className="arc-rail-name">BRAMS ARCHIVES</span>
        <span className="arc-rail-brand-sep">·</span>
        <span className="arc-rail-brand-sub">CLASSIFIÉ</span>
      </div>
      <div className="arc-rail-universes">
        {animes.map(anime => {
          const active = anime.id === activeId
          const accent = anime.theme?.accent || '#fff'
          return (
            <button
              key={anime.id}
              type="button"
              onClick={() => onSelect(anime.id)}
              className={`arc-rail-btn${active ? ' is-active' : ''}`}
              style={{ '--anime-accent': accent }}
            >
              <span className="arc-rail-emoji">{anime.emoji || '·'}</span>
              <span>{anime.shortName || anime.name.split(' ')[0].toUpperCase()}</span>
              <span className="arc-rail-count">{entriesByAnime[anime.id] || 0}</span>
            </button>
          )
        })}
      </div>
      <button className="arc-rail-close" type="button" onClick={onClose}>
        <X size={13} />
        <span>Fermer</span>
      </button>
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
  void secretCount

  return (
    <aside className="arc-panel">
      {/* Bloc de classification */}
      <div className="arc-classification">
        <div className="arc-clearance-badge"><span className="arc-clearance-dot" /> Niveau 5 — Restreint</div>
        <h2 className="arc-anime-title">{anime.name}</h2>
        {anime.description && (
          <p className="arc-anime-tagline">{anime.description.slice(0, 120)}</p>
        )}
      </div>

      {/* Recherche */}
      <div className="arc-panel-search">
        <div className="arc-search-wrap">
          <Search className="arc-search-icon" size={13} />
          <input
            className="arc-search-input"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Interroger les archives…"
          />
        </div>
      </div>

      {/* Registre de dossiers */}
      <div className="arc-panel-label">Registre de dossiers</div>
      <nav className="arc-folder-nav">
        {[{ id: 'all', label: 'Tout consulter', icon: '📁', count: allCount }, ...visible.map(c => ({ ...c, count: categoryCounts[c.id] || 0, icon: CATEGORY_ICONS[c.id] || '·' }))].map(cat => {
          const active = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`arc-folder-btn${active ? ' is-active' : ''}`}
            >
              <span className="arc-folder-marker" />
              <span style={{ fontSize: 14 }}>{cat.icon}</span>
              <span className="arc-folder-name">{cat.label}</span>
              <span className="arc-folder-count">{cat.count}</span>
            </button>
          )
        })}
      </nav>

      {/* Mode spoiler */}
      <div className="arc-spoiler-block">
        <div className="arc-spoiler-info">
          <span className="arc-spoiler-label">Mode Spoiler</span>
          <span className="arc-spoiler-desc">Censure les dossiers sensibles</span>
        </div>
        <button
          type="button"
          onClick={onSpoilerToggle}
          className={`arc-spoiler-switch${spoilerSafe ? ' is-on' : ''}`}
          aria-pressed={spoilerSafe}
          aria-label="Basculer le mode spoiler"
        >
          <span />
        </button>
      </div>
    </aside>
  )
}

// ─── Archive Hero + Tabs ─────────────────────────────────────────────────────
export function ArchiveHero({ anime, activeTab, tabs, onTabChange, onClose, entryCount = 0, favoritesCount = 0, classifiedCount = 0, legendaryCount = 0 }) {
  return (
    <div className="arc-hero">
      <div className="arc-hero-scanline" aria-hidden />
      <div className="arc-hero-watermark" aria-hidden>{anime.name}</div>

      {/* Identité */}
      <div className="arc-hero-identity">
        <span className="arc-hero-badge">⛨ Gouvernement Mondial</span>
        <span className="arc-hero-pre">Archives Restreintes</span>
        <h1 className="arc-hero-title">{anime.name}</h1>
      </div>

      <div className="arc-hero-vline" aria-hidden />

      {/* Stats */}
      <div className="arc-hero-chips">
        <div className="arc-hero-chip"><strong>{entryCount}</strong><span>Dossiers</span></div>
        <div className="arc-hero-chip arc-hero-chip--gold"><strong>{legendaryCount}</strong><span>Légendaires</span></div>
        <div className="arc-hero-chip arc-hero-chip--red"><strong>{classifiedCount}</strong><span>Classifiés</span></div>
        <div className="arc-hero-chip arc-hero-chip--fav"><strong>{favoritesCount}</strong><span>Favoris</span></div>
      </div>

      {/* Onglets */}
      <div className="arc-hero-tabs" role="tablist">
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`arc-tab-btn${active ? ' is-active' : ''}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <button className="arc-hero-close" type="button" onClick={onClose} aria-label="Fermer les archives">
        <X size={16} />
      </button>
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
      <div className="arc-register">
        {/* En-tête réduit : visible uniquement quand un filtre par tag est actif. */}
        <AnimatePresence>
          {activeTag && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}
            >
              <button className="arc-active-tag" type="button" onClick={onClearTag}>
                <Tag size={10} /> {activeTag} <X size={10} />
              </button>
              <span className="arc-register-count">{entries.length} dossier{entries.length > 1 ? 's' : ''}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!entries.length ? (
          <div className="arc-register-empty">
            <div className="arc-register-empty-icon">🔐</div>
            <strong>Aucun dossier trouvé</strong>
            <span>Modifiez les filtres ou la recherche.</span>
          </div>
        ) : (
          <div className="arc-rows-list">
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
          </div>
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
// Recâblé sur .arc-row : couleur de rareté pilotée par --rarity-color/--rarity-glow,
// hover/active gérés en CSS (la couche override v2 aplatit la ligne).
function ArchiveRow({ entry, index, isActive, isFavorite, spoilerSafe, revealed, onSelect, onToggleFavorite }) {
  const cfg = rarityConfig[entry.rarity] || rarityConfig.common
  const hidden = isSpoilerHiddenArc(entry, spoilerSafe, revealed)

  return (
    <div
      className={`arc-row${isActive ? ' is-active' : ''}${hidden ? ' is-classified' : ''}`}
      style={{ '--rarity-color': cfg.accent, '--rarity-glow': hexToRgba(cfg.accent, 0.5) }}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(entry) }}
      aria-label={hidden ? 'Dossier classifié' : `Ouvrir dossier ${entry.name}`}
    >
      <span className="arc-row-bar" aria-hidden />

      {/* Référence + icône catégorie */}
      <div className="arc-row-id">
        <span className="arc-row-num">{fmtId(index)}</span>
        {!hidden && <span className="arc-row-cat-icon">{CATEGORY_ICONS[entry.category] || '·'}</span>}
      </div>

      {/* Nom / classifié */}
      <div className="arc-row-info">
        {hidden ? (
          <>
            <span className="arc-row-classified-name">██████ CLASSIFIÉ ██████</span>
            <span className="arc-row-classified-sub">Accès restreint — Gouvernement Mondial</span>
          </>
        ) : (
          <>
            <span className="arc-row-name">{entry.name}</span>
            <span className="arc-row-sub">
              {entry.subtitle || entry.category}{entry.knownUser ? ` · ${entry.knownUser}` : ''}
            </span>
          </>
        )}
      </div>

      {/* Rareté */}
      <div className="arc-row-rarity">
        <span className="arc-row-rarity-icon">{cfg.icon}</span>
        <span className="arc-row-rarity-label">{rarityLabels[entry.rarity] || entry.rarity}</span>
      </div>

      {/* Favori */}
      <button
        className={`arc-row-fav${isFavorite ? ' is-active' : ''}`}
        type="button"
        onClick={e => { e.stopPropagation(); onToggleFavorite(entry.slug) }}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
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
      <div className="arc-inspection-empty">
        <div className="arc-inspection-emblem">☠</div>
        <div className="arc-inspection-prompt">Archives Confidentielles</div>
        <div className="arc-inspection-hint">Aucun dossier disponible.</div>
      </div>
    )
  }

  const cfg = rarityConfig[featured.rarity] || rarityConfig.common
  const statEntries = Object.entries(featured.stats || {}).slice(0, 5)
  const rarityVars = { '--rarity-color': cfg.accent, '--rarity-glow': hexToRgba(cfg.accent, 0.5) }

  return (
    <div className="arc-insp-default" style={rarityVars}>
      <div className="arc-insp-default-wm" aria-hidden>CLASSIFIÉ</div>

      {/* Tampon prioritaire */}
      <div className="arc-insp-default-stamp">
        <span className="arc-insp-default-org">Gouvernement Mondial · Division Renseignement</span>
        <span className="arc-insp-default-title-stamp">Dossier Prioritaire</span>
        <span className="arc-insp-default-access">Accès Niv.5</span>
      </div>

      {/* Identité du dossier vedette */}
      <div className="arc-insp-default-hero">
        <span className="arc-insp-default-icon">{cfg.icon}</span>
        <div className="arc-insp-default-name">{featured.name}</div>
        <span className="arc-insp-default-sub">{rarityLabels[featured.rarity] || featured.rarity}</span>
      </div>

      {/* Stats */}
      {statEntries.length > 0 && (
        <div className="arc-insp-default-stats">
          {statEntries.map(([key, val]) => {
            const pct = Math.max(0, Math.min(100, Number(val) || 0))
            return (
              <div className="arc-insp-default-stat" key={key}>
                <span>{statLabel(key)}</span>
                <div className="arc-insp-default-stat-bar"><div style={{ width: `${pct}%` }} /></div>
                <span>{val}</span>
              </div>
            )
          })}
        </div>
      )}

      {(featured.description || featured.subtitle) && (
        <p className="arc-insp-default-desc">
          {featured.description ? `${featured.description.slice(0, 200)}…` : featured.subtitle}
        </p>
      )}

      <div className="arc-insp-default-hint">Sélectionnez un dossier pour consulter l'archive complète</div>
      <div className="arc-insp-default-coords">⌖ Archives Brams · Accès classifié</div>
    </div>
  )
}

// ─── Archive Inspection Panel ─────────────────────────────────────────────────
function ArchiveInspection({ entry, index, isFavorite, spoilerSafe, revealed, onReveal, onToggleFavorite, onTagClick }) {
  const cfg = rarityConfig[entry.rarity] || rarityConfig.common
  const hidden = isSpoilerHiddenArc(entry, spoilerSafe, revealed)
  const rarityVars = { '--rarity-color': cfg.accent, '--rarity-glow': hexToRgba(cfg.accent, 0.5) }

  return (
    <div className="arc-insp-card" style={rarityVars}>
      <div className="arc-insp-card-header">
        <div className="arc-insp-band" aria-hidden />
        <div className="arc-insp-head">
          <div className="arc-insp-meta">
            <span className="arc-insp-file-id">{fmtId(index >= 0 ? index : 0)} · {(entry.category || '').replace(/-/g, ' ').toUpperCase()}</span>
            <RarityBadge rarity={entry.rarity} />
          </div>
          <h2 className="arc-insp-name">{hidden ? '████████' : entry.name}</h2>
          {!hidden && (entry.subtitle || entry.knownUser) && (
            <div className="arc-insp-sub">{entry.subtitle || entry.knownUser}</div>
          )}
        </div>
      </div>

      {hidden ? (
        <div className="arc-insp-classified">
          <div className="arc-insp-class-scan" aria-hidden />
          <div className="arc-insp-class-icon">🔒</div>
          <div className="arc-insp-class-stamp">Accès Restreint</div>
          <div className="arc-insp-class-hint">Archive classifiée — spoiler majeur détecté. Autorisation requise.</div>
          <button className="arc-insp-reveal-btn" type="button" onClick={() => onReveal(entry.id)}>
            Déclassifier le dossier
          </button>
        </div>
      ) : (
        <div className="arc-insp-body">
          {/* Rapport */}
          {entry.description && (
            <div className="arc-insp-section">
              <div className="arc-insp-section-title">Rapport de situation</div>
              <p className="arc-insp-desc">{entry.description}</p>
            </div>
          )}

          {/* Stats */}
          {!!Object.keys(entry.stats || {}).length && (
            <div className="arc-insp-section">
              <div className="arc-insp-section-title">Indices de capacité</div>
              <div className="arc-insp-stats">
                {Object.entries(entry.stats).map(([key, value]) => {
                  const pct = Math.max(0, Math.min(100, Number(value) || 0))
                  return (
                    <div className="arc-insp-stat-row" key={key}>
                      <span className="arc-insp-stat-label">{statLabel(key)}</span>
                      <div className="arc-insp-stat-bar"><div className="arc-insp-stat-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="arc-insp-stat-val">{value}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Forces / Faiblesses */}
          {entry.strengths && (
            <div className="arc-insp-section">
              <div className="arc-insp-section-title">Analyse tactique</div>
              <div className="arc-insp-cols">
                <div className="arc-insp-col">
                  <div className="arc-insp-col-title" style={{ color: '#34d399' }}>⊕ Forces</div>
                  <ul>{(entry.strengths || []).map(s => <li key={s}>{s}</li>)}</ul>
                </div>
                <div className="arc-insp-col">
                  <div className="arc-insp-col-title" style={{ color: '#f87171' }}>⊖ Faiblesses</div>
                  <ul>{(entry.weaknesses || []).map(w => <li key={w}>{w}</li>)}</ul>
                </div>
              </div>
            </div>
          )}

          {/* Éveil */}
          {entry.awakening && (
            <div className="arc-insp-section">
              <div className="arc-insp-section-title">Éveil · Classification spéciale</div>
              <div className="arc-insp-awakening">{entry.awakening}</div>
            </div>
          )}

          {/* Tags */}
          {!!(entry.tags || []).length && (
            <div className="arc-insp-section">
              <div className="arc-insp-section-title">Mots-clés d'archive</div>
              <div className="arc-insp-tags">
                {(entry.tags || []).map(tag => (
                  <span
                    key={tag}
                    className="arc-insp-tag"
                    role="button" tabIndex={0}
                    onClick={() => onTagClick?.(tag)}
                    onKeyDown={e => { if (e.key === 'Enter') onTagClick?.(tag) }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="arc-insp-footer">
        <button
          className={`arc-insp-btn${isFavorite ? ' is-active' : ''}`}
          type="button"
          onClick={() => onToggleFavorite(entry.slug)}
        >
          {isFavorite ? '♥ Favori' : '♡ Ajouter aux favoris'}
        </button>
      </div>
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
