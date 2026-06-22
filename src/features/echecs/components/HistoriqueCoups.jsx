// ── Historique des coups en SAN, numéroté, scroll auto sur le dernier ───────
// Chaque coup est cliquable : `onSelectPly(index)` reçoit l'indice du demi-coup
// (0-based). `plySelectionne` surligne le coup courant. Sans onSelectPly, le
// composant reste purement informatif (rétro-compatible).
import { useEffect, useRef } from 'react'
import { THEME } from '../constants.js'

export default function HistoriqueCoups({ historique = [], hauteur = 180, onSelectPly = null, plySelectionne = null }) {
  const finRef = useRef(null)
  useEffect(() => { finRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [historique.length])

  const lignes = []
  for (let i = 0; i < historique.length; i += 2) {
    lignes.push({ n: i / 2 + 1, blanc: historique[i]?.san, noir: historique[i + 1]?.san, iBlanc: i, iNoir: i + 1 })
  }

  const cellule = (san, ply, dernierGlobal) => {
    if (!san) return <span style={{ width: 64 }} />
    const actif = plySelectionne === ply || (plySelectionne == null && dernierGlobal)
    const cliquable = !!onSelectPly
    return (
      <span
        onClick={cliquable ? () => onSelectPly(ply) : undefined}
        title={cliquable ? 'Revenir à cette position' : undefined}
        style={{
          width: 64, padding: '2px 6px', borderRadius: 5, color: THEME.text, fontWeight: 600,
          fontFamily: THEME.fontMono, fontVariantNumeric: 'tabular-nums', fontSize: 13,
          cursor: cliquable ? 'pointer' : 'default',
          background: actif ? 'rgba(200,164,92,0.18)' : 'transparent',
          boxShadow: actif ? 'inset 0 0 0 1px rgba(200,164,92,0.40)' : 'none',
          transition: 'background .12s',
        }}
        onMouseEnter={cliquable ? e => { if (!actif) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' } : undefined}
        onMouseLeave={cliquable ? e => { if (!actif) e.currentTarget.style.background = 'transparent' } : undefined}
      >
        {san}
      </span>
    )
  }

  return (
    <div style={{
      background: THEME.card, border: `1px solid ${THEME.cardBorder}`, borderRadius: 14,
      padding: '10px 4px 10px 12px', height: hauteur, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: THEME.muted, marginBottom: 6, fontFamily: THEME.fontBody }}>
        Coups
      </div>
      <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
        {lignes.length === 0 && (
          <div style={{ color: THEME.muted, fontSize: 13, fontStyle: 'italic', paddingTop: 8 }}>La partie n'a pas encore commencé…</div>
        )}
        {lignes.map((l, idx) => {
          const estDerniere = idx === lignes.length - 1
          const dernierEstNoir = historique.length % 2 === 0
          return (
            <div key={l.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '1px 6px', fontSize: 13.5, fontFamily: THEME.fontBody, background: idx % 2 ? 'transparent' : 'rgba(255,255,255,0.018)', borderRadius: 5 }}>
              <span style={{ width: 26, color: THEME.muted, fontFamily: THEME.fontMono, fontVariantNumeric: 'tabular-nums' }}>{l.n}.</span>
              {cellule(l.blanc, l.iBlanc, estDerniere && !dernierEstNoir)}
              {cellule(l.noir, l.iNoir, estDerniere && dernierEstNoir)}
            </div>
          )
        })}
        <div ref={finRef} />
      </div>
    </div>
  )
}
