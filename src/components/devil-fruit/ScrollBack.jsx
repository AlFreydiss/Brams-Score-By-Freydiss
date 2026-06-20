import s from '../../styles/parchment.module.css'
import { FRUIT_TYPES } from './character-data.js'

export default function ScrollBack({ character }) {
  const ft = FRUIT_TYPES[character.fruit.type]

  return (
    <div
      className={s.parchment}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div className={`${s.tornEdge} ${s.top}`} />
      <div className={`${s.tornEdge} ${s.bottom}`} />

      {/* Portrait fantôme en fond */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', overflow: 'hidden',
      }}>
        <img loading="lazy" decoding="async"
          src={character.image}
          alt=""
          aria-hidden="true"
          style={{
            width: '90%', height: '90%',
            objectFit: 'cover', objectPosition: 'top center',
            filter: 'sepia(1) contrast(0.6) brightness(1.15)',
            opacity: 0.13,
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 40%, black 40%, transparent 80%)',
            userSelect: 'none',
          }}
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      {/* Water stains */}
      <div className={s.waterStain} style={{ width: 110, height: 80, top: '25%', right: '-5%' }} />
      <div className={s.waterStain} style={{ width: 80, height: 65, bottom: '12%', left: '-4%' }} />

      <div style={{ padding: '20px 22px 16px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 2 }}>

        {/* Archive header */}
        <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: 8 }}>
          <div style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: 'italic',
            fontSize: 9,
            letterSpacing: '0.2em',
            color: '#8A5A20',
            marginBottom: 3,
          }}>
            ARCHIVES SECRÈTES · WORLD GOVERNMENT
          </div>
          <div
            className={s.inkReveal}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(14px, 2.5vw, 17px)',
              fontWeight: 900,
              letterSpacing: '0.15em',
              color: '#1A0A04',
            }}
          >
            FRUIT DU DÉMON
          </div>
        </div>

        {/* Type badge */}
        <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0, marginBottom: 6 }}>
          <div
            className={s.stampAppear}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 11px',
              borderRadius: 20,
              background: `${ft.badge}22`,
              border: `1px solid ${ft.badge}99`,
              fontFamily: "'Cinzel', serif",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: ft.color,
            }}
          >
            <span style={{ fontSize: 8 }}>◆</span>
            {ft.label.toUpperCase()}
          </div>
        </div>

        {/* Fruit name */}
        <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: 2 }}>
          <div
            className={s.inkReveal}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 'clamp(11px, 2vw, 14px)',
              fontWeight: 700,
              color: '#1A0A04',
              letterSpacing: '0.05em',
              animationDelay: '0.15s',
            }}
          >
            {character.fruit.name}
          </div>
          {character.fruit.aka && (
            <div style={{
              fontFamily: "'IM Fell English', serif",
              fontStyle: 'italic',
              fontSize: 10,
              color: '#7A4A20',
              marginTop: 2,
            }}>
              alias « {character.fruit.aka} »
            </div>
          )}
        </div>

        {/* Ornamental divider */}
        <div
          className={s.ornDivider}
          style={{ color: 'rgba(74,44,16,0.35)', margin: '6px 0', flexShrink: 0 }}
        >
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: '#8B6020' }}>⟡</span>
        </div>

        {/* Description */}
        <div
          className={s.inkFadeUp}
          style={{
            fontFamily: "'EB Garamond', Georgia, serif",
            fontSize: 'clamp(10px, 1.6vw, 12px)',
            lineHeight: 1.7,
            color: '#2A1A08',
            flex: '1 1 auto',
            overflow: 'hidden',
            marginBottom: 8,
            animationDelay: '0.25s',
          }}
        >
          {character.fruit.description}
        </div>

        {/* Abilities */}
        <div style={{ flexShrink: 0, marginBottom: 10 }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: '#8A5A20',
            marginBottom: 5,
            textAlign: 'center',
          }}>
            ✦ CAPACITÉS RÉPERTORIÉES ✦
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
            {character.fruit.abilities.map((ab, i) => (
              <div
                key={i}
                className={s.inkFadeUp}
                style={{
                  background: 'rgba(74,44,16,0.07)',
                  border: '1px solid rgba(74,44,16,0.22)',
                  borderRadius: 3,
                  padding: '2px 8px',
                  fontFamily: "'EB Garamond', serif",
                  fontStyle: 'italic',
                  fontSize: 10,
                  color: '#3A1A08',
                  animationDelay: `${0.35 + i * 0.07}s`,
                }}
              >
                {ab}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(74,44,16,0.2)',
          paddingTop: 7,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 10,
            fontWeight: 700,
            color: '#2A1A08',
            letterSpacing: '0.06em',
          }}>
            {character.name}
          </div>
          <div style={{
            fontFamily: "'IM Fell English', serif",
            fontStyle: 'italic',
            fontSize: 9,
            color: '#7A4A20',
          }}>
            {character.title}
          </div>
        </div>
      </div>

      <div className={s.agedOverlay} />
      <div className={s.agedCracks} />
    </div>
  )
}
