// Écran vainqueur premium, partagé entre le tournoi solo et le salon multi.
// Gère proprement l'absence de vignette YouTube (openings audio-only / ytId
// invalide) : fallback gradient au lieu d'une image cassée « ... ».
import { useState } from 'react'
import { motion } from 'framer-motion'

const PINK = '#9d174d', PURPLE = '#4c1d95', PINK_L = '#db2777', PINK_LL = '#f9a8d4'
const GOLD = PINK
const GRAD_TXT = `linear-gradient(135deg, ${PINK_LL} 0%, ${PINK_L} 45%, ${PURPLE} 100%)`

export default function WinnerCard({ winner, onReset, resetLabel = 'Rejouer le tournoi', subtitle = 'Le tournoi est terminé. La communauté a parlé.' }) {
  const [imgFailed, setImgFailed] = useState(false)
  const [imgState, setImgState] = useState('loading')
  const ytOk = winner?.ytId && !String(winner.ytId).startsWith('similar')
  const thumb = ytOk && !imgFailed ? `https://img.youtube.com/vi/${winner.ytId}/hqdefault.jpg` : null
  const accent = winner?.color || GOLD
  const showThumb = !!thumb && imgState !== 'failed' && !imgFailed

  function handleLoad(e) {
    if (e.target.naturalWidth <= 120) setImgFailed(true)  // placeholder « vidéo indisponible » de YouTube
    else setImgState('ok')
  }

  if (!winner) return null

  return (
    <div style={{ textAlign: 'center', padding: '20px 0 40px' }}>
      <style>{`@keyframes wc_glow{0%,100%{box-shadow:0 0 60px ${accent}22,0 0 0 1px ${accent}22}50%{box-shadow:0 0 100px ${accent}44,0 0 0 1px ${accent}55}}`}</style>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          display: 'inline-block', position: 'relative', borderRadius: 24,
          border: `1px solid ${accent}`, overflow: 'hidden',
          animation: 'wc_glow 3.5s ease-in-out infinite',
          maxWidth: 500, width: '100%',
        }}
      >
        {showThumb ? (
          <>
            <img src={thumb} onLoad={handleLoad} onError={() => setImgFailed(true)} alt=""
              style={{ position: 'absolute', inset: '-5%', width: '110%', height: '110%', maxWidth: 'none', maxHeight: 'none', objectFit: 'cover', filter: 'blur(16px) brightness(0.26) saturate(1.3)' }} />
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${accent}30 0%, rgba(7,9,14,0.88) 65%)` }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 40% 35%, ${accent}55 0%, ${accent}18 40%, rgba(7,9,14,.98) 68%)` }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, padding: '44px 56px' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🏆</div>
          <div style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 900, background: GRAD_TXT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8, lineHeight: 1.2 }}>
            {winner.title}
          </div>
          {winner.anime && <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>{winner.anime}</div>}
          {winner.artist && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.28)' }}>{winner.artist}</div>}
        </div>
      </motion.div>

      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', margin: '24px 0' }}>{subtitle}</div>

      <button onClick={onReset}
        style={{ padding: '11px 30px', borderRadius: 12, border: `1px solid ${accent}55`, background: `${accent}1f`, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all .2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = `${accent}33` }}
        onMouseLeave={e => { e.currentTarget.style.background = `${accent}1f` }}>
        {resetLabel}
      </button>
    </div>
  )
}
