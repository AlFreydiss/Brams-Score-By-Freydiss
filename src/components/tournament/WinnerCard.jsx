// Écran VAINQUEUR — célébration premium (tournoi solo + salon multi).
// Props inchangées : { winner, onReset, resetLabel, subtitle }.
// Confettis or, rayons tournants, couronne CHAMPION, trophée qui bondit,
// réécoute de l'opening (YouTube embed à la demande), partage. Reduced-motion safe.
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'

const PINK = '#db2777', PURPLE = '#7c3aed', PINK_LL = '#f9a8d4', GOLD = '#f5c945'
const REDUCE = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

export default function WinnerCard({ winner, onReset, resetLabel = 'Rejouer le tournoi', subtitle = 'Le tournoi est terminé. La communauté a parlé.' }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [imgState, setImgState] = useState('loading')
  const [playing, setPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const accent = winner?.color || PINK
  const ytOk = winner?.ytId && !String(winner.ytId).startsWith('similar')
  const thumb = ytOk && !imgFailed ? `https://img.youtube.com/vi/${winner.ytId}/hqdefault.jpg` : null
  const showThumb = !!thumb && imgState !== 'failed' && !imgFailed
  const gradTxt = `linear-gradient(135deg, #fff 0%, ${PINK_LL} 40%, ${accent} 100%)`

  // confettis : ~46 particules déterministes (pas de Math.random au render — varie par index)
  const confetti = useMemo(() => {
    if (REDUCE) return []
    const cols = [GOLD, accent, '#ffffff', PINK_LL, PURPLE]
    return Array.from({ length: 46 }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280 / 233280
      const seed2 = (i * 4099 + 137) % 997 / 997
      return {
        left: (seed * 100).toFixed(1), delay: (seed2 * 2.6).toFixed(2),
        dur: (2.6 + seed * 2.4).toFixed(2), col: cols[i % cols.length],
        size: 6 + Math.round(seed2 * 7), rot: Math.round(seed * 360),
        sway: (seed2 * 60 - 30).toFixed(0), round: i % 3 === 0,
      }
    })
  }, [accent])

  function handleLoad(e) {
    if (e.target.naturalWidth <= 120) setImgFailed(true)
    else setImgState('ok')
  }
  function share() {
    const txt = `🏆 « ${winner?.title} »${winner?.anime ? ` (${winner.anime})` : ''} a gagné le tournoi sur Brams Community !`
    try {
      if (navigator.share) { navigator.share({ text: txt, url: location.href }).catch(() => {}) }
      else { navigator.clipboard?.writeText(`${txt} ${location.href}`); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    } catch {}
  }

  if (!winner) return null

  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: '8px 0 48px', overflow: 'hidden' }}>
      <style>{`
        @keyframes wc_rays { to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes wc_glow { 0%,100%{ box-shadow:0 0 60px ${accent}33, 0 0 0 1px ${accent}44 } 50%{ box-shadow:0 0 130px ${accent}66, 0 0 0 1px ${accent}88 } }
        @keyframes wc_trophy { 0%,100%{ transform:translateY(0) rotate(-4deg) } 50%{ transform:translateY(-10px) rotate(4deg) } }
        @keyframes wc_crownp { 0%,100%{ transform:translateY(0) scale(1); filter:drop-shadow(0 0 10px ${GOLD}88) } 50%{ transform:translateY(-3px) scale(1.06); filter:drop-shadow(0 0 22px ${GOLD}) } }
        @keyframes wc_fall { 0%{ transform:translateY(-12vh) translateX(0) rotate(0); opacity:0 } 8%{opacity:1} 100%{ transform:translateY(108vh) translateX(var(--sway)) rotate(720deg); opacity:.9 } }
        @keyframes wc_titlein { from{ opacity:0; transform:translateY(14px) } to{ opacity:1; transform:none } }
        @keyframes wc_shine { to { background-position: 200% center; } }
        .wc-champ { background-size:200% auto; animation: wc_shine 3s linear infinite; }
        @media (prefers-reduced-motion: reduce){ .wc-anim{ animation:none !important; } }
        @media (max-width:640px){ .wc-inner{ padding:34px 22px !important; } .wc-actions{ flex-direction:column; } }
      `}</style>

      {/* confettis (plein écran de la zone) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {confetti.map((c, i) => (
          <span key={i} className="wc-anim" style={{
            position: 'absolute', top: 0, left: `${c.left}%`, width: c.size, height: c.round ? c.size : c.size * 0.45,
            background: c.col, borderRadius: c.round ? '50%' : 2, opacity: 0,
            '--sway': `${c.sway}px`, transform: `rotate(${c.rot}deg)`,
            animation: `wc_fall ${c.dur}s linear ${c.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* rayons tournants derrière la carte */}
      {!REDUCE && (
        <div aria-hidden className="wc-anim" style={{
          position: 'absolute', top: 200, left: '50%', width: 900, height: 900, zIndex: 0, pointerEvents: 'none',
          transform: 'translate(-50%,-50%)', opacity: 0.5,
          background: `repeating-conic-gradient(from 0deg at 50% 50%, ${accent}14 0deg 12deg, transparent 12deg 24deg)`,
          maskImage: 'radial-gradient(circle, #000 0%, transparent 62%)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 62%)',
          animation: 'wc_rays 32s linear infinite',
        }} />
      )}

      {/* eyebrow CHAMPION */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}
        style={{ position: 'relative', zIndex: 1, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span className="wc-anim" style={{ fontSize: 26, animation: 'wc_crownp 2.4s ease-in-out infinite' }}>👑</span>
        <span className="wc-champ" style={{
          fontFamily: "'Pirata One',cursive", fontSize: 'clamp(20px,3.4vw,30px)', fontWeight: 900, letterSpacing: '.04em',
          background: `linear-gradient(90deg, ${GOLD}, #fff 45%, ${GOLD})`, WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent', textTransform: 'uppercase',
        }}>Champion</span>
        <span className="wc-anim" style={{ fontSize: 26, animation: 'wc_crownp 2.4s ease-in-out infinite .3s' }}>👑</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="wc-anim"
        style={{
          display: 'inline-block', position: 'relative', zIndex: 1, borderRadius: 26,
          border: `1px solid ${accent}`, overflow: 'hidden', animation: REDUCE ? 'none' : 'wc_glow 3.2s ease-in-out infinite',
          maxWidth: 560, width: '100%',
        }}
      >
        {showThumb ? (
          <>
            <img src={thumb} onLoad={handleLoad} onError={() => setImgFailed(true)} alt=""
              style={{ position: 'absolute', inset: '-5%', width: '110%', height: '110%', maxWidth: 'none', objectFit: 'cover', filter: 'blur(18px) brightness(0.28) saturate(1.4)' }} />
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 35%, ${accent}3a 0%, rgba(7,9,14,0.92) 66%)` }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 45% 30%, ${accent}66 0%, ${accent}1c 42%, rgba(7,9,14,.98) 70%)` }} />
        )}

        <div className="wc-inner" style={{ position: 'relative', zIndex: 1, padding: '46px 56px' }}>
          {playing && ytOk ? (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', marginBottom: 22, border: `1px solid ${accent}55` }}>
              <iframe title="winner" src={`https://www.youtube.com/embed/${winner.ytId}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media" allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
          ) : (
            <div className="wc-anim" style={{ fontSize: 64, marginBottom: 10, animation: REDUCE ? 'none' : 'wc_trophy 2.8s ease-in-out infinite', filter: `drop-shadow(0 8px 24px ${accent}88)` }}>🏆</div>
          )}

          <div style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 900, background: gradTxt, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8, lineHeight: 1.12, animation: REDUCE ? 'none' : 'wc_titlein .6s .2s both' }}>
            {winner.title}
          </div>
          {winner.anime && <div style={{ fontSize: 15.5, color: 'rgba(255,255,255,.72)', fontWeight: 700, marginBottom: 3 }}>{winner.anime}</div>}
          {winner.artist && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.4)' }}>{winner.artist}</div>}

          {ytOk && (
            <button onClick={() => setPlaying(p => !p)} style={{
              marginTop: 22, padding: '10px 22px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${accent}`, background: `${accent}26`, color: '#fff', fontSize: 13.5, fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>{playing ? '⏸ Masquer' : '▶ Réécouter le gagnant'}</button>
          )}
        </div>
      </motion.div>

      <div style={{ position: 'relative', zIndex: 1, fontSize: 14, color: 'rgba(255,255,255,.42)', margin: '22px 0 20px' }}>{subtitle}</div>

      <div className="wc-actions" style={{ position: 'relative', zIndex: 1, display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onReset} style={{
          padding: '13px 32px', borderRadius: 13, border: 'none', cursor: 'pointer', minHeight: 46,
          background: `linear-gradient(135deg, ${accent}, ${PURPLE})`, color: '#fff', fontSize: 14, fontWeight: 800,
          boxShadow: `0 12px 34px ${accent}55`,
        }}>{resetLabel}</button>
        <button onClick={share} style={{
          padding: '13px 26px', borderRadius: 13, cursor: 'pointer', minHeight: 46,
          border: `1px solid ${accent}55`, background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: 13.5, fontWeight: 800,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>{copied ? '✓ Copié' : '🔗 Partager'}</button>
      </div>
    </div>
  )
}
