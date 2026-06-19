// Brams Phone — phase DESSIN. Affiche la consigne (texte du round précédent),
// le canvas, le minuteur. Submit = upload R2 puis submit(url). Auto-submit à 0s.
import { useEffect, useRef, useState } from 'react'
import { type } from '../../styles/typography.js'
import { C, alpha, KEYFRAMES } from './theme.js'
import { Btn, PhaseFrame, Waiting } from './ui.jsx'
import DrawCanvas from './DrawCanvas.jsx'
import { uploadDrawing } from '../../lib/garticUpload.js'

export default function DrawPhase({ room, remaining, total, mySubmitted, prevPage, submit }) {
  const canvasRef = useRef(null)
  const [prompt, setPrompt] = useState(null)
  const [loadingPrompt, setLoadingPrompt] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submittedRef = useRef(false)
  // Round figé au montage de CETTE phase dessin. L'upload R2 est lent : si l'hôte avance
  // pendant l'envoi, le serveur écrirait la page sur la mauvaise manche → « Dessin manquant ».
  // (DrawPhase remonte à chaque phase via key={status}, donc ce ref = la bonne manche.)
  const drawRoundRef = useRef(room?.current_round)
  // Anti faux auto-submit : n'auto-soumet que si la phase a vraiment eu du temps (remaining
  // vu > 3s). Sinon un transitoire remaining<=1.5 au tout début verrouillait le dessin.
  const sawTimeRef = useRef(false)

  useEffect(() => {
    let alive = true
    setLoadingPrompt(true)
    prevPage().then((p) => { if (alive) { setPrompt(p?.content || ''); setLoadingPrompt(false) } })
      .catch(() => { if (alive) setLoadingPrompt(false) })
    return () => { alive = false }
  }, [prevPage])

  const doSubmit = async (auto) => {
    if (submittedRef.current || busy) return
    if (!canvasRef.current) return
    setBusy(true); setErr('')
    try {
      const url = await uploadDrawing(canvasRef.current, room.code)
      submittedRef.current = true
      await submit(url, drawRoundRef.current)
    } catch (e) {
      if (e?.code === 'login_required') setErr('Connecte-toi pour dessiner et envoyer.')
      else setErr('Envoi du dessin impossible. Réessaie.')
      if (auto) submittedRef.current = false // laisse l'hôte gérer le placeholder
    } finally {
      setBusy(false)
    }
  }

  // Auto-submit ~1,5 s AVANT la fin : l'upload R2 (toBlob → presign → PUT) prend 1-3 s.
  // Démarrer pile à 0 s perdait la course contre l'avance de l'hôte → dessin manquant.
  useEffect(() => {
    if (remaining != null && remaining > 3) sawTimeRef.current = true
    if (remaining != null && remaining <= 1.5 && sawTimeRef.current && !submittedRef.current && !busy && !mySubmitted) doSubmit(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, mySubmitted])

  if (mySubmitted || submittedRef.current) {
    return (
      <PhaseFrame eyebrow="Phase dessin" prompt="Dessin envoyé !" remaining={remaining} total={total}>
        <Waiting label="En attente des autres pirates…" />
      </PhaseFrame>
    )
  }

  return (
    <>
      <style>{KEYFRAMES}</style>
      <PhaseFrame
        eyebrow="Dessine cette phrase"
        prompt={loadingPrompt ? '…' : (prompt || 'Dessine ce que t\'inspire ce carnet.')}
        remaining={remaining} total={total}
        footer={
          <>
            {err && <span style={{ ...type.small, color: C.danger, marginRight: 'auto', alignSelf: 'center' }}>{err}</span>}
            <Btn variant="gold" disabled={busy} onClick={() => doSubmit(false)}>{busy ? 'Envoi…' : 'Valider mon dessin'}</Btn>
          </>
        }
      >
        <div style={{ marginBottom: 4, padding: '10px 14px', borderRadius: 12, background: alpha(C.gold, 0.08), border: `1px solid ${C.hair}`, marginTop: -4 }}>
          <span style={{ ...type.eyebrow, color: C.gold }}>À illustrer</span>
          <div style={{ ...type.body, color: C.text, marginTop: 4 }}>{loadingPrompt ? 'Chargement…' : (prompt || '—')}</div>
        </div>
        <DrawCanvas canvasRef={canvasRef} disabled={busy} />
      </PhaseFrame>
    </>
  )
}
