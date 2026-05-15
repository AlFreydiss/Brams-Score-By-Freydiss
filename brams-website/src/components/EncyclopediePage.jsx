import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

// ── Données ───────────────────────────────────────────────────────────────────

const HAKI = [
  {
    name: 'Haki de l\'Observation',
    jp: 'Kenbunshoku no Haki',
    color: '#74b9ff',
    emoji: '👁️',
    icon: '🔵',
    desc: 'Permet de percevoir les présences, émotions et intentions à distance. Les utilisateurs avancés peuvent entrevoir quelques secondes dans le futur.',
    details: [
      { label: 'Niveau de base', text: 'Détection des présences dans un rayon étendu. Lecture des émotions et intentions hostiles. Perception même en dehors du champ de vision.' },
      { label: 'Vision du Futur', text: 'Capacité rare : apercevoir le futur proche. Katakuri fut le premier à la montrer, avant que Luffy ne la développe en combat. Shanks la possède à un niveau extrême.' },
      { label: 'Contre-mesures', text: 'Un utilisateur vide son esprit pour ne pas montrer ses intentions. Les simples animaux et individus sans conscience le possèdent naturellement.' },
    ],
    users: ['Luffy', 'Katakuri', 'Shanks', 'Enel', 'Coby', 'Boa Hancock', 'Rayleigh', 'Sanji'],
    rarity: 'Commun',
    rarityColor: '#74b9ff',
  },
  {
    name: 'Haki de l\'Armement',
    jp: 'Busoshoku no Haki',
    color: '#636e72',
    emoji: '⚫',
    icon: '⚫',
    desc: 'Crée une armure invisible renforcée sur le corps ou les armes. Seule façon de toucher efficacement les utilisateurs de Fruits Logia. La forme avancée (Ryou) projette le Haki à l\'intérieur de la cible.',
    details: [
      { label: 'Armement classique', text: 'Revêtement noir sur les membres ou armes. Augmente drastiquement la puissance offensive et défensive. Neutralise les corps Logia.' },
      { label: 'Ryou — Armement Fluide', text: 'Forme avancée apprise sur Udon (Wano). Le Haki traverse les défenses sans les briser — il détruit de l\'intérieur. Seule méthode confirmée pour blesser Kaido sous ses écailles.' },
      { label: 'Hardening', text: 'Forme visuelle : la zone revêtue devient noire, dure comme l\'acier. Utilisée par Vergo, Pica, ou encore les guerriers d\'Amazon Lily.' },
    ],
    users: ['Garp', 'Rayleigh', 'Vergo', 'Luffy', 'Zoro', 'Sanji', 'Katakuri', 'Doflamingo', 'Fujitora', 'Jinbei'],
    rarity: 'Commun',
    rarityColor: '#74b9ff',
  },
  {
    name: 'Haki du Conquérant',
    jp: 'Haoshoku no Haki',
    color: '#fdcb6e',
    emoji: '👑',
    icon: '🟡',
    desc: 'Le Haki des Rois. Un être sur plusieurs millions peut en être doté. La seule forme de Haki impossible à acquérir par l\'entraînement — on naît avec, ou pas. La volonté du porteur soumet les êtres faibles.',
    details: [
      { label: 'Domination de masse', text: 'En libérant sa volonté, le porteur peut assommer ou paralyser des dizaines voire des centaines d\'adversaires faibles simultanément. Effet incontrôlé avant la maîtrise.' },
      { label: 'Revêtement du Conquérant', text: 'Forme ultra-rare révélée à Wano. Shanks et Kaido le pratiquent. Luffy le développe naturellement. Permet de recouvrir les membres et armes du Haki du Conquérant — les coups créent des éclairs noirs dévastateurs.' },
      { label: 'Affrontement de volontés', text: 'Quand deux porteurs entrent en collision avec leur Haki du Conquérant, cela génère des éclairs dorés dans le ciel. Vu lors de Roger vs Whitebeard, Luffy vs Kaido.' },
    ],
    users: ['Roger', 'Whitebeard', 'Shanks', 'Big Mom', 'Kaido', 'Luffy', 'Doflamingo', 'Ace', 'Boa Hancock', 'Rayleigh', 'Sengoku', 'Yamato', 'Zoro'],
    rarity: 'Extrêmement Rare',
    rarityColor: '#fdcb6e',
  },
]

const MYSTERIES = [
  {
    emoji: '💎',
    title: 'Le One Piece',
    color: '#ffd700',
    level: 'MAJEUR',
    desc: 'Le trésor légendaire de Gol D. Roger, caché sur Laugh Tale au bout du Grand Line. Sa nature exacte reste inconnue de tous, sauf de Roger et son équipage — qui ont ri en le découvrant. Ce trésor est la raison même de l\'existence de la "Grande Ère des Pirates".',
    theories: ['Un héritage de Joy Boy et du Siècle Oublié', 'La vérité sur l\'histoire du monde effacée par le Gouvernement', 'Peut-être pas un objet physique mais une connaissance ou une clé'],
    status: 'Non résolu',
  },
  {
    emoji: '🌑',
    title: 'Le Siècle Oublié',
    color: '#a29bfe',
    level: 'MAJEUR',
    desc: '100 ans d\'histoire effacés des archives mondiales par le Gouvernement Mondial. Seuls les Ponéglyphes indestructibles en gardent la trace. Ohara a été détruite pour avoir cherché à lire cette vérité. Joy Boy, le Gouvernement Mondial et la création du système actuel y sont directement liés.',
    theories: ['Un ancien royaume puissant a été vaincu par les 20 royaumes fondateurs', 'Le Gouvernement cache sa propre origine criminelle', 'Joy Boy était le roi de cet ancien royaume disparu'],
    status: 'Partiellement révélé (arc Egghead)',
  },
  {
    emoji: '🌞',
    title: 'Joy Boy & son héritier',
    color: '#fdcb6e',
    level: 'MAJEUR',
    desc: 'Personnage mythique du Siècle Oublié ayant laissé des excuses gravées sur le Ponéglyphe de Fishman Island. Il avait fait une promesse qu\'il n\'a pas pu tenir. Zounisha affirme attendre le retour de son héritier depuis 800 ans. Luffy est confirmé comme ce successeur lors de l\'éveil de son fruit en Gear 5.',
    theories: ['Joy Boy était lié à Fishman Island et aux habitants de la mer', 'Sa promesse concernait la libération des esclaves et des opprimés', 'Luffy n\'est pas Joy Boy mais son esprit reincorporé dans un nouveau corps'],
    status: 'Partiellement résolu — Luffy = héritier confirmé',
  },
  {
    emoji: '🌀',
    title: 'Le Hito Hito no Mi — Modèle Nika',
    color: '#e0524a',
    level: 'RÉVÉLÉ',
    desc: 'Le fruit de Luffy, officiellement catalogué "Gomu Gomu no Mi" (Paramecia), est en réalité le Hito Hito no Mi Modèle Nika — un Zoan Mythique. Le Gouvernement Mondial le cherchait depuis 800 ans pour l\'empêcher d\'éveiller son vrai porteur. Lors de l\'éveil, Luffy se transforme en Nika, le Dieu du Soleil — forme la plus libre et puissante connue.',
    theories: ['Le fruit choisit lui-même son porteur — il a "fui" le Gouvernement pendant 800 ans', 'Le rire de Luffy (Ha Ha Ha) est identique à celui de Roger et de Nika', 'Nika est une figure mythique qui a libéré des esclaves dans le Siècle Oublié'],
    status: 'Révélé — arc Egghead (Vegapunk)',
  },
  {
    emoji: '🩸',
    title: 'Imu-Sama',
    color: '#d63031',
    level: 'MYSTÈRE ACTIF',
    desc: 'Silhouette mystérieuse siégeant sur le Trône Vide au Pangée Fortress. Semble être le véritable chef suprême du monde, au-dessus des 5 Dieux de la Sagesse. Imu possède l\'arme ultime et a décidé seul de l\'effacement de Lulusia. Son identité, ses pouvoirs et son âge restent totalement inconnus.',
    theories: ['Imu est immortel depuis le Siècle Oublié — peut-être via l\'Ope Ope no Mi', 'Imu est directement lié à Joy Boy — soit son ennemi, soit quelqu\'un qui lui a survécu', 'Imu pourrait être une femme (certaines cases le suggèrent)'],
    status: 'Non résolu — révélations en cours',
  },
  {
    emoji: '📜',
    title: 'Le Rio Ponéglyphe',
    color: '#00b894',
    level: 'MAJEUR',
    desc: 'L\'histoire complète du Siècle Oublié est fragmentée en 4 Ponéglyphes "Rio" dispersés dans le monde. Roger était la seule personne à pouvoir les "entendre" sans les lire. Nico Robin a pour destin de les lire et de révéler cette vérité au monde entier — c\'est pourquoi le Gouvernement la traque depuis son enfance.',
    theories: ['Les 4 Ponéglyphes révèlent la localisation de Laugh Tale combinés', 'La vérité du Siècle Oublié renverserait le Gouvernement Mondial', 'Roger a pleuré en comprenant qu\'il était né trop tôt pour accomplir la promesse de Joy Boy'],
    status: 'Non résolu — Robin doit les assembler',
  },
  {
    emoji: '🧬',
    title: 'La Volonté du D.',
    color: '#6c5ce7',
    level: 'MAJEUR',
    desc: 'Les porteurs du "D" dans leur nom (Monkey D. Luffy, Portgas D. Ace, Gol D. Roger, Marshall D. Teach…) semblent partager un destin particulier. Les Dieux de la Sagesse craignent les "D" et les appellent "ennemis naturels des Dieux". Roger l\'appelait "la Volonté". Les personnages "D" sourient souvent face à la mort.',
    theories: ['Le "D" signifie "Dawn" (Aube) — les porteurs apporteront l\'aube au monde', 'Ils sont les descendants de l\'ancien royaume vaincu lors du Siècle Oublié', 'Chaque "D" porte inconsciemment la volonté de Joy Boy et se bat pour la liberté'],
    status: 'Partiellement révélé',
  },
  {
    emoji: '🏴‍☠️',
    title: 'Le dernier message de Roger',
    color: '#e17055',
    level: 'RÉVÉLÉ',
    desc: '"Je ne meurs pas, mes nakamas. Avant de mourir, j\'ai tout mis dans un seul endroit. Si vous voulez, allez le chercher. Je l\'ai tout laissé là-bas." — Gol D. Roger, place publique de Logue Town. Cette phrase a déclenché la Grande Ère des Pirates et motivé des générations entières à naviguer. Roger savait qu\'il ne pouvait pas accomplir la promesse de Joy Boy lui-même.',
    theories: ['Roger a délibérément lancé l\'Ère des Pirates pour trouver le successeur de Joy Boy', 'Il espérait que quelqu\'un "né dans la mauvaise époque" accomplirait ce qu\'il ne pouvait pas', 'Barbe Noire et Luffy sont les deux héritiers possibles — liberté vs ténèbres'],
    status: 'Révélé — arc Logue Town',
  },
]

const FRUITS = [
  { name: 'Gomu Gomu no Mi', type: 'Paramecia', user: 'Monkey D. Luffy', color: '#e0524a', emoji: '🌀', power: 'Corps élastique comme le caoutchouc. En Gear 5, transformation en Nika le Dieu Soleil.', rare: false, image: null },
  { name: 'Mera Mera no Mi', type: 'Logia', user: 'Portgas D. Ace', color: '#ff6b35', emoji: '🔥', power: 'Contrôle total du feu. Génère et devient des flammes. Dégâts catastrophiques.', rare: false, image: null },
  { name: 'Hie Hie no Mi', type: 'Logia', user: 'Aokiji', color: '#74b9ff', emoji: '❄️', power: "Congèle tout ce qu'il touche. Peut geler la mer entière. Contrecarre le feu.", rare: false, image: null },
  { name: 'Yami Yami no Mi', type: 'Logia', user: 'Barbe Noire', color: '#636e72', emoji: '🌑', power: 'Fruit le plus sombre. Attire et nul les autres pouvoirs. Douleur amplifiée.', rare: true, image: null },
  { name: 'Ope Ope no Mi', type: 'Paramecia', user: 'Trafalgar Law', color: '#00b894', emoji: '⚕️', power: "Crée un \"Room\" opératoire. Peut restructurer tout ce qui est à l'intérieur. Don de l'immortalité possible.", rare: true, image: null },
  { name: 'Hana Hana no Mi', type: 'Paramecia', user: 'Nico Robin', color: '#fd79a8', emoji: '🌸', power: "Fait pousser des répliques de membres sur n'importe quelle surface. Parfait pour l'espionnage.", rare: false, image: null },
  { name: 'Gura Gura no Mi', type: 'Paramecia', user: 'Barbe Blanche', color: '#a29bfe', emoji: '💥', power: 'Fruit le plus puissant des Paramecia. Génère des tremblements de terre. Peut détruire le monde.', rare: true, image: null },
  { name: 'Pika Pika no Mi', type: 'Logia', user: 'Kizaru', color: '#fdcb6e', emoji: '⚡', power: 'Vitesse de la lumière. Coups de lasers dévastateurs. Quasi-invincible.', rare: true, image: null },
  { name: 'Magu Magu no Mi', type: 'Logia', user: 'Akainu', color: '#d63031', emoji: '🌋', power: "Magma brûlant tout, même le feu. Température la plus haute parmi les Logia. Aucune pitié.", rare: true, image: null },
  { name: 'Suke Suke no Mi', type: 'Paramecia', user: 'Absalom / Shiryu', color: '#81ecec', emoji: '👻', power: "Invisibilité totale de soi-même et de tout ce qu'on touche. Attaques surprises mortelles.", rare: false, image: null },
  { name: 'Doku Doku no Mi', type: 'Paramecia', user: 'Magellan', color: '#6c5ce7', emoji: '☠️', power: 'Génère et contrôle tous types de poisons. Un seul contact est fatal sans antidote.', rare: false, image: null },
  { name: 'Bari Bari no Mi', type: 'Paramecia', user: 'Bartolomeo', color: '#00cec9', emoji: '🛡️', power: "Barrières indestructibles. Peut bloquer n'importe quelle attaque, même des coups de Yonkou.", rare: false, image: null },
  { name: 'Zoan Uo Uo no Mi', type: 'Zoan', user: 'Kaidou', color: '#8e44ad', emoji: '🐉', power: "Transformation en dragon oriental gigantesque. Maîtrise totale des éléments. Le plus fort être vivant.", rare: true, image: null },
  { name: 'Tori Tori no Mi (Phénix)', type: 'Zoan', user: 'Marco', color: '#0984e3', emoji: '🔵', power: "Transformation en phénix légendaire. Flammes bleues de régénération. Résistance extrême.", rare: true, image: null },
  { name: 'Niku Niku no Mi', type: 'Paramecia', user: 'Jewelry Bonney', color: '#e17055', emoji: '⌛', power: "Contrôle l'âge de toute cible touchée. Peut vieillir ou rajeunir instantanément.", rare: true, image: null },
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
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 10, color: fruit.color, fontWeight: 700, opacity: 0.8 }}>Pouvoir ↺</span>
          </div>
        </div>

        {/* Face arrière */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(145deg, ${fruit.color}38 0%, ${fruit.color}16 60%, rgba(14,14,16,0.92) 100%)`,
          border: `1px solid ${fruit.color}55`,
          borderRadius: 16,
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          overflow: 'hidden',
          boxShadow: `inset 0 1px 0 ${fruit.color}20`,
        }}>
          {fruit.image && (
            <img
              src={fruit.image}
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center top',
                opacity: 0.14, pointerEvents: 'none', userSelect: 'none',
              }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          )}
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '18px', height: '100%', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
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
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

const LEGEND_COUNT = FRUITS.filter(f => f.rare).length

function useCountUp(target, duration = 1600, delay = 500) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf
    const t = setTimeout(() => {
      const start = performance.now()
      const tick = now => {
        const p = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        setVal(Math.round(ease * target))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(t); cancelAnimationFrame(raf) }
  }, [target, duration, delay])
  return val
}

function StatPill({ value, label, color = 'var(--accent)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 90 }}>
      <span style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 40, lineHeight: 1, color }}>{value}</span>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}

function EncyclopediaHero({ search, setSearch, searchRef }) {
  const fruits     = useCountUp(FRUITS.length, 1400, 300)
  const types      = useCountUp(3,             1000, 500)
  const legendaires = useCountUp(LEGEND_COUNT, 1600, 400)

  return (
    <div style={{
      minHeight: '80vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      padding: '60px 24px 48px',
    }}>
      {/* Orbes décoratifs */}
      <div style={{ position: 'absolute', top: '10%', left: '8%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,82,74,0.10) 0%, transparent 70%)', pointerEvents: 'none', animation: 'drift 18s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '5%', right: '6%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(162,155,254,0.08) 0%, transparent 70%)', pointerEvents: 'none', animation: 'drift 24s 4s ease-in-out infinite reverse' }} />
      <div style={{ position: 'absolute', top: '45%', right: '15%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(253,203,110,0.07) 0%, transparent 70%)', pointerEvents: 'none', animation: 'drift 14s 2s ease-in-out infinite' }} />

      {/* Eyebrow */}
      <div style={{ fontSize: 10, letterSpacing: '0.35em', fontWeight: 800, color: 'var(--accent)', marginBottom: 22, textTransform: 'uppercase', animation: 'fadeUp 0.6s ease both' }}>
        One Piece • Univers Étendu
      </div>

      {/* Titre principal */}
      <h1 style={{
        fontFamily: 'var(--display)', fontWeight: 900, textAlign: 'center',
        fontSize: 'clamp(56px, 11vw, 108px)',
        lineHeight: 0.92, margin: '0 0 20px',
        background: 'linear-gradient(140deg, #ffffff 0%, rgba(255,255,255,0.80) 45%, var(--accent) 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        animation: 'fadeUp 0.75s 0.1s ease both',
      }}>
        📚<br />Encyclopédie
      </h1>

      {/* Sous-titre */}
      <p style={{
        fontSize: 17, color: 'var(--muted)', textAlign: 'center', maxWidth: 460, lineHeight: 1.65,
        margin: '0 0 44px', animation: 'fadeUp 0.75s 0.2s ease both',
      }}>
        Explore les fruits du démon, personnages et pouvoirs de l'univers One Piece
      </p>

      {/* Stats count-up */}
      <div style={{
        display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap',
        marginBottom: 48, animation: 'fadeUp 0.75s 0.3s ease both',
      }}>
        <StatPill value={fruits}      label="Fruits du Démon" color="var(--accent)" />
        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'center', height: 40 }} />
        <StatPill value={types}       label="Types"           color="#a29bfe" />
        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'center', height: 40 }} />
        <StatPill value={legendaires} label="Légendaires"     color="#fdcb6e" />
      </div>

      {/* Barre de recherche héro */}
      <div style={{
        width: '100%', maxWidth: 560, position: 'relative',
        animation: 'fadeUp 0.75s 0.4s ease both',
      }}>
        <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--muted)', pointerEvents: 'none' }}>🔍</span>
        <input
          ref={searchRef}
          type="text"
          placeholder='Chercher un fruit, un utilisateur, un pouvoir…'
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', paddingLeft: 50, paddingRight: 20, height: 54,
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
            color: 'var(--text)', fontSize: 15, outline: 'none',
            fontFamily: 'var(--body)', boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(224,82,74,0.5)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(224,82,74,0.15)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)' }}
        />
      </div>

      {/* Scroll hint */}
      <div style={{ marginTop: 40, fontSize: 12, color: 'var(--muted)', animation: 'float 2.5s ease-in-out infinite', letterSpacing: '0.05em' }}>
        ↓ Découvrir la collection
      </div>
    </div>
  )
}

// ── Carte Haki ────────────────────────────────────────────────────────────────

function HakiCard({ haki, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ animation: `fadeUp 0.45s ${index * 0.1}s ease-out both` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: `linear-gradient(145deg, ${haki.color}18 0%, rgba(14,14,16,0.9) 100%)`,
          border: `1px solid ${open ? haki.color + '55' : haki.color + '28'}`,
          borderRadius: 18, padding: '24px 24px 20px', cursor: 'pointer',
          transition: 'all 0.22s ease',
          boxShadow: open ? `0 8px 40px ${haki.color}22` : 'none',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 44, filter: `drop-shadow(0 0 12px ${haki.color}60)` }}>{haki.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 4 }}>{haki.name}</div>
            <div style={{ fontSize: 12, color: haki.color, fontWeight: 600, letterSpacing: '0.06em', opacity: 0.85 }}>{haki.jp}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 800,
              background: `${haki.rarityColor}18`, color: haki.rarityColor,
              border: `1px solid ${haki.rarityColor}40`, letterSpacing: '0.08em', whiteSpace: 'nowrap',
            }}>{haki.rarity}</span>
            <span style={{ fontSize: 12, color: haki.color, opacity: 0.7 }}>{open ? '▲ Réduire' : '▼ Détails'}</span>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 14px' }}>{haki.desc}</p>

        {/* Utilisateurs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {haki.users.map(u => (
            <span key={u} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: `${haki.color}12`, color: haki.color,
              border: `1px solid ${haki.color}30`, fontWeight: 600,
            }}>{u}</span>
          ))}
        </div>

        {/* Détails dépliables */}
        {open && (
          <div style={{ marginTop: 20, borderTop: `1px solid ${haki.color}20`, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {haki.details.map((d, i) => (
              <div key={i} style={{ background: `${haki.color}0d`, border: `1px solid ${haki.color}22`, borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: haki.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{d.label}</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, margin: 0 }}>{d.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Carte Mystère ─────────────────────────────────────────────────────────────

function MysteryCard({ m, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ animation: `fadeUp 0.45s ${index * 0.07}s ease-out both` }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background: `linear-gradient(135deg, ${m.color}14 0%, rgba(14,14,16,0.92) 100%)`,
          border: `1px solid ${open ? m.color + '50' : m.color + '25'}`,
          borderRadius: 16, cursor: 'pointer', overflow: 'hidden',
          transition: 'all 0.2s ease',
          boxShadow: open ? `0 8px 40px ${m.color}1a` : 'none',
        }}
      >
        {/* Barre de niveau */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${m.color}, transparent)` }} />

        <div style={{ padding: '20px 22px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 32 }}>{m.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{m.title}</div>
              <span style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 800,
                background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}35`,
                letterSpacing: '0.12em', display: 'inline-block', marginTop: 4,
              }}>{m.level}</span>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `${m.color}18`, border: `1px solid ${m.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: m.color, flexShrink: 0, transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>▾</div>
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, margin: '0 0 12px' }}>{m.desc}</p>

          {/* Statut */}
          <div style={{ fontSize: 11, color: m.color, fontWeight: 700, opacity: 0.8 }}>
            📍 {m.status}
          </div>

          {/* Théories dépliables */}
          {open && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${m.color}20`, paddingTop: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: m.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Théories principales</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.theories.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: m.color, fontSize: 16, lineHeight: 1.5, flexShrink: 0 }}>◆</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'fruits',    label: '🍎 Fruits du Démon', count: FRUITS.length },
  { id: 'haki',     label: '⚡ Haki',             count: HAKI.length },
  { id: 'mysteres', label: '🌑 Mystères',          count: MYSTERIES.length },
]

export default function EncyclopediePage({ onClose }) {
  const [tab, setTab] = useState('fruits')
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

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const fn = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === '/' && e.target.tagName !== 'INPUT') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', fn)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', fn) }
  }, [onClose])

  const typeCounts = useMemo(() => {
    const c = {}
    types.forEach(t => { c[t] = t === 'Tous' ? FRUITS.length : FRUITS.filter(f => f.type === t).length })
    return c
  }, [])

  return (
    <>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--bg)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease-out' }}>

        {/* ── Header compact ── */}
        <div style={{ flexShrink: 0, background: 'rgba(17,18,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 56 }}>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text)', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >← Retour</button>
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15, color: 'var(--text)', flex: 1, textAlign: 'center' }}>📚 Encyclopédie One Piece</span>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: '0 0 auto', padding: '0 24px', height: 44, fontSize: 13, fontWeight: 700,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: active ? '#fff' : 'var(--muted)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>
                  {t.label} <span style={{ opacity: 0.6, fontSize: 11 }}>({t.count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Contenu scrollable ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── TAB : FRUITS ── */}
          {tab === 'fruits' && (
            <>
              <EncyclopediaHero search={search} setSearch={setSearch} searchRef={searchRef} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '0 20px 28px' }}>
                {types.map(t => {
                  const active = filter === t
                  const tc = TYPE_COLORS[t]
                  return (
                    <button key={t} onClick={() => setFilter(t)} style={{
                      height: 36, padding: '0 18px', borderRadius: 100,
                      border: `1px solid ${active ? (tc?.border || 'rgba(224,82,74,0.5)') : 'rgba(255,255,255,0.1)'}`,
                      background: active ? (tc?.bg || 'rgba(224,82,74,0.15)') : 'transparent',
                      color: active ? (tc?.text || 'var(--accent)') : 'var(--muted)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}>
                      {t} <span style={{ fontSize: 11, opacity: 0.7 }}>({typeCounts[t]})</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 60px' }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Aucun résultat</div>
                    <div style={{ fontSize: 14 }}>Essaie un autre nom ou pouvoir</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                    {filtered.map((fruit, i) => <FruitCard key={fruit.name} fruit={fruit} index={i} />)}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── TAB : HAKI ── */}
          {tab === 'haki' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 60px' }}>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: 'var(--accent)', marginBottom: 16, textTransform: 'uppercase' }}>One Piece • Pouvoirs</div>
                <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(36px, 7vw, 68px)', color: '#fff', margin: '0 0 14px', lineHeight: 1 }}>⚡ Le Haki</h2>
                <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
                  Le Haki est une énergie vitale présente en chaque être vivant. Seule une volonté d'acier permet de l'éveiller et de le maîtriser. Il existe trois types — et l'un d'eux ne peut être appris.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {HAKI.map((h, i) => <HakiCard key={h.name} haki={h} index={i} />)}
              </div>
            </div>
          )}

          {/* ── TAB : MYSTÈRES ── */}
          {tab === 'mysteres' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 60px' }}>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.3em', fontWeight: 800, color: 'var(--accent)', marginBottom: 16, textTransform: 'uppercase' }}>One Piece • Lore</div>
                <h2 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(36px, 7vw, 68px)', color: '#fff', margin: '0 0 14px', lineHeight: 1 }}>🌑 Mystères</h2>
                <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
                  Les grandes énigmes de l'univers One Piece — certaines résolues, d'autres encore actives. Clique pour dérouler les théories et l'état de la révélation.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {MYSTERIES.map((m, i) => <MysteryCard key={m.title} m={m} index={i} />)}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer hint ── */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '8px 20px', background: 'rgba(17,18,20,0.9)', display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['/', 'Rechercher (Fruits)'], ['Clique', 'Dérouler / Retourner'], ['Échap', 'Retour']].map(([k, label]) => (
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
