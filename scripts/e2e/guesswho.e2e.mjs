// Partie complète Guess Who à 3 navigateurs (faux micro Chromium).
//   npm run dev   (port 5173)  puis  node scripts/e2e/guesswho.e2e.mjs <dossier-captures>
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = process.argv[2] || '.'
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
})
const errors = []
async function player(name) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ['microphone'] })
  await ctx.addInitScript((n) => { localStorage.setItem('bc_acq_done', '1'); localStorage.setItem('bp_guest', 'guest_' + n) }, name)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  return page
}
const [a, b, c] = await Promise.all(['alice', 'bob', 'carol'].map(player))
const all = [a, b, c]

await a.goto(`${BASE}/guess-who`)
await a.getByRole('button', { name: 'Créer un salon' }).click()
await a.waitForURL(/\/guess-who\/[A-Z0-9]{4}$/)
const url = a.url()
await Promise.all([b.goto(url), c.goto(url)])
await a.getByRole('button', { name: 'Lancer la partie' }).click({ timeout: 20000 })

// Gages
for (const [i, p] of all.entries()) {
  await p.getByPlaceholder(/opening de One Piece/).fill(`gage numéro ${i}`)
  await p.getByRole('button', { name: 'Envoyer', exact: true }).click()
}

// Alice et Bob imitent, Carol jamais → Carol perd une vie à chaque tour et est
// éliminée au tour 2. Son gage est donc forcément celui d'Alice ou de Bob.
for (let round = 1; round <= 2; round++) {
  // La phase d'écoute (20 s) avance seule ; résultat précédent 8 s.
  await a.getByRole('button', { name: '● Enregistrer' }).waitFor({ timeout: 45000 })
  for (const p of [a, b]) {
    await p.getByRole('button', { name: '● Enregistrer' }).click()
    await p.waitForTimeout(1500)
    await p.getByRole('button', { name: '■ Arrêter' }).click()
    await p.getByRole('button', { name: 'Envoyer mon imitation' }).click()
    await p.getByText('✓ Envoyé').first().waitFor({ timeout: 15000 })
  }
  await a.screenshot({ path: `${OUT}/gw-r${round}-record.png` })
  // Vote : chacun vote pour la première imitation qui n'est pas la sienne
  for (const p of all) {
    await p.getByRole('button', { name: 'Voter' }).first().click({ timeout: 70000 })
  }
  await a.getByText(/perd une vie|perdent une vie|Personne ne perd/).waitFor({ timeout: 60000 })
  await a.screenshot({ path: `${OUT}/gw-r${round}-result.png` })
}

await a.getByText(/doit faire un gage|doivent faire un gage/).waitFor({ timeout: 60000 })
await a.waitForTimeout(3000)
await a.screenshot({ path: `${OUT}/gw-gage.png` })
const gage = await a.getByText(/^« gage numéro [01] »$/).count()
await a.getByText(/Meilleur imitateur|Fin du chapitre/).first().waitFor({ timeout: 30000 })
await a.screenshot({ path: `${OUT}/gw-end.png` })

// Réactions en direct : Alice envoie 🔥, Bob la voit s'envoler.
await a.getByRole('button', { name: 'Réagir 🔥' }).click()
await b.waitForTimeout(900)
const reactionSeen = await b.evaluate(() => [...document.querySelectorAll('span')].some((el) => el.textContent === '🔥' && !el.closest('button')))

console.log(JSON.stringify({ errors, gageFromOthers: gage === 1, reactionSeen }))
await browser.close()
process.exit(errors.length || gage !== 1 || !reactionSeen ? 1 : 0)
