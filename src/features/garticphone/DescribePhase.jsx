// Brams Phone — phase DESCRIPTION. Montre le dessin du round précédent (URL R2),
// textarea légende, minuteur, Submit. Auto-submit à 0s.
import { useEffect, useRef, useState } from 'react'
import { type, fonts } from '../../styles/typography.js'
import { C, alpha, KEYFRAMES } from './theme.js'
import { Btn, PhaseFrame, Waiting } from './ui.jsx'

export default function DescribePhase({ remaining, total, mySubmitted, prevPage, submit, submittedLabel, draftKey }) {
  const [img, setImg] = useState(null)
  // null = on attend encore (loader bref) ; '' = grâce épuisée → fallback ; sinon = URL.
  const [loadingImg, setLoadingImg] = useState(true)
  const [text, setText] = useState(() => { try { return (draftKey && localStorage.getItem(draftKey)) || '' } catch { return '' } })
  const [busy, setBusy] = useState(false)
  const submittedRef = useRef(false)
  // remaining live, lu dans le poll sans relancer l'effet à chaque tick.
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining
  // Garde anti faux auto-submit : on n'auto-soumet QUE si la phase a réellement eu du temps
  // (remaining vu > 2s). Sinon un transitoire où remaining lit 0 au tout début de la phase
  // (reconnexion / propagation du nouveau phase_ends_at) verrouillait le joueur en "envoyé"
  // sans qu'il ait rien fait.
  const sawTimeRef = useRef(false)

  // Le dessin à décrire peut encore être en cours d'upload R2 quand cette phase démarre
  // (upload lent terminé après l'avance de l'hôte). On re-tente en arrière-plan SANS bloquer
  // l'UI : le textarea est utilisable tout de suite (fallback affiché), et l'image est
  // injectée si/quand elle arrive. La grâce est bornée par le temps (≈7 s) OU le temps de
  // phase restant — sur une phase « rush » de 25 s un fetch lent (10 s de timeout chacun) ne
  // doit pas voler tout le temps de réflexion du joueur.
  useEffect(() => {
    let alive = true
    const t0 = Date.now()
    setLoadingImg(true)
    const stop = () => { if (alive) setLoadingImg(false) }
    const poll = () => {
      prevPage().then((p) => {
        if (!alive) return
        const c = p?.content || ''
        if (c) { setImg(c); setLoadingImg(false); return } // image arrivée, même tardive
        const elapsed = (Date.now() - t0) / 1000
        const rem = remainingRef.current
        // Arrêt si : grâce épuisée (~7 s), OU phase presque finie (≤3 s → place pour taper),
        // OU la grâce restante dépasse le temps de phase restant.
        if (elapsed >= 7 || (rem != null && rem <= 3) || (rem != null && rem < elapsed + 1.2)) { stop(); return }
        setTimeout(poll, 1200)
      }).catch(() => {
        if (!alive) return
        const elapsed = (Date.now() - t0) / 1000
        const rem = remainingRef.current
        if (elapsed >= 7 || (rem != null && rem <= 3)) { stop(); return }
        setTimeout(poll, 1200)
      })
    }
    poll()
    return () => { alive = false }
  }, [prevPage])

  // Brouillon : persiste la légende (survit refresh/reco), purgée à la soumission.
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
    if (remaining != null && remaining > 2) sawTimeRef.current = true
    if (remaining != null && remaining <= 0 && sawTimeRef.current && !submittedRef.current && !mySubmitted) doSubmit(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, mySubmitted])

  if (mySubmitted || submittedRef.current) {
    return (
      <PhaseFrame eyebrow="Phase description" prompt="Légende envoyée !" remaining={remaining} total={total}>
        <Waiting label={submittedLabel || 'En attente des autres pirates…'} />
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
          {img ? (
            <img src={img} alt="Dessin à décrire" data-bp-anim style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 460, objectFit: 'contain', animation: 'bp-rise .35s ease-out' }} />
          ) : loadingImg ? (
            <div style={{ ...type.body, color: '#888', padding: 40, textAlign: 'center' }}>
              Chargement du dessin… <span style={{ display: 'block', marginTop: 6, ...type.small, color: C.textFaint }}>tu peux déjà commencer à décrire ce que tu imagines.</span>
            </div>
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
