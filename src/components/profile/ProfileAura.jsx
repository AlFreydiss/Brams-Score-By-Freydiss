// ── Aura Brams : score de prestige global + détail des facteurs ──────────────
import { CountUp, AuraFactor } from './shared.jsx'

export default function ProfileAura({ data }) {
  const { aura, auraTier, auraFactors, rank } = data
  return (
    <div className="pfx-aura">
      <div className="pfx-aura-score">
        <span className="pfx-aura-eyebrow">Aura Brams</span>
        <div className="pfx-aura-num"><CountUp value={aura} /><small>/100</small></div>
        <span className="pfx-aura-tier" style={{ color: auraTier.color }}>{auraTier.label}</span>
      </div>
      <div className="pfx-aura-main">
        <div className="pfx-aura-bar-top">
          <span>Score de prestige global</span>
          <span>{aura}/100</span>
        </div>
        <div className="pfx-aura-track">
          <div className="pfx-aura-fill" style={{ width: `${aura}%` }} />
        </div>
        <div className="pfx-aura-factors">
          <AuraFactor label="Vocal"      value={auraFactors.vocal}   max={30} color="#d4a017" />
          <AuraFactor label="Berries"    value={auraFactors.berries} max={25} color="#b8912a" />
          <AuraFactor label="Classement" value={auraFactors.rankF}   max={30} color={rank.color} />
        </div>
      </div>
    </div>
  )
}
