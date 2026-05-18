import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchMemberProfile } from '../lib/supabase.js'

const RANK_MAP = [
  { min: 150, rang: 'Roi des Pirates', emoji: '🤴', color: '#FFD700', next: null },
  { min: 70,  rang: 'Yonkou',          emoji: '👑', color: '#9B59B6', next: 150 },
  { min: 40,  rang: 'Amiral',          emoji: '🪖', color: '#F1C40F', next: 70  },
  { min: 25,  rang: 'Shichibukai',     emoji: '⚔️', color: '#2ECC71', next: 40  },
  { min: 10,  rang: 'Pirate',          emoji: '🏴‍☠️', color: '#3B82F6', next: 25  },
  { min: 0,   rang: 'Moussaillon',     emoji: '⚓', color: '#7c7f8a', next: 10  },
]

function getRank(h) {
  return RANK_MAP.find(r => h >= r.min) ?? RANK_MAP[RANK_MAP.length - 1]
}

function fmtB(n) {
  if (!n) return '0'
  n = parseInt(n)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

function WantedPoster({ member, rank }) {
  const h     = parseFloat(member.vocal_h || 0)
  const rk    = getRank(h)
  const prime = parseInt(member.berrys || 0)

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, #2a1f0e 0%, #1a1208 100%)',
      border: '3px solid #8B6914',
      borderRadius: 8,
      padding: '28px 24px 24px',
      maxWidth: 320,
      margin: '0 auto',
      boxShadow: '0 0 60px rgba(139,105,20,0.4), 0 24px 80px rgba(0,0,0,0.7)',
      fontFamily: 'serif',
    }}>
      {/* Bords déco */}
      {['top','bottom'].map(pos => (
        <div key={pos} style={{
          position: 'absolute', [pos]: 8, left: 8, right: 8, height: 2,
          background: 'linear-gradient(90deg, transparent, #8B6914, #FFD700, #8B6914, transparent)',
        }} />
      ))}
      {['left','right'].map(pos => (
        <div key={pos} style={{
          position: 'absolute', [pos]: 8, top: 8, bottom: 8, width: 2,
          background: 'linear-gradient(180deg, transparent, #8B6914, #FFD700, #8B6914, transparent)',
        }} />
      ))}

      {/* WANTED header */}
      <div style={{
        textAlign: 'center',
        fontFamily: 'var(--pirate)',
        fontSize: 11, letterSpacing: '.35em',
        color: '#8B6914', marginBottom: 4,
      }}>— AVIS DE RECHERCHE —</div>
      <div style={{
        textAlign: 'center',
        fontFamily: 'var(--pirate)',
        fontSize: 52, lineHeight: 1,
        color: '#FFD700',
        textShadow: '0 0 20px rgba(255,215,0,0.5)',
        marginBottom: 16,
      }}>WANTED</div>

      {/* Avatar */}
      <div style={{
        width: 180, height: 180, margin: '0 auto 16px',
        border: '3px solid #8B6914',
        borderRadius: 4, overflow: 'hidden',
        background: `${rk.color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
      }}>
        {member.avatar_url ? (
          <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 80 }}>{rk.emoji}</span>
        )}
      </div>

      {/* Nom */}
      <div style={{
        textAlign: 'center',
        fontFamily: 'var(--pirate)',
        fontSize: 28, color: '#fff',
        marginBottom: 4,
        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
      }}>{member.username || `Pirate #${String(member.uid).slice(-4)}`}</div>

      {/* Rang badge */}
      <div style={{
        textAlign: 'center', marginBottom: 16,
        fontSize: 12, fontWeight: 700,
        color: rk.color, letterSpacing: '.1em',
      }}>{rk.emoji} {rk.rang}</div>

      {/* Séparateur */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #8B6914, transparent)', margin: '0 0 14px' }} />

      {/* Prime */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, letterSpacing: '.2em', color: '#8B6914', marginBottom: 4 }}>PRIME</div>
        <div style={{
          fontFamily: 'var(--pirate)',
          fontSize: 30, color: '#FFD700',
          textShadow: '0 0 12px rgba(255,215,0,0.6)',
        }}>{fmtB(prime)} ฿</div>
      </div>

      {/* Rank position */}
      {rank && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(0,0,0,0.6)', border: '1px solid #8B6914',
          borderRadius: 6, padding: '4px 8px',
          fontSize: 11, fontWeight: 800, color: rk.color,
        }}>#{rank}</div>
      )}
    </div>
  )
}

function StatBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: `0 0 8px ${color}60`,
        }} />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { discordId } = useParams()
  const navigate      = useNavigate()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchMemberProfile(discordId)
      .then(data => { setMember(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [discordId])

  const share = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const h    = parseFloat(member?.vocal_h || 0)
  const rk   = getRank(h)
  const next = rk.next ? RANK_MAP.find(r => r.rang === (rk.next === 150 ? 'Roi des Pirates' : RANK_MAP.find(r2 => r2.min === rk.next)?.rang)) : null
  const nextRk = rk.next ? RANK_MAP.find(r => r.min === rk.next) : null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      paddingTop: 80,
      paddingBottom: 60,
    }}>
      {/* Orbes */}
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${rk.color}08, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,101,242,0.06), transparent 70%)', pointerEvents: 'none' }} />

      <div className="container" style={{ maxWidth: 960 }}>

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '9px 18px', color: 'var(--muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 36,
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--muted)' }}
        >← Retour</button>

        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>🏴‍☠️</div>
            <p style={{ color: 'var(--muted)' }}>Chargement du profil…</p>
          </div>
        )}

        {!loading && !member && (
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>☠️</div>
            <h2 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 28, color: '#fff', marginBottom: 12 }}>Pirate introuvable</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 28 }}>Ce membre n'est pas dans le classement.</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">Retour à l'accueil</button>
          </div>
        )}

        {!loading && member && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 48, alignItems: 'start' }}>

            {/* ── Colonne gauche — Wanted poster ── */}
            <div>
              <WantedPoster member={member} rank={member.rank} />

              {/* Share */}
              <button
                onClick={share}
                style={{
                  width: '100%', marginTop: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, padding: '10px 0', color: copied ? '#34d399' : 'var(--muted)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
                }}
              >
                {copied ? '✅ Lien copié !' : '🔗 Partager ce profil'}
              </button>
            </div>

            {/* ── Colonne droite — Stats ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Header */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: rk.color, marginBottom: 8 }}>
                  {rk.emoji} {rk.rang}
                </div>
                <h1 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(28px,4vw,48px)', color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>
                  {member.username || `Pirate #${String(member.uid).slice(-4)}`}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Classement global : <strong style={{ color: '#fff' }}>#{member.rank}</strong> sur {member.total} nakamas
                </p>
              </div>

              {/* Stats principales */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}>
                {[
                  { label: 'Heures vocales', value: `${h}h`, icon: '🎙️', color: rk.color },
                  { label: 'Berrys', value: `${fmtB(member.berrys)} ฿`, icon: '💰', color: '#FFD700' },
                  { label: 'Rang global', value: `#${member.rank}`, icon: '📊', color: '#5865F2' },
                  { label: 'Classement', value: rk.rang, icon: rk.emoji, color: rk.color },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14, padding: '18px 20px',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'var(--display)', marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Progression vers rang suivant */}
              {nextRk && (
                <div style={{
                  background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Progression</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      vers {nextRk.emoji} {nextRk.rang}
                    </span>
                  </div>
                  <StatBar
                    label={`${rk.rang} → ${nextRk.rang}`}
                    value={`${h}h / ${nextRk.min}h`}
                    max={nextRk.min}
                    color={nextRk.color}
                  />
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                    Il reste <strong style={{ color: nextRk.color }}>{Math.max(0, nextRk.min - h)}h</strong> de vocal pour atteindre {nextRk.rang}.
                  </p>
                </div>
              )}

              {nextRk === null && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.03))',
                  border: '1px solid rgba(255,215,0,0.25)',
                  borderRadius: 14, padding: '20px 24px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👑</div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: '#FFD700', marginBottom: 4 }}>Rang maximum atteint</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Ce membre est au sommet du Grand Line.</div>
                </div>
              )}

              {/* Discord ID */}
              <div style={{
                background: 'rgba(88,101,242,0.06)', border: '1px solid rgba(88,101,242,0.15)',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Discord ID</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#5865f2', fontFamily: 'monospace' }}>{member.uid}</div>
                </div>
                <a
                  href="https://discord.gg/v3Ddhtbz"
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    marginLeft: 'auto',
                    background: '#5865f2', color: '#fff',
                    border: 'none', borderRadius: 8,
                    padding: '7px 14px', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', textDecoration: 'none',
                  }}
                >Rejoindre →</a>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
