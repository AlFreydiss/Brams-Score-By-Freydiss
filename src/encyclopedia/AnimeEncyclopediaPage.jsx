import { useEffect, useMemo, useState } from 'react'
import { animeRegistry } from './data/animeRegistry'
import { animeThemes } from './data/animeThemes'
import { animeCategories } from './data/animeCategories'
import { animeEntries } from './data/animeEntries'
import { animeSecretFiles } from './data/animeSecretFiles'
import { animeTimelines } from './data/animeTimelines'
import { communityModes } from './data/communityModes'
import { onePieceFruits } from './data/onePieceFruits'
import { rarityStyles } from './data/rarityStyles'
import {
  AnimeHeroStrip,
  CategoryPills,
  EntryDetailPanel,
  EntryGrid,
  MainTopbar,
  SecretFilesTab,
  Sidebar,
  TimelineTab,
  ToolsTab,
  hexToRgba,
} from './components/shared'
import FruitComparator from './components/FruitComparator'
import RandomFruitRoulette from './components/RandomFruitRoulette'
import OnePieceWorldMap from './components/OnePieceWorldMap'
import './encyclopedia.css'

const FAVORITES_KEY = 'enc-favs'
const SPOILER_KEY = 'enc-spoiler-safe'

const animeAccentColors = {
  'one-piece': '#e0524a',
  naruto: '#f47b20',
  'dragon-ball': '#ffb02e',
  bleach: '#79d8ff',
  'fullmetal-alchemist': '#c0932f',
  'my-hero-academia': '#00c3ff',
  'the-promised-neverland': '#9b59b6',
  'dr-stone': '#43e97b',
}

const animeEmojis = {
  'one-piece': '☠',
  naruto: '🍥',
  'dragon-ball': '🟠',
  bleach: '⚔',
  'fullmetal-alchemist': '⚗',
  'my-hero-academia': '★',
  'the-promised-neverland': '⌖',
  'dr-stone': '✦',
}

const baseTabs = [
  { id: 'fiches', label: 'Fiches' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'archives', label: 'Archives' },
]

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function searchEntry(entry, query, categoryLabel = '') {
  if (!query) return true
  const haystack = [
    entry.name,
    entry.subtitle,
    entry.description,
    entry.category,
    entry.rarity,
    categoryLabel,
    ...(entry.tags || []),
  ].join(' ').toLowerCase()
  return haystack.includes(query)
}

export default function AnimeEncyclopediaPage({ onClose }) {
  const [animeId, setAnimeId] = useState('one-piece')
  const [activeTab, setActiveTab] = useState('fiches')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [revealed, setRevealed] = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [favorites, setFavorites] = useState(() => readJson(FAVORITES_KEY, {}))
  const [spoilerSafe, setSpoilerSafe] = useState(() => readJson(SPOILER_KEY, true))

  const anime = animeRegistry.find(item => item.id === animeId) || animeRegistry[0]
  const accent = animeAccentColors[anime.id] || anime.theme?.accent || animeThemes[anime.id]?.accent || '#ffffff'
  const theme = {
    ...anime.theme,
    accent,
    accentSoft: hexToRgba(accent, 0.16),
    cardGlow: hexToRgba(accent, 0.22),
  }

  const tabs = useMemo(() => (
    animeId === 'one-piece' ? [...baseTabs, { id: 'tools', label: 'Outils' }] : baseTabs
  ), [animeId])

  const entriesByAnime = useMemo(() => {
    const counts = {}
    animeRegistry.forEach(item => {
      const fruits = item.id === 'one-piece' ? onePieceFruits.length : 0
      counts[item.id] = animeEntries.filter(entry => entry.animeId === item.id).length + fruits
    })
    return counts
  }, [])

  const baseEntries = useMemo(() => {
    const entries = animeEntries.filter(entry => entry.animeId === animeId)
    return animeId === 'one-piece' ? [...onePieceFruits, ...entries] : entries
  }, [animeId])

  const categoryLabels = useMemo(() => (
    Object.fromEntries((animeCategories[animeId] || anime.categories || []).map(item => [item.id, item.label]))
  ), [animeId, anime.categories])

  const favoriteSlugs = favorites[animeId] || []
  const normalizedQuery = query.trim().toLowerCase()

  const filteredEntries = useMemo(() => {
    return baseEntries.filter(entry => {
      if (category !== 'all' && entry.category !== category) return false
      return searchEntry(entry, normalizedQuery, categoryLabels[entry.category])
    })
  }, [baseEntries, category, categoryLabels, normalizedQuery])

  const secretFiles = useMemo(() => animeSecretFiles.filter(file => file.animeId === animeId), [animeId])
  const timeline = animeTimelines[animeId] || []

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const onKey = event => {
      if (event.key !== 'Escape') return
      if (selectedEntry) setSelectedEntry(null)
      else onClose?.()
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
    setSelectedEntry(null)
    if (animeId !== 'one-piece' && activeTab === 'tools') setActiveTab('fiches')
  }, [activeTab, animeId])

  const toggleFavorite = slug => {
    setFavorites(current => {
      const currentAnime = current[animeId] || []
      const nextAnime = currentAnime.includes(slug)
        ? currentAnime.filter(item => item !== slug)
        : [...currentAnime, slug]
      return { ...current, [animeId]: nextAnime }
    })
  }

  const reveal = id => {
    setRevealed(current => current.includes(id) ? current : [...current, id])
  }

  return (
    <div
      className="enc-shell"
      style={{
        '--enc-accent': theme.accent,
        '--enc-accent-soft': theme.accentSoft,
        '--enc-card-glow': theme.cardGlow,
        '--enc-background-aura': theme.backgroundAura,
      }}
    >
      <Sidebar
        animes={animeRegistry.map(item => ({
          ...item,
          emoji: animeEmojis[item.id] || item.shortName,
          theme: { ...item.theme, accent: animeAccentColors[item.id] || item.theme?.accent },
        }))}
        activeId={animeId}
        entriesByAnime={entriesByAnime}
        query={query}
        onQueryChange={setQuery}
        spoilerSafe={spoilerSafe}
        onSpoilerToggle={() => setSpoilerSafe(value => !value)}
        onSelect={setAnimeId}
        onClose={onClose}
      />

      <main className="enc-main">
        <MainTopbar anime={anime} activeTab={activeTab} tabs={tabs} onTabChange={setActiveTab} onClose={onClose} />
        <AnimeHeroStrip anime={{ ...anime, theme }} entryCount={baseEntries.length} secretCount={secretFiles.length} />

        <div className="enc-content">
          {activeTab === 'fiches' && (
            <>
              <CategoryPills categories={animeCategories[animeId] || anime.categories || []} active={category} onChange={setCategory} />
              <EntryGrid
                entries={filteredEntries}
                favorites={favoriteSlugs}
                spoilerSafe={spoilerSafe}
                revealed={revealed}
                onToggleFavorite={toggleFavorite}
                onReveal={reveal}
                onSelect={setSelectedEntry}
              />
            </>
          )}

          {activeTab === 'timeline' && <TimelineTab items={timeline} spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />}
          {activeTab === 'archives' && <SecretFilesTab files={secretFiles} spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />}

          {activeTab === 'tools' && animeId === 'one-piece' && (
            <ToolsTab>
              <FruitComparator />
              <RandomFruitRoulette />
              <OnePieceWorldMap spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />
            </ToolsTab>
          )}
        </div>
      </main>

      <EntryDetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  )
}

void communityModes
void rarityStyles
