// ── Onglet « Vue d'ensemble » : identité, trésor, parcours, succès, équipage ─
import { RANK_MAP, fmtNum, fmtB } from '../../lib/profileTokens.js'
import { EmptyState } from './shared.jsx'

function AchievementCard({ ach }) {
  return (
    <div className={`pfx-ach${ach.unlocked ? ' on' : ''}`}>
      <span className="pfx-ach-icon">{ach.icon}</span>
      <div className="pfx-ach-body">
        <strong>{ach.label}</strong>
        <span>{ach.desc}</span>
      </div>
      <span className="pfx-ach-check">{ach.unlocked ? '✓' : '·'}</span>
    </div>
  )
}

export default function ProfileOverview({ data, onSeeAchievements }) {
  const { member, shopData, wallet, hours, rank, achievements } = data
  const invCount = shopData?.inventory?.length || 0
  const txCount  = shopData?.transactions?.length || 0
  const unlocked = achievements.filter(a => a.unlocked)

  return (
    <div className="pfx-tabpanel">
      <div className="pfx-grid">
        {/* Identité */}
        <article className="pfx-panel" style={{ '--dot-c': '#6b7280' }}>
          <h2 className="pfx-panel-h">Identité</h2>
          <div className="pfx-rows">
            {[
              ['Pseudo',     member?.username || '—'],
              ['Discord ID', member?.uid],
              ['Rang',       `${rank.emoji} ${rank.rang}`],
              ['Position',   `#${member?.rank} / ${member?.total}`],
            ].map(([k, v]) => <div className="pfx-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}
          </div>
        </article>

        {/* Trésor */}
        <article className="pfx-panel pfx-panel-gold">
          <h2 className="pfx-panel-h">Trésor</h2>
          <div className="pfx-treasure">
            <span>Solde wallet</span>
            <strong>{fmtNum(wallet)} <em>฿</em></strong>
          </div>
          <div className="pfx-rows">
            {[
              ['Prime publique', `${fmtB(member?.berrys || 0)} ฿`],
              ['Inventaire',     `${invCount} objet${invCount > 1 ? 's' : ''}`],
              ['Achats',         `${txCount} transaction${txCount > 1 ? 's' : ''}`],
            ].map(([k, v]) => <div className="pfx-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}
          </div>
        </article>

        {/* Parcours des rangs */}
        <article className="pfx-panel" style={{ '--dot-c': rank.color }}>
          <h2 className="pfx-panel-h">Parcours des rangs</h2>
          <div className="pfx-journey">
            {RANK_MAP.slice().reverse().map(item => {
              const on        = hours >= item.min
              const isCurrent = rank.rang === item.rang
              return (
                <div key={item.rang} className={`pfx-jstep${on ? ' on' : ''}${isCurrent ? ' current' : ''}`} style={{ '--ac': item.color }}>
                  <div className="pfx-jdot">{item.emoji}</div>
                  <div className="pfx-jbody">
                    <div className="pfx-jtext">
                      <strong>{item.rang}</strong>
                      <small>{item.min}h requis</small>
                    </div>
                    {isCurrent
                      ? <span className="pfx-jtag">Actuel</span>
                      : <span className="pfx-jcheck">{on ? '✓' : '—'}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </div>

      {/* Succès débloqués (aperçu) */}
      <div className="pfx-section">
        <div className="pfx-section-hd">
          <h3>Succès débloqués</h3>
          <button type="button" className="pfx-see-all" onClick={onSeeAchievements}>Voir tous →</button>
        </div>
        {unlocked.length > 0 ? (
          <div className="pfx-ach-row">
            {unlocked.slice(0, 6).map(a => <AchievementCard key={a.id} ach={a} />)}
          </div>
        ) : (
          <EmptyState icon="🎯" title="Aucun succès débloqué." sub="Continue à être actif sur le serveur." />
        )}
      </div>

      {/* Équipage */}
      <div className="pfx-crew">
        <span className="pfx-crew-ic">⚓</span>
        <div className="pfx-crew-body">
          <strong>Aucun équipage</strong>
          <span>Ce pirate navigue en solitaire pour l'instant.</span>
        </div>
        <a className="pfx-btn pfx-btn-ghost" href="/equipage">Explorer →</a>
      </div>
    </div>
  )
}
