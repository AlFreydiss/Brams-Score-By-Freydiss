import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/sl-chapters.json'
import VIDEOS from '../data/sl-videos.json'

const EMOJIS = ['💎','⚔️','🗡️','👁️','🌑','💀','🔮','🌊','⚡','🏹','🦂','🌪️','🔥','🌙','🐉','🧿','🌟','🦁','💧','🔱','🕷️','🌀','🎭','🌒','⛓️','🩸','🌿']

export default function SlPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#1976d2"
      namespace="sl"
      title="Solo Leveling"
      headerEmoji="💎"
      emojiList={EMOJIS}
      onClose={onClose}
    />
  )
}
