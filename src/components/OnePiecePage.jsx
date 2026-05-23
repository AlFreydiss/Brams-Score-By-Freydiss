import GenericMangaPage from './GenericMangaPage.jsx'
import VIDEOS from '../data/onepiece-videos.js'

const EMOJIS = ['J', 'L', 'Z', 'N', 'S', 'U', 'R', 'F', 'B', 'C']

export default function OnePiecePage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={[]}
      videosData={VIDEOS}
      color="#e0524a"
      namespace="onepiece"
      title="One Piece - Arc Egghead"
      headerEmoji="OP"
      emojiList={EMOJIS}
      arcsData={[]}
      onClose={onClose}
    />
  )
}
