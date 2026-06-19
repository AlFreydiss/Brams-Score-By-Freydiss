// Brams Phone — phase DESCRIPTION. Montre le dessin du round précédent (URL R2),
// textarea légende, minuteur, Submit. Auto-submit à 0s.
import { useEffect, useRef, useState } from 'react'
import { type, fonts } from '../../styles/typography.js'
import { C, alpha, KEYFRAMES } from './theme.js'
import { Btn, PhaseFrame, Waiting } from './ui.jsx'

export default function DescribePhase({ remaining, total, mySubmitted, prevPage, submit }) {
  const [img, setImg] = useState(null)
  const [loadingImg, setLoadingImg] = useState(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const submittedRef = useRef(false)

  // Le dessin à décrire peut encore être en cours d'upload R2 quand cette phase démarre
  // (upload lent terminé après l'avance de l'hôte). On re-tente quelques fois avant
  // d'afficher « indisponible », au lieu de figer le placeholder sur le premier fetch vide.
  useEffect(() => {
    let alive = true, tries = 0
    setLoadingImg(true)
    const poll = () => {
      prevPage().then((p) => {
        if (!alive) return
        const c = p?.content || ''
        if (c) { setImg(c); setLoadingImg(false); return }
        if (++tries < 6) { setTimeout(poll, 1200); return } // ~7 s de grâce
        setImg(''); setLoadingImg(false)
      }).catch(() => { if (alive) { if (++tries < 6) setTimeout(poll, 1200); else setLoadingImg(false) } })
    }
    poll()
    return () => { alive = false }
  }, [prevPage])

  const doSubmit = async (auto) => {
    if (submittedRef.current || busy) return
    const val = text.trim()
    if (!val && !auto) return
    setBusy(true)
    submittedRef.current = true
    await submit(val || '—')
    setBusy(false)
  }

  useEffect(() => {
    if (remaining != null && remaining <= 0 && !submittedRef.current && !mySubmitted) doSubmit(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, mySubmitted])

  if (mySubmitted || submittedRef.current) {
    return (
      <PhaseFrame eyebrow="Phase description" prompt="Légende envoyée !" remaining={remaining} total={total}>
        <Waiting label="En attente des autres pirates…" />
      </PhaseFrame>
    )
  }

  return (
    <>
      <style>{KEYFRAMES}</style>
      <PhaseFrame
        eyebrow="Que représente ce dessin ?"
        prompt="Devine la scène — le voisin la redessinera."
        remaining={remaining} total={total}
        footer={<Btn variant="gold" disabled={busy || !text.trim()} onClick={() => doSubmit(false)}>{busy ? 'Envoi…' : 'Valider ma description'}</Btn>}
      >
        <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.hairTop}`, background: '#fff', marginBottom: 14, minHeight: 200, display: 'grid', placeItems: 'center' }}>
          {loadingImg ? (
            <div style={{ ...type.body, color: '#888', padding: 40 }}>Chargement du dessin…</div>
          ) : img ? (
            <img src={img} alt="Dessin à décrire" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 460, objectFit: 'contain' }} />
          ) : (
            <div style={{ ...type.body, color: '#888', padding: 40, textAlign: 'center' }}>Dessin indisponible — décris ce que tu imagines.</div>
          )}
        </div>
        <textarea
          autoFocus
          value={text}
          maxLength={140}
          onChange={(e) => setText(e.target.value)}
          placeholder="Décris la scène…"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doSubmit(false) }}
          style={{
            width: '100%', minHeight: 88, resize: 'vertical', boxSizing: 'border-box',
            padding: '14px 16px', borderRadius: 14, fontFamily: fonts.body, fontSize: 16, lineHeight: 1.5,
            color: C.text, background: alpha(C.gold, 0.05), border: `1px solid ${C.hair}`, outline: 'none',
          }}
        />
        <div style={{ ...type.small, color: C.textFaint, marginTop: 8, textAlign: 'right' }}>{text.length}/140</div>
      </PhaseFrame>
    </>
  )
}
