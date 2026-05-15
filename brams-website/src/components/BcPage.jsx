import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/bc-chapters.json'
import VIDEOS from '../data/bc-videos.json'

const EMOJIS = ['🍀','⚡','🔥','🌊','💨','🌑','🗡️','💀','👑','🌙','🔮','🏹','🦁','⚔️','🌪️','🔱','🧿','🌟','💎','🌸','🌒','⛓️','🩸','🌿','🦂','💧','🎭']

export default function BcPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#388e3c"
      namespace="bc"
      title="Black Clover"
      headerEmoji="🍀"
      emojiList={EMOJIS}
      onClose={onClose}
    />
  )
}
