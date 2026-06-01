import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/carole-tuesday-chapters.json'
import VIDEOS from '../data/carole-tuesday-videos.json'

const EMOJIS = ['♫', '♪', '♬', '✦', '★', '◆']

export default function CaroleTuesdayPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#14b8a6"
      namespace="carole-tuesday"
      title="Carole & Tuesday"
      headerEmoji="♫"
      emojiList={EMOJIS}
      arcsData={[]}
      onClose={onClose}
    />
  )
}
