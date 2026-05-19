import { rarityLabels } from '../data/rarityStyles'

export function RarityBadge({ rarity }) {
  return <span className={`enc-rarity enc-rarity-${rarity}`}>{rarityLabels[rarity] || rarity}</span>
}

export function AnimeSelector({ animes, activeId, entriesByAnime, onSelect }) {
  return (
    <div className="enc-selector" aria-label="Choisir un univers anime">
      {animes.map(anime => {
        const active = anime.id === activeId
        return (
          <button key={anime.id} className={`enc-anime-tab ${active ? 'is-active' : ''}`} onClick={() => onSelect(anime.id)} style={{ '--anime-accent': anime.theme.accent, '--anime-soft': anime.theme.accentSoft }}>
            <span className="enc-anime-short">{anime.shortName}</span>
            <span className="enc-anime-copy">
              <strong>{anime.name}</strong>
              <small>{entriesByAnime[anime.id] || 0} archives - {anime.status}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function AnimeHero({ anime, spoilerSafe, setSpoilerSafe }) {
  return (
    <section className="enc-hero" style={{ '--title-gradient': anime.theme.titleGradient }}>
      <p className="enc-kicker">{anime.label}</p>
      <div className="enc-hero-mark">📚</div>
      <h1>{anime.title}</h1>
      <p className="enc-subtitle">{anime.description}</p>
      <div className="enc-stats">
        {anime.stats.map(stat => (
          <div className="enc-stat" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      <button className={`enc-spoiler-toggle ${spoilerSafe ? 'is-on' : ''}`} onClick={() => setSpoilerSafe(!spoilerSafe)} aria-pressed={spoilerSafe}>
        <span>{spoilerSafe ? 'Mode sans spoiler actif' : 'Spoilers visibles'}</span>
        <b>{spoilerSafe ? 'Protege' : 'Libre'}</b>
      </button>
    </section>
  )
}

export function AnimeSearchBar({ value, onChange, placeholder }) {
  return (
    <label className="enc-search">
      <span>Recherche</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function AnimeCategoryPills({ categories, active, onChange }) {
  return (
    <div className="enc-pill-row" aria-label="Filtres categories">
      <button className={active === 'all' ? 'is-active' : ''} onClick={() => onChange('all')}>Tout</button>
      {categories.map(category => (
        <button key={category.id} className={active === category.id ? 'is-active' : ''} onClick={() => onChange(category.id)}>{category.label}</button>
      ))}
    </div>
  )
}

export function FilterPills({ rarity, setRarity, favoritesOnly, setFavoritesOnly, secretOnly, setSecretOnly }) {
  const rarities = ['all', 'common', 'rare', 'epic', 'legendary', 'mythic', 'secret', 'forbidden']
  return (
    <div className="enc-pill-row enc-secondary-filters" aria-label="Filtres avances">
      {rarities.map(item => <button key={item} className={rarity === item ? 'is-active' : ''} onClick={() => setRarity(item)}>{item === 'all' ? 'Toutes raretes' : rarityLabels[item]}</button>)}
      <button className={favoritesOnly ? 'is-active' : ''} onClick={() => setFavoritesOnly(!favoritesOnly)}>Favoris</button>
      <button className={secretOnly ? 'is-active' : ''} onClick={() => setSecretOnly(!secretOnly)}>Dossiers secrets</button>
    </div>
  )
}

export function EntryGrid({ entries, favorites, spoilerSafe, onToggleFavorite, onReveal, revealed, onSelect }) {
  if (!entries.length) {
    return (
      <div className="enc-empty">
        <strong>Aucune archive trouvee.</strong>
        <span>Essaie un autre nom, une categorie ou un univers.</span>
      </div>
    )
  }
  return (
    <div className="enc-entry-grid">
      {entries.map(entry => (
        <EntryCard key={entry.id} entry={entry} isFavorite={favorites.includes(entry.slug)} spoilerSafe={spoilerSafe} onToggleFavorite={onToggleFavorite} revealed={revealed.includes(entry.id)} onReveal={onReveal} onSelect={onSelect} />
      ))}
    </div>
  )
}

export function EntryCard({ entry, isFavorite, spoilerSafe, onToggleFavorite, revealed, onReveal, onSelect }) {
  const hidden = spoilerSafe && entry.spoilerLevel >= 4 && !revealed
  return (
    <article className={`enc-card enc-rarity-card-${entry.rarity} ${hidden ? 'is-spoiler-hidden' : ''}`}>
      <div className="enc-card-top">
        <RarityBadge rarity={entry.rarity} />
        <button className={`enc-fav ${isFavorite ? 'is-active' : ''}`} aria-label={`Ajouter ${entry.name} aux favoris`} onClick={() => onToggleFavorite(entry.slug)}>♥</button>
      </div>
      <h3>{hidden ? 'Archive masquee' : entry.name}</h3>
      <p className="enc-card-sub">{hidden ? 'Mode sans spoiler actif' : entry.subtitle || entry.category}</p>
      <p>{hidden ? 'Cette carte contient un spoiler majeur. Tu peux la reveler manuellement.' : entry.description}</p>
      {hidden ? <button className="enc-reveal" onClick={() => onReveal(entry.id)}>Reveler</button> : (
        <>
          <div className="enc-tags">{entry.tags.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}</div>
          <button className="enc-card-detail" onClick={() => onSelect(entry)}>Ouvrir la fiche</button>
        </>
      )}
    </article>
  )
}

export function EntryDetailPanel({ entry, onClose }) {
  if (!entry) return null
  const stats = entry.stats || {}
  return (
    <div className="enc-modal" role="dialog" aria-modal="true" aria-label={`Fiche ${entry.name}`}>
      <article className={`enc-modal-card enc-detail-panel enc-rarity-card-${entry.rarity}`}>
        <button className="enc-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        <RarityBadge rarity={entry.rarity} />
        <h2>{entry.name}</h2>
        <p className="enc-card-sub">{entry.subtitle || entry.category}</p>
        <p>{entry.description}</p>
        {!!Object.keys(stats).length && (
          <div className="enc-detail-stats">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <i><b style={{ width: `${value}%` }} /></i>
                <em>{value}</em>
              </div>
            ))}
          </div>
        )}
        {entry.strengths && <div className="enc-detail-columns"><DetailList title="Forces" items={entry.strengths} /><DetailList title="Faiblesses" items={entry.weaknesses || []} /></div>}
        {entry.awakening && <p><strong>Eveil:</strong> {entry.awakening}</p>}
        <div className="enc-tags">{(entry.tags || []).map(tag => <span key={tag}>{tag}</span>)}</div>
      </article>
    </div>
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

export function SecretFilesSection({ files, spoilerSafe, revealed, onReveal }) {
  return (
    <section className="enc-section">
      <SectionTitle label="Archives interdites" text="Dossiers sensibles, theories majeures et zones volontairement protegees par le mode sans spoiler." />
      <div className="enc-secret-grid">
        {files.map(file => {
          const hidden = spoilerSafe && file.spoilerLevel >= 4 && !revealed.includes(file.id)
          return (
            <article key={file.id} className={`enc-secret enc-rarity-card-${file.rarity} ${hidden ? 'is-spoiler-hidden' : ''}`}>
              <div className="enc-card-top"><RarityBadge rarity={file.rarity} /><span>{file.dangerLevel}</span></div>
              <h3>{hidden ? 'Dossier classifie' : file.title}</h3>
              <p>{hidden ? 'Archive masquee par le mode sans spoiler.' : file.summary}</p>
              {hidden ? <button className="enc-reveal" onClick={() => onReveal(file.id)}>Reveler le dossier</button> : <div className="enc-tags">{file.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function AnimeTimeline({ items, spoilerSafe, revealed, onReveal }) {
  return (
    <section className="enc-section">
      <SectionTitle label="Timeline" text="Chronologie dynamique de l'univers selectionne, avec protection des arcs sensibles." />
      <div className="enc-timeline">
        {items.map(item => {
          const hidden = spoilerSafe && item.spoilerLevel >= 4 && !revealed.includes(item.id)
          return (
            <article key={item.id} className={`enc-time-item ${hidden ? 'is-spoiler-hidden' : ''}`}>
              <span>{item.badge}</span>
              <h3>{hidden ? 'Arc masque' : item.title}</h3>
              <p>{hidden ? 'Spoiler protege.' : item.description}</p>
              {hidden && <button className="enc-reveal" onClick={() => onReveal(item.id)}>Reveler</button>}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function CommunityModesSection({ modes }) {
  return (
    <section className="enc-section">
      <SectionTitle label="Modes communautaires bientot" text="Quiz, blind tests et defis seront lies au classement Brams et aux berries." />
      <div className="enc-mode-grid">
        {modes.map(mode => (
          <article className="enc-mode" key={`${mode.animeId}:${mode.title}`}>
            <span>Bientot</span>
            <h3>{mode.title}</h3>
            <p>{mode.description}</p>
            <button disabled>Arrive bientot</button>
          </article>
        ))}
      </div>
    </section>
  )
}

export function FavoritesSection({ entries }) {
  return (
    <section className="enc-section">
      <SectionTitle label="Ma collection" text={`${entries.length} archive(s) sauvegardee(s) dans cet univers.`} />
      {entries.length ? <div className="enc-mini-list">{entries.map(entry => <span key={entry.id}>{entry.name}</span>)}</div> : <p className="enc-muted">Aucun favori pour cet anime.</p>}
    </section>
  )
}

export function SectionTitle({ label, text }) {
  return (
    <div className="enc-section-title">
      <h2>{label}</h2>
      <p>{text}</p>
    </div>
  )
}
