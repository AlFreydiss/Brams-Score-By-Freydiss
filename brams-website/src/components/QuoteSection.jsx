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
      padding: '100px 0', textAlign: 'center',
      background: 'linear-gradient(180deg, transparent 0%, rgba(224,82,74,0.04) 50%, transparent 100%)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      {/* Orbes déco */}
      <div style={{ position: 'absolute', left: '10%', top: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '10%', bottom: '10%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,89,182,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* Ligne déco gauche */}
      <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
        width: 3, height: '50%', minHeight: 100,
        background: 'linear-gradient(to bottom, transparent, rgba(224,82,74,0.4), transparent)',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
        width: 3, height: '50%', minHeight: 100,
        background: 'linear-gradient(to bottom, transparent, rgba(224,82,74,0.4), transparent)',
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
