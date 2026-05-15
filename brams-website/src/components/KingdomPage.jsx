import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/kingdom-chapters.json'
import VIDEOS from '../data/kingdom-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['⚔️','👑','🏹','🐉','🗡️','🏰','🛡️','🔱','🌾','⚡','🦅','🔥','🌊','💀','🗺️','🪖','🌙','⛰️','🏇','🌟','💢','🌪️','🎯','🏔️','🌿','🦁','🔴']

export default function KingdomPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#c9a227"
      namespace="kingdom"
      title="Kingdom"
      headerEmoji="⚔️"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.kingdom}
      onClose={onClose}
    />
  )
}
