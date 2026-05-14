import { useState, useRef, useEffect } from 'react'

const FRUITS = [
  { name: 'Gomu Gomu no Mi', type: 'Paramecia', user: 'Monkey D. Luffy', color: '#e0524a', emoji: '🌀', power: 'Corps élastique comme le caoutchouc. En Gear 5, transformation en Nika le Dieu Soleil.', rare: false },
  { name: 'Mera Mera no Mi', type: 'Logia', user: 'Portgas D. Ace', color: '#ff6b35', emoji: '🔥', power: 'Contrôle total du feu. Génère et devient des flammes. Dégâts catastrophiques.', rare: false },
  { name: 'Hie Hie no Mi', type: 'Logia', user: 'Aokiji', color: '#74b9ff', emoji: '❄️', power: 'Congèle tout ce qu\'il touche. Peut geler la mer entière. Contrecarre le feu.', rare: false },
  { name: 'Yami Yami no Mi', type: 'Logia', user: 'Barbe Noire', color: '#2d3436', emoji: '🌑', power: 'Fruit le plus sombre. Attire et nul les autres pouvoirs. Douleur amplifiée.', rare: true },
  { name: 'Ope Ope no Mi', type: 'Paramecia', user: 'Trafalgar Law', color: '#00b894', emoji: '⚕️', power: 'Crée un "Room" opératoire. Peut restructurer tout ce qui est à l\'intérieur. Don de l\'immortalité possible.', rare: true },
  { name: 'Hana Hana no Mi', type: 'Paramecia', user: 'Nico Robin', color: '#fd79a8', emoji: '🌸', power: 'Fait pousser des répliques de membres sur n\'importe quelle surface. Parfait pour l\'espionnage.', rare: false },
  { name: 'Gura Gura no Mi', type: 'Paramecia', user: 'Barbe Blanche', color: '#a29bfe', emoji: '💥', power: 'Fruit le plus puissant des Paramecia. Génère des tremblements de terre. Peut détruire le monde.', rare: true },
  { name: 'Pika Pika no Mi', type: 'Logia', user: 'Kizaru', color: '#fdcb6e', emoji: '⚡', power: 'Vitesse de la lumière. Coups de lasers dévastateurs. Quasi-invincible.', rare: true },
  { name: 'Magu Magu no Mi', type: 'Logia', user: 'Akainu', color: '#d63031', emoji: '🌋', power: 'Magma brûlant tout, même le feu. Température la plus haute parmi les Logia. Aucune pitié.', rare: true },
  { name: 'Suke Suke no Mi', type: 'Paramecia', user: 'Absalom / Shiryu', color: '#81ecec', emoji: '👻', power: 'Invisibilité totale de soi-même et de tout ce qu\'on touche. Attaques surprises mortelles.', rare: false },
  { name: 'Doku Doku no Mi', type: 'Paramecia', user: 'Magellan', color: '#6c5ce7', emoji: '☠️', power: 'Génère et contrôle tous types de poisons. Un seul contact est fatal sans antidote.', rare: false },
  { name: 'Bari Bari no Mi', type: 'Paramecia', user: 'Bartolomeo', color: '#00cec9', emoji: '🛡️', power: 'Barrières indestructibles. Peut bloquer n\'importe quelle attaque, même des coups de Yonkou.', rare: false },
]

function useInView(ref) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

function FruitCard({ fruit, index }) {
  const [hovered, setHovered] = useState(false)
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      onClick={() => setFlipped(f => !f)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        height: 200,
        cursor: 'pointer',
        perspective: 800,
        animation: `fadeUp 0.6s ${index * 0.05}s ease-out both`,
      }}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.5s ease',
      }}>
        {/* Front */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, rgba(30,32,36,0.95), rgba(${hexToRgb(fruit.color)},0.15))`,
          border: `1px solid ${hovered ? fruit.color + '60' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 16,
          padding: '20px 18px',
          backfaceVisibility: 'hidden',
          boxShadow: hovered ? `0 0 30px ${fruit.color}30` : 'none',
          transition: 'all 0.25s ease',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{fruit.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{fruit.name}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 20,
                background: fruit.type === 'Logia' ? 'rgba(253,203,110,0.15)' : fruit.type === 'Paramecia' ? 'rgba(116,185,255,0.15)' : 'rgba(255,118,117,0.15)',
                color: fruit.type === 'Logia' ? '#fdcb6e' : fruit.type === 'Paramecia' ? '#74b9ff' : '#ff7675',
                border: `1px solid ${fruit.type === 'Logia' ? 'rgba(253,203,110,0.3)' : fruit.type === 'Paramecia' ? 'rgba(116,185,255,0.3)' : 'rgba(255,118,117,0.3)'}`,
              }}>{fruit.type}</span>
              {fruit.rare && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,215,0,0.15)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rare</span>}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{fruit.user}</span>
            <span style={{ fontSize: 11 }}>Cliquer pour info ↺</span>
          </div>
        </div>

        {/* Back */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${fruit.color}20, ${fruit.color}08)`,
          border: `1px solid ${fruit.color}50`,
          borderRadius: 16,
          padding: '20px 18px',
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>{fruit.emoji}</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>{fruit.power}</p>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            Utilisateur : <span style={{ color: fruit.color, fontWeight: 600 }}>{fruit.user}</span>
          </div>
          <div style={{ fontSize: 11, color: fruit.color, fontWeight: 600 }}>← Retourner</div>
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

export default function DevilFruits() {
  const ref = useRef(null)
  const visible = useInView(ref)
  const [filter, setFilter] = useState('Tous')
  const types = ['Tous', 'Paramecia', 'Logia']
  const filtered = filter === 'Tous' ? FRUITS : FRUITS.filter(f => f.type === filter)

  return (
    <section id="fruits" ref={ref} style={{ padding: '110px 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="label">🍎 Encyclopédie</div>
          <h2 className="h2" style={{ textAlign: 'center' }}>Fruits du Démon</h2>
          <p className="sub" style={{ textAlign: 'center', margin: '0 auto 32px' }}>Les pouvoirs légendaires de l'univers One Piece — clique sur une carte pour découvrir le pouvoir</p>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {types.map(t => (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: filter === t ? 'var(--accent)' : 'var(--card)',
                color: filter === t ? '#fff' : 'var(--muted)',
                transition: 'all 0.2s',
              }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {visible && filtered.map((fruit, i) => (
            <FruitCard key={fruit.name} fruit={fruit} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
