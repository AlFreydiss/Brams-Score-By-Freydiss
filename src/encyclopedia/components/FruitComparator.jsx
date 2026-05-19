import { useMemo, useState } from 'react'
import { onePieceFruits } from '../data/onePieceFruits'
import { RarityBadge, SectionTitle } from './shared'

const statLabels = {
  rawPower: 'Puissance brute',
  mobility: 'Mobilite',
  defense: 'Defense',
  utility: 'Utilite',
  rarity: 'Rarete',
  awakeningPotential: "Potentiel d'eveil",
  combatDanger: 'Danger en combat',
  versatility: 'Polyvalence',
}

function FruitSelect({ label, value, onChange }) {
  return (
    <label className="enc-fruit-select">
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {onePieceFruits.map(fruit => <option key={fruit.slug} value={fruit.slug}>{fruit.name}</option>)}
      </select>
    </label>
  )
}

function FruitSummary({ fruit }) {
  return (
    <article className={`enc-fruit-summary enc-rarity-card-${fruit.rarity}`}>
      <RarityBadge rarity={fruit.rarity} />
      <h3>{fruit.name}</h3>
      <p>{fruit.subtitle}</p>
      <strong>{fruit.knownUser}</strong>
    </article>
  )
}

function verdictFor(a, b) {
  const diffs = Object.entries(a.stats).map(([key, value]) => ({ key, diff: value - b.stats[key] })).sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
  const top = diffs[0]
  const leader = top.diff >= 0 ? a : b
  const loser = top.diff >= 0 ? b : a
  const stat = statLabels[top.key].toLowerCase()
  const parts = [`${leader.name} domine ${loser.name} sur ${stat}.`]
  if ((top.key === 'mobility') && Math.abs(top.diff) > 10) parts.push(`${leader.name} impose le rythme du combat par sa mobilite.`)
  if ((top.key === 'rawPower') && Math.abs(top.diff) > 10) parts.push(`${leader.name} offre une puissance destructrice plus directe.`)
  if (leader.stats.utility >= 88) parts.push('Ce fruit est plus polyvalent hors combat.')
  if (leader.stats.combatDanger >= 95) parts.push('Il represente une menace majeure en combat reel.')
  return parts.join(' ')
}

export default function FruitComparator() {
  const [leftSlug, setLeftSlug] = useState('mera-mera-no-mi')
  const [rightSlug, setRightSlug] = useState('pika-pika-no-mi')
  const left = onePieceFruits.find(fruit => fruit.slug === leftSlug) || onePieceFruits[0]
  const right = onePieceFruits.find(fruit => fruit.slug === rightSlug) || onePieceFruits[1]
  const verdict = useMemo(() => verdictFor(left, right), [left, right])

  return (
    <section className="enc-section">
      <SectionTitle label="Comparateur de fruits" text="Deux fruits, huit statistiques, forces/faiblesses et verdict automatique." />
      <div className="enc-comparator">
        <FruitSelect label="Fruit A" value={leftSlug} onChange={setLeftSlug} />
        <div className="enc-vs">VS</div>
        <FruitSelect label="Fruit B" value={rightSlug} onChange={setRightSlug} />
        <FruitSummary fruit={left} />
        <div className="enc-stat-bars">
          {Object.keys(statLabels).map(key => {
            const a = left.stats[key]
            const b = right.stats[key]
            return (
              <div className="enc-compare-row" key={key}>
                <span>{statLabels[key]}</span>
                <div className="enc-bar-pair">
                  <i style={{ width: `${a}%` }} className={a >= b ? 'wins' : ''} />
                  <b style={{ width: `${b}%` }} className={b >= a ? 'wins' : ''} />
                </div>
                <em>{a} / {b}</em>
              </div>
            )
          })}
        </div>
        <FruitSummary fruit={right} />
        <div className="enc-verdict">
          <strong>Verdict</strong>
          <p>{verdict}</p>
        </div>
      </div>
    </section>
  )
}
