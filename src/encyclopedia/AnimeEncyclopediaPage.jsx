import { useEffect, useMemo, useState } from 'react'
import { animeRegistry } from './data/animeRegistry'
import { animeEntries } from './data/animeEntries'
import { animeSecretFiles } from './data/animeSecretFiles'
import { animeTimelines } from './data/animeTimelines'
import { communityModes } from './data/communityModes'
import { onePieceFruits } from './data/onePieceFruits'
import {
  AnimeCategoryPills,
  AnimeHero,
  AnimeSearchBar,
  AnimeSelector,
  CommunityModesSection,
  EntryGrid,
  EntryDetailPanel,
  FavoritesSection,
  FilterPills,
  SecretFilesSection,
  AnimeTimeline,
} from './components/shared'
import FruitComparator from './components/FruitComparator'
import RandomFruitRoulette from './components/RandomFruitRoulette'
import OnePieceWorldMap from './components/OnePieceWorldMap'
import './encyclopedia.css'

const FAVORITES_KEY = 'brams_encyclopedia_favorites'
const SPOILER_KEY = 'brams_encyclopedia_spoiler_safe'

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function searchEntry(entry, query, categoryLabel = '') {
  if (!query) return true
  const haystack = [entry.name, entry.subtitle, entry.description, entry.category, entry.rarity, categoryLabel, ...(entry.tags || [])].join(' ').toLowerCase()
  return haystack.includes(query)
}

export default function AnimeEncyclopediaPage({ onClose }) {
  const [animeId, setAnimeId] = useState('one-piece')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [rarity, setRarity] = useState('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [secretOnly, setSecretOnly] = useState(false)
  const [revealed, setRevealed] = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [favorites, setFavorites] = useState(() => readJson(FAVORITES_KEY, {}))
  const [spoilerSafe, setSpoilerSafe] = useState(() => readJson(SPOILER_KEY, true))

  const anime = animeRegistry.find(item => item.id === animeId) || animeRegistry[0]
  const theme = anime.theme
  const entriesByAnime = useMemo(() => {
    const counts = {}
    animeRegistry.forEach(item => { counts[item.id] = animeEntries.filter(entry => entry.animeId === item.id).length + (item.id === 'one-piece' ? onePieceFruits.length : 0) })
    return counts
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = event => {
      if (event.key === 'Escape' && selectedEntry) setSelectedEntry(null)
      else if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, selectedEntry])

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem(SPOILER_KEY, JSON.stringify(spoilerSafe))
  }, [spoilerSafe])

  useEffect(() => {
    setCategory('all')
    setQuery('')
    setRarity('all')
    setFavoritesOnly(false)
    setSecretOnly(false)
  }, [animeId])

  const baseEntries = useMemo(() => {
    const regular = animeEntries.filter(entry => entry.animeId === animeId)
    return animeId === 'one-piece' ? [...onePieceFruits, ...regular] : regular
  }, [animeId])

  const favoriteSlugs = favorites[animeId] || []
  const categoryLabels = Object.fromEntries(anime.categories.map(item => [item.id, item.label]))
  const normalizedQuery = query.trim().toLowerCase()

  const filteredEntries = useMemo(() => {
    return baseEntries.filter(entry => {
      if (category !== 'all' && entry.category !== category) return false
      if (rarity !== 'all' && entry.rarity !== rarity) return false
      if (favoritesOnly && !favoriteSlugs.includes(entry.slug)) return false
      if (secretOnly && entry.category !== 'secret-files' && entry.rarity !== 'secret' && entry.rarity !== 'forbidden') return false
      return searchEntry(entry, normalizedQuery, categoryLabels[entry.category])
    })
  }, [baseEntries, category, rarity, favoritesOnly, favoriteSlugs, secretOnly, normalizedQuery, categoryLabels])

  const visibleSecretFiles = useMemo(() => animeSecretFiles.filter(file => file.animeId === animeId), [animeId])
  const visibleModes = useMemo(() => communityModes.filter(mode => mode.animeId === animeId), [animeId])
  const visibleTimeline = animeTimelines[animeId] || []
  const favoriteEntries = baseEntries.filter(entry => favoriteSlugs.includes(entry.slug))

  const toggleFavorite = slug => {
    setFavorites(current => {
      const currentAnime = current[animeId] || []
      const nextAnime = currentAnime.includes(slug) ? currentAnime.filter(item => item !== slug) : [...currentAnime, slug]
      return { ...current, [animeId]: nextAnime }
    })
  }

  const reveal = id => setRevealed(current => current.includes(id) ? current : [...current, id])

  return (
    <div className="enc-shell" style={{ '--accent': theme.accent, '--accent-soft': theme.accentSoft, '--card-glow': theme.cardGlow, '--background-aura': theme.backgroundAura }}>
      <div className="enc-topbar">
        <button className="enc-back" onClick={onClose}>Retour</button>
        <strong>Archives Brams Community</strong>
        <span>{anime.name}</span>
      </div>

      <main className="enc-scroll">
        <AnimeSelector animes={animeRegistry} activeId={animeId} entriesByAnime={entriesByAnime} onSelect={setAnimeId} />
        <AnimeHero anime={anime} spoilerSafe={spoilerSafe} setSpoilerSafe={setSpoilerSafe} />

        <div className="enc-controls">
          <AnimeSearchBar value={query} onChange={setQuery} placeholder={anime.searchPlaceholder} />
          <AnimeCategoryPills categories={anime.categories} active={category} onChange={setCategory} />
          <FilterPills rarity={rarity} setRarity={setRarity} favoritesOnly={favoritesOnly} setFavoritesOnly={setFavoritesOnly} secretOnly={secretOnly} setSecretOnly={setSecretOnly} />
        </div>

        <FavoritesSection entries={favoriteEntries} />
        <EntryGrid entries={filteredEntries} favorites={favoriteSlugs} spoilerSafe={spoilerSafe} onToggleFavorite={toggleFavorite} revealed={revealed} onReveal={reveal} onSelect={setSelectedEntry} />

        {animeId === 'one-piece' && (
          <>
            <FruitComparator />
            <RandomFruitRoulette />
            <OnePieceWorldMap spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />
          </>
        )}

        <SecretFilesSection files={visibleSecretFiles} spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />
        <AnimeTimeline items={visibleTimeline} spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />
        <CommunityModesSection modes={visibleModes} />
        <EntryDetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      </main>
    </div>
  )
}
