# Guess Who — refonte visuelle sobre : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la peau « planche de manga » de Guess Who par l'identité Brams (encre chaude + champagne, Fraunces + Hanken), sans toucher à la logique de jeu, et relire tout le code du jeu.

**Architecture:** `theme.js` (nouveau) réutilise `src/theme/tierStudio.js` et expose palette, typo, filets, ombres, recettes. `manga.jsx` garde ses exports/props mais change de peau. Un test « garde-fou de style » scanne les fichiers du jeu et interdit contours épais, ombres dures et couleurs saturées : il passe au vert quand la reprise écran par écran est finie. Une page de démo DEV-only rend chaque écran avec un état factice pour le contrôle visuel.

**Tech Stack:** Vite + React (inline styles uniquement), framer-motion, `node --test`, Chromium headless pour les captures.

**Spec:** `docs/superpowers/specs/2026-10-03-guess-who-visuel-design.md`

## Global Constraints

- Inline styles only (Brams). Keyframes et `:focus-visible` dans `GLOBAL_CSS` (balise `<style>` existante), rien d'autre.
- Palette : fond `#0B0B0C`, surfaces `#161618`, élevé `#1E1E20`, filets `rgba(255,255,255,0.07)`, champagne `#C7A869` / `#D9C190` / `#E3D2A6`, texte `#EDEAE3` / `#C7C2B8` / `#9A958B` / `#6B675F`, sauge `#7FA38A`, brique `#BE6A5A`.
- Typo : Fraunces (titres, nom du son, podium, grands chiffres), Hanken Grotesk (le reste). Plus d'import Dela Gothic One / M PLUS 1p.
- Aucun contour > 1,5 px, aucune ombre dure décalée, aucun jaune/rouge/cyan saturé dans `src/features/guesswho/*.jsx`.
- Contraste AA (≥ 4,5:1) pour tout texte courant ; `:focus-visible` anneau champagne 2 px ; cibles tactiles ≥ 44 px ; `prefers-reduced-motion` respecté.
- Aucun changement de logique : props, `g.act.*`, effets réseau inchangés. Suite `npm test` toujours verte.
- Route `/guess-who/demo` seulement si `import.meta.env.DEV`.

## Review Focus

1. Texte posé sur fond champagne (boutons principaux, pastilles) : doit rester lisible → test de contraste `onAccent` / `accent` dans Task 1.
2. Écran en 390 px de large (iPhone) : rien ne déborde horizontalement → captures 390×844 de chaque écran de démo (Task 10), à regarder.
3. `prefers-reduced-motion` : plus aucune animation de secousse ou de rotation → garde-fou de style interdit `gw-shake` et `rotateY` (Task 2).
4. Usage oublié d'une ancienne clé (`C.yellow` dans un écran non repris) : doit rester lisible pendant la transition → remappage de `C` (Task 2) + garde-fou qui finit par l'interdire (Task 9).
5. Page de démo atteinte en production : ne doit jamais apparaître → route sous `import.meta.env.DEV` + vérification `dist` sans `DemoPage` (Task 3).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/features/guesswho/theme.js` (créer) | Palette, typo, filets, ombres, rayons, recettes `plate()`, `pill()`, `contrast()` |
| `src/features/guesswho/theme.test.js` (créer) | Contrastes AA des couples texte/fond |
| `src/features/guesswho/styleGuard.test.js` (créer) | Interdit contours épais, ombres dures, couleurs saturées, polices manga |
| `src/features/guesswho/manga.jsx` (modifier) | Même API, peau Brams |
| `src/features/guesswho/RoomView.jsx` (créer) | Rendu des phases à partir de `g` (extrait de `GuessWhoPage.jsx`) |
| `src/features/guesswho/DemoPage.jsx`, `demoState.js` (créer) | Démo DEV-only de chaque écran avec un `g` factice |
| `src/App.jsx` (modifier) | Route DEV `/guess-who/demo` |
| `src/components/BarreJeu.jsx` (modifier) | Skin `brams` |
| `ui.jsx`, `fx.jsx`, `Lobby.jsx`, `GuessWhoPage.jsx`, `MicSetup.jsx`, `GagesPhase.jsx`, `ListenPhase.jsx`, `RecordPhase.jsx`, `LiveWave.jsx`, `VotePhase.jsx`, `ResultPhase.jsx`, `Reactions.jsx`, `GageWheel.jsx`, `EndScreen.jsx`, `sfx.js` (modifier) | Reprise visuelle |

---

### Task 1: Thème

**Files:**
- Create: `src/features/guesswho/theme.js`, `src/features/guesswho/theme.test.js`
- Modify: `package.json` (script `test` : ajouter `src/features/guesswho/theme.test.js`)

**Interfaces:**
- Consumes: `ink`, `fonts` de `src/theme/tierStudio.js`.
- Produces: `T` (palette), `F` (polices), `LINE`, `LINE_SOFT`, `SHADOW`, `RADIUS`, `plate(extra)`, `pill(kind, extra)`, `label(extra)`, `contrast(hexA, hexB) → number`.

- [ ] **Step 1: Test qui échoue**

```js
// src/features/guesswho/theme.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { T, contrast } from './theme.js'

test('contrast : noir/blanc = 21, identique = 1', () => {
  assert.equal(Math.round(contrast('#000000', '#FFFFFF')), 21)
  assert.equal(contrast('#777777', '#777777'), 1)
})

test('couples texte/fond lisibles (AA ≥ 4,5)', () => {
  for (const [fg, bg] of [[T.textHi, T.bg], [T.text, T.surface], [T.textMute, T.surface], [T.onAccent, T.accent], [T.accent, T.surface], [T.danger, T.surface], [T.ok, T.surface]]) {
    assert.ok(contrast(fg, bg) >= 4.5, `${fg} sur ${bg} = ${contrast(fg, bg).toFixed(2)}`)
  }
})
```

Run: `node --test src/features/guesswho/theme.test.js` → Expected: FAIL (module absent).

- [ ] **Step 2: Implémenter**

```js
// src/features/guesswho/theme.js
// Guess Who — identité Brams (atelier de gravure) : encre chaude + champagne.
// Repose sur src/theme/tierStudio.js, aucune seconde palette.
import { ink, fonts } from '../../theme/tierStudio.js'

export const T = {
  bg: ink.ink800, surface: ink.ink700, raised: ink.ink600, deep: ink.ink900,
  line: ink.line, lineSoft: ink.lineSoft,
  accent: ink.gold500, accentHi: ink.gold400, accentLit: ink.gold300, glow: ink.goldGlow,
  onAccent: '#0B0B0C',
  textHi: ink.textHi, text: ink.text, textMute: ink.textMute, textFaint: ink.textFaint,
  ok: '#7FA38A', danger: '#BE6A5A',
  medal: { gold: '#C7A869', silver: '#A9A9A4', bronze: '#A9774F' },
}

export const F = { display: fonts.display, ui: fonts.ui }
export const LINE = `1px solid ${T.line}`
export const LINE_SOFT = `1px solid ${T.lineSoft}`
export const RADIUS = { sm: 10, md: 14, lg: 18, pill: 999 }
export const SHADOW = {
  soft: '0 1px 2px rgba(0,0,0,.45), 0 8px 24px rgba(0,0,0,.28)',
  lift: '0 2px 4px rgba(0,0,0,.5), 0 14px 36px rgba(0,0,0,.35)',
  inset: 'inset 0 1px 0 rgba(255,255,255,.04)',
}

// Plaque (carte structurelle) : filet fin, dégradé léger, ombre douce.
export function plate(extra = {}) {
  return {
    background: `linear-gradient(180deg, ${T.raised} 0%, ${T.surface} 100%)`,
    border: LINE, borderTopColor: 'rgba(255,255,255,0.09)', borderRadius: RADIUS.lg,
    boxShadow: `${SHADOW.soft}, ${SHADOW.inset}`, ...extra,
  }
}

// Pilule : 'primary' (champagne), 'ghost' (filet), 'danger' (filet brique).
export function pill(kind = 'primary', extra = {}) {
  const skins = {
    primary: { background: T.accent, color: T.onAccent, border: `1px solid ${T.accent}` },
    ghost: { background: 'transparent', color: T.textHi, border: LINE },
    danger: { background: 'transparent', color: T.danger, border: `1px solid ${T.danger}` },
  }
  return { borderRadius: RADIUS.pill, ...(skins[kind] || skins.primary), ...extra }
}

// Étiquette gravée : petites capitales espacées.
export function label(extra = {}) {
  return { fontFamily: F.ui, fontWeight: 700, fontSize: 11.5, letterSpacing: '.16em', textTransform: 'uppercase', color: T.textMute, ...extra }
}

// Rapport de contraste WCAG entre deux couleurs #RRGGBB.
export function contrast(a, b) {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16)
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
```

- [ ] **Step 3: Vérifier**

Run: `node --test src/features/guesswho/theme.test.js` → Expected: PASS. Si un couple échoue (ex. `T.danger` sur `T.surface`), éclaircir la teinte concernée par pas de 5 % de luminosité jusqu'à ≥ 4,5 et consigner la valeur retenue en Ruling.

- [ ] **Step 4: Commit**

```bash
git add src/features/guesswho/theme.js src/features/guesswho/theme.test.js package.json
git commit -m "feat(guess-who): thème Brams (palette, typo, plaques, contrastes AA)"
```

---

### Task 2: Garde-fou de style + peau de `manga.jsx`

**Files:**
- Create: `src/features/guesswho/styleGuard.test.js`
- Modify: `src/features/guesswho/manga.jsx` (tout le fichier), `package.json` (script `test`)

**Interfaces:**
- Consumes: `T`, `F`, `LINE`, `SHADOW`, `RADIUS`, `plate`, `pill`, `label` (Task 1).
- Produces (API inchangée) : `FONT_DISPLAY`, `FONT_BODY`, `C`, `SPRING_POP`, `GLOBAL_CSS`, `MangaBackdrop`, `Btn({children, variant, disabled, full, style, ...props})`, `Timer({remaining,total,tick})`, `PhaseFrame({eyebrow,prompt,remaining,total,children,footer,wide,tilt,tick})`, `PlayerChip({player,host,submitted,me,compact})`, `LiveRoster(...)`, `Waiting({label})`, `SfxBurst()` → `null`, `alpha(hex,a)`, `type`.
- Produces (nouveau) : `styleViolations(source: string) → string[]` dans `src/features/guesswho/logic/styleRules.js` (une entrée `"<ligne>: <raison>"` par violation).

- [ ] **Step 1: Règles + test qui échoue**

Créer `src/features/guesswho/logic/styleRules.js` :

```js
// Règles du garde-fou visuel (identité Brams, sobre) : une ligne = une violation.
const RULES = [
  [/\b[2-9]px (solid|dashed)/, 'contour épais (> 1,5 px)'],
  [/['`]\s*-?\d+px -?\d+px 0 /, 'ombre dure décalée'],
  [/\bC\.(yellow|red|cyan)\b/, 'couleur saturée (C.yellow/red/cyan)'],
  [/Dela Gothic|M PLUS 1p/, 'police manga'],
  [/gw-shake|rotateY/, 'secousse / rotation de page'],
  [/repeating-conic-gradient/, 'lignes de vitesse'],
]

export function styleViolations(source) {
  const out = []
  String(source).split(/\r?\n/).forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return
    for (const [re, why] of RULES) if (re.test(line)) out.push(`${i + 1}: ${why}`)
  })
  return out
}
```

Créer `src/features/guesswho/styleGuard.test.js` :

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { styleViolations } from './logic/styleRules.js'

test('styleViolations : détecte et ignore les commentaires', () => {
  assert.equal(styleViolations("border: `3px solid ${C.ink}`").length, 1)
  assert.equal(styleViolations("boxShadow: `4px 4px 0 ${C.ink}`").length, 1)
  assert.equal(styleViolations('// 3px solid dans un commentaire').length, 0)
  assert.equal(styleViolations("border: `1px solid ${T.line}`").length, 0)
})

// Fichiers repris : la liste s'allonge à chaque tâche, jusqu'à tous les .jsx (Task 9).
const DONE = ['manga.jsx']

test('fichiers repris : aucun style manga', () => {
  const dir = new URL('./', import.meta.url)
  for (const f of readdirSync(dir).filter((x) => DONE.includes(x))) {
    const v = styleViolations(readFileSync(new URL(f, dir), 'utf8'))
    assert.deepEqual(v, [], `${f}\n${v.join('\n')}`)
  }
})
```

Ajouter `src/features/guesswho/styleGuard.test.js` au script `test` de `package.json`.

Run: `node --test src/features/guesswho/styleGuard.test.js` → Expected: FAIL sur « fichiers repris » (violations dans `manga.jsx`).

- [ ] **Step 2: Réécrire `manga.jsx`**

Remplacer le contenu par la version Brams (même liste d'exports). Points imposés :

```js
import { T, F, LINE, SHADOW, RADIUS, plate, pill, label } from './theme.js'

export const FONT_DISPLAY = F.display
export const FONT_BODY = F.ui

// Clés historiques conservées, remappées (un usage oublié reste lisible).
export const C = {
  paper: T.surface, ink: T.textHi, tone: T.line,
  red: T.danger, yellow: T.accent, cyan: T.accentHi,
  text: T.textHi, textMut: T.textMute, warn: T.accentHi, danger: T.danger, ok: T.ok, ember: T.danger, gold: T.accent,
  // nouvelles clés
  bg: T.bg, surface: T.surface, raised: T.raised, line: T.line, accent: T.accent, accentHi: T.accentHi,
  onAccent: T.onAccent, faint: T.textFaint, body: T.text,
}

export const SPRING_POP = { type: 'spring', stiffness: 380, damping: 26, mass: 0.7 }

export const GLOBAL_CSS = `
.gw-btn:focus-visible, .gw-focus:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 3px; }
@keyframes gw-spin { to { transform: rotate(360deg) } }
@keyframes gw-confetti { 0% { transform: translate3d(0,-10vh,0) rotate(0) } 100% { transform: translate3d(var(--dx),110vh,0) rotate(var(--rot)) } }
@keyframes gw-pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
@keyframes gw-beat { 0% { transform: scale(1.12) } 100% { transform: scale(1) } }
@keyframes gw-blink { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
@keyframes gw-breathe { 0%,100% { opacity: .35; transform: scale(1) } 50% { opacity: .7; transform: scale(1.06) } }
@keyframes gw-float-up { 0% { transform: translate3d(0,0,0) scale(.6); opacity: 0 } 15% { transform: translate3d(0,-40px,0) scale(1); opacity: .85 } 75% { opacity: .7 } 100% { transform: translate3d(var(--dx),-300px,0) scale(.9); opacity: 0 } }
@keyframes gw-flash { 0% { opacity: .5 } 100% { opacity: 0 } }
@media (prefers-reduced-motion: reduce) { .gw-anim { animation: none !important } }
.gw-btn { touch-action: manipulation; -webkit-user-select: none; user-select: none; }
`
```

- `MangaBackdrop` : `position: fixed; inset: 0; background: T.bg` + couche halo `radial-gradient(ellipse 60% 45% at 50% 30%, ${T.glow.replace('0.06','0.10')}, transparent 70%)` + grain (`backgroundImage` SVG `feTurbulence` en data URI, `opacity: .035`).
- `Btn` : `pill()` selon `variant` (`gold`/`ember` → `primary`, `sea` → `primary` avec `background: T.accentHi`, `ghost` → `ghost`, `danger` → `danger`) ; `minHeight: 48`, `padding: '0 22px'`, `fontFamily: F.ui`, `fontWeight: 700`, `fontSize: 15` ; survol `y: -1` + `boxShadow: SHADOW.soft`, appui `scale: 0.98` ; désactivé `opacity: .45`.
- `Timer` : SVG 64×64, cercle fond `T.line` 3 px, arc `T.accent` (brique `T.danger` si `crit`) via `strokeDasharray`, chiffre `F.display` 22 px `T.textHi` ; sous 5 s `animation: gw-pulse 1s ease-in-out infinite` (classe `gw-anim`) ; garde l'effet `tick` existant à l'identique.
- `PhaseFrame` : `plate({ padding: 'clamp(18px,3vw,30px)' })`, entrée `{ opacity: 0, y: 8 }` → `{ opacity: 1, y: 0 }` (`duration: .25`, réduit : opacité seule), `tilt` ignoré (prop gardée) ; `eyebrow` en `label()` ; `prompt` en `F.display`, `fontWeight: 500`, `clamp(1.5rem, 4vw, 2.3rem)`, `T.textHi` ; anneau brique fin (`boxShadow` `0 0 0 1px ${T.danger}`) quand `crit`.
- `PlayerChip` : avatar rond, `border: 1px solid T.line` (`T.accent` si `me`), `submitted` → anneau `0 0 0 2px ${T.accent}` + pastille coche `✓` (fond `T.accent`, texte `T.onAccent`, 18 px rond) ; nom `F.ui` 600 `T.text` ; déconnecté `opacity .4`.
- `LiveRoster` : séparateur `borderTop: LINE`, compteur en `label()`.
- `Waiting` : spinner `2px solid T.line`, `borderTopColor: T.accent`.
- `SfxBurst` : `export function SfxBurst() { return null }` (onomatopées supprimées, appelants inchangés).
- `alpha` : inchangé. `type` : `body` (`F.ui` 500 16/1.55 `T.text`), `small` (`F.ui` 600 13.5), `h2` (`F.display` 500 clamp), `h3` (`F.display` 500 20).

- [ ] **Step 3: Vérifier**

Run: `node --test src/features/guesswho/styleGuard.test.js && npx vite build` → Expected: PASS + build OK.

- [ ] **Step 4: Commit**

```bash
git add src/features/guesswho/manga.jsx src/features/guesswho/logic/styleRules.js src/features/guesswho/styleGuard.test.js package.json
git commit -m "feat(guess-who): peau Brams des briques communes + garde-fou de style"
```

---

### Task 3: Page de démo (DEV) et extraction de `RoomView`

**Files:**
- Create: `src/features/guesswho/RoomView.jsx`, `src/features/guesswho/DemoPage.jsx`, `src/features/guesswho/demoState.js`, `src/features/guesswho/demoState.test.js`
- Modify: `src/features/guesswho/GuessWhoPage.jsx` (bloc de rendu des phases de `Room`), `src/App.jsx:747-748`, `package.json` (script `test`)

**Interfaces:**
- Produces: `RoomView({ g, code, reactions })` (rend bannières + phase + réactions, exactement le JSX actuel de `Room` après le chargement) ; `DEMO_PHASES: string[]` ; `demoG(phase: string) → g` (objet de même forme que le retour de `useGuessWhoRoom`, `act.*` = fonctions asynchrones qui renvoient `{ ok: true }`).

- [ ] **Step 1: Test qui échoue**

```js
// src/features/guesswho/demoState.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEMO_PHASES, demoG } from './demoState.js'

test('demoG : un état cohérent par phase, sans réseau', async () => {
  assert.deepEqual(DEMO_PHASES, ['lobby', 'gages', 'listen', 'record', 'vote', 'result', 'gage', 'end'])
  for (const ph of DEMO_PHASES) {
    const g = demoG(ph)
    assert.equal(g.room.phase, ph)
    assert.ok(g.players.length >= 4)
    assert.ok(g.me && g.players.some((p) => p.user_id === g.me.user_id))
    assert.deepEqual(await g.act.vote('u2'), { ok: true })
  }
  assert.ok(demoG('listen').room.clip.title)
  assert.ok(demoG('vote').takes.length >= 3)
  assert.ok(demoG('result').room.last_result)
  assert.ok(demoG('gage').room.gage_result.length >= 1)
})
```

Run: `node --test src/features/guesswho/demoState.test.js` → Expected: FAIL (module absent).

- [ ] **Step 2: Écrire `demoState.js`**

Lire `useGuessWhoRoom.js` (objet retourné, fin du fichier) et chaque écran pour la liste exacte des champs lus ; `demoG(phase)` renvoie **tous** les champs du hook : `status: 'ready'`, `error: null`, `spectator: false`, `reason: null`, `room` (`code: 'DEMO'`, `phase`, `round: 3`, `settings: { lives: 2, speed: 'normal', sounds: 'all', rounds: 0 }`, `clip: { id: 'demo', title: 'Extension du territoire', anime: 'Jujutsu Kaisen', lang: 'ja', kind: 'technique', url: '', duration: 2.5 }`, `phase_ends_at` = maintenant + 20 s, `last_result` selon la forme lue dans `ResultPhase.jsx`, `gage_result` selon `GageWheel.jsx`, `gage_pool`), `players` (5 joueurs `u1`…`u5`, avatars DiceBear, `seat` 0…4, `lives`, `total_votes`, `ready`, `connected: true`, `is_host` pour `u1`), `me` = `u1`, `isHost: true`, `prog` (`took`, `voted`, `gaged` selon les écrans), `takes` (4 imitations, `audio_url: ''`), `notice: null`, `highlights: []`, `clearNotice() {}`, `remaining: 18`, `total: 25`, `maxLives: 2`, `refresh: async () => {}`, `act` (`start`, `gage`, `take`, `vote`, `skip`, `ready`, `rejoin` → `async () => ({ ok: true })`), `connection: 'ok'`, `live: true`, `late: false`, `stats` (forme lue dans `EndScreen.jsx`, avec `awards`), `roundsMax: 0`, `isLastRound: false`, `serverNow: Date.now()`, `myVote: null`, `myGage: null`, `myTake: false`.

- [ ] **Step 3: Extraire `RoomView` et écrire `DemoPage`**

`RoomView.jsx` : déplacer depuis `GuessWhoPage.jsx` le JSX de `Room` qui commence à `<SfxBurst …/>` et finit après `<ReactionBar …/>` (avec `connectionNotice`, `REASONS`, `LAST_ROUND_PHASES`, `banner` et les imports d'écrans), en props `{ g, code, reactions }`. `Room` appelle `<RoomView g={g} code={code} reactions={reactions} />`.

`DemoPage.jsx` :

```jsx
// Démo DEV : chaque écran de Guess Who avec un état factice, sans réseau.
import { useState } from 'react'
import { GLOBAL_CSS, MangaBackdrop, FONT_BODY } from './manga.jsx'
import { T, F, pill } from './theme.js'
import RoomView from './RoomView.jsx'
import { DEMO_PHASES, demoG } from './demoState.js'

export default function DemoPage() {
  const initial = new URLSearchParams(location.search).get('phase')
  const [phase, setPhase] = useState(DEMO_PHASES.includes(initial) ? initial : 'lobby')
  const g = demoG(phase)
  return (
    <div style={{ position: 'relative', minHeight: '100dvh', padding: 'clamp(12px,3vw,32px)', fontFamily: FONT_BODY, color: T.text }}>
      <style>{GLOBAL_CSS}</style>
      <MangaBackdrop />
      <nav style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {DEMO_PHASES.map((p) => (
          <button key={p} onClick={() => setPhase(p)} style={{ ...pill(p === phase ? 'primary' : 'ghost'), padding: '6px 12px', fontFamily: F.ui, fontSize: 13, cursor: 'pointer' }}>{p}</button>
        ))}
      </nav>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <RoomView key={phase} g={g} code="DEMO" reactions={{ items: [], send: () => {} }} />
      </div>
    </div>
  )
}
```

`App.jsx` : avant la route `/guess-who/:code`, ajouter (avec un import `lazy` de `./features/guesswho/DemoPage.jsx` déclaré en haut, à côté des autres `lazyWithReload`) :

```jsx
        {import.meta.env.DEV && <Route path="/guess-who/demo" element={<GameLayout><GuessWhoDemo /></GameLayout>} />}
```

Ajouter `src/features/guesswho/demoState.test.js` au script `test`.

- [ ] **Step 4: Vérifier**

Run: `node --test src/features/guesswho/demoState.test.js && npx vite build && grep -rl "Démo DEV" dist/assets | wc -l` → Expected: PASS, build OK, `0` (démo absente du build de prod).

Capture de contrôle : `npx vite --port 5201` en arrière-plan, puis Chromium headless `--screenshot` sur `http://localhost:5201/guess-who/demo?phase=listen` (390×844). Expected : la page s'affiche sans erreur (peau encore partiellement manga, normal à ce stade).

- [ ] **Step 5: Commit**

```bash
git add src/features/guesswho/RoomView.jsx src/features/guesswho/DemoPage.jsx src/features/guesswho/demoState.js src/features/guesswho/demoState.test.js src/features/guesswho/GuessWhoPage.jsx src/App.jsx package.json
git commit -m "feat(guess-who): page de démo DEV de chaque écran (état factice, sans réseau)"
```

---

### Règles de reprise (Tasks 4 à 8)

Appliquées à chaque fichier repris, puis le fichier est ajouté à `DONE` dans `styleGuard.test.js` :

| Manga | Brams |
|---|---|
| `border: \`3px solid ${C.ink}\`` (ou 2–4 px) | `border: LINE` (ou `1px solid ${T.accent}` pour l'état choisi) |
| `3px dashed` séparateur | `borderTop: LINE_SOFT` |
| ombre dure `Npx Npx 0 ${…}` | `SHADOW.soft` (ou rien) |
| fond `C.paper` + contour | `plate()` |
| fond `C.yellow` / `C.red` (mise en avant) | `T.accent` + texte `T.onAccent` (danger : `T.danger` en texte/filet, jamais en grand aplat) |
| `C.cyan` | `T.accentHi` |
| `C.ink` en couleur de texte | `T.textHi` (titres) / `T.text` (corps) |
| `FONT_DISPLAY` + `fontWeight: 400` | `F.display` + `fontWeight: 500` |
| `transform: 'rotate(…)'`, `skewX`, `rotate` décoratifs | supprimés |
| `borderRadius: 4–6` | `RADIUS.sm`–`RADIUS.md` |
| emoji décoratif massif | gardé seulement s'il porte une info (👑 hôte, 🎙️ micro) |

Chaque tâche : appliquer les règles + le traitement de l'écran décrit dans la spec (Section 2), ajouter les fichiers à `DONE`, lancer `node --test src/features/guesswho/styleGuard.test.js` (Expected: PASS), `npx vite build` (Expected: OK), capturer l'écran de démo concerné en 390×844 et 1280×800 et **regarder** la capture ; commit.

### Task 4: `ui.jsx`, `fx.jsx`, `BarreJeu` (skin `brams`)

**Files:** Modify `src/features/guesswho/ui.jsx`, `src/features/guesswho/fx.jsx`, `src/components/BarreJeu.jsx`, `src/features/guesswho/GuessWhoPage.jsx` (`skin="brams"`), `src/features/guesswho/styleGuard.test.js` (`DONE` += `ui.jsx`, `fx.jsx`)

- `Lives` : points ronds 10 px, plein `T.accent`, perdu `T.line` (plus de cœurs rouges).
- `AvatarName` : avatar filet `T.line`, nom `F.ui` 600 `T.textHi`, sous-texte `T.textMute`.
- `ClipPlayer` : bouton rond 56 px (`big` : 72) fond `T.accent` icône `T.onAccent` ; onde/progress en `T.accent` sur `T.line`, hauteur 48, barres 2 px arrondies ; libellé `label()`.
- `TakeCard` : `plate()` ; `selected` → `border: 1px solid ${T.accent}` + coche ; non sélectionnée quand une autre l'est → `opacity: .7`.
- `Confetti` : 18 paillettes champagne (`T.accent`, `T.accentLit`, `T.medal.silver`) 4–6 px, durée inchangée, `count` divisé par 2.
- `SoundToggle` : pilule `ghost` compacte.
- `BarreJeu` : ajouter `SKINS.brams` (fond `T.bg` à 85 % + `backdrop-filter: blur(10px)`, `borderBottom: LINE`, titre `F.display` 500 `T.textHi`, bouton retour pilule ghost) ; `GuessWhoPage` passe `skin="brams"`.

Contrôle visuel : `?phase=vote` et `?phase=end`.

```bash
git add src/features/guesswho/ui.jsx src/features/guesswho/fx.jsx src/components/BarreJeu.jsx src/features/guesswho/GuessWhoPage.jsx src/features/guesswho/styleGuard.test.js
git commit -m "feat(guess-who): peau Brams — avatars, vies, lecteur, cartes, paillettes, barre"
```

### Task 5: Accueil, salon, micro

**Files:** Modify `GuessWhoPage.jsx` (accueil `Home`, bannières), `RoomView.jsx` (bannières), `Lobby.jsx`, `MicSetup.jsx`, `styleGuard.test.js` (`DONE` += `GuessWhoPage.jsx`, `RoomView.jsx`, `Lobby.jsx`, `MicSetup.jsx`)

- Accueil : logo/titre « Guess Who » en `F.display` 500 avec point champagne, carte `plate()` créer / rejoindre, champ code en `F.display` espacé (`letterSpacing: '.3em'`), boutons pilule.
- Bannières (connexion, spectateur, dernier tour, notice) : pilule `raised` + filet ; dernier tour = filet champagne, texte `T.accentLit`, sans rotation.
- Salon : `BigCode` en `F.display` 500 `clamp(2.6rem,10vw,4rem)` `letterSpacing: '.28em'` sur `plate()` ; QR sur fond `#EDEAE3` arrondi `RADIUS.md` (lisibilité du scan) ; joueurs `PlayerChip` ; places vides en cercle pointillé `1px dashed ${T.line}` ; réglages en contrôles segmentés (pilules ghost, choisi = primary) ; bandeau navigateur intégré en `plate()` filet champagne.
- `MicSetup` : vumètre barre fine `T.accent`, sélecteur `select` fond `T.surface` filet, messages d'erreur `T.danger`.

Contrôle visuel : `?phase=lobby` + accueil `/guess-who` (390 et 1280).

```bash
git commit -am "feat(guess-who): peau Brams — accueil, salon, réglages micro"
```

### Task 6: Gages, écoute, enregistrement

**Files:** Modify `GagesPhase.jsx`, `ListenPhase.jsx`, `RecordPhase.jsx`, `LiveWave.jsx`, `styleGuard.test.js` (`DONE` += ces 4)

- Gages : `textarea` `plate()` 16 px, compteur de caractères `T.textMute`, bouton primary.
- Écoute : nom du son `F.display` 500 `clamp(1.8rem,5vw,2.8rem)` `T.textHi`, ligne « animé · langue » `F.ui` `T.textMute`, `ClipPlayer big`, « Écouter en boucle » pilule ghost.
- Enregistrement : bouton micro rond 96 px fond `T.accent` (enregistrement en cours : fond `T.danger` + halo `gw-breathe` `T.danger` 30 %) ; décompte `F.display` 500 120 px `T.accentLit` avec fondu ; `LiveWave` barres 3 px `T.accent` sur `T.line`, sans contour ; messages d'erreur `T.danger` sur `plate()`.

Contrôle visuel : `?phase=gages`, `?phase=listen`, `?phase=record`.

```bash
git commit -am "feat(guess-who): peau Brams — gages, écoute, enregistrement"
```

### Task 7: Vote, résultat, réactions

**Files:** Modify `VotePhase.jsx`, `ResultPhase.jsx`, `Reactions.jsx`, `styleGuard.test.js` (`DONE` += ces 3)

- Vote : grille de `TakeCard`, consigne `label()`, revote = bandeau filet champagne « Égalité — revote ».
- Résultat : votes en `CountUp` `F.display` ; vainqueur du tour = `plate()` filet champagne + auréole `boxShadow: 0 0 0 4px ${T.glow}` ; perdant = vies qui s'éteignent (transition opacité 600 ms) ; texte de résultat `T.textHi`.
- Réactions : barre en pilule `raised`, emojis 22 px ; flottants 26 px, `opacity` max .85, durée × 1,3.

Contrôle visuel : `?phase=vote`, `?phase=result`.

```bash
git commit -am "feat(guess-who): peau Brams — vote, résultat, réactions"
```

### Task 8: Roue des gages, écran de fin

**Files:** Modify `GageWheel.jsx`, `EndScreen.jsx`, `styleGuard.test.js` (`DONE` += ces 2)

- Roue : segments alternés `T.raised` / `rgba(199,168,105,.22)`, séparateurs `T.line`, texte `F.ui` `T.textHi`, pointeur triangle `T.accent`, résultat dans `plate()` filet champagne ; durée et logique de tirage inchangées ; machine à sous des gages : rouleau `plate()`, texte `F.display`.
- Fin : podium 3 plaques (hauteurs 120 / 90 / 70), médaille ronde `T.medal.*` 28 px avec rang `F.display` `T.onAccent` ; stats en `plate()` compactes (icône, `label()`, valeur `F.display`) ; « L'imitation de la partie » en `plate()` (fini le bloc noir/jaune) ; boutons revanche primary / prêt ghost / quitter ghost ; « ✓ prêt » `T.ok`.

Contrôle visuel : `?phase=gage`, `?phase=end`.

```bash
git commit -am "feat(guess-who): peau Brams — roue des gages, écran de fin"
```

### Task 9: Garde-fou sur tout le jeu + volume

**Files:** Modify `styleGuard.test.js` (remplacer `DONE` par tous les `*.jsx` du dossier), `sfx.js` (gain général × 0,7)

- [ ] **Step 1:** `const DONE = readdirSync(new URL('./', import.meta.url)).filter((f) => f.endsWith('.jsx'))`. Run: `node --test src/features/guesswho/styleGuard.test.js` → Expected: PASS ; sinon reprendre chaque ligne listée.
- [ ] **Step 2:** `sfx.js` : multiplier le gain maître par 0,7 (repérer le `GainNode`/volume global ; un seul point de changement).
- [ ] **Step 3:** `npm test` → Expected: tout PASS. `npx vite build` → OK.

```bash
git commit -am "feat(guess-who): garde-fou de style sur tout le jeu, sons plus doux"
```

### Task 10: Relecture du code et contrôle visuel final

**Files:** selon les bugs trouvés.

- [ ] **Step 1: Relecture** de `src/features/guesswho/**`, `src/lib/guessWhoRooms.js`, `src/lib/guessWhoAudio.js`, `supabase/migrations/2026100*_guess_who*.sql` : états impossibles, fuites (micro non libéré, `setTimeout`/`requestAnimationFrame`/`setInterval` sans nettoyage, `URL.createObjectURL` sans `revokeObjectURL`), comportements iPhone Safari (autoplay, `AudioContext` suspendu, veille), erreurs avalées. Consigner chaque constat dans le ledger : `Review: <fichier:ligne> — <problème> — bug confirmé | douteux`.
- [ ] **Step 2: Bugs confirmés** : pour chacun, test qui échoue (logique pure dans `logic/`, ou PGlite), correctif, test vert, commit `fix(guess-who): …`.
- [ ] **Step 3: Captures finales** : `npx vite --port 5201` ; pour chaque `phase` de `DEMO_PHASES` et l'accueil, Chromium headless en 390×844 puis 1280×800 ; regarder chaque image. Un écran raté (débordement, texte illisible, reste de style manga) → correction + nouvelle capture.
- [ ] **Step 4:** `npm test` + `npx vite build` → Expected: PASS / OK.
