import GenericMangaPage from './GenericMangaPage.jsx'
import VIDEOS from '../data/violet-evergarden-videos.json'

const EMOJIS = ['✉', '✒', '☂', '❀', '✦', '☕', '✧', '✉']

export default function VioletEvergardenPage({ onClose }) {
  const videos = VIDEOS.map(video => ({
    ...video,
    preferredAudioLang: 'fr',
  }))

  return (
    <GenericMangaPage
      chaptersData={[]}
      videosData={videos}
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
