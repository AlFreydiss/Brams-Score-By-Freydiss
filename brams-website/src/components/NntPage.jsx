import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/nnt-chapters.json'
import VIDEOS from '../data/nnt-videos.json'

const EMOJIS = ['🐗','🦁','🐻','🦊','🐍','🐺','🐉','👑','⚡','🌙','🔮','💀','🗡️','🌊','🔥','🌑','🧿','🌿','🏹','⚔️','🌸','🌪️','💧','🔱','🦂','🌟','🎭']

export default function NntPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#8e44ad"
      namespace="nnt"
      title="Nanatsu no Taizai"
      headerEmoji="🐗"
      emojiList={EMOJIS}
      onClose={onClose}
    />
  )
}
