import { useState, useEffect, useRef, useCallback } from 'react'

const QUOTES = [
  { text: "Je vais devenir le Roi des Pirates !", author: "Monkey D. Luffy", ep: "Épisode 1", color: '#E0524A' },
  { text: "Un homme qui abandonne quelque chose ne mérite pas de le retrouver.", author: "Roronoa Zoro", ep: "Épisode 24", color: '#2ECC71' },
  { text: "Les rêves ne meurent jamais tant qu'il reste quelqu'un pour les porter.", author: "Monkey D. Luffy", ep: "Épisode 48", color: '#E0524A' },
  { text: "Je ne regrette rien.", author: "Portgas D. Ace", ep: "Épisode 483", color: '#F97316' },
  { text: "Ce n'est pas le monde qui est cruel. C'est toi qui es trop faible.", author: "Donquixote Doflamingo", ep: "Épisode 151", color: '#9B59B6' },
  { text: "Nul ne peut changer le passé. Mais n'importe qui peut changer l'avenir.", author: "Nico Robin", ep: "Épisode 279", color: '#3B82F6' },
  { text: "Même affaibli, un lion reste un lion.", author: "Rayleigh", ep: "Épisode 400", color: '#F1C40F' },
  { text: "La force n'est pas la seule chose qui compte dans ce monde.", author: "Shanks", ep: "Épisode 4", color: '#FFD700' },
  { text: "Vouloir la liberté, c'est déjà commencer à l'avoir.", author: "Trafalgar Law", ep: "Épisode 512", color: '#74b9ff' },
  { text: "Il n'y a pas de raccourci vers un rêve.", author: "Monkey D. Luffy", ep: "Épisode 220", color: '#E0524A' },
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
    <section style={{
      position: 'relative', overflow: 'hidden',
      padding: '100px 0', textAlign: 'center',
      background: `linear-gradient(180deg, rgba(3,7,14,0.08) 0%, ${q.color}06 50%, rgba(3,7,14,0.08) 100%)`,
      transition: 'background 0.6s ease',
    }}>
      {/* Fondu haut — raccordement cinématique avec le Hero */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'45%', background:'transparent', pointerEvents:'none', zIndex:0 }} />
      {/* Fondu bas — transition vers la section Rangs */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'45%', background:'linear-gradient(0deg, rgba(3,7,14,0.72) 0%, rgba(3,7,14,0.45) 35%, rgba(3,7,14,0.15) 70%, transparent 100%)', pointerEvents:'none', zIndex:0 }} />

      {/* Lignes latérales */}
      {['left', 'right'].map(side => (
        <div key={side} style={{
          position: 'absolute', [side]: 0, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: '50%', minHeight: 100,
          background: `linear-gradient(to bottom, transparent, ${q.color}60, transparent)`,
          transition: 'background 0.6s ease',
        }} />
      ))}

      {/* Orbes déco */}
      <div style={{ position: 'absolute', left: '10%', top: '20%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${q.color}08 0%, transparent 70%)`, pointerEvents: 'none', transition: 'background 0.6s ease' }} />
      <div style={{ position: 'absolute', right: '10%', bottom: '10%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,89,182,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.5s ease', maxWidth: 720, margin: '0 auto' }}>
          {/* Guillemet déco */}
          <div style={{ fontSize: 56, color: q.color, fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 16, opacity: 0.5, transition: 'color 0.6s ease' }}>"</div>

          <p style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(20px, 3.5vw, 34px)',
            fontWeight: 700, color: '#fff', lineHeight: 1.4,
            letterSpacing: '-.02em', marginBottom: 28,
          }}>
            {q.text}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: q.color, transition: 'color 0.6s ease' }}>— {q.author}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{q.ep}</span>
          </div>
        </div>

        {/* Contrôles */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginTop: 44 }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {QUOTES.map((_, i) => (
              <button key={i} onClick={() => handleDot(i)} style={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer',
                background: i === idx ? q.color : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease', padding: 0,
              }} />
            ))}
          </div>

          {/* Bouton "Autre citation" */}
          <button onClick={handleNext} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${q.color}15`, border: `1px solid ${q.color}35`,
            borderRadius: 100, padding: '9px 22px', fontSize: 13, fontWeight: 700,
            color: q.color, cursor: 'pointer', letterSpacing: '.04em',
            transition: 'all .2s', backdropFilter: 'blur(8px)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = `${q.color}28`; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = `${q.color}15`; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            ↻ Autre citation
          </button>
        </div>
      </div>
    </section>
  )
}
