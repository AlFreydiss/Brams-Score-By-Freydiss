import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/fireforce-chapters.json'
import VIDEOS from '../data/fireforce-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['🔥','🌊','⚡','💀','🌑','🕊️','⚔️','🌪️','💥','🩸','🛡️','🌟','🎭','🔮','🦅','🌀','⚓','🌈','💎','🐉']

export default function FireForcePage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#f4511e"
      namespace="fireforce"
      title="Fire Force"
      headerEmoji="🔥"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.fireforce}
      onClose={onClose}
    />
  )
}
