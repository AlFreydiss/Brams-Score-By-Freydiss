import { useMemo, useState } from 'react'
import { onePieceFruits } from '../data/onePieceFruits'
import { rarityStyles } from '../data/rarityStyles'
import { RarityBadge, SectionTitle } from './shared'

function pickWeightedFruit() {
  const weighted = onePieceFruits.map(fruit => ({ fruit, weight: rarityStyles[fruit.rarity]?.chance || 1 }))
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of weighted) {
    roll -= item.weight
    if (roll <= 0) return item.fruit
  }
  return weighted[0].fruit
}

export default function RandomFruitRoulette() {
  const [open, setOpen] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState(onePieceFruits[0])
  const reel = useMemo(() => [...onePieceFruits, ...onePieceFruits.slice(0, 8)], [])

  const roll = () => {
    setOpen(true)
    setRolling(true)
    window.setTimeout(() => {
      setResult(pickWeightedFruit())
      setRolling(false)
    }, 1300)
  }

  const copyDiscord = async () => {
    const chance = rarityStyles[result.rarity]?.chance
    const text = `Le destin m'a donne le ${result.name} !\nRarete : ${result.rarity}\nType : ${result.fruitType}\nChance : ${chance}%`
    await navigator.clipboard?.writeText(text)
  }

  return (
    <section className="enc-section">
      <SectionTitle label="Le destin du fruit" text="Mini-mode aleatoire avec raretes ponderees, suspense et partage Discord." />
      <button className="enc-primary" onClick={roll}>Lancer la roulette</button>
      {open && (
        <div className="enc-modal" role="dialog" aria-modal="true" aria-label="Resultat du destin du fruit">
          <div className="enc-modal-card">
            <button className="enc-modal-close" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
            <p className="enc-kicker">Le destin t'a donne...</p>
            <div className={`enc-roulette ${rolling ? 'is-rolling' : ''}`}>
              <div className="enc-reel">
                {reel.map((fruit, index) => <span key={`${fruit.slug}-${index}`}>{fruit.name}</span>)}
              </div>
            </div>
            {!rolling && (
              <article className={`enc-result-card enc-rarity-card-${result.rarity}`}>
                <RarityBadge rarity={result.rarity} />
                <h3>{result.name}</h3>
                <p>{result.description}</p>
                <div className="enc-result-meta">
                  <span>Type: {result.fruitType}</span>
                  <span>Utilisateur: {result.knownUser}</span>
                  <span>Chance: {rarityStyles[result.rarity]?.chance}%</span>
                </div>
                <div className="enc-actions">
                  <button onClick={roll}>Relancer</button>
                  <button onClick={copyDiscord}>Copier pour Discord</button>
                </div>
              </article>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
