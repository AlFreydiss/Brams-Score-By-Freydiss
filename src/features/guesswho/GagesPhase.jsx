import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { C, FONT_DISPLAY, SPRING_POP, type, Btn, PhaseFrame, LiveRoster } from './manga.jsx'
import { play, vibrate } from './sfx.js'

export const roster = (g, ids) => new Set(g.players.filter((p) => (ids || []).includes(p.user_id)).map((p) => p.seat))

// Idées pour débloquer la page blanche (un tap remplit le champ).
const IDEAS = [
  "Chanter l'opening de One Piece en vocal",
  'Parler comme un méchant de shōnen pendant 5 min',
  'Crier « KAMEHAMEHA » en vocal',
  'Mettre une photo de profil choisie par le groupe',
  'Faire 15 pompes en caméra',
  'Imiter son perso préféré pendant 3 tours',
]

export default function GagesPhase({ g }) {
  // Gage déjà envoyé (retrouvé après rechargement) : pré-rempli.
  const [text, setText] = useState(g.myGage || '')
  const [sent, setSent] = useState(!!(g.me?.has_gage || g.myGage))
  const [err, setErr] = useState(null)
  const [ideas] = useState(() => [...IDEAS].sort(() => Math.random() - 0.5).slice(0, 3))
  const touched = useRef(false)
  useEffect(() => {
    if (!g.myGage) return
    setSent(true)
    if (!touched.current) setText(g.myGage)
  }, [g.myGage])
  const edit = (v) => { touched.current = true; setText(v) }
  const send = async () => {
    const r = await g.act.gage(text)
    if (r?.ok) { setSent(true); setErr(null); play('select'); vibrate(25) } else setErr(r?.error === 'empty' ? 'Écris un gage.' : 'Envoi impossible, réessaie.')
  }
  // rien à renvoyer si le texte est celui déjà enregistré
  const same = sent && !!g.myGage && text.trim() === g.myGage.trim()
  return (
    <PhaseFrame tick eyebrow="Avant de jouer" prompt="Écris un gage" remaining={g.remaining} total={g.total}
      footer={g.me && <Btn onClick={send} disabled={!text.trim() || same} style={{ minWidth: 180 }}>{same ? '✓ Gage envoyé' : sent ? 'Modifier mon gage' : 'Envoyer ✍️'}</Btn>}>
      <p style={{ ...type.body, color: C.textMut, marginTop: 0 }}>
        Il sera peut-être tiré pour le premier éliminé (jamais pour toi). Personne ne le voit avant.
      </p>
      {g.me ? (
        <div style={{ position: 'relative' }}>
          <textarea value={text} maxLength={140} onChange={(e) => edit(e.target.value)} rows={3}
            placeholder="Ex. : chanter l'opening de One Piece en vocal" aria-label="Ton gage"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim()) send() }}
            className="gw-focus" style={{ width: '100%', borderRadius: 0, padding: 14, background: C.paper, ...type.body, fontSize: 17,
              color: C.ink, border: `3px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, resize: 'vertical', boxSizing: 'border-box' }} />
          {sent && (
            <motion.span key="stamp" aria-label="gage envoyé" initial={{ scale: 2.4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -10 }}
              transition={{ type: 'spring', stiffness: 600, damping: 13 }}
              style={{
                position: 'absolute', right: 10, top: -16, background: C.red, color: '#fff', border: `3px solid ${C.ink}`,
                fontFamily: FONT_DISPLAY, fontSize: 15, padding: '2px 10px', boxShadow: `3px 3px 0 ${C.ink}`, pointerEvents: 'none',
              }}>ENVOYÉ !</motion.span>
          )}
          <div style={{ ...type.small, color: text.length > 125 ? C.danger : C.textMut, textAlign: 'right', marginTop: 6 }}>{text.length}/140</div>
          {!text && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ ...type.small, color: C.textMut, alignSelf: 'center' }}>En panne d'idée ?</span>
              {ideas.map((t, i) => (
                <motion.button key={t} type="button" className="gw-btn" onClick={() => edit(t)}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_POP, delay: i * 0.06 }}
                  style={{
                    minHeight: 44, padding: '6px 12px', cursor: 'pointer', textAlign: 'left', ...type.small, color: C.ink,
                    background: C.paper, border: `2px dashed ${C.ink}`,
                  }}>{t}</motion.button>
              ))}
            </div>
          )}
        </div>
      ) : <p style={{ ...type.body, color: C.textMut }}>Les joueurs écrivent leur gage…</p>}
      {err && <p role="alert" style={{ ...type.body, color: C.danger }}>{err}</p>}
      <LiveRoster players={g.players} submittedSeats={roster(g, g.prog?.gaged)} meUserId={g.me?.user_id} label="ont écrit leur gage" />
    </PhaseFrame>
  )
}
