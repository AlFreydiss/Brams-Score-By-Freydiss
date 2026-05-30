import { useState, useMemo } from 'react'

// ── Arène de duel multijoueur (salon tournoi) ────────────────────────────────
// Vraie scène premium : top contexte · centre 2 openings face à face + VS ·
// sidebar votes · zone basse (progression / règles / prochains duels).
// Ne porte AUCUNE logique de vote/réseau : tout vient des props (onVote, etc.).

const PINK = '#9d174d', PURPLE = '#4c1d95', PINK_L = '#f9a8d4', GOLD = '#d4a017'
const BORDER = 'rgba(255,255,255,.09)'
const PANEL = 'linear-gradient(165deg, #17151f, #110f17)'

const ARENA_CSS = `
@keyframes ra-vs { 0%,100%{transform:rotate(45deg) scale(1);box-shadow:0 0 0 0 rgba(157,23,77,.35)} 50%{transform:rotate(45deg) scale(1.05);box-shadow:0 0 0 10px rgba(157,23,77,0)} }
@keyframes ra-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes ra-eq { 0%,100%{height:6px} 50%{height:20px} }
.ra-card{animation:ra-in .5s cubic-bezier(.22,1,.36,1) both}
.ra-card:hover{transform:translateY(-3px)}
.ra-vote:hover:not(:disabled){filter:brightness(1.12)}
.ra-vote:active:not(:disabled){transform:translateY(1px)}
`

function hex(c, a) {
  const n = parseInt(c.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export default function RoomArena({
  code, copied, onLeave, onCopyLink,
  match, roundLabel, matchNum, totalMatches, progress,
  leftN, rightN, totalV, myVote, onVote, canVote,
  players, votes, rounds, isMobile,
}) {
  const [playing, setPlaying] = useState(null) // 'left' | 'right'
  const playingP = playing === 'left' ? match.left : playing === 'right' ? match.right : null
  const pct = side => (totalV ? Math.round(((side === 'left' ? leftN : rightN) / totalV) * 100) : 0)
  const showResult = !!myVote

  const voteBy = useMemo(() => {
    const m = {}; for (const v of votes) m[String(v.user_id)] = v.side; return m
  }, [votes])
  const votedCount = players.filter(p => voteBy[String(p.user_id)]).length

  // Prochains duels (mêmes round, en attente, paire complète) pour la zone basse.
  const nextDuels = useMemo(() => {
    if (!rounds) return []
    const out = []
    for (const r of rounds) {
      for (const m of r.matches) {
        if (m.id === match.id) continue
        if (m.status === 'pending' && m.left && m.right) out.push([m.left.title, m.right.title])
        if (out.length >= 3) return out
      }
    }
    return out
  }, [rounds, match.id])

  function toggleAudio(side) { setPlaying(p => (p === side ? null : side)) }
  function watch(p) { if (p?.ytId) window.open(`https://www.youtube.com/watch?v=${p.ytId}`, '_blank', 'noopener') }

  // ── Carte opening (héros) ──
  const Card = ({ p, side, delay }) => {
    if (!p) return <div style={{ flex: 1 }} />
    const accent = p.color || PINK
    const voted = myVote === side
    const dimmed = myVote && !voted
    const isThis = playing === side
    const thumb = `https://img.youtube.com/vi/${p.ytId}/maxresdefault.jpg`
    return (
      <div className="ra-card" style={{
        flex: 1, minWidth: 0, position: 'relative', borderRadius: 20, overflow: 'hidden',
        minHeight: isMobile ? 340 : 'min(62vh, 600px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        border: `1px solid ${voted ? accent : isThis ? hex(accent, 0.6) : BORDER}`,
        boxShadow: voted ? `0 0 0 1px ${accent}, 0 24px 70px ${hex(accent, 0.28)}` : '0 24px 60px rgba(0,0,0,.5)',
        opacity: dimmed ? 0.62 : 1,
        transform: voted ? 'scale(1.012)' : 'none',
        transition: 'opacity .35s, transform .25s, border-color .3s, box-shadow .3s',
        animationDelay: `${delay}s`,
      }}>
        {/* Média de fond */}
        <img src={thumb} alt="" onError={e => { e.currentTarget.src = `https://img.youtube.com/vi/${p.ytId}/hqdefault.jpg` }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: `saturate(1.1) brightness(${dimmed ? 0.5 : isThis ? 0.92 : 0.78})`, transition: 'filter .4s' }} />
        {/* Overlay lisibilité (léger en haut, dense en bas) */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(8,7,11,.12) 0%, rgba(8,7,11,.30) 42%, rgba(8,7,11,.86) 88%, rgba(8,7,11,.95) 100%)` }} />
        {isThis && <div style={{ position: 'absolute', inset: 0, boxShadow: `inset 0 0 120px ${hex(accent, 0.35)}`, pointerEvents: 'none' }} />}

        {/* Top : badge + écoute */}
        <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: isThis ? accent : 'rgba(255,255,255,.7)', padding: '4px 10px', borderRadius: 7, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', border: `1px solid ${isThis ? hex(accent, 0.5) : 'transparent'}` }}>Opening</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => watch(p)} title="Voir en plein écran" style={iconBtn(accent)}>⛶</button>
            <button onClick={() => toggleAudio(side)} title={isThis ? 'Stop' : 'Écouter'} style={{ ...iconBtn(accent), background: isThis ? hex(accent, 0.9) : 'rgba(0,0,0,.5)', color: isThis ? '#fff' : accent, borderColor: hex(accent, 0.5) }}>{isThis ? '■' : '▶'}</button>
          </div>
        </div>

        {/* Bas : infos + vote */}
        <div style={{ position: 'relative', zIndex: 2, padding: isMobile ? '0 16px 16px' : '0 22px 22px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 5 }}>{p.anime}</div>
          <div style={{ fontSize: isMobile ? 22 : 30, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-.01em', textShadow: '0 2px 18px rgba(0,0,0,.8)' }}>{p.title}</div>
          {p.artist && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', fontStyle: 'italic', marginTop: 3 }}>{p.artist}</div>}

          {/* Barre de votes (après ton vote) */}
          {showResult && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, marginBottom: 5 }}>
                <span style={{ color: voted ? accent : 'rgba(255,255,255,.5)' }}>{pct(side)}%</span>
                <span style={{ color: 'rgba(255,255,255,.4)' }}>{side === 'left' ? leftN : rightN} vote{(side === 'left' ? leftN : rightN) !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                <div style={{ width: `${pct(side)}%`, height: '100%', background: `linear-gradient(90deg, ${hex(accent, 0.7)}, ${accent})`, borderRadius: 99, transition: 'width .5s cubic-bezier(.22,1,.36,1)' }} />
              </div>
            </div>
          )}

          {/* Bouton vote intégré */}
          <button
            className="ra-vote"
            onClick={() => { if (canVote && !myVote) onVote(side) }}
            disabled={!!myVote || !canVote}
            style={{
              marginTop: 14, width: '100%', padding: isMobile ? '12px' : '14px', borderRadius: 13, border: 'none',
              fontSize: 14, fontWeight: 800, cursor: (myVote || !canVote) ? 'default' : 'pointer',
              color: voted ? '#fff' : myVote ? 'rgba(255,255,255,.5)' : '#fff',
              background: voted ? `linear-gradient(135deg, ${accent}, ${PURPLE})` : myVote ? 'rgba(255,255,255,.06)' : `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              boxShadow: voted ? `0 10px 30px ${hex(accent, 0.4)}` : 'none',
              opacity: !canVote ? 0.5 : 1, transition: 'all .18s',
            }}>
            {voted ? '✓ Ton vote' : myVote ? 'Voté' : 'Voter pour cet opening'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: 'min(1320px, 100%)', margin: '0 auto' }}>
      <style>{ARENA_CSS}</style>

      {/* Lecteur audio caché */}
      {playingP?.ytId && (
        <iframe key={playingP.ytId} title="audio" src={`https://www.youtube.com/embed/${playingP.ytId}?autoplay=1`}
          allow="autoplay; encrypted-media" style={{ position: 'fixed', width: 1, height: 1, left: -9999, top: -9999, opacity: 0, border: 0, pointerEvents: 'none' }} />
      )}

      {/* ── TOP : barre de contexte ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onLeave} style={ctxBtn}>← Quitter</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', borderRadius: 11, background: 'rgba(157,23,77,.12)', border: `1px solid ${hex(PINK, 0.34)}` }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.45)', letterSpacing: '.08em' }}>CODE</span>
          <strong style={{ fontSize: 16, fontWeight: 900, letterSpacing: '.22em', color: PINK_L }}>{code}</strong>
          <button onClick={onCopyLink} style={{ ...ctxBtn, padding: '4px 10px', fontSize: 11, background: copied ? 'rgba(52,211,153,.16)' : 'rgba(255,255,255,.06)', color: copied ? '#34d399' : 'rgba(255,255,255,.7)' }}>{copied ? '✓ Copié' : 'Copier le lien'}</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>
          <span>👥 {players.length}</span>
          <span style={{ color: PINK_L, fontWeight: 700 }}>{roundLabel}</span>
          <span>Duel {matchNum}/{totalMatches}</span>
        </div>
      </div>

      {/* ── CENTRE : arène + sidebar ── */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: isMobile ? 12 : 0, alignItems: 'stretch', flexDirection: isMobile ? 'column' : 'row' }}>
          <Card p={match.left} side="left" delay={0.05} />

          {/* VS central assumé */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 12, flexShrink: 0, width: isMobile ? '100%' : 92, padding: isMobile ? '4px 0' : 0 }}>
            <div style={{ flex: isMobile ? 1 : 'unset', height: isMobile ? 1 : 'auto', width: isMobile ? 'auto' : 1, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,.1), transparent)', minHeight: isMobile ? 0 : 60 }} />
            <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: `linear-gradient(135deg, ${hex(PINK, 0.9)}, ${hex(PURPLE, 0.9)})`, animation: 'ra-vs 2.6s ease-in-out infinite' }} />
              <span style={{ position: 'relative', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '.02em' }}>VS</span>
            </div>
            {/* Égaliseur quand un opening joue */}
            {playing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 22 }}>
                {[0, 1, 2, 3].map(i => <span key={i} style={{ width: 3, borderRadius: 2, background: PINK_L, animation: `ra-eq ${0.5 + i * 0.12}s ${i * 0.06}s ease-in-out infinite` }} />)}
              </div>
            ) : (
              <div style={{ flex: isMobile ? 1 : 'unset', height: isMobile ? 1 : 'auto', width: isMobile ? 'auto' : 1, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,.1), transparent)', minHeight: isMobile ? 0 : 60 }} />
            )}
          </div>

          <Card p={match.right} side="right" delay={0.12} />
        </div>

        {/* Sidebar votes */}
        <aside style={{ width: isMobile ? '100%' : 264, flexShrink: 0, background: 'rgba(12,11,17,.6)', backdropFilter: 'blur(16px)', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, alignSelf: 'flex-start', position: isMobile ? 'static' : 'sticky', top: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: PINK_L }}>Votes</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{votedCount}/{players.length}</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ width: `${players.length ? (votedCount / players.length) * 100 : 0}%`, height: '100%', background: GOLD, transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 320, overflowY: 'auto' }}>
            {players.map(p => {
              const side = voteBy[String(p.user_id)]
              const choice = side === 'left' ? match.left : side === 'right' ? match.right : null
              const col = choice?.color || PINK_L
              return (
                <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: '#fff', background: side ? hex(col.startsWith('#') ? col : PINK, 0.25) : 'rgba(255,255,255,.06)', border: `1.5px solid ${side ? col : 'rgba(255,255,255,.12)'}` }}>{(p.display_name || '?')[0].toUpperCase()}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.display_name}{p.is_host ? ' 👑' : ''}</div>
                    <div style={{ fontSize: 10.5, color: side ? col : 'rgba(255,255,255,.32)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{side ? `▸ ${choice?.title || '—'}` : 'en attente…'}</div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 13, color: side ? '#34d399' : 'rgba(255,255,255,.25)' }}>{side ? '✓' : '⏳'}</span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER}`, fontSize: 11.5, color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>
            {totalV >= players.length && players.length > 0 ? 'Résolution du duel…' : myVote ? 'En attente des autres votes…' : 'À toi de voter !'}
          </div>
        </aside>
      </div>

      {/* ── BAS : zone utile ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14, marginTop: 18 }}>
        {/* Progression */}
        <div style={footPanel}>
          {footTitle('Progression du tournoi')}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{progress.done}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>/ {progress.total} duels</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <div style={{ width: `${progress.pct}%`, height: '100%', background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, transition: 'width .6s' }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 8 }}>{roundLabel}</div>
        </div>

        {/* Prochains duels */}
        <div style={footPanel}>
          {footTitle('Prochains duels')}
          {nextDuels.length === 0 ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Dernier duel du round — le gagnant passe au tour suivant.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {nextDuels.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'rgba(255,255,255,.55)' }}>
                  <span style={{ flex: 1, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d[0]}</span>
                  <span style={{ color: 'rgba(255,255,255,.25)', fontWeight: 800, fontSize: 9 }}>VS</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d[1]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Règles */}
        <div style={footPanel}>
          {footTitle('Comment voter')}
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 11.5, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>
            <li>Écoute les 2 openings (▶).</li>
            <li>Vote pour ton préféré.</li>
            <li>La majorité fait avancer le bracket.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const ctxBtn = { padding: '8px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
const footPanel = { background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18 }
const footTitle = t => (
  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: 12 }}>{t}</div>
)
function iconBtn(accent) {
  return { width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', border: `1px solid ${hex(accent, 0.4)}`, color: accent, cursor: 'pointer', fontSize: 13, padding: 0 }
}
