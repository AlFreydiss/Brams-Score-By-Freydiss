import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/bunny-girl-chapters.json'
import VIDEOS from '../data/bunny-girl-videos.json'

const EMOJIS = ['◆', '◇', '✦', '✧', '★', '☆', '♪', '♢']

export default function BunnyGirlPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#8b7cff"
      namespace="bunny-girl"
      title="Bunny Girl Senpai"
      headerEmoji="◆"
      emojiList={EMOJIS}
      arcsData={[]}
      onClose={onClose}
    />
  )
}
