import s from '../../styles/parchment.module.css'
import { FRUIT_TYPES } from './character-data.js'

export default function ScrollFront({ character }) {
  const ft = FRUIT_TYPES[character.fruit.type]

  return (
    <div
      className={s.parchment}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div className={`${s.tornEdge} ${s.top}`} />
      <div className={`${s.tornEdge} ${s.bottom}`} />

      {/* Water stains */}
      <div className={s.waterStain} style={{ width: 130, height: 90, top: '10%', left: '-6%' }} />
      <div className={s.waterStain} style={{ width: 95, height: 75, bottom: '18%', right: '-4%' }} />

      {/* WANTED header */}
      <div style={{ textAlign: 'center', paddingTop: 20, paddingBottom: 6, flexShrink: 0 }}>
        <div style={{
          fontFamily: "'Cinzel', 'Trajan Pro', serif",
          fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: 900,
          letterSpacing: '0.28em',
          color: '#1A0A04',
          lineHeight: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.12)',
        }}>
          WANTED
        </div>
        <div style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          fontSize: 11,
          letterSpacing: '0.2em',
          color: '#5C3A1A',
          marginTop: 3,
        }}>
          DEAD OR ALIVE
        </div>
      </div>

      {/* Separator */}
      <div style={{
        height: 2,
        margin: '0 18px 10px',
        background: 'linear-gradient(90deg, transparent, rgba(74,44,16,0.5), rgba(74,44,16,0.7), rgba(74,44,16,0.5), transparent)',
        flexShrink: 0,
      }} />

      {/* Portrait */}
      <div style={{ margin: '0 18px', position: 'relative', flexShrink: 0 }}>
        <div className={s.portrait} style={{ height: 210 }}>
          <img loading="lazy" decoding="async"
            src={character.image}
            alt={character.name}
            className={s.portraitImg}
            onError={e => {
              e.target.src = `https://placehold.co/340x210/2A1A08/F5E6C0?text=${encodeURIComponent(character.name.split(' ').pop())}`
            }}
          />
        </div>

        {/* Type badge overlay — top left corner */}
        <div style={{
          position: 'absolute',
          top: 6,
          left: 6,
          background: `${ft.badge}cc`,
          border: `1px solid ${ft.badge}`,
          borderRadius: 3,
          padding: '2px 7px',
          fontFamily: "'Cinzel', serif",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          zIndex: 6,
        }}>
          {ft.label.toUpperCase()}
        </div>

        {/* Wax seal — top right */}
        <div
          className={s.waxSeal}
          style={{
            position: 'absolute',
            top: -14,
            right: -10,
            width: 44,
            height: 44,
            background: `radial-gradient(circle at 38% 32%, ${ft.badge}dd, ${ft.color}ff)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: 'rgba(255,255,255,0.9)',
            zIndex: 7,
          }}
        >
          ☠
        </div>
      </div>

      {/* Fold crease */}
      <div className={`${s.foldLine} ${s.h}`} style={{ top: '68%', flexShrink: 0 }} />

      {/* Info block */}
      <div style={{ padding: '8px 18px 14px', flexShrink: 0 }}>
        {/* Name */}
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(12px, 2.5vw, 15px)',
          fontWeight: 700,
          color: '#1A0A04',
          letterSpacing: '0.05em',
          textAlign: 'center',
          lineHeight: 1.2,
          marginBottom: 2,
        }}>
          {character.name}
        </div>
        {/* Epithet */}
        <div style={{
          fontFamily: "'IM Fell English', serif",
          fontStyle: 'italic',
          fontSize: 11,
          color: '#5C3A1A',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          {character.epithet}
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(74,44,16,0.4), transparent)',
          marginBottom: 7,
        }} />

        {/* Bounty */}
        {character.bounty ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: 'italic',
              fontSize: 10,
              color: '#7A4A20',
              letterSpacing: '0.14em',
              marginBottom: 1,
            }}>
              — PRIME —
            </div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(15px, 3vw, 19px)',
              fontWeight: 900,
              color: '#1A0A04',
              letterSpacing: '0.06em',
              lineHeight: 1,
            }}>
              {character.bounty}
              <span style={{ fontSize: '0.6em', color: '#5C3A1A', marginLeft: 4, fontWeight: 600 }}>Berry</span>
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            fontFamily: "'Cinzel', serif",
            fontSize: 11,
            fontWeight: 700,
            color: '#8B1A1A',
            letterSpacing: '0.12em',
          }}>
            ✦ MARINE · AUCUNE PRIME ✦
          </div>
        )}
      </div>

      <div className={s.agedOverlay} />
      <div className={s.agedCracks} />
    </div>
  )
}
