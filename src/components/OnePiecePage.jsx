import GenericMangaPage from './GenericMangaPage.jsx'
import VIDEOS from '../data/onepiece-videos.js'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['🏴‍☠️', '⚓', '🌊', '⚔️', '🍖', '🎩', '🗺️', '🔥', '💎', '🌑', '👑', '🔮', '🎭', '💀', '🌸', '⛵', '🐉', '🌀', '🏝️', '🌟']

export default function OnePiecePage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={[]}
      videosData={VIDEOS}
      color="#e0524a"
      namespace="one-piece"
      title="One Piece"
      headerEmoji="🏴‍☠️"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS?.onepiece || []}
      onClose={onClose}
    />
  )
}
