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
  ArchiveHero,
  ArchiveRegister,
  ControlPanel,
  EntryDetailPanel,
  SecretFilesTab,
  TimelineTab,
  ToolsTab,
  UniverseRail,
  hexToRgba,
} from './components/shared'
import FruitComparator from './components/FruitComparator'
import RandomFruitRoulette from './components/RandomFruitRoulette'
import OnePieceWorldMap from './components/OnePieceWorldMap'
import './encyclopedia.css'

const FAVORITES_KEY = 'enc-favs'
const SPOILER_KEY   = 'enc-spoiler-safe'

const animeAccentColors = {
  'one-piece':              '#e0524a',
  naruto:                   '#f47b20',
  'dragon-ball':            '#ffb02e',
  bleach:                   '#79d8ff',
  'fullmetal-alchemist':    '#c0932f',
  'my-hero-academia':       '#00c3ff',
  'the-promised-neverland': '#9b59b6',
  'dr-stone':               '#43e97b',
}

const animeEmojis = {
  'one-piece':              '☠️',
  naruto:                   '🍃',
  'dragon-ball':            '🔮',
  bleach:                   '⚔️',
  'fullmetal-alchemist':    '⚗️',
  'my-hero-academia':       '⚡',
  'the-promised-neverland': '🔑',
  'dr-stone':               '🧪',
}

const baseTabs = [
  { id: 'fiches',   label: 'Fiches',   icon: '📋' },
  { id: 'timeline', label: 'Timeline', icon: '📅' },
  { id: 'archives', label: 'Archives', icon: '🔒' },
]

function readJson(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

function searchEntry(entry, query, categoryLabel = '') {
  if (!query) return true
  const hay = [entry.name, entry.subtitle, entry.description, entry.category, entry.rarity, categoryLabel, ...(entry.tags || [])].join(' ').toLowerCase()
  return hay.includes(query)
}

export default function AnimeEncyclopediaPage({ onClose }) {
  const [animeId,       setAnimeId]       = useState('one-piece')
  const [activeTab,     setActiveTab]     = useState('fiches')
  const [category,      setCategory]      = useState('all')
  const [query,         setQuery]         = useState('')
  const [tagFilter,     setTagFilter]     = useState('')
  const [revealed,      setRevealed]      = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [favorites,     setFavorites]     = useState(() => readJson(FAVORITES_KEY, {}))
  const [spoilerSafe,   setSpoilerSafe]   = useState(() => readJson(SPOILER_KEY, true))
  const [isMobile,      setIsMobile]      = useState(false)

  const anime  = animeRegistry.find(a => a.id === animeId) || animeRegistry[0]
  const accent = animeAccentColors[anime.id] || anime.theme?.accent || '#ffffff'
  const theme  = { ...anime.theme, accent, accentSoft: hexToRgba(accent, 0.16), cardGlow: hexToRgba(accent, 0.22) }

  const tabs = useMemo(() => (
    animeId === 'one-piece' ? [...baseTabs, { id: 'tools', label: 'Outils', icon: '⚙️' }] : baseTabs
  ), [animeId])

  const animesForRail = useMemo(() => (
    animeRegistry.map(a => ({
      ...a,
      emoji: animeEmojis[a.id] || a.shortName,
      theme: { ...a.theme, accent: animeAccentColors[a.id] || a.theme?.accent },
    }))
  ), [])

  const entriesByAnime = useMemo(() => {
    const counts = {}
    animeRegistry.forEach(a => {
      const fruits = a.id === 'one-piece' ? onePieceFruits.length : 0
      counts[a.id] = animeEntries.filter(e => e.animeId === a.id).length + fruits
    })
    return counts
  }, [])

  const baseEntries = useMemo(() => {
    const entries = animeEntries.filter(e => e.animeId === animeId)
    return animeId === 'one-piece' ? [...onePieceFruits, ...entries] : entries
  }, [animeId])

  const categoryLabels = useMemo(() => (
    Object.fromEntries((animeCategories[animeId] || anime.categories || []).map(c => [c.id, c.label]))
  ), [animeId, anime.categories])

  const categoryCounts = useMemo(() => {
    const counts = { all: baseEntries.length }
    baseEntries.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1 })
    return counts
  }, [baseEntries])

  const favoriteSlugs    = favorites[animeId] || []
  const normalizedQuery  = query.trim().toLowerCase()

  const filteredEntries = useMemo(() => baseEntries.filter(e => {
    if (category !== 'all' && e.category !== category) return false
    if (tagFilter && !(e.tags || []).includes(tagFilter)) return false
    return searchEntry(e, normalizedQuery, categoryLabels[e.category])
  }), [baseEntries, category, categoryLabels, normalizedQuery, tagFilter])

  const secretFiles = useMemo(() => animeSecretFiles.filter(f => f.animeId === animeId), [animeId])
  const timeline    = animeTimelines[animeId] || []

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const check = () => setIsMobile(window.innerWidth < 820)
    check()
    window.addEventListener('resize', check)
    const onKey = e => {
      if (e.key !== 'Escape') return
      if (selectedEntry) setSelectedEntry(null)
      else onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('resize', check)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, selectedEntry])

  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)) }, [favorites])
  useEffect(() => { localStorage.setItem(SPOILER_KEY, JSON.stringify(spoilerSafe)) }, [spoilerSafe])

  useEffect(() => {
    setCategory('all')
    setQuery('')
    setTagFilter('')
    setSelectedEntry(null)
    if (animeId !== 'one-piece' && activeTab === 'tools') setActiveTab('fiches')
  }, [animeId, activeTab])

  const toggleFavorite = slug => setFavorites(cur => {
    const curr = cur[animeId] || []
    const next = curr.includes(slug) ? curr.filter(s => s !== slug) : [...curr, slug]
    return { ...cur, [animeId]: next }
  })

  const reveal = id => setRevealed(cur => cur.includes(id) ? cur : [...cur, id])

  const accentVars = {
    '--enc-accent':     theme.accent,
    '--enc-accent-soft': theme.accentSoft,
    '--enc-card-glow':  theme.cardGlow,
  }

  return (
    <div className="arc-shell" style={accentVars}>
      {/* Universe rail */}
      <UniverseRail
        animes={animesForRail}
        activeId={animeId}
        entriesByAnime={entriesByAnime}
        onSelect={setAnimeId}
        onClose={onClose}
      />

      <div className="arc-body">
        {/* Left control panel */}
        <ControlPanel
          anime={{ ...anime, theme }}
          entryCount={baseEntries.length}
          secretCount={secretFiles.length}
          categories={animeCategories[animeId] || anime.categories || []}
          categoryCounts={categoryCounts}
          activeCategory={category}
          onCategoryChange={setCategory}
          query={query}
          onQueryChange={setQuery}
          spoilerSafe={spoilerSafe}
          onSpoilerToggle={() => setSpoilerSafe(v => !v)}
        />

        {/* Main board */}
        <div className="arc-board">
          <ArchiveHero
            anime={{ ...anime, theme }}
            activeTab={activeTab}
            tabs={tabs}
            onTabChange={setActiveTab}
            onClose={onClose}
            entryCount={baseEntries.length}
            favoritesCount={favoriteSlugs.length}
            classifiedCount={baseEntries.filter(e => e.rarity === 'forbidden' || e.rarity === 'secret').length}
            legendaryCount={baseEntries.filter(e => e.rarity === 'legendary' || e.rarity === 'mythic').length}
          />

          <div className="arc-content">
            {activeTab === 'fiches' && (
              <ArchiveRegister
                entries={filteredEntries}
                selectedEntry={selectedEntry}
                onSelectEntry={setSelectedEntry}
                favorites={favoriteSlugs}
                onToggleFavorite={toggleFavorite}
                spoilerSafe={spoilerSafe}
                revealed={revealed}
                onReveal={reveal}
                onTagClick={setTagFilter}
                activeTag={tagFilter}
                onClearTag={() => setTagFilter('')}
              />
            )}

            {activeTab === 'timeline' && (
              <div style={{ padding: '20px 24px 60px' }}>
                <TimelineTab items={timeline} spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />
              </div>
            )}

            {activeTab === 'archives' && (
              <div style={{ padding: '20px 24px 60px' }}>
                <SecretFilesTab files={secretFiles} spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />
              </div>
            )}

            {activeTab === 'tools' && animeId === 'one-piece' && (
              <div style={{ padding: '20px 24px 60px' }}>
                <ToolsTab>
                  <FruitComparator />
                  <RandomFruitRoulette />
                  <OnePieceWorldMap spoilerSafe={spoilerSafe} revealed={revealed} onReveal={reveal} />
                </ToolsTab>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer (inspection panel is hidden on mobile) */}
      {isMobile && selectedEntry && (
        <EntryDetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  )
}

void communityModes
void rarityStyles
void animeThemes
