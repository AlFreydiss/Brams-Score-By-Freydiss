import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './Navbar.jsx'
import { newGame, answer as engineAnswer, reject as engineReject, decide } from '../features/akinator/engine.js'
import { SERIES, CHARACTERS } from '../features/akinator/data.js'

// ── Design tokens — DA aqua premium : bleu nuit + cyan goutte d'eau. ──────────
const BG     = '#06111b'
const PINK   = '#0891b2'   // (noms conservés pour limiter le diff) = cyan profond
const PURPLE = '#0e7490'   // = bleu eau sombre
const PINK_L = '#67e8f9'   // = cyan clair
const PINK_M = '#22d3ee'   // = aqua
const GRAD   = `linear-gradient(135deg, ${PINK_M} 0%, ${PURPLE} 100%)`
const GLASS  = 'rgba(8,28,42,0.86)'
const TEXT   = '#ecfeff'
const MUTED  = 'rgba(236,254,255,0.55)'
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }
const LEAF_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%2367e8f9' stroke-width='1.25' opacity='0.55'%3E%3Cpath d='M60 14 C42 38 30 54 30 72 a30 30 0 0 0 60 0 C90 54 78 38 60 14 Z'/%3E%3Cpath d='M50 70 C52 82 62 90 74 86'/%3E%3Cpath d='M18 88 C30 78 42 78 54 88 C66 98 78 98 90 88 C98 82 106 82 114 88'/%3E%3C/g%3E%3C/svg%3E"
const AKI_FX = `
@keyframes aki-float{0%{transform:translateY(8px) translateX(0);opacity:0}12%{opacity:.48}88%{opacity:.34}100%{transform:translateY(-90px) translateX(14px);opacity:0}}
@keyframes aki-breathe{0%,100%{opacity:.020}50%{opacity:.035}}
@keyframes aki-drop-fall{0%{transform:translateY(-12vh);opacity:0}10%{opacity:.70}88%{opacity:.45}100%{transform:translateY(112vh);opacity:0}}
@keyframes aki-drop-sway{0%,100%{translate:-12px 0}50%{translate:12px 0}}
@media (prefers-reduced-motion:reduce){[data-fx]{animation:none!important}}
`
const AKI_DROPS = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 37.3 + 6) % 98,
  size: 8 + (i % 4) * 3,
  dur: 8.5 + (i % 6) * 2.2,
  del: -(i * 1.1) % 13,
  sway: 4.8 + (i % 5) * .7,
}))

const AkiDrops = () => (
  <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
    {AKI_DROPS.map((d, i) => (
      <span key={i} data-fx style={{
        position: 'absolute',
        left: `${d.x}%`,
        top: 0,
        width: d.size,
        height: d.size * 1.32,
        animation: `aki-drop-fall ${d.dur}s ${d.del}s linear infinite`,
        willChange: 'transform',
      }}>
        <span data-fx style={{
          display: 'block',
          width: '100%',
          height: '100%',
          borderRadius: '70% 0 70% 70%',
          transform: 'rotate(-45deg)',
          background: 'radial-gradient(circle at 33% 30%, rgba(236,254,255,.90), rgba(103,232,249,.44) 35%, rgba(34,211,238,.18) 72%)',
          border: '1px solid rgba(103,232,249,.38)',
          boxShadow: '0 0 12px rgba(34,211,238,.24)',
          animation: `aki-drop-sway ${d.sway}s ease-in-out infinite`,
        }} />
      </span>
    ))}
  </div>
)

const AkiAmbient = () => (
  <>
    <style>{AKI_FX}</style>
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: `
      radial-gradient(900px 520px at 16% -8%, ${hexA(PINK_M, .12)}, transparent 62%),
      radial-gradient(760px 520px at 88% 12%, rgba(124,92,246,.10), transparent 64%),
      radial-gradient(780px 680px at 48% 116%, ${hexA(PINK, .08)}, transparent 66%),
      linear-gradient(180deg, #06111b 0%, #050b12 58%, #04070c 100%)` }} />
    <div aria-hidden style={{
      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: .055,
      backgroundImage: 'linear-gradient(rgba(103,232,249,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.10) 1px, transparent 1px)',
      backgroundSize: '56px 56px',
      WebkitMaskImage: 'linear-gradient(180deg, transparent, black 16%, black 76%, transparent)',
      maskImage: 'linear-gradient(180deg, transparent, black 16%, black 76%, transparent)',
    }} />
    <div data-fx aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `url("${LEAF_URI}")`, backgroundSize: '180px', animation: 'aki-breathe 11s ease-in-out infinite' }} />
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} data-fx style={{ position: 'absolute', left: `${8 + i * 10}%`, bottom: '-10px', width: 4 + (i % 3), height: 4 + (i % 3), borderRadius: '50%', background: hexA(PINK_L, .50), filter: 'blur(.5px)', animation: `aki-float ${11 + (i % 5) * 2}s linear ${i * 1.3}s infinite` }} />
      ))}
    </div>
    <AkiDrops />
  </>
)

// ── Réponses ──────────────────────────────────────────────────────────────
// Les cinq réponses de l'original. Les nuances comptent : « probablement »
// pèse moins qu'un « oui » franc dans le calcul du génie.
const ANSWERS = [
  { key:'yes',     label:'Oui',               color:'#4ade80', bg:'rgba(34,197,94,.12)',   border:'rgba(34,197,94,.4)',   hotkey:'1' },
  { key:'no',      label:'Non',               color:'#f87171', bg:'rgba(239,68,68,.12)',   border:'rgba(239,68,68,.4)',   hotkey:'2' },
  { key:'dunno',   label:'Je ne sais pas',    color:'#cbd5e1', bg:'rgba(148,163,184,.08)', border:'rgba(148,163,184,.25)', hotkey:'3' },
  { key:'prob',    label:'Probablement',      color:'#a3e635', bg:'rgba(132,204,22,.08)',  border:'rgba(132,204,22,.28)', hotkey:'4' },
  { key:'probnot', label:'Probablement pas',  color:'#fb923c', bg:'rgba(249,115,22,.08)',  border:'rgba(249,115,22,.28)', hotkey:'5' },
]


// ── Sub-components ─────────────────────────────────────────────────────────

// ── Mascotte Freydiss ─────────────────────────────────────────────────────────
function FreydissMascot({ size = 100, pulse = true, mood = 'idle' }) {
  const eyeL = mood === 'thinking' ? 'M31 36 Q34 33 37 36' : null
  const eyeR = mood === 'thinking' ? 'M43 36 Q46 33 49 36' : null
  const moodEmoji = mood === 'found' ? '😏' : mood === 'lost' ? '😤' : null
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', position: 'relative',
        background: `linear-gradient(135deg, ${PINK_M} 0%, ${PURPLE} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: pulse ? 'akPulse 2.8s ease-in-out infinite' : 'none',
        boxShadow: `0 0 ${size*.35}px rgba(34,211,238,.42), 0 0 ${size*.7}px rgba(14,116,144,.24), inset 0 1px 0 rgba(255,255,255,.15)`,
      }}>
        {moodEmoji ? (
          <span style={{ fontSize: size * 0.55, lineHeight:1 }}>{moodEmoji}</span>
        ) : (
          <svg width={size*.8} height={size*.8} viewBox="0 0 80 80" style={{ overflow:'visible' }}>
            {/* Cheveux longs noirs bouclés — afro style (inspiré Freydiss) */}
            {/* Masse principale afro */}
            <ellipse cx="40" cy="20" rx="25" ry="18" fill="#0d0805" />
            {/* Boucles sur le dessus */}
            <circle cx="22" cy="17" r="9" fill="#120a06" />
            <circle cx="30" cy="10" r="10" fill="#0d0805" />
            <circle cx="40" cy="8"  r="11" fill="#110a06" />
            <circle cx="50" cy="10" r="10" fill="#0d0805" />
            <circle cx="58" cy="17" r="9"  fill="#120a06" />
            {/* Mèches longues qui tombent — style bouclé */}
            <path d="M18 28 Q10 44 14 60 Q16 66 13 72" stroke="#0d0805" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M62 28 Q70 44 66 60 Q64 66 67 72" stroke="#0d0805" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M14 34 Q6  50 10 64" stroke="#150b07" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M66 34 Q74 50 70 64" stroke="#150b07" strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Bandana pirate rouge sur le front */}
            <rect x="16" y="26" width="48" height="8" rx="3" fill="#4C9A5F" />
            <ellipse cx="40" cy="26" rx="5" ry="3" fill="#7b0f3a" />
            {/* Skull tiny sur le bandana */}
            <ellipse cx="40" cy="27" rx="3.5" ry="3" fill="white" opacity=".9" />
            <circle cx="38.5" cy="26.5" r=".9" fill="#0f0f1a" />
            <circle cx="41.5" cy="26.5" r=".9" fill="#0f0f1a" />
            <rect x="38" y="28.5" width="4" height="1" rx=".5" fill="#0f0f1a" />
            {/* Visage — teinte medium (inspiré Freydiss) */}
            <ellipse cx="40" cy="38" rx="17" ry="19" fill="#c8864a" />
            {/* Yeux */}
            {eyeL ? (
              <>
                <path d={eyeL} stroke="#2f6b40" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d={eyeR} stroke="#2f6b40" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <ellipse cx="33.5" cy="36.5" rx="3.8" ry="3.8" fill="white" />
                <ellipse cx="46.5" cy="36.5" rx="3.8" ry="3.8" fill="white" />
                <circle cx="34.5" cy="37.2" r="2.2" fill="#2f6b40" />
                <circle cx="47.5" cy="37.2" r="2.2" fill="#2f6b40" />
                <circle cx="35.2" cy="36.5" r=".9" fill="white" />
                <circle cx="48.2" cy="36.5" r=".9" fill="white" />
              </>
            )}
            {/* Joues */}
            <ellipse cx="27" cy="41.5" rx="5" ry="3" fill="rgba(255,120,120,.28)" />
            <ellipse cx="53" cy="41.5" rx="5" ry="3" fill="rgba(255,120,120,.28)" />
            {/* Sourire */}
            <path d="M32 46 Q40 52 48 46" stroke="#c07070" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {/* Étincelles */}
            <text x="61" y="22" fontSize="9" fill="#f59e0b" opacity=".85">✦</text>
            <text x="10" y="28" fontSize="7" fill="#f9a8d4" opacity=".75">✦</text>
            <text x="64" y="42" fontSize="6" fill="#f9a8d4" opacity=".6">✧</text>
          </svg>
        )}
      </div>
      <div style={{
        fontSize: size * 0.115, fontWeight:800, letterSpacing:'.08em',
        color:'rgba(103,232,249,.72)', textTransform:'uppercase',
        fontFamily:'var(--display)',
      }}>Freydiss</div>
    </div>
  )
}

function IdleScreen({ onStart }) {
  return (
    <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}
      style={{ textAlign:'center', maxWidth:580, padding:'0 16px' }}>
      <div style={{ marginBottom:36, animation:'akFloat 3.5s ease-in-out infinite' }}>
        <FreydissMascot size={130} />
      </div>

      <h1 style={{
        fontFamily:'var(--display)', fontSize:'clamp(28px,5vw,44px)', fontWeight:900,
        background:`linear-gradient(135deg, ${PINK_L} 0%, ${PINK_M} 50%, #a78bfa 100%)`,
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        marginBottom:14, lineHeight:1.15,
      }}>Je vais deviner à quoi vous pensez !</h1>

      <p style={{ fontSize:16, color:MUTED, lineHeight:1.7, marginBottom:36 }}>
        Pensez à <strong style={{ color:PINK_L }}>n'importe qui ou n'importe quoi</strong> :<br/>
        perso d'anime, célébrité, héros de film, animal, objet…<br/>
        Répondez honnêtement — le génie trouvera.
      </p>

      <button onClick={onStart} style={{
        padding:'16px 52px', borderRadius:100,
        background: GRAD, border:'none', cursor:'pointer',
        fontSize:18, fontWeight:800, color:'#fff',
        boxShadow:`0 8px 32px rgba(34,211,238,.34)`,
        transition:'all .2s', fontFamily:'var(--body)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow=`0 14px 44px rgba(34,211,238,.46)` }}
      onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow=`0 8px 32px rgba(34,211,238,.34)` }}
      >✨ Je suis prêt !</button>

      <p style={{ fontSize:12, color:'rgba(240,232,248,.25)', marginTop:20 }}>
        {CHARACTERS.length} personnages · {Object.keys(SERIES).length} séries · réponses instantanées
      </p>
    </motion.div>
  )
}

function AskingScreen({ question, qCount, confidence, onAnswer, onUndo }) {
  // Certitude réelle du génie sur son favori, pas une barre qui avance seule.
  const pct = Math.round(Math.max(4, Math.min(100, (confidence || 0) * 100)))

  useEffect(() => {
    function onKey(e) {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return
      const a = ANSWERS.find(x => x.hotkey === e.key)
      if (a) { e.preventDefault(); onAnswer(a.key) }
      else if (e.key === 'Backspace' && onUndo) { e.preventDefault(); onUndo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAnswer, onUndo])

  return (
    <motion.div initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-30 }}
      transition={{ duration:.2 }}
      style={{ width:'100%', maxWidth:620, padding:'0 16px' }}>

      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:12, fontWeight:700, color:MUTED, letterSpacing:'.08em', textTransform:'uppercase' }}>
            Question {qCount + 1}
          </span>
          <span style={{ fontSize:12, fontWeight:700, color:PINK_L }}>
            certitude {pct} %
          </span>
        </div>
        <div style={{ height:5, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:pct + '%', background:GRAD, borderRadius:3, transition:'width .5s ease' }} />
        </div>
      </div>

      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:22, animation:'akFloat 3s ease-in-out infinite' }}>
          <FreydissMascot size={70} mood="thinking" />
        </div>
        <div style={{
          background: GLASS,
          border:`1px solid rgba(34,211,238,.22)`,
          borderRadius:22, padding:'30px 36px',
          boxShadow:`0 24px 64px rgba(0,0,0,.45), inset 0 1px 0 rgba(103,232,249,.08)`,
        }}>
          <p style={{
            fontSize:'clamp(17px,3vw,22px)', fontWeight:700,
            color:TEXT, lineHeight:1.45, fontFamily:'var(--display)', margin:0,
          }}>{question.text}</p>
        </div>
      </div>

      <div className="ak-answers">
        {ANSWERS.map(a => (
          <button key={a.key} onClick={() => onAnswer(a.key)} className="ak-answer" style={{
            background:a.bg, border:`1px solid ${a.border}`, color:a.color,
          }}>
            <span>{a.label}</span>
            <kbd aria-hidden>{a.hotkey}</kbd>
          </button>
        ))}
      </div>

      {onUndo && (
        <div style={{ textAlign:'center', marginTop:16 }}>
          <button onClick={onUndo} style={{
            background:'none', border:'none', cursor:'pointer', color:MUTED,
            fontSize:13, fontWeight:600, fontFamily:'var(--body)', padding:'6px 10px',
          }}>← Corriger la réponse précédente</button>
        </div>
      )}
    </motion.div>
  )
}

function GuessingScreen({ guess, qCount, onRight, onWrong }) {
  return (
    <motion.div initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:1.05 }}
      style={{ textAlign:'center', maxWidth:480, padding:'0 16px' }}>

      <p style={{ fontSize:13, fontWeight:700, letterSpacing:'.15em', color:MUTED, marginBottom:20, textTransform:'uppercase' }}>
        Après {qCount} question{qCount > 1 ? 's' : ''}, je pense que c'est…
      </p>

      {/* Character card */}
      <div style={{
        width:200, height:240, borderRadius:22, margin:'0 auto 28px',
        background:`linear-gradient(145deg, rgba(34,211,238,.20) 0%, rgba(14,116,144,.34) 100%)`,
        border:`2px solid rgba(34,211,238,.34)`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        boxShadow:`0 24px 70px rgba(34,211,238,.22), 0 0 110px rgba(14,116,144,.16)`,
        animation:'akPulse 2.5s ease-in-out infinite',
        backdropFilter:'blur(10px)',
        padding:'20px 16px',
      }}>
        <div style={{ fontSize:72, marginBottom:16, animation:'akFloat 3s ease-in-out infinite', lineHeight:1 }}>
          {guess.emoji}
        </div>
        <div style={{
          fontSize:15, fontWeight:800, color:TEXT,
          fontFamily:'var(--display)', textAlign:'center', lineHeight:1.3,
        }}>{guess.name}</div>
        {guess.domain && (
          <div style={{ marginTop:6, fontSize:12, color:MUTED, textAlign:'center' }}>{guess.domain}</div>
        )}
      </div>

      <p style={{ fontSize:15, color:MUTED, marginBottom:22 }}>Est-ce que j'ai raison ?</p>

      <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
        <button onClick={onRight} style={{
          padding:'14px 38px', borderRadius:100,
          background:'rgba(34,197,94,.15)', border:'2px solid rgba(34,197,94,.5)',
          color:'#4ade80', cursor:'pointer', fontSize:16, fontWeight:800,
          transition:'all .18s', fontFamily:'var(--body)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(34,197,94,.27)'; e.currentTarget.style.transform='scale(1.05)' }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(34,197,94,.15)'; e.currentTarget.style.transform='scale(1)' }}
        >✅ Oui !</button>

        <button onClick={onWrong} style={{
          padding:'14px 38px', borderRadius:100,
          background:'rgba(239,68,68,.15)', border:'2px solid rgba(239,68,68,.5)',
          color:'#f87171', cursor:'pointer', fontSize:16, fontWeight:800,
          transition:'all .18s', fontFamily:'var(--body)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.27)'; e.currentTarget.style.transform='scale(1.05)' }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,.15)'; e.currentTarget.style.transform='scale(1)' }}
        >❌ Non</button>
      </div>
    </motion.div>
  )
}

function WinScreen({ guess, qCount, onReplay }) {
  return (
    <motion.div initial={{ opacity:0, scale:.85 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
      transition={{ type:'spring', stiffness:260, damping:20 }}
      style={{ textAlign:'center', maxWidth:480, padding:'0 16px' }}>

      <div style={{ fontSize:56, marginBottom:14, animation:'akFloat 2s ease-in-out infinite' }}>🎉</div>

      <h2 style={{
        fontFamily:'var(--display)', fontSize:'clamp(24px,5vw,36px)', fontWeight:900,
        background:'linear-gradient(135deg, #4ade80, #22c55e)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        marginBottom:6,
      }}>J'avais raison !</h2>

      <p style={{ color:MUTED, marginBottom:28, fontSize:14 }}>
        Trouvé en <strong style={{ color:PINK_L }}>{qCount} question{qCount > 1 ? 's' : ''}</strong>
      </p>

      <div style={{
        width:170, height:210, borderRadius:20, margin:'0 auto 28px',
        background:'linear-gradient(145deg, rgba(34,197,94,.2), rgba(16,185,129,.28))',
        border:'2px solid rgba(34,197,94,.45)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        boxShadow:'0 20px 60px rgba(34,197,94,.22)',
        padding:16,
      }}>
        <div style={{ fontSize:64, marginBottom:12, lineHeight:1 }}>{guess.emoji}</div>
        <div style={{ fontSize:14, fontWeight:800, color:'#4ade80', fontFamily:'var(--display)', textAlign:'center', lineHeight:1.3 }}>
          {guess.name}
        </div>
      </div>

      <button onClick={onReplay} style={{
        padding:'14px 44px', borderRadius:100,
        background: GRAD, border:'none', cursor:'pointer',
        fontSize:16, fontWeight:800, color:'#fff',
        boxShadow:`0 8px 32px rgba(34,211,238,.34)`,
        transition:'all .2s', fontFamily:'var(--body)',
      }}
      onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
      >🔮 Rejouer</button>
    </motion.div>
  )
}

function LostScreen({ onReplay }) {
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
      style={{ textAlign:'center', maxWidth:480, padding:'0 16px' }}>

      <div style={{ fontSize:56, marginBottom:14 }}>😤</div>

      <h2 style={{
        fontFamily:'var(--display)', fontSize:'clamp(22px,4vw,32px)', fontWeight:900,
        color:PINK_L, marginBottom:10,
      }}>Je donne ma langue au chat !</h2>

      <p style={{ color:MUTED, marginBottom:12, lineHeight:1.65, fontSize:15 }}>
        Ce personnage a réussi à me battre…<br/>
        Il n'est peut-être pas encore dans ma base de données.
      </p>

      <p style={{ fontSize:12, color:'rgba(240,232,248,.28)', marginBottom:32 }}>
        Tu peux essayer avec un autre personnage !
      </p>

      <button onClick={onReplay} style={{
        padding:'14px 44px', borderRadius:100,
        background: GRAD, border:'none', cursor:'pointer',
        fontSize:16, fontWeight:800, color:'#fff',
        boxShadow:`0 8px 32px rgba(34,211,238,.34)`,
        transition:'all .2s', fontFamily:'var(--body)',
      }}
      onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
      >🔮 Rejouer</button>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const PHASE = { IDLE:'idle', ASKING:'asking', GUESSING:'guessing', WIN:'win', LOST:'lost' }

// Au-delà, le génie s'avoue vaincu.
const MAX_QUESTIONS = 40
const MAX_GUESSES   = 5

export default function AkinatorPage() {
  const [phase,    setPhase]    = useState(PHASE.IDLE)
  const [game,     setGame]     = useState(null)   // état du moteur
  const [move,     setMove]     = useState(null)   // { action, question | char, confidence }
  const [guess,    setGuess]    = useState(null)   // { name, emoji, domain, id }
  const [guesses,  setGuesses]  = useState(0)
  // Pile des états précédents pour « Corriger ».
  const undoStack = useRef([])

  const play = useCallback((state, nGuesses) => {
    const d = decide(state)
    if (d.action === 'question' && state.asked.length < MAX_QUESTIONS) {
      setMove(d); setPhase(PHASE.ASKING); return
    }
    if (d.action === 'giveup' || nGuesses >= MAX_GUESSES) { setPhase(PHASE.LOST); return }
    const top = d.char || null
    if (!top) { setPhase(PHASE.LOST); return }
    setGuess({ id: top.id, name: top.name, emoji: '🔮', domain: SERIES[top.s]?.name || null })
    setPhase(PHASE.GUESSING)
  }, [])

  const startGame = useCallback(() => {
    const s = newGame()
    undoStack.current = []
    setGame(s); setGuess(null); setGuesses(0)
    play(s, 0)
  }, [play])

  const handleAnswer = useCallback((key) => {
    if (!game || !move || move.action !== 'question') return
    undoStack.current.push({ game, move })
    const next = engineAnswer(game, move.question.id, key)
    setGame(next)
    play(next, guesses)
  }, [game, move, guesses, play])

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    // Retour à l'état d'avant la dernière réponse, même question reposée.
    setGame(prev.game); setMove(prev.move)
    setPhase(PHASE.ASKING)
  }, [])

  const handleGuessRight = useCallback(() => setPhase(PHASE.WIN), [])

  const handleGuessWrong = useCallback(() => {
    if (!game || !guess) return
    const next = engineReject(game, guess.id)
    const n = guesses + 1
    setGame(next); setGuesses(n); setGuess(null)
    play(next, n)
  }, [game, guess, guesses, play])

  const reset = useCallback(() => {
    setPhase(PHASE.IDLE); setGame(null); setMove(null); setGuess(null); setGuesses(0)
    undoStack.current = []
  }, [])

  const qCount = game ? game.asked.length : 0
  const currentQ = move && move.action === 'question' ? move.question : null

  return (
    <div style={{ position:'fixed', left:0, right:0, top:0, bottom:0, zIndex:100, background:BG, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Navbar globale solide (la page est fixe → pas de scroll fenêtre → forceScrolled). L'overlay démarre juste sous la navbar. */}
      <Navbar forceScrolled />
      <style>{`
        @keyframes akStar   { 0%,100%{opacity:.25;transform:scale(1)} 50%{opacity:.9;transform:scale(1.6)} }
        @keyframes akPulse  { 0%,100%{box-shadow:0 0 30px rgba(34,211,238,.32),0 0 60px rgba(14,116,144,.18)} 50%{box-shadow:0 0 52px rgba(34,211,238,.52),0 0 100px rgba(14,116,144,.28)} }
        .ak-answers { display:grid; grid-template-columns:1fr 1fr; gap:10px }
        .ak-answers > :first-child, .ak-answers > :nth-child(2) { padding:17px 12px; font-size:16px }
        .ak-answers > :nth-child(3) { grid-column:1 / -1 }
        .ak-answer {
          position:relative; padding:13px 12px; border-radius:14px; cursor:pointer;
          font-family:var(--body); font-size:14px; font-weight:800; letter-spacing:.02em;
          transition:transform .15s, filter .15s;
        }
        .ak-answer:hover { transform:scale(1.03); filter:brightness(1.15) }
        .ak-answer:active { transform:scale(.98) }
        .ak-answer:focus-visible { outline:2px solid #67e8f9; outline-offset:2px }
        .ak-answer kbd {
          position:absolute; right:10px; top:50%; transform:translateY(-50%);
          font:600 10px var(--body); opacity:.4; border:1px solid currentColor;
          border-radius:4px; padding:1px 5px;
        }
        @media (hover:none) { .ak-answer kbd { display:none } }
        @keyframes akFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
      `}</style>
      <AkiAmbient />

      {/* Content */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', zIndex:2 }}>
        <AnimatePresence mode="wait">
          {phase === PHASE.IDLE     && <IdleScreen     key="idle"                  onStart={startGame} />}
          {phase === PHASE.ASKING && currentQ && <AskingScreen key={`q-${qCount}`} question={currentQ} qCount={qCount} confidence={move.confidence} onAnswer={handleAnswer} onUndo={undoStack.current.length ? handleUndo : null} />}
          {phase === PHASE.GUESSING && guess           && <GuessingScreen key={`g-${qCount}`}  guess={guess}       qCount={qCount} onRight={handleGuessRight} onWrong={handleGuessWrong} />}
          {phase === PHASE.WIN      && guess           && <WinScreen  key="win"  guess={guess} qCount={qCount} onReplay={reset} />}
          {phase === PHASE.LOST                        && <LostScreen key="lost"                                                 onReplay={reset} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
