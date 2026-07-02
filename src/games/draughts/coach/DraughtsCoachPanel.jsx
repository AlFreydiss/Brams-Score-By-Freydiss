// ── DraughtsCoachPanel : le coach IA des Dames. Deux aides distinctes :
//   • Indice  → meilleur coup moteur remonté au parent via onHint(move)
//               (c'est le board qui surligne — le panel ne dessine rien).
//   • Conseil → explication en français du plan (Claude via /api/chat, game 'dames').
// + chat coach : question libre du joueur, avec la position en contexte.
// Adapté du CoachPanel échecs — 2D stricte, chrome sobre, styles inline only.
import { useRef, useState } from 'react'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { useDraughtsCoach } from './useDraughtsCoach.js'
import { meilleurCoupDames, notationCoupDames } from './draughtsCoachContext.js'

function Btn({ onClick, disabled, accent, primaire, children, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      flex: 1, padding: '9px 10px', borderRadius: ui.radius.sm,
      cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
      font: `700 12.5px ${fonts.body}`,
      color: disabled ? ui.textMute : (primaire ? '#15110a' : ui.text),
      background: disabled ? ui.surface : (primaire ? accent : ui.surface),
      border: `1px solid ${disabled ? ui.line : (primaire ? accent : ui.line)}`,
      opacity: disabled ? 0.55 : 1, transition: 'filter .15s, border-color .15s',
    }}
      onMouseEnter={e => { if (!disabled && primaire) e.currentTarget.style.filter = 'brightness(1.07)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
    >{children}</button>
  )
}

export default function DraughtsCoachPanel({
  board, trait, rules, dernierCoup, onHint,
  accent = ui.accent, actif = true,
}) {
  const { texte, loading, erreur, demander } = useDraughtsCoach()
  const [q, setQ] = useState('')
  const [lastQ, setLastQ] = useState('')
  const [calcul, setCalcul] = useState(false)      // recherche moteur sync en cours
  const [indiceTexte, setIndiceTexte] = useState('')
  const cacheRef = useRef(null)                    // { board, trait, mv } — évite 2 recherches sur la même position

  const size = rules?.size || 10
  const peutAider = !!actif && !calcul

  // Recherche moteur différée d'un tick (laisse React peindre l'état "calcul")
  // puis rend le meilleur coup à `suite`. Cache par référence de plateau.
  const avecMeilleurCoup = (suite) => {
    const cache = cacheRef.current
    if (cache && cache.board === board && cache.trait === trait) { suite(cache.mv); return }
    setCalcul(true)
    setTimeout(() => {
      let mv = null
      try { mv = meilleurCoupDames(board, trait, rules) } catch { /* moteur : on n'affiche rien */ }
      cacheRef.current = { board, trait, mv }
      setCalcul(false)
      suite(mv)
    }, 30)
  }

  const indice = () => {
    if (!peutAider) return
    avecMeilleurCoup((mv) => {
      if (!mv) return
      setIndiceTexte(notationCoupDames(mv, size))
      onHint?.(mv)
    })
  }

  const conseil = () => {
    if (!peutAider || loading) return
    setLastQ('')
    avecMeilleurCoup((mv) => demander({ board, trait, rules, dernierCoup, meilleurCoup: mv }))
  }

  const envoyer = () => {
    const t = q.trim()
    if (!t || !peutAider || loading) return
    setLastQ(t)
    setQ('')
    avecMeilleurCoup((mv) => demander({ board, trait, rules, dernierCoup, meilleurCoup: mv, question: t }))
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 9,
      padding: '11px 12px', borderRadius: ui.radius.sm,
      background: ui.surface, border: `1px solid ${ui.line}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span aria-hidden style={{
          width: 7, height: 7, borderRadius: 2, background: accent,
          boxShadow: `0 0 8px ${accent}`,
        }} />
        <span style={{ font: `800 12px ${fonts.body}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>
          Coach IA
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <Btn onClick={indice} disabled={!peutAider} accent={accent} title="Surligne le meilleur coup sur le damier">
          💡 Indice{indiceTexte ? ` · ${indiceTexte}` : ''}
        </Btn>
        <Btn onClick={conseil} disabled={!peutAider || loading} accent={accent} primaire title="Le coach explique le plan en français">
          {calcul ? 'Analyse…' : (loading ? 'Le coach réfléchit…' : '🎓 Conseil')}
        </Btn>
      </div>

      {(texte || erreur || loading || lastQ) && (
        <div style={{
          maxHeight: 240, overflowY: 'auto',
          padding: '9px 11px', borderRadius: ui.radius.sm,
          background: ui.bg || 'rgba(0,0,0,0.25)', border: `1px solid ${ui.line}`,
          font: `400 13px/1.55 ${fonts.body}`, color: ui.textDim, whiteSpace: 'pre-wrap',
        }}>
          {lastQ && (
            <div style={{ marginBottom: 7, paddingBottom: 7, borderBottom: `1px solid ${ui.line}` }}>
              <span style={{ font: `700 11px ${fonts.body}`, color: accent }}>Toi · </span>
              <span style={{ color: ui.text }}>{lastQ}</span>
            </div>
          )}
          {erreur
            ? <span style={{ color: '#e0a3a3' }}>{erreur}</span>
            : (texte || (loading ? 'Le coach réfléchit…' : ''))}
        </div>
      )}

      {!texte && !erreur && !loading && !lastQ && (
        <p style={{ margin: 0, font: `400 11.5px ${fonts.body}`, color: ui.textMute, lineHeight: 1.45 }}>
          Bloqué ? Demande le meilleur coup, un conseil, ou pose ta question au coach ci-dessous.
        </p>
      )}

      {/* Chat coach : question libre (« quel coup jouer ? », « pourquoi ? »…) */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') envoyer() }}
          placeholder="Demande au coach… (quel coup ? pourquoi ?)"
          disabled={!peutAider || loading}
          style={{
            flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: ui.radius.sm,
            background: ui.bg || 'rgba(0,0,0,0.25)', border: `1px solid ${ui.line}`,
            font: `400 12.5px ${fonts.body}`, color: ui.text, outline: 'none',
          }}
        />
        <Btn onClick={envoyer} disabled={!peutAider || loading || !q.trim()} accent={accent} primaire title="Envoyer la question au coach">
          ↑
        </Btn>
      </div>
    </div>
  )
}
