// ── MoveList : coups SAN, 2 colonnes numérotées, clic = saut, scrollable ────
// `historique` = chess.js verbose moves. `curseur` = index du demi-coup affiché
// (-1 = position initiale, length-1 = dernière). Clic sur un coup → onAller(i).
import { useEffect, useRef } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'

const BRASS = '#81b64c'

export default function MoveList({ historique, curseur, onAller }) {
  const refActif = useRef(null)
  const scrollRef = useRef(null)

  // auto-scroll sur le coup courant
  useEffect(() => {
    if (refActif.current && scrollRef.current) {
      const el = refActif.current
      const box = scrollRef.current
      const haut = el.offsetTop, bas = haut + el.offsetHeight
      if (haut < box.scrollTop || bas > box.scrollTop + box.clientHeight) {
        box.scrollTop = haut - box.clientHeight / 2
      }
    }
  }, [curseur])

  // regroupe en paires (blanc, noir) par numéro de coup
  const paires = []
  for (let i = 0; i < historique.length; i += 2) {
    paires.push({ n: i / 2 + 1, blanc: historique[i], noir: historique[i + 1], iB: i, iN: i + 1 })
  }

  const Coup = ({ mv, idx }) => {
    if (!mv) return <span style={{ flex: 1 }} />
    const actif = idx === curseur
    return (
      <button
        ref={actif ? refActif : null}
        onClick={() => onAller(idx)}
        style={{
          flex: 1, textAlign: 'left', padding: '3px 7px', borderRadius: 5,
          cursor: 'pointer', border: 'none',
          background: actif ? 'rgba(129,182,76,0.18)' : 'transparent',
          color: actif ? '#e7d8b8' : ui.text,
          font: `${actif ? 700 : 600} 13px ${fonts.mono}`,
          fontVariantNumeric: 'tabular-nums',
          transition: 'background .12s, color .12s',
        }}
        onMouseEnter={e => { if (!actif) e.currentTarget.style.background = ui.surfaceHi }}
        onMouseLeave={e => { if (!actif) e.currentTarget.style.background = 'transparent' }}
      >
        {mv.san}
      </button>
    )
  }

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        background: ui.bg, borderRadius: ui.radius.sm,
        border: `1px solid ${ui.line}`, padding: 4,
      }}
    >
      {paires.length === 0 && (
        <div style={{ padding: '14px 10px', textAlign: 'center', color: ui.textMute, font: `500 12.5px ${fonts.body}` }}>
          Aucun coup joué
        </div>
      )}
      {paires.map((p, row) => (
        <div key={p.n} style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: row % 2 ? 'transparent' : 'rgba(255,255,255,0.015)',
          borderRadius: 5,
        }}>
          <span style={{
            width: 28, flexShrink: 0, textAlign: 'right', paddingRight: 6,
            color: ui.textMute, font: `600 12px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
          }}>{p.n}.</span>
          <Coup mv={p.blanc} idx={p.iB} />
          <Coup mv={p.noir} idx={p.iN} />
        </div>
      ))}
      <style>{`button:focus-visible{outline:2px solid ${BRASS};outline-offset:1px}`}</style>
    </div>
  )
}
