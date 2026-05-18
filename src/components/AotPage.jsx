import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/aot-chapters.json'
import VIDEOS from '../data/aot-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['🗡️','🦅','🏰','⚔️','🔒','🌊','🌑','🧱','💀','🔥','🌿','👁️','⛓️','🌪️','🦴','🩸','🌙','🗺️','🏔️','🦂','💣','🌒','🔴','🎭','🌫️','🧿','🔱']

export default function AotPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#546e7a"
      namespace="aot"
      title="L'Attaque des Titans"
      headerEmoji="🗡️"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.aot}
      onClose={onClose}
    />
  )
}
