import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/bluelock-chapters.json'
import VIDEOS from '../data/bluelock-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['⚽','🔵','🏆','⚡','💪','🎯','🔥','👑','💎','🌟','⚔️','🛡️','💥','🌊','🦅','🌀','🎭','🩸','🌙','🐉']

export default function BlueLockPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#1565c0"
      namespace="bluelock"
      title="Blue Lock"
      headerEmoji="⚽"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.bluelock}
      onClose={onClose}
    />
  )
}
