import { useState } from 'react'
import { rarityLabels, rarityConfig } from '../data/rarityStyles'

export const rarityColors = {
  common:    '#a8b0bd',
  rare:      '#4ea8ff',
  epic:      '#a855f7',
  legendary: '#f8c14a',
  mythic:    '#d8a7ff',
  secret:    '#c94bff',
  forbidden: '#ff3d4d',
}

const UNIVERSE_ICONS = {
  'one-piece':             '☠️',
  naruto:                  '🍃',
  'dragon-ball':           '🔮',
  bleach:                  '⚔️',
  'fullmetal-alchemist':   '⚗️',
  'my-hero-academia':      '⚡',
  'the-promised-neverland':'🔑',
  'dr-stone':              '🧪',
}

export function hexToRgba(hex, alpha = 1) {
  const clean = String(hex || '#ffffff').replace('#', '')
  const value = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, 'f').slice(0, 6)
  const n = Number.parseInt(value, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function isSpoilerHidden(item, spoilerSafe, revealed = []) {
  return spoilerSafe && (item.isMajorSpoiler || item.spoilerLevel >= 4 || item.badge === 'Spoiler') && !revealed.includes(item.id)
}

export function RarityBadge({ rarity }) {
  const cfg = rarityConfig[rarity] || rarityConfig.common
  return (
    <span className={`enc-rarity enc-rarity-${rarity}`} style={{ '--rarity-color': cfg.accent }}>
      <span aria-hidden="true">{cfg.icon}</span>
      {rarityLabels[rarity] || rarity}
    </span>
  )
}

export function Sidebar({ animes, activeId, entriesByAnime, query, onQueryChange, spoilerSafe, onSpoilerToggle, onSelect, onClose }) {
  return (
    <aside className="enc-sidebar">
      <div className="enc-sidebar-head">
        <strong>☠ Archives</strong>
        <button className="enc-icon-btn" type="button" onClick={onClose} aria-label="Fermer">✕</button>
      </div>

      <nav className="enc-anime-list" aria-label="Univers anime">
        {animes.map((anime, i) => {
          const active = anime.id === activeId
          const accent = anime.theme?.accent || '#ffffff'
          return (
            <button
              key={anime.id}
              type="button"
              className={`enc-sidebar-item ${active ? 'is-active' : ''}`}
              onClick={() => onSelect(anime.id)}
              style={{ '--anime-accent': accent, '--anime-accent-soft': hexToRgba(accent, 0.1), animationDelay: `${i * 34}ms` }}
            >
              <span className="enc-sidebar-bar" />
              <span className="enc-sidebar-emoji" aria-hidden="true">{anime.emoji || anime.shortName}</span>
              <span className="enc-sidebar-name">{anime.name}</span>
              <span className="enc-sidebar-count">{entriesByAnime[anime.id] || 0}</span>
            </button>
          )
        })}
      </nav>

      <div className="enc-sidebar-tools">
        <label className="enc-search">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={e => onQueryChange(e.target.value)} placeholder="Recherche…" />
        </label>
      </div>

      <div className="enc-spoiler-toggle">
        <div>
          <span className="enc-toggle-label">Mode spoiler</span>
          <span className="enc-toggle-desc">Masque les spoilers majeurs</span>
        </div>
        <button
          className={`enc-toggle-switch ${spoilerSafe ? 'is-on' : ''}`}
          type="button"
          onClick={onSpoilerToggle}
          aria-pressed={spoilerSafe}
          aria-label="Basculer le mode spoiler"
        >
          <span className="enc-toggle-knob" />
        </button>
      </div>
    </aside>
  )
}

export function MainTopbar({ anime, activeTab, tabs, onTabChange, onClose }) {
  return (
    <header className="enc-main-topbar">
      <div className="enc-breadcrumb">
        <span>Archives</span>
        <strong>{anime.name}</strong>
      </div>
      <div className="enc-tabs" role="tablist" aria-label="Sections">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'is-active' : ''}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon && <span className="enc-tab-icon" aria-hidden="true">{tab.icon}</span>}
            {tab.label}
            {activeTab === tab.id && <span className="enc-tab-active-bar" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <button className="enc-icon-btn enc-top-close" type="button" onClick={onClose} aria-label="Fermer">✕</button>
    </header>
  )
}

export function AnimeHeroStrip({ anime, entryCount, secretCount }) {
  const icon = UNIVERSE_ICONS[anime.id] || anime.emoji || anime.shortName || '✦'
  const accent = anime.theme?.accent || '#e0524a'
  const stats = [
    { label: 'Fiches',   value: entryCount },
    { label: 'Stats',    value: anime.stats?.length || 0 },
    { label: 'Archives', value: secretCount },
  ]
  return (
    <section
      className="enc-hero-strip"
      style={{
        '--title-gradient': anime.theme?.titleGradient,
        '--enc-accent': accent,
        '--enc-accent-soft': hexToRgba(accent, 0.16),
        '--enc-card-glow': hexToRgba(accent, 0.22),
      }}
    >
      <div className="enc-hero-copy">
        <div className="enc-hero-emblem" aria-hidden="true">
          {icon}
          <div className="enc-hero-emblem-glow" />
        </div>
        <div>
          <span className="enc-hero-label">{anime.label}</span>
          <h1 className="enc-hero-title">{anime.name}</h1>
          {anime.description && <p className="enc-hero-desc">{anime.description}</p>}
        </div>
      </div>
      <div className="enc-hero-stats">
        {stats.map(stat => (
          <div key={stat.label} className="enc-hero-stat-orb">
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

export function CategoryPills({ categories, active, onChange, counts = {} }) {
  const visible = categories.filter(c => !['world-map', 'coming-soon', 'comparator'].includes(c.id))
  const allCount = counts.all ?? visible.reduce((sum, c) => sum + (counts[c.id] || 0), 0)
  return (
    <div className="enc-category-row" aria-label="Categories">
      <button type="button" className={active === 'all' ? 'is-active' : ''} onClick={() => onChange('all')}>
        <span>Tout</span>
        <span className="enc-pill-count">{allCount}</span>
      </button>
      {visible.map(cat => (
        <button key={cat.id} type="button" className={active === cat.id ? 'is-active' : ''} onClick={() => onChange(cat.id)}>
          <span>{cat.label}</span>
          <span className="enc-pill-count">{counts[cat.id] || 0}</span>
        </button>
      ))}
    </div>
  )
}

export function EntryGrid({ entries, favorites, spoilerSafe, revealed, onToggleFavorite, onReveal, onSelect, onTagClick, activeTag, onClearTag }) {
  return (
    <>
      <div className="enc-fiches-header">
        <span className="enc-fiches-count">{entries.length} archive{entries.length > 1 ? 's' : ''}</span>
        {activeTag && (
          <button type="button" onClick={onClearTag} className="enc-tag-active-filter">
            🏷 {activeTag} ✕
          </button>
        )}
      </div>
      {!entries.length ? (
        <div className="enc-empty">
          <strong>Aucune archive trouvée.</strong>
          <span>Essaie une autre recherche ou catégorie.</span>
        </div>
      ) : (
        <div className="enc-entry-grid">
          {entries.map((entry, i) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              index={i}
              isFavorite={favorites.includes(entry.slug)}
              spoilerSafe={spoilerSafe}
              revealed={revealed}
              onToggleFavorite={onToggleFavorite}
              onReveal={onReveal}
              onSelect={onSelect}
              onTagClick={onTagClick}
              activeTag={activeTag}
            />
          ))}
        </div>
      )}
    </>
  )
}

export function EntryCard({ entry, index = 0, isFavorite, spoilerSafe, revealed, onToggleFavorite, onReveal, onSelect, onTagClick, activeTag }) {
  const [revealing, setRevealing] = useState(false)
  const cfg = rarityConfig[entry.rarity] || rarityConfig.common
  const hidden = isSpoilerHidden(entry, spoilerSafe, revealed)
  const tags = entry.tags || []

  const revealCard = () => {
    setRevealing(true)
    window.setTimeout(() => onReveal(entry.id), 220)
  }

  return (
    <article
      className={`enc-card enc-rarity-card-${entry.rarity} ${hidden ? 'is-spoiler-hidden' : ''} ${revealing ? 'enc-revealing' : ''}`}
      style={{
        '--rarity-color': cfg.accent,
        '--rarity-glow': cfg.glow,
        '--rarity-gradient': cfg.gradient,
        animationDelay: `${Math.min(index, 12) * 28}ms`,
      }}
    >
      <div className="enc-card-band" aria-hidden="true" />
      <div className="enc-card-aura" aria-hidden="true" />

      <div className="enc-card-top">
        <RarityBadge rarity={entry.rarity} />
        <button
          className={`enc-fav ${isFavorite ? 'is-active' : ''}`}
          type="button"
          aria-label={`${isFavorite ? 'Retirer' : 'Ajouter'} ${entry.name} des favoris`}
          onClick={() => onToggleFavorite(entry.slug)}
        >
          ♥
        </button>
      </div>

      <h3 className="enc-card-name">{entry.name}</h3>

      {hidden && (
        <div className="enc-spoiler-overlay" aria-label="Contenu classifié">
          <div className="enc-spoiler-scan" aria-hidden="true" />
          <div className="enc-spoiler-lock">
            <span className="enc-spoiler-icon">🔒</span>
            <span className="enc-spoiler-stamp">CLASSIFIÉ</span>
            <span className="enc-spoiler-hint">Spoiler majeur — révèle pour accéder</span>
          </div>
        </div>
      )}

      <div className="enc-card-body">
        <p className="enc-card-sub">{entry.subtitle || entry.category}</p>
        <p className="enc-card-desc">{entry.description}</p>
        <div className="enc-tags">
          {tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className={activeTag === tag ? 'is-active' : ''}
              onClick={() => onTagClick?.(tag)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onTagClick?.(tag) }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="enc-card-actions">
        {hidden && <button type="button" className="enc-reveal-btn" onClick={revealCard}>Révéler</button>}
        <button type="button" className="enc-ghost-btn" onClick={() => onSelect(entry)}>Ouvrir →</button>
      </div>
    </article>
  )
}

export function TimelineTab({ items, spoilerSafe, revealed, onReveal }) {
  if (!items.length) return <EmptyState text="Aucune timeline disponible pour cet univers." />
  return (
    <section className="enc-timeline">
      {items.map((item, i) => {
        const hidden = isSpoilerHidden(item, spoilerSafe, revealed)
        return (
          <article key={item.id} className={`enc-time-item ${hidden ? 'is-spoiler-hidden' : ''}`} style={{ animationDelay: `${i * 35}ms` }}>
            <div className="enc-time-meta">
              <span className={item.badge === 'Spoiler' ? 'is-spoiler' : ''}>{item.badge}</span>
              <strong>{String(i + 1).padStart(2, '0')}</strong>
            </div>
            <div className="enc-time-line"><i /></div>
            <div className="enc-time-card">
              <h3>{hidden ? 'Arc protégé' : item.title}</h3>
              <p>{hidden ? 'Ce passage est masqué par le mode spoiler.' : item.description}</p>
              <div className="enc-tags">
                {(item.arcs || [item.title]).slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}
              </div>
              {hidden && <button type="button" className="enc-ghost-btn" style={{ marginTop: 12 }} onClick={() => onReveal(item.id)}>Révéler</button>}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export function SecretFilesTab({ files, spoilerSafe, revealed, onReveal }) {
  return (
    <section className="enc-archive-section">
      <SectionTitle label="Archives Classifiées" text="Dossiers sensibles et zones volontairement protégées par le mode spoiler." />
      {!files.length ? (
        <EmptyState text="Aucune archive classifiée disponible pour cet univers." />
      ) : (
        <div className="enc-secret-grid">
          {files.map((file, i) => {
            const cfg = rarityConfig[file.rarity] || rarityConfig.secret
            const hidden = isSpoilerHidden(file, spoilerSafe, revealed)
            return (
              <article
                key={file.id}
                className={`enc-secret enc-secret-${file.rarity} ${hidden ? 'is-spoiler-hidden' : ''}`}
                style={{ '--rarity-color': cfg.accent, '--rarity-glow': cfg.glow, animationDelay: `${i * 32}ms` }}
              >
                <div className="enc-secret-scan" aria-hidden="true" />
                <div className="enc-card-top">
                  <RarityBadge rarity={file.rarity} />
                  <span className="enc-danger">{file.dangerLevel}</span>
                </div>
                <span className="enc-stamp">{rarityLabels[file.rarity] || file.rarity}</span>
                <h3>{hidden ? 'Dossier protégé' : file.title}</h3>
                <p>{hidden ? 'Archive masquée par le mode spoiler.' : file.summary}</p>
                <div className="enc-tags">
                  {(file.tags || []).map(tag => <span key={tag}>{tag}</span>)}
                </div>
                {hidden && <button type="button" className="enc-ghost-btn" style={{ marginTop: 12 }} onClick={() => onReveal(file.id)}>Révéler</button>}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function ToolsTab({ children }) {
  return <div className="enc-tools-stack">{children}</div>
}

export function EntryDetailPanel({ entry, onClose }) {
  if (!entry) return null
  const cfg = rarityConfig[entry.rarity] || rarityConfig.common
  const stats = entry.stats || {}

  return (
    <>
      <button className="enc-drawer-overlay" type="button" aria-label="Fermer la fiche" onClick={onClose} />
      <aside
        className={`enc-entry-drawer enc-rarity-card-${entry.rarity}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche ${entry.name}`}
        style={{ '--rarity-color': cfg.accent, '--rarity-glow': cfg.glow }}
      >
        <div className="enc-drawer-top-band" aria-hidden="true" />
        <button className="enc-icon-btn enc-drawer-close" type="button" onClick={onClose} aria-label="Fermer">✕</button>

        <RarityBadge rarity={entry.rarity} />
        <h2>{entry.name}</h2>
        <p className="enc-drawer-sub">{entry.subtitle || entry.category}</p>
        <p className="enc-drawer-desc">{entry.description}</p>

        {!!Object.keys(stats).length && (
          <div className="enc-drawer-stats-section">
            <div className="enc-drawer-section-title">Statistiques</div>
            <div className="enc-detail-stats">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key}>
                  <span>{statLabel(key)}</span>
                  <i><b style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} /></i>
                  <em>{value}</em>
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.strengths && (
          <div className="enc-drawer-stats-section">
            <div className="enc-drawer-section-title">Analyse</div>
            <div className="enc-detail-columns">
              <DetailList title="Forces" items={entry.strengths} />
              <DetailList title="Faiblesses" items={entry.weaknesses || []} />
            </div>
          </div>
        )}

        {entry.awakening && (
          <div className="enc-drawer-stats-section">
            <div className="enc-drawer-section-title">Éveil</div>
            <p className="enc-awakening">{entry.awakening}</p>
          </div>
        )}

        <div className="enc-tags enc-drawer-tags">
          {(entry.tags || []).map(tag => <span key={tag}>{tag}</span>)}
        </div>
      </aside>
    </>
  )
}

function DetailList({ title, items }) {
  return (
    <div>
      <strong>{title}</strong>
      <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  )
}

function statLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
}

export function SectionTitle({ label, text }) {
  return (
    <div className="enc-section-title">
      <span>BRAMS ARCHIVES</span>
      <h2>{label}</h2>
      {text && <p>{text}</p>}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="enc-empty">
      <strong>Rien à afficher.</strong>
      <span>{text}</span>
    </div>
  )
}

export const AnimeSelector = Sidebar
export const AnimeHero = AnimeHeroStrip
export const AnimeSearchBar = null
export const AnimeCategoryPills = CategoryPills
export const FilterPills = null
export const SecretFilesSection = SecretFilesTab
export const AnimeTimeline = TimelineTab
export function CommunityModesSection() { return null }
export function FavoritesSection() { return null }
