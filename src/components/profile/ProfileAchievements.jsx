// ── Onglet « Succès » : tous les succès, débloqués ou non ────────────────────
export default function ProfileAchievements({ data }) {
  const { achievements } = data
  return (
    <div className="pfx-tabpanel">
      <div className="pfx-ach-grid">
        {achievements.map(a => (
          <div key={a.id} className={`pfx-ach${a.unlocked ? ' on' : ''}`}>
            <span className="pfx-ach-icon">{a.icon}</span>
            <div className="pfx-ach-body">
              <strong>{a.label}</strong>
              <span>{a.desc}{a.rarity ? ` · ${a.rarity}` : ''}</span>
            </div>
            <span className="pfx-ach-check">{a.unlocked ? '✓' : '·'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
