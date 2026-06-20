// ── Roue de la fortune quotidienne + streak ─────────────────────────────────
// Bouton 🎰 dans la navbar (pastille rouge "!" si un tirage est disponible →
// FOMO) + modale roue. Le crédit est 100% SERVEUR : on appelle claimDailyWheel(),
// on ANIME la roue pour s'arrêter sur le prize_index RENVOYÉ par le serveur, puis
// on révèle amount/prize_label. Aucun montant n'est tiré ni envoyé côté client.
// Styles inline. Respecte prefers-reduced-motion. Ne crash jamais (RPC absente →
// can_claim:false). Dark/or sobre premium.
import { useEffect, useRef, useState, useCallback } from 'react'
import { getDailyWheelState, claimDailyWheel } from '../lib/dailyWheel.js'
import { fetchShopBalance } from '../lib/berryShop.js'

const GOLD = '#BFA46A'
const BG = '#0E0F13'

// Les 6 secteurs DOIVENT correspondre aux index 0..5 renvoyés par le serveur.
// L'ordre = l'ordre visuel sur la roue (secteur 0 en haut, sens horaire).
const SECTORS = [
  { label: '50',      amount: 50,   color: '#3a3d46' },
  { label: '100',     amount: 100,  color: '#2f5d4a' },
  { label: '250',     amount: 250,  color: '#3a3d46' },
  { label: '500',     amount: 500,  color: '#5d4a2f' },
  { label: '1000',    amount: 1000, color: '#3a3d46' },
  { label: 'JACKPOT', amount: 5000, color: '#7a5a1a' },
]
const N = SECTORS.length
const SEG = 360 / N // 60°

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Conique pour le fond de la roue (les secteurs colorés).
function conicGradient() {
  const stops = SECTORS.map((s, i) => `${s.color} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(', ')
  return `conic-gradient(from -${SEG / 2}deg, ${stops})`
}

function WheelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
    </svg>
  )
}

// Labels disposés en cercle au centre de chaque secteur.
function WheelLabels() {
  return (
    <>
      {SECTORS.map((s, i) => {
        const angle = i * SEG // secteur i centré sur i*SEG (from -SEG/2 ci-dessus)
        return (
          <div
            key={i}
            style={{
              position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center',
              transform: `rotate(${angle}deg)`, pointerEvents: 'none',
            }}
          >
            <span style={{
              marginTop: 14, fontSize: s.label === 'JACKPOT' ? 11 : 14, fontWeight: 900,
              color: s.label === 'JACKPOT' ? '#ffe9a8' : 'rgba(255,255,255,0.92)',
              letterSpacing: '.02em', textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
            }}>
              {s.label}
            </span>
          </div>
        )
      })}
    </>
  )
}

export default function DailyWheel({ discordId }) {
  const [state, setState] = useState({ ok: false, can_claim: false, streak: 0 })
  const [open, setOpen] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)   // { amount, prize_label, prize_index, streak }
  const [claimed, setClaimed] = useState(false) // tirage du jour déjà pris
  const [error, setError] = useState(null)
  const settleTimer = useRef(null)

  const refresh = useCallback(() => {
    if (!discordId) return
    getDailyWheelState().then(setState).catch(() => {})
  }, [discordId])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => () => clearTimeout(settleTimer.current), [])

  if (!discordId) return null

  const canClaim = state.can_claim && !claimed

  async function spin() {
    if (spinning || !canClaim) return
    setSpinning(true)
    setError(null)

    const res = await claimDailyWheel()

    if (!res.ok) {
      setSpinning(false)
      if (res.error === 'already') {
        setClaimed(true)
        setState(s => ({ ...s, can_claim: false }))
      } else if (res.error === 'auth') {
        setError('Connexion requise.')
      } else {
        setError('Une erreur est survenue. Réessaie.')
      }
      return
    }

    // Cible = centre du secteur prize_index, ramené sous le pointeur (en haut).
    // On ajoute des tours complets pour l'effet. Le pointeur est fixe en haut :
    // pour amener le secteur k sous lui, on tourne de -(k*SEG) modulo 360.
    const idx = Math.min(Math.max(res.prize_index, 0), N - 1)
    const reduced = prefersReducedMotion()
    const target = -(idx * SEG)

    if (reduced) {
      setRotation(target)
      finishSpin(res)
      return
    }

    const TURNS = 6
    // Repart de la rotation courante normalisée pour éviter un saut visuel.
    const base = rotation - (rotation % 360)
    const next = base + TURNS * 360 + target
    setRotation(next)
    settleTimer.current = setTimeout(() => finishSpin(res), 4200)
  }

  function finishSpin(res) {
    setSpinning(false)
    setClaimed(true)
    setResult({ amount: res.amount, prize_label: res.prize_label, prize_index: res.prize_index, streak: res.streak })
    setState(s => ({ ...s, can_claim: false, streak: res.streak }))
    // Rafraîchit le solde affiché ailleurs (boutique, etc.) sans recharger.
    fetchShopBalance().then(bal => {
      window.dispatchEvent(new CustomEvent('berry-balance-changed', { detail: { balance: bal } }))
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('berry-balance-changed', { detail: { balance: res.balance } }))
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Roue de la fortune quotidienne"
        title={canClaim ? 'Roue du jour disponible !' : 'Roue de la fortune'}
        style={{
          position: 'relative', width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          color: canClaim ? '#ffe9a8' : 'rgba(255,255,255,0.75)',
          background: canClaim
            ? 'linear-gradient(135deg, rgba(191,164,106,0.22), rgba(191,164,106,0.06))'
            : 'rgba(255,255,255,0.04)',
          border: canClaim ? '1px solid rgba(191,164,106,0.5)' : '1px solid rgba(255,255,255,0.08)',
          transition: 'transform .15s, box-shadow .2s, background .2s, border-color .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; if (canClaim) e.currentTarget.style.boxShadow = '0 6px 22px rgba(191,164,106,0.28)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
      >
        🎰
        {canClaim && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8, background: '#e0413a', color: '#fff', fontSize: 11, fontWeight: 900,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            boxShadow: '0 0 0 2px rgba(14,15,19,0.9), 0 0 10px rgba(224,65,58,0.6)',
            animation: 'dwPulse 1.6s ease-in-out infinite',
          }}>!</span>
        )}
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 16, background: 'rgba(5,6,9,0.78)',
            backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            animation: 'dwFade .25s ease',
          }}
        >
          <div style={{
            position: 'relative', width: 'min(420px, 94vw)', borderRadius: 18, padding: '26px 24px 28px',
            background: `radial-gradient(120% 90% at 50% 0%, rgba(191,164,106,0.10), ${BG} 60%)`,
            border: '1px solid rgba(191,164,106,0.28)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            textAlign: 'center',
          }}>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              style={{
                position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
              }}
            >×</button>

            <div style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: GOLD, fontWeight: 800 }}>
              Roue du jour
            </div>
            <div style={{
              marginTop: 6, fontSize: 14, color: 'rgba(255,255,255,0.82)', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              🔥 Jour {state.streak || (result?.streak ?? 0) || 1}
              <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 500, fontSize: 12 }}>· +10%/jour consécutif</span>
            </div>

            {/* Roue */}
            <div style={{ position: 'relative', width: 260, height: 260, margin: '20px auto 8px' }}>
              {/* Pointeur (fixe, en haut) */}
              <div style={{
                position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
                width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
                borderTop: `20px solid ${GOLD}`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }} />
              {/* Disque tournant */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: conicGradient(),
                border: '6px solid rgba(191,164,106,0.55)',
                boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.35), 0 10px 40px rgba(0,0,0,0.5)',
                transform: `rotate(${rotation}deg)`,
                transition: spinning && !prefersReducedMotion()
                  ? 'transform 4.1s cubic-bezier(0.15, 0.85, 0.2, 1)'
                  : 'none',
              }}>
                <WheelLabels />
              </div>
              {/* Moyeu central */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2,
                width: 46, height: 46, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, #2a2c33, ${BG})`,
                border: `2px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}>🪙</div>
            </div>

            {/* Résultat / état */}
            <div style={{ minHeight: 46, marginTop: 8 }}>
              {result ? (
                <div style={{ animation: 'dwPop .4s ease' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#ffe9a8' }}>
                    +{Number(result.amount).toLocaleString('fr-FR')} berries
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                    {result.prize_label || SECTORS[result.prize_index]?.label}
                  </div>
                </div>
              ) : error ? (
                <div style={{ fontSize: 13, color: '#e0746a', fontWeight: 600 }}>{error}</div>
              ) : claimed ? (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                  Reviens demain ! 🌙
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>
                  Tourne la roue pour tenter le jackpot 5000.
                </div>
              )}
            </div>

            {/* Bouton tourner */}
            <button
              onClick={spin}
              disabled={spinning || !canClaim}
              style={{
                marginTop: 14, width: '100%', height: 48, borderRadius: 12, cursor: (spinning || !canClaim) ? 'default' : 'pointer',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 900, letterSpacing: '.04em',
                color: (spinning || !canClaim) ? 'rgba(255,255,255,0.4)' : '#1a1408',
                background: (spinning || !canClaim)
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #e6cd8a, #BFA46A)',
                border: (spinning || !canClaim) ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(191,164,106,0.6)',
                transition: 'transform .15s, box-shadow .2s, filter .2s',
                boxShadow: (spinning || !canClaim) ? 'none' : '0 8px 26px rgba(191,164,106,0.3)',
              }}
              onMouseEnter={e => { if (!spinning && canClaim) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.06)' } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none' }}
            >
              {spinning ? 'La roue tourne…' : canClaim ? '🎯 TOURNER' : (claimed ? 'Déjà tourné aujourd\'hui' : 'Indisponible')}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dwPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.18) } }
        @keyframes dwFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dwPop { from { opacity: 0; transform: scale(.85) } to { opacity: 1; transform: scale(1) } }
        @media (prefers-reduced-motion: reduce) {
          @keyframes dwPulse { 0%,100% { transform: none } }
        }
      `}</style>
    </>
  )
}
