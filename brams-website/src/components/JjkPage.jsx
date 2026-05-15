import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/jjk-chapters.json'
import VIDEOS from '../data/jjk-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['⚡','💀','🔮','👊','🌀','🌑','🦴','🔱','⚔️','🕷️','🌊','🔥','💢','👁️','🌫️','🧿','⛓️','🩸','🌪️','👹','💣','🌙','🗡️','🔴','🎭','🌒','🦂']

export default function JjkPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#c62828"
      namespace="jjk"
      title="Jujutsu Kaisen"
      headerEmoji="⚡"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.jjk}
      onClose={onClose}
    />
  )
}
