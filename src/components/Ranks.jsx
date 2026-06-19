import { useState } from 'react'
import RankModal from './RankModal.jsx'
import {
  CINE, GOLD_GRAD, CineStyles, Reveal, CineSection, SectionHead, CineRule,
} from './home/cine.jsx'

const RANKS = [
  { emoji:'🏴‍☠️', name:'Moussaillon', hours:'0h',  color:'#7c7f8a', minH:0,   maxH:10,    desc:"Bienvenue à bord ! Tu viens de monter sur le navire. L'aventure commence.", tier:0 },
  { emoji:'🏴‍☠️', name:'Pirate',      hours:'10h', color:'#2ECC71', minH:10,  maxH:25,    desc:"Les débuts de l'aventure. Tu es là, c'est déjà quelque chose.", tier:1 },
  { emoji:'⚔️',  name:'Shichibukai', hours:'25h', color:'#166024', minH:25,  maxH:40,    desc:"Tu t'imposes. Le serveur commence à te connaître.", tier:2 },
  { emoji:'🪖',  name:'Amiral',      hours:'40h', color:'#F1C40F', minH:40,  maxH:70,    desc:"Présence solide, respect acquis. Les Marines te craignent.", tier:3 },
  { emoji:'👑',  name:'Yonkou',      hours:'70h', color:'#9B59B6', minH:70,  maxH:150,   desc:"Élite du serveur. Une des grandes puissances du Brams.", tier:4 },
  { emoji:'🤴',  name:'Roi des Pirates', hours:'150h', color:'#FFD700', minH:150, maxH:99999, desc:"Le sommet. Celui qui a tout trouvé — le classement et le respect.", tier:5 },
]

const TIER_MAX = RANKS.length - 1

function RankBand({ rank, index, onOpen }) {
  const [h, setH] = useState(false)
  const tierPct = Math.round((rank.tier / TIER_MAX) * 100)
  // Intensité de l'or croît avec le palier (ascension) — reste dans le système ivoire/or.
  const goldMix = 0.34 + (rank.tier / TIER_MAX) * 0.46

  return (
    <Reveal delay={120 + index * 90}>
      <div
        onClick={() => onOpen(rank)}
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(rank) } }}
        style={{
          position: 'relative', overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center', gap: 'clamp(18px, 3vw, 40px)',
          padding: 'clamp(22px, 2.6vw, 34px) clamp(22px, 3vw, 44px)',
          borderRadius: 18,
          background: h ? CINE.panel2 : CINE.panel,
          border: `1px solid ${h ? CINE.hairTop : CINE.hair}`,
          boxShadow: h ? '0 20px 56px rgba(0,0,0,0.5)' : '0 6px 24px rgba(0,0,0,0.25)',
          transform: h ? 'translateX(8px)' : 'none',
          transition: 'transform .4s cubic-bezier(.22,1,.36,1), background .3s, border-color .3s, box-shadow .4s',
          cursor: 'pointer',
        }}
      >
        {/* Filet doré vertical à gauche : épaisseur/opacité croît avec le palier (ascension) */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 3,
          background: GOLD_GRAD,
          opacity: h ? Math.min(1, goldMix + 0.2) : goldMix,
          transition: 'opacity .35s',
        }} />

        {/* Sceau / icône du rang */}
        <div style={{
          width: 'clamp(58px, 6vw, 76px)', height: 'clamp(58px, 6vw, 76px)',
          flexShrink: 0, borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(28px, 3vw, 38px)',
          background: 'rgba(191,164,106,0.07)',
          border: `1px solid ${h ? CINE.goldDim : CINE.hair}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: 'border-color .35s',
        }}>
          {rank.emoji}
        </div>

        {/* Identité du rang */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{
              fontFamily: CINE.title, fontWeight: 700,
              fontSize: 'clamp(19px, 2.1vw, 26px)', lineHeight: 1.05,
              letterSpacing: '-0.02em', color: CINE.ink,
            }}>
              {rank.name}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: CINE.title, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: CINE.gold,
              padding: '4px 12px', borderRadius: 100,
              background: 'rgba(191,164,106,0.08)',
              border: `1px solid ${CINE.goldDim}`,
            }}>
              {rank.hours} / semaine
            </span>
          </div>
          <p style={{
            margin: 0, fontFamily: CINE.body,
            fontSize: 'clamp(13.5px, 1.4vw, 15px)', lineHeight: 1.6,
            color: CINE.inkSoft, maxWidth: 640,
          }}>
            {rank.desc}
          </p>

          {/* Jauge d'ascension (palier sur l'échelle) — pure or/ivoire */}
          <div style={{ marginTop: 16, maxWidth: 360 }}>
            <div style={{
              height: 3, borderRadius: 2, overflow: 'hidden',
              background: 'rgba(255,255,255,0.06)',
            }}>
              <div style={{
                height: '100%', width: `${tierPct}%`,
                background: GOLD_GRAD, borderRadius: 2,
                transition: 'width 1s cubic-bezier(.22,1,.36,1)',
              }} />
            </div>
            <div style={{
              marginTop: 7, fontFamily: CINE.title, fontSize: 10.5, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: CINE.faint,
            }}>
              Palier {rank.tier} / {TIER_MAX}
            </div>
          </div>
        </div>

        {/* Action — voir les membres */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          paddingLeft: 'clamp(8px, 2vw, 24px)',
        }}>
          <span style={{
            fontFamily: CINE.title, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: h ? CINE.goldHi : CINE.muted,
            transition: 'color .3s', whiteSpace: 'nowrap',
          }}>
            Voir les membres
          </span>
          <span aria-hidden style={{
            fontFamily: CINE.title, fontSize: 18, color: CINE.gold,
            transform: h ? 'translateX(4px)' : 'none', transition: 'transform .35s',
          }}>
            →
          </span>
        </div>
      </div>
    </Reveal>
  )
}

export default function Ranks() {
  const [selectedRank, setSelectedRank] = useState(null)

  return (
    <>
      <CineStyles />
      <CineSection id="rangs">
        <SectionHead
          eyebrow="Progression"
          title="Gravis les"
          accent="rangs"
          lead="Plus tu passes de temps en vocal sur les 7 derniers jours, plus tu t'élèves. De Moussaillon à Roi des Pirates — chaque palier se mérite. Clique sur un rang pour voir ses membres."
        />

        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 16, marginTop: 'clamp(40px, 5vh, 64px)',
        }}>
          {RANKS.map((r, i) => (
            <RankBand key={r.name} rank={r} index={i} onOpen={setSelectedRank} />
          ))}
        </div>

        <Reveal delay={120 + RANKS.length * 90 + 60}>
          <CineRule style={{ margin: '44px auto 22px' }} />
          <p style={{
            margin: 0, textAlign: 'center', fontFamily: CINE.body,
            fontSize: 13.5, letterSpacing: '0.02em', color: CINE.muted,
          }}>
            Heures comptées sur une fenêtre glissante de 7 jours · les rangs sont cumulatifs
          </p>
        </Reveal>
      </CineSection>

      {selectedRank && (
        <RankModal rank={selectedRank} onClose={() => setSelectedRank(null)} />
      )}
    </>
  )
}
