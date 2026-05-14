import { useState, useEffect, useMemo, useRef } from 'react'

// ── Données ───────────────────────────────────────────────────────────────────

const FRUITS = [
  { name: 'Gomu Gomu no Mi', type: 'Paramecia', user: 'Monkey D. Luffy', color: '#e0524a', emoji: '🌀', power: 'Corps élastique comme le caoutchouc. En Gear 5, transformation en Nika le Dieu Soleil.', rare: false },
  { name: 'Mera Mera no Mi', type: 'Logia', user: 'Portgas D. Ace', color: '#ff6b35', emoji: '🔥', power: 'Contrôle total du feu. Génère et devient des flammes. Dégâts catastrophiques.', rare: false },
  { name: 'Hie Hie no Mi', type: 'Logia', user: 'Aokiji', color: '#74b9ff', emoji: '❄️', power: "Congèle tout ce qu'il touche. Peut geler la mer entière. Contrecarre le feu.", rare: false },
  { name: 'Yami Yami no Mi', type: 'Logia', user: 'Barbe Noire', color: '#636e72', emoji: '🌑', power: 'Fruit le plus sombre. Attire et nul les autres pouvoirs. Douleur amplifiée.', rare: true },
  { name: 'Ope Ope no Mi', type: 'Paramecia', user: 'Trafalgar Law', color: '#00b894', emoji: '⚕️', power: "Crée un \"Room\" opératoire. Peut restructurer tout ce qui est à l'intérieur. Don de l'immortalité possible.", rare: true },
  { name: 'Hana Hana no Mi', type: 'Paramecia', user: 'Nico Robin', color: '#fd79a8', emoji: '🌸', power: "Fait pousser des répliques de membres sur n'importe quelle surface. Parfait pour l'espionnage.", rare: false },
  { name: 'Gura Gura no Mi', type: 'Paramecia', user: 'Barbe Blanche', color: '#a29bfe', emoji: '💥', power: 'Fruit le plus puissant des Paramecia. Génère des tremblements de terre. Peut détruire le monde.', rare: true },
  { name: 'Pika Pika no Mi', type: 'Logia', user: 'Kizaru', color: '#fdcb6e', emoji: '⚡', power: 'Vitesse de la lumière. Coups de lasers dévastateurs. Quasi-invincible.', rare: true },
  { name: 'Magu Magu no Mi', type: 'Logia', user: 'Akainu', color: '#d63031', emoji: '🌋', power: "Magma brûlant tout, même le feu. Température la plus haute parmi les Logia. Aucune pitié.", rare: true },
  { name: 'Suke Suke no Mi', type: 'Paramecia', user: 'Absalom / Shiryu', color: '#81ecec', emoji: '👻', power: "Invisibilité totale de soi-même et de tout ce qu'on touche. Attaques surprises mortelles.", rare: false },
  { name: 'Doku Doku no Mi', type: 'Paramecia', user: 'Magellan', color: '#6c5ce7', emoji: '☠️', power: 'Génère et contrôle tous types de poisons. Un seul contact est fatal sans antidote.', rare: false },
  { name: 'Bari Bari no Mi', type: 'Paramecia', user: 'Bartolomeo', color: '#00cec9', emoji: '🛡️', power: "Barrières indestructibles. Peut bloquer n'importe quelle attaque, même des coups de Yonkou.", rare: false },
  { name: 'Zoan Uo Uo no Mi', type: 'Zoan', user: 'Kaidou', color: '#8e44ad', emoji: '🐉', power: "Transformation en dragon oriental gigantesque. Maîtrise totale des éléments. Le plus fort être vivant.", rare: true },
  { name: 'Tori Tori no Mi (Phénix)', type: 'Zoan', user: 'Marco', color: '#0984e3', emoji: '🔵', power: "Transformation en phénix légendaire. Flammes bleues de régénération. Résistance extrême.", rare: true },
  { name: 'Niku Niku no Mi', type: 'Paramecia', user: 'Jewelry Bonney', color: '#e17055', emoji: '⌛', power: "Contrôle l'âge de toute cible touchée. Peut vieillir ou rajeunir instantanément.", rare: true },
]

const TYPE_COLORS = {
  Paramecia: { bg: 'rgba(116,185,255,0.15)', border: 'rgba(116,185,255,0.35)', text: '#74b9ff' },
  Logia:     { bg: 'rgba(253,203,110,0.15)', border: 'rgba(253,203,110,0.35)', text: '#fdcb6e' },
  Zoan:      { bg: 'rgba(255,118,117,0.15)', border: 'rgba(255,118,117,0.35)', text: '#ff7675' },
}

// ── Carte fruit (flip) ────────────────────────────────────────────────────────

function FruitCard({ fruit, index }) {
  const [flipped, setFlipped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const tc = TYPE_COLORS[fruit.type] || TYPE_COLORS.Paramecia

  return (
    <div
      onClick={() => setFlipped(f => !f)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', height: 220, cursor: 'pointer', perspective: 900, animation: `fadeUp 0.45s ${index * 0.04}s ease-out both` }}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.5s ease',
      }}>
        {/* Face avant */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(145deg, ${fruit.color}30 0%, ${fruit.color}10 50%, rgba(14,14,16,0.88) 100%)`,
          border: `1px solid ${hovered ? fruit.color + '65' : fruit.color + '30'}`,
          borderRadius: 16, padding: '20px 18px',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          boxShadow: hovered ? `0 8px 32px ${fruit.color}30` : `0 2px 12px ${fruit.color}12`,
          transition: 'all 0.22s ease',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 38, marginBottom: 10, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>{fruit.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{fruit.name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{fruit.type}</span>
              {fruit.rare && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,215,0,0.15)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Légendaire</span>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{fruit.user}</span>
            <span style={{ fontSize: 10, color: fruit.color, fontWeight: 700, opacity: 0.8 }}>Pouvoir ↺</span>
          </div>
        </div>

        {/* Face arrière */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(145deg, ${fruit.color}38 0%, ${fruit.color}16 60%, rgba(14,14,16,0.92) 100%)`,
          border: `1px solid ${fruit.color}55`,
          borderRadius: 16, padding: '18px',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
          boxShadow: `inset 0 1px 0 ${fruit.color}20`,
        }}>
          <div style={{ fontSize: 24 }}>{fruit.emoji}</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>{fruit.power}</p>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            Utilisateur : <span style={{ color: fruit.color, fontWeight: 700 }}>{fruit.user}</span>
          </div>
          <div style={{ fontSize: 11, color: fruit.color, fontWeight: 700 }}>← Retourner</div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function EncyclopediePage({ onClose }) {
  const [filter, setFilter] = useState('Tous')
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)

  const types = ['Tous', 'Paramecia', 'Logia', 'Zoan']

  const filtered = useMemo(() => {
    let result = FRUITS
    if (filter !== 'Tous') result = result.filter(f => f.type === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.user.toLowerCase().includes(q) ||
        f.power.toLowerCase().includes(q)
      )
    }
    return result
  }, [filter, search])

  // Lock scroll + raccourcis
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const fn = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === '/' && e.target.tagName !== 'INPUT') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', fn)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', fn) }
  }, [onClose])

  const counts = useMemo(() => {
    const c = {}
    types.forEach(t => { c[t] = t === 'Tous' ? FRUITS.length : FRUITS.filter(f => f.type === t).length })
    return c
  }, [])

  return (
    <>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease-out' }}>

        {/* ── Header ── */}
        <div style={{ flexShrink: 0, background: 'rgba(17,18,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>

          {/* Ligne titre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 60 }}>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 9, color: '#fff', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >← Retour</button>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16, color: '#fff' }}>📚 Encyclopédie One Piece</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
            </div>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(224,82,74,0.1)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
              🍎 Fruits du Démon
            </span>
          </div>

          {/* Ligne contrôles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px 12px', flexWrap: 'wrap' }}>

            {/* Recherche */}
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--muted)', pointerEvents: 'none' }}>🔍</span>
              <input
                ref={searchRef}
                type="text"
                placeholder='Nom, utilisateur, pouvoir… ("/" pour focus)'
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, height: 36, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 9, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'var(--body)', boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(224,82,74,0.5)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Filtres type */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {types.map(t => {
                const active = filter === t
                const tc = TYPE_COLORS[t]
                return (
                  <button key={t} onClick={() => setFilter(t)} style={{
                    height: 36, padding: '0 14px', borderRadius: 9, border: `1px solid ${active ? (tc?.border || 'rgba(224,82,74,0.5)') : 'rgba(255,255,255,0.1)'}`,
                    background: active ? (tc?.bg || 'rgba(224,82,74,0.15)') : 'transparent',
                    color: active ? (tc?.text || 'var(--accent)') : 'var(--muted)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {t} <span style={{ fontSize: 10, opacity: 0.7 }}>({counts[t]})</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: 8 }}>Aucun résultat</div>
                <div style={{ fontSize: 14 }}>Essaie un autre nom ou pouvoir</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {filtered.map((fruit, i) => (
                  <FruitCard key={fruit.name} fruit={fruit} index={i} />
                ))}
              </div>
            )}

            {/* Bientôt */}
            <div style={{ marginTop: 48, padding: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⚡</div>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6 }}>Bientôt : Haki & Personnages</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>L'encyclopédie s'agrandit au fil des arcs</div>
            </div>
          </div>
        </div>

        {/* ── Footer hint ── */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '8px 20px', background: 'rgba(17,18,20,0.9)', display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['/', 'Rechercher'], ['Clique', 'Retourner la carte'], ['Échap', 'Retour']].map(([k, label]) => (
            <span key={k} style={{ fontSize: 11, color: 'var(--muted)' }}>
              <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', marginRight: 5 }}>{k}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
