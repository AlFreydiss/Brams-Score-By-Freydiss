import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/love-prism-chapters.json'
import VIDEOS from '../data/love-prism-videos.json'

const EMOJIS = ['♪', '◆', '◇', '✦', '✧', '★', '☆', '♬']

export default function LovePrismPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#ec4899"
      namespace="love-prism"
      title="Love Through A Prism"
      headerEmoji="♪"
      emojiList={EMOJIS}
      arcsData={[]}
      onClose={onClose}
    />
  )
}
