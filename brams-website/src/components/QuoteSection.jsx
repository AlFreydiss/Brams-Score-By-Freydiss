import { useState, useEffect } from 'react'

const QUOTES = [
  { text: "Je vais devenir le Roi des Pirates !", author: "Monkey D. Luffy", ep: "Épisode 1" },
  { text: "Un homme qui abandonne quelque chose ne mérite pas de le retrouver.", author: "Roronoa Zoro", ep: "Épisode 24" },
  { text: "Les rêves ne meurent jamais tant qu'il reste quelqu'un pour les porter.", author: "Monkey D. Luffy", ep: "Épisode 48" },
  { text: "Je ne regrette rien.", author: "Portgas D. Ace", ep: "Épisode 483" },
  { text: "Ce n'est pas le monde qui est cruel. C'est toi qui es trop faible.", author: "Donquixote Doflamingo", ep: "Épisode 151" },
  { text: "Nul ne peut changer le passé. Mais n'importe qui peut changer l'avenir.", author: "Nico Robin", ep: "Épisode 279" },
  { text: "Même affaibli, un lion reste un lion.", author: "Rayleigh", ep: "Épisode 400" },
  { text: "La force n'est pas la seule chose qui compte dans ce monde.", author: "Shanks", ep: "Épisode 4" },
]

export default function QuoteSection() {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % QUOTES.length)
        setFade(true)
      }, 600)
    }, 8000)
    return () => clearInterval(id)
  }, [])

  const q = QUOTES[idx]

  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      padding: '120px 0', textAlign: 'center',
    }}>
      {/* GIF en fond */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(/bg-anime.gif)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.18,
        pointerEvents: 'none',
      }} />
      {/* Overlay gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(17,18,20,0.85) 0%, rgba(17,18,20,0.5) 50%, rgba(17,18,20,0.85) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Ligne déco gauche */}
      <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
        width: 4, height: '60%', minHeight: 120,
        background: 'linear-gradient(to bottom, transparent, var(--accent), transparent)',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
        width: 4, height: '60%', minHeight: 120,
        background: 'linear-gradient(to bottom, transparent, var(--accent), transparent)',
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          opacity: fade ? 1 : 0,
          transition: 'opacity 0.6s ease',
          maxWidth: 720, margin: '0 auto',
        }}>
          <div style={{ fontSize: 56, color: 'var(--accent)', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: 16, opacity: 0.6 }}>"</div>

          <p style={{
            fontFamily: 'var(--display)',
            fontSize: 'clamp(20px, 3.5vw, 34px)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.4,
            letterSpacing: '-.02em',
            marginBottom: 28,
          }}>
            {q.text}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>— {q.author}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{q.ep}</span>
          </div>
        </div>

        {/* Indicateurs */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 40 }}>
          {QUOTES.map((_, i) => (
            <button key={i} onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true) }, 300) }} style={{
              width: i === idx ? 20 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer',
              background: i === idx ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease', padding: 0,
            }} />
          ))}
        </div>
      </div>
    </section>
  )
}
