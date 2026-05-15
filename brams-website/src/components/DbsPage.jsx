import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/dbs-chapters.json'
import VIDEOS from '../data/dbs-videos.json'

const EMOJIS = ['🐉','⚡','🌟','💥','👊','🌀','🔥','🌊','🌙','💀','🗡️','🔮','🏹','🦁','🌑','🧿','⚔️','🦂','💎','🌸','🌪️','🔱','🎭','💧','🌒','⛓️','🩸']

export default function DbsPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#f57f17"
      namespace="dbs"
      title="Dragon Ball Super"
      headerEmoji="🐉"
      emojiList={EMOJIS}
      onClose={onClose}
    />
  )
}
