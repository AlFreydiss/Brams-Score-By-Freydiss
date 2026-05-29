import { useState, useEffect, useRef } from 'react'
import { searchGifs, gifConfigured, GIF_CATEGORIES } from '../../lib/gifProvider.js'
import { T } from './socialStyles.js'

// Panel GIF premium au-dessus du composer. onSelect(url) envoie le GIF.
export default function GifPicker({ onSelect }) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState([])
  const [loading, setLoading] = useState(true)
  const debounce = useRef(null)

  const run = (q) => {
    setLoading(true)
    searchGifs(q).then(g => { setGifs(g); setLoading(false) })
  }
  useEffect(() => { run('') }, [])
  useEffect(() => {
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => run(query), 350)
    return () => clearTimeout(debounce.current)
  }, [query])

  return (
    <div style={{ borderTop: `1px solid ${T.border}`, background: T.surface, padding: 10, maxHeight: 280, display: 'flex', flexDirection: 'column' }}>
      <input
        value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un GIF…" autoFocus
        style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 13, background: T.bg, border: `1px solid ${T.border}`, color: T.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {GIF_CATEGORIES.map(c => (
          <button key={c} onClick={() => setQuery(c)} style={{
            padding: '4px 10px', borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            background: query === c ? T.violetSoft : T.surface2, color: query === c ? T.violet : T.textDim,
            border: 'none', fontFamily: 'inherit',
          }}>{c}</button>
        ))}
      </div>
      {!gifConfigured && (
        <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 6 }}>
          Mode démo (quelques GIF). Ajoute <code style={{ color: T.goldSoft }}>VITE_TENOR_KEY</code> pour la recherche complète.
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ paddingTop: '75%', background: T.surface2, borderRadius: 8, animation: 'pulse 1.5s infinite' }} />)
          : gifs.length === 0
            ? <div style={{ gridColumn: '1/-1', textAlign: 'center', color: T.textFaint, fontSize: 12, padding: 16 }}>Aucun GIF trouvé.</div>
            : gifs.map(g => (
              <button key={g.id} onClick={() => onSelect(g.url)} style={{ border: 'none', padding: 0, background: T.surface2, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1.3' }}>
                <img src={g.preview} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
      </div>
    </div>
  )
}
