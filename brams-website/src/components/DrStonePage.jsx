import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/drstone-chapters.json'
import VIDEOS from '../data/drstone-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['⚗️','🔬','💡','🌿','⚡','🧪','🔩','🌊','🏔️','🔥','💎','🌙','🛸','🌍','⚙️','🧬','🔭','🌟','💧','🌱','🎯','🏹','🦾','🌀','🔱','🎭','🌒']

export default function DrStonePage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#00b894"
      namespace="drstone"
      title="Dr. Stone"
      headerEmoji="⚗️"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.drstone}
      onClose={onClose}
    />
  )
}
