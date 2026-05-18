import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/mha-chapters.json'
import VIDEOS from '../data/mha-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['💪','⚡','🔥','🧊','🌪️','💥','🦸','⚔️','🛡️','🎯','💎','🌟','🩸','⚓','🏹','🦅','🌊','🐉','🕊️','🌀']

export default function MhaPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#1e88e5"
      namespace="mha"
      title="My Hero Academia"
      headerEmoji="💪"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.mha}
      onClose={onClose}
    />
  )
}
