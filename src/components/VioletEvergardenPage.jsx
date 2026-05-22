import GenericMangaPage from './GenericMangaPage.jsx'
import VIDEOS from '../data/violet-evergarden-videos.json'

const EMOJIS = ['✉', '✒', '☂', '❀', '✦', '☕', '✧', '✉']

export default function VioletEvergardenPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={[]}
      videosData={VIDEOS}
      color="#8b7cff"
      namespace="violet-evergarden"
      title="Violet Evergarden"
      headerEmoji="✉"
      emojiList={EMOJIS}
      arcsData={[]}
      onClose={onClose}
    />
  )
}
