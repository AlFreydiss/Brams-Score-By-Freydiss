import GenericMangaPage from './GenericMangaPage.jsx'
import VIDEOS from '../data/kaiju-videos.json'

const EMOJIS = ['👾','⚡','🔥','💥','🦎','🗡️','🌀','👁️','💀','🏙️','🌊','🐉']

export default function KaijuNo8Page({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={[]}
      videosData={VIDEOS}
      color="#00bcd4"
      namespace="kaiju8"
      title="Kaiju No. 8"
      headerEmoji="👾"
      emojiList={EMOJIS}
      arcsData={[]}
      onClose={onClose}
    />
  )
}
