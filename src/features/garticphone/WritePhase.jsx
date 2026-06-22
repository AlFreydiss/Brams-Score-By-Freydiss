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
  const [err, setErr] = useState('')
  const submittedRef = useRef(false)
  const lastTryRef = useRef(0) // throttle des retries auto
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
    if (auto) { const now = Date.now(); if (now - lastTryRef.current < 1000) return; lastTryRef.current = now }
    setBusy(true); setErr('')
    const out = await submit(val || '—')
    // Échec réseau : on NE marque PAS comme envoyé (brouillon conservé, retry possible / l'auto relance).
    if (out && out.error) { setBusy(false); setErr('Envoi raté — on réessaie…'); return }
    submittedRef.current = true
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
          {err && <span style={{ ...type.small, color: C.danger, alignSelf: 'center' }}>{err}</span>}
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
          onFocus={(e) => { e.currentTarget.style.borderColor = alpha(C.gold, 0.55); e.currentTarget.style.boxShadow = `0 0 0 3px ${alpha(C.gold, 0.14)}` }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.hair; e.currentTarget.style.boxShadow = 'none' }}
          style={{
            width: '100%', minHeight: 124, resize: 'vertical', boxSizing: 'border-box',
            padding: '16px 18px', borderRadius: 14, fontFamily: fonts.body, fontSize: 16, lineHeight: 1.5,
            color: C.text, background: alpha(C.gold, 0.05), border: `1px solid ${C.hair}`, outline: 'none',
            transition: 'border-color .2s, box-shadow .2s',
          }}
        />
        <div style={{ ...type.small, color: C.textFaint, marginTop: 8, textAlign: 'right' }}>{text.length}/140 · Ctrl+Entrée pour valider</div>
      </PhaseFrame>
    </>
  )
}
