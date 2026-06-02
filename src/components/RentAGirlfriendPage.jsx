import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/rent-girlfriend-chapters.json'
import VIDEOS from '../data/rent-girlfriend-videos.json'

const EMOJIS = ['◇', '◆', '✦', '✧', '♡', '♢', '♪', '★']

export default function RentAGirlfriendPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#14b8a6"
      namespace="rent-girlfriend"
      title="Rent-a-Girlfriend"
      headerEmoji="◇"
      emojiList={EMOJIS}
      arcsData={[]}
      onClose={onClose}
    />
  )
}
