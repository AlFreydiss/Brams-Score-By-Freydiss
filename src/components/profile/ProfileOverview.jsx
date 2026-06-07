// ── Onglet « Vue d'ensemble » — refonte propre ───────────────────────────────
// Bandeau KPI + progression de rang + parcours + aperçu des succès. Premium
// sobre (dark + or), tout en grille responsive, sans le superflu d'avant.
import { RANK_MAP, fmtNum } from '../../lib/profileTokens.js'

const GOLD = '#d4a017'
const C = {
  card: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 },
  text: '#f3f3f5',
  dim: 'rgba(255,255,255,0.55)',
  faint: 'rgba(255,255,255,0.40)',
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div style={{ ...C.card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: C.faint }}>{label}</span>
      <strong style={{ fontSize: 24, fontWeight: 800, color: accent || C.text, lineHeight: 1.1 }}>{value}</strong>
      {sub && <span style={{ fontSize: 12, color: C.dim }}>{sub}</span>}
    </div>
  )
}

export default function ProfileOverview({ data, onSeeAchievements }) {
  const { member, hours, rank, nextRank, remaining, pct, wallet, aura, auraTier, achievements } = data
  const unlocked = achievements.filter(a => a.unlocked)

  return (
    <div className="pfx-tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Bandeau KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Kpi label="Heures vocales" value={`${fmtNum(Math.round(hours))} h`} sub="cumulées" />
        <Kpi label="Aura" value={aura} sub={auraTier.label} accent={auraTier.color} />
        <Kpi label="Trésor" value={`${fmtNum(wallet)} ฿`} accent={GOLD} sub="solde berries" />
        <Kpi label="Classement" value={member?.rank ? `#${member.rank}` : '—'} sub={member?.total ? `sur ${fmtNum(member.total)} pirates` : ''} />
      </div>

      {/* Progression de rang */}
      <div style={{ ...C.card, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <span style={{ fontSize: 34, lineHeight: 1 }}>{rank.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: rank.color }}>{rank.rang}</div>
            <div style={{ fontSize: 12.5, color: C.dim }}>
              {nextRank
                ? <>Plus que <strong style={{ color: C.text }}>{fmtNum(Math.ceil(remaining))} h</strong> pour devenir <strong style={{ color: nextRank.color }}>{nextRank.rang}</strong></>
                : 'Rang maximum atteint — sommet du monde 👑'}
            </div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: GOLD, flexShrink: 0 }}>{Math.round(pct)}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${rank.color}, ${nextRank?.color || GOLD})`, transition: 'width .5s ease' }} />
        </div>
      </div>

      {/* Parcours des rangs */}
      <div style={{ ...C.card, padding: '18px 20px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: C.text }}>Parcours des rangs</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {RANK_MAP.slice().reverse().map(item => {
            const on = hours >= item.min
            const isCurrent = rank.rang === item.rang
            return (
              <div key={item.rang} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 10, background: isCurrent ? 'rgba(212,160,23,0.08)' : 'transparent', opacity: on ? 1 : 0.45 }}>
                <span style={{ fontSize: 20, width: 26, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? item.color : C.text }}>{item.rang}</div>
                  <div style={{ fontSize: 11.5, color: C.faint }}>{item.min}h requis</div>
                </div>
                {isCurrent
                  ? <span style={{ fontSize: 10.5, fontWeight: 800, color: '#0b0c0e', background: item.color, padding: '3px 9px', borderRadius: 99 }}>ACTUEL</span>
                  : <span style={{ fontSize: 15, color: on ? '#2ECC71' : C.faint }}>{on ? '✓' : '—'}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Succès débloqués (aperçu) */}
      <div style={{ ...C.card, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>Succès débloqués <span style={{ color: C.faint, fontWeight: 700 }}>({unlocked.length}/{achievements.length})</span></h3>
          <button type="button" onClick={onSeeAchievements} style={{ border: 'none', background: 'transparent', color: GOLD, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Voir tous →</button>
        </div>
        {unlocked.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {unlocked.slice(0, 6).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,160,23,0.18)' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: C.faint, fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.6 }}>🎯</div>
            Aucun succès débloqué pour l'instant — reste actif sur le serveur.
          </div>
        )}
      </div>
    </div>
  )
}
