import GenericMangaPage from './GenericMangaPage.jsx'
import CHAPTERS from '../data/tpn-chapters.json'
import VIDEOS from '../data/tpn-videos.json'
import { MANGA_ARCS } from '../data/manga-arcs.js'

const EMOJIS = ['🌿','👁️','🏃','🌑','🔒','💀','🌊','🌙','⛓️','🩸','🌿','🔴','🌪️','🦴','🧿','🌒','⚔️','🕷️','🌀','🎭','🏹','🌫️','🔱','🦂','💣','🌟','💧']

export default function TpnPage({ onClose }) {
  return (
    <GenericMangaPage
      chaptersData={CHAPTERS}
      videosData={VIDEOS}
      color="#6c5ce7"
      namespace="tpn"
      title="The Promised Neverland"
      headerEmoji="🌿"
      emojiList={EMOJIS}
      arcsData={MANGA_ARCS.tpn}
      onClose={onClose}
    />
  )
}
