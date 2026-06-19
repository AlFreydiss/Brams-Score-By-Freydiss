import { useState, useEffect, useRef, useCallback } from 'react'
import { CINE, GOLD_GRAD, CineStyles, Reveal } from './home/cine.jsx'

const QUOTES = [
  { text: "Je vais devenir le Roi des Pirates !", author: "Monkey D. Luffy", ep: "Épisode 1" },
  { text: "Un homme qui abandonne quelque chose ne mérite pas de le retrouver.", author: "Roronoa Zoro", ep: "Épisode 24" },
  { text: "Les rêves ne meurent jamais tant qu'il reste quelqu'un pour les porter.", author: "Monkey D. Luffy", ep: "Épisode 48" },
  { text: "Je ne regrette rien.", author: "Portgas D. Ace", ep: "Épisode 483" },
  { text: "Ce n'est pas le monde qui est cruel. C'est toi qui es trop faible.", author: "Donquixote Doflamingo", ep: "Épisode 151" },
  { text: "Nul ne peut changer le passé. Mais n'importe qui peut changer l'avenir.", author: "Nico Robin", ep: "Épisode 279" },
  { text: "Même affaibli, un lion reste un lion.", author: "Rayleigh", ep: "Épisode 400" },
  { text: "La force n'est pas la seule chose qui compte dans ce monde.", author: "Shanks", ep: "Épisode 4" },
  { text: "Vouloir la liberté, c'est déjà commencer à l'avoir.", author: "Trafalgar Law", ep: "Épisode 512" },
  { text: "Il n'y a pas de raccourci vers un rêve.", author: "Monkey D. Luffy", ep: "Épisode 220" },
]

export default function QuoteSection() {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)
  const timerRef = useRef(null)

  const goTo = useCallback((nextIdx) => {
    setFade(false)
    setTimeout(() => { setIdx(nextIdx); setFade(true) }, 500)
  }, [])

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setIdx(i => { const n = (i + 1) % QUOTES.length; goTo(n); return i })
    }, 8000)
  }, [goTo])

  useEffect(() => {
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [startTimer])

  const handleNext = () => {
    clearInterval(timerRef.current)
    goTo((idx + 1) % QUOTES.length)
    startTimer()
  }

  const handleDot = (i) => {
    clearInterval(timerRef.current)
    goTo(i)
    startTimer()
  }

  const q = QUOTES[idx]

  return (
    <section style={{ position: 'relative', width: '100%', overflow: 'hidden', padding: 'clamp(48px, 8vh, 92px) 0' }}>
      <CineStyles />

      {/* Filets or estompés en haut/bas — respiration cinématique entre deux blocs lourds */}
      <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${CINE.goldDim}, transparent)`, opacity: 0.45 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${CINE.goldDim}, transparent)`, opacity: 0.45 }} />

      <Reveal style={{ width: '100%', maxWidth: CINE.maxW, margin: '0 auto', padding: '0 clamp(20px, 5vw, 72px)', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center',
          gap: 'clamp(20px, 4vw, 56px)',
        }}>
          {/* Guillemet géant doré, ancré à gauche */}
          <div aria-hidden style={{
            fontFamily: CINE.title, fontWeight: 700, lineHeight: 0.7,
            fontSize: 'clamp(80px, 12vw, 168px)',
            background: GOLD_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            opacity: 0.32, userSelect: 'none', alignSelf: 'start', marginTop: '-0.1em',
          }}>“</div>

          {/* Citation centrale — pleine largeur horizontale */}
          <div style={{ opacity: fade ? 1 : 0, transform: fade ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity .5s ease, transform .5s ease', minWidth: 0 }}>
            <p style={{
              margin: 0, fontFamily: CINE.title, fontWeight: 700, color: CINE.ink,
              fontSize: 'clamp(22px, 3.4vw, 44px)', lineHeight: 1.18, letterSpacing: '-0.02em',
            }}>
              {q.text}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'clamp(16px, 2vw, 26px)', flexWrap: 'wrap' }}>
              <span aria-hidden style={{ width: 'clamp(28px, 5vw, 64px)', height: 1, background: GOLD_GRAD, opacity: 0.8 }} />
              <span style={{ fontFamily: CINE.title, fontSize: 'clamp(14px, 1.4vw, 17px)', fontWeight: 700, letterSpacing: '0.02em', background: GOLD_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {q.author}
              </span>
              <span style={{ fontFamily: CINE.body, fontSize: 12, color: CINE.muted, letterSpacing: '0.04em' }}>· {q.ep}</span>
            </div>
          </div>

          {/* Contrôles, ancrés à droite */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 18, alignSelf: 'center' }}>
            <button onClick={handleNext} aria-label="Autre citation" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
              minHeight: 40, padding: '10px 20px', borderRadius: 100, cursor: 'pointer',
              fontFamily: CINE.title, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
              color: CINE.ink, background: CINE.panel, border: `1px solid ${CINE.hairTop}`,
              transition: 'transform .25s, border-color .25s, background .25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = CINE.panel2; e.currentTarget.style.borderColor = CINE.gold; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = CINE.panel; e.currentTarget.style.borderColor = CINE.hairTop; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <span aria-hidden style={{ color: CINE.gold }}>↻</span> Autre citation
            </button>

            <div style={{ display: 'flex', gap: 6 }}>
              {QUOTES.map((_, i) => (
                <button key={i} onClick={() => handleDot(i)} aria-label={`Citation ${i + 1}`} style={{
                  width: i === idx ? 22 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0,
                  background: i === idx ? GOLD_GRAD : CINE.hairTop,
                  transition: 'width .3s ease, background .3s ease',
                }} />
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
