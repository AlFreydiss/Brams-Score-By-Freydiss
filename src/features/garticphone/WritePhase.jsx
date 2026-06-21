// Freydiss Phone — phase ÉCRITURE (round 0). Textarea pour la phrase de départ,
// minuteur, Submit. Auto-submit à 0s (même vide → l'hôte comblera).
import { useEffect, useRef, useState } from 'react'
import { type, fonts } from '../../styles/typography.js'
import { C, alpha, KEYFRAMES } from './theme.js'
import { Btn, PhaseFrame, Waiting } from './ui.jsx'

const IDEAS = [
  'Luffy mange un fruit du démon périmé',
  'Un Marine fait du yoga avec Bartholomew Kuma',
  'Zoro se perd dans un supermarché',
  'Nami vend le Thousand Sunny aux enchères',
]

export default function WritePhase({ remaining, total, mySubmitted, submit, submittedLabel, draftKey }) {
  const [text, setText] = useState(() => { try { return (draftKey && localStorage.getItem(draftKey)) || '' } catch { return '' } })
  const [busy, setBusy] = useState(false)
  const submittedRef = useRef(false)
  const [ph, setPh] = useState(() => IDEAS[Math.floor(Math.random() * IDEAS.length)])

  // Brouillon : persiste le texte (survit refresh/reco), purgé à la soumission.
  useEffect(() => {
    if (!draftKey) return
    try { text ? localStorage.setItem(draftKey, text) : localStorage.removeItem(draftKey) } catch {}
  }, [text, draftKey])

  const doSubmit = async (auto) => {
    if (submittedRef.current || busy) return
    const val = text.trim()
    if (!val && !auto) return
    setBusy(true)
    submittedRef.current = true
    await submit(val || '—')
    try { if (draftKey) localStorage.removeItem(draftKey) } catch {}
    setBusy(false)
  }

  useEffect(() => {
    if (remaining != null && remaining <= 0 && !submittedRef.current && !mySubmitted) doSubmit(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, mySubmitted])

  if (mySubmitted || submittedRef.current) {
    return (
      <PhaseFrame eyebrow="Point de départ" prompt="Phrase envoyée !" remaining={remaining} total={total}>
        <Waiting label={submittedLabel || 'En attente des autres pirates…'} />
      </PhaseFrame>
    )
  }

  return (
    <>
      <style>{KEYFRAMES}</style>
      <PhaseFrame
        eyebrow="Écris la phrase de départ"
        prompt="Lance une scène absurde — le voisin devra la dessiner."
        remaining={remaining} total={total}
        footer={<>
          <Btn variant="ghost" onClick={() => setPh(IDEAS[Math.floor(Math.random() * IDEAS.length)])} style={{ marginRight: 'auto' }}>🎲 Idée</Btn>
          <Btn variant="gold" disabled={busy || !text.trim()} onClick={() => doSubmit(false)}>{busy ? 'Envoi…' : 'Valider ma phrase'}</Btn>
        </>}
      >
        <textarea
          autoFocus
          value={text}
          maxLength={140}
          onChange={(e) => setText(e.target.value)}
          placeholder={`ex. ${ph}`}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doSubmit(false) }}
          style={{
            width: '100%', minHeight: 120, resize: 'vertical', boxSizing: 'border-box',
            padding: '16px 18px', borderRadius: 14, fontFamily: fonts.body, fontSize: 17, lineHeight: 1.5,
            color: C.text, background: alpha(C.gold, 0.05), border: `1px solid ${C.hair}`, outline: 'none',
          }}
        />
        <div style={{ ...type.small, color: C.textFaint, marginTop: 8, textAlign: 'right' }}>{text.length}/140 · Ctrl+Entrée pour valider</div>
      </PhaseFrame>
    </>
  )
}
