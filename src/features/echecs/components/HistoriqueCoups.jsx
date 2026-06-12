// ── Historique des coups en SAN, numéroté, scroll auto sur le dernier ───────
import { useEffect, useRef } from 'react'
import { THEME } from '../constants.js'

export default function HistoriqueCoups({ historique = [], hauteur = 180 }) {
  const finRef = useRef(null)
  useEffect(() => { finRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [historique.length])

  const lignes = []
  for (let i = 0; i < historique.length; i += 2) {
    lignes.push({ n: i / 2 + 1, blanc: historique[i]?.san, noir: historique[i + 1]?.san })
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
          return (
            <div key={l.n} style={{ display: 'flex', gap: 8, padding: '3px 6px', borderRadius: 6, background: estDerniere ? 'rgba(255,215,0,0.06)' : 'transparent', fontSize: 13.5, fontFamily: THEME.fontBody }}>
              <span style={{ width: 26, color: THEME.muted, fontVariantNumeric: 'tabular-nums' }}>{l.n}.</span>
              <span style={{ width: 64, color: THEME.text, fontWeight: 600 }}>{l.blanc || ''}</span>
              <span style={{ width: 64, color: l.noir ? THEME.text : THEME.muted, fontWeight: 600 }}>{l.noir || ''}</span>
            </div>
          )
        })}
        <div ref={finRef} />
      </div>
    </div>
  )
}
