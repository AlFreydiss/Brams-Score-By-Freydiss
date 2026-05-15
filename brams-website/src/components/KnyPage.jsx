import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/kny-chapters.json'
import VIDEOS from '../data/kny-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['🔥','💀','🌊','⚡','🌙','🗡️','🌸','🏔️','🌀','👁️','🩸','🌿','🔴','🌑','⛓️','💧','🦋','🌪️','🐍','🕷️','🌟','🎭','🔱','🦂','🌒','🧿','⚔️']

export default function KnyPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#e85d27"
      namespace="kny"
      title="Kimetsu no Yaiba"
      headerEmoji="🔥"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.kny}
      onClose={onClose}
    />
  )
}
