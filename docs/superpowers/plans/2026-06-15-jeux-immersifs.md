# Jeux immersifs (échecs/dames/brams-phone plein écran) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Faire de `/echecs`, `/dames`, `/brams-phone` des écrans de jeu plein viewport sans la navbar du site, avec board agrandi.

**Architecture:** Sortir les 3 routes de `PageLayout` (App.jsx) ; barre compacte partagée `BarreJeu` (← Jeux + titre + slot actions) en haut de chaque jeu ; paddings ajustés (plus de navbar) ; canvas/board agrandis. Logique de jeu intacte.

**Tech Stack:** React 18, react-router (`Link`), styles inline. Pas de test unitaire (layout) → gate = build vert + acceptation webapp-testing.

**Réf:** spec `docs/superpowers/specs/2026-06-15-jeux-immersifs-design.md`.

---

## File Structure
- **Create** `src/components/BarreJeu.jsx` — barre compacte partagée.
- **Modify** `src/App.jsx` — `/echecs`, `/dames`, `/brams-phone(/:code)` sans `PageLayout`.
- **Modify** `src/features/echecs/EchecsPage.jsx` — BarreJeu + paddingTop réduit.
- **Modify** `src/features/echecs/components/Plateau3D.jsx` — height plus grande (fill).
- **Modify** `src/features/dames/DamesPage.jsx` — fond propre + BarreJeu + board élargi.
- **Modify** `src/features/garticphone/BramsPhonePage.jsx` — BarreJeu + paddingTop réduit.

---

## Task 1: BarreJeu + sortie de PageLayout + Échecs immersif

**Files:** Create `src/components/BarreJeu.jsx` ; Modify `src/App.jsx`, `EchecsPage.jsx`, `Plateau3D.jsx`.

- [ ] **Step 1: Créer la barre partagée**

Create `src/components/BarreJeu.jsx`:
```jsx
// Barre compacte des écrans de jeu immersifs : ← Jeux + titre + actions (slot droite).
import { Link } from 'react-router-dom'

export default function BarreJeu({ titre, children }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30, height: 52, display: 'flex', alignItems: 'center',
      gap: 12, padding: '0 clamp(12px,2.5vw,22px)', boxSizing: 'border-box',
      background: 'rgba(8,9,13,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <Link to="/jeux" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
        color: '#cbb26b', fontSize: 13, fontWeight: 800, padding: '6px 12px', borderRadius: 10,
        border: '1px solid rgba(212,160,23,0.28)', background: 'rgba(212,160,23,0.08)',
      }}>← Jeux</Link>
      {titre && <span style={{ fontSize: 14, fontWeight: 800, color: '#ece8df', letterSpacing: '-0.01em' }}>{titre}</span>}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Sortir les 3 routes de PageLayout (App.jsx)**

Dans `src/App.jsx`, remplacer :
```jsx
<Route path="/echecs"      element={<PageLayout><EchecsPage /></PageLayout>} />
<Route path="/dames"       element={<PageLayout><DamesPage /></PageLayout>} />
```
par :
```jsx
<Route path="/echecs"      element={<EchecsPage />} />
<Route path="/dames"       element={<DamesPage />} />
```
Et les routes brams-phone :
```jsx
<Route path="/brams-phone"        element={<PageLayout><BramsPhonePage /></PageLayout>} />
<Route path="/brams-phone/:code"  element={<PageLayout><BramsPhonePage /></PageLayout>} />
```
par :
```jsx
<Route path="/brams-phone"        element={<BramsPhonePage />} />
<Route path="/brams-phone/:code"  element={<BramsPhonePage />} />
```

- [ ] **Step 3: EchecsPage immersif**

Dans `src/features/echecs/EchecsPage.jsx` :
- Importer `BarreJeu` : `import BarreJeu from '../../components/BarreJeu.jsx'`.
- Le conteneur racine : `paddingTop` n'a plus besoin de dégager la navbar → mettre `paddingTop: 0` (la `BarreJeu` sticky occupe le haut). Garder le fond radial.
- Remplacer le `<div>` en-tête maison (le bloc `display:flex justify-content:space-between` avec `<h1>♟ Échecs Brams</h1>` + les 2 boutons toggle) par `<BarreJeu titre="Échecs Brams">{...les deux boutons toggle 3D et son inchangés...}</BarreJeu>`, placée TOUT EN HAUT (avant le conteneur `maxWidth`). Le sous-titre/description du hub peut rester sous la barre (mode hub uniquement). Garder le state `troisD`/`mute` et leurs handlers tels quels — juste déplacer les 2 `<button>` dans le slot `children` de `BarreJeu`.
- Le conteneur `maxWidth` (1640 en jeu) garde son padding latéral ; retirer le `paddingTop: enJeu ? 78 : 92` du wrapper racine.

- [ ] **Step 4: Plateau3D plus grand**

Dans `src/features/echecs/components/Plateau3D.jsx`, le wrapper :
```jsx
<div data-testid="plateau3d-wrap" style={{ position: 'relative', width: '100%', height: 'min(72vh, 560px)' }}>
```
→
```jsx
<div data-testid="plateau3d-wrap" style={{ position: 'relative', width: '100%', height: 'min(82vh, 820px)' }}>
```

- [ ] **Step 5: Build**

Run: `npm run build` → `✓ built`.

- [ ] **Step 6: Commit**

```bash
git add src/components/BarreJeu.jsx src/App.jsx src/features/echecs/EchecsPage.jsx src/features/echecs/components/Plateau3D.jsx
git commit -m "feat(jeux): échecs en écran de jeu immersif (hors navbar, BarreJeu, canvas 3D agrandi)"
```

---

## Task 2: Dames + Brams Phone immersifs

**Files:** Modify `src/features/dames/DamesPage.jsx`, `src/features/garticphone/BramsPhonePage.jsx`.

- [ ] **Step 1: DamesPage — fond + BarreJeu + board élargi**

Dans `src/features/dames/DamesPage.jsx` :
- Importer `BarreJeu`.
- Le `<div>` racine : ajouter un **fond plein viewport** (il n'en a plus sans PageLayout) :
  `background: 'radial-gradient(1000px 520px at 50% -6%, rgba(212,160,23,0.10), transparent 60%), linear-gradient(180deg,#0b0a0e,#0c0b10 60%,#08090d)'`, garder `minHeight:'100vh'`, retirer le `padding` top excessif (mettre `padding: '0 16px 60px'`).
- Insérer `<BarreJeu titre="Dames Brams" />` tout en haut (avant le header centré). Le header titre/tabs reste dessous.
- Élargir le board : le conteneur `maxWidth: 1100` → `maxWidth: 1320` (plus de place).

- [ ] **Step 2: BramsPhonePage — BarreJeu + paddingTop réduit**

Dans `src/features/garticphone/BramsPhonePage.jsx` (composant `Shell`) :
- Importer `BarreJeu` (`import BarreJeu from '../../components/BarreJeu.jsx'`).
- Dans `Shell`, réduire `paddingTop: 92` → `paddingTop: 0` et insérer `<BarreJeu titre="Brams Phone" />` en tout premier enfant (avant `<div style={pageBg}/>` ? non — la barre doit être au-dessus du contenu et visible : la mettre juste après l'ouverture, en position sticky elle se place en haut ; le contenu `zIndex:2` passe dessous le `pageBg`. Mettre `<BarreJeu>` APRÈS le conteneur de contenu `zIndex:2` ne marche pas — la placer comme premier élément du conteneur racine, et donner au wrapper de contenu un `paddingTop` léger si besoin). Concrètement : juste après `<div className="bp-page" ...>` ouvrant, insérer `<BarreJeu titre="Brams Phone" />`, puis les `<style>`, `pageBg`, `dotGrid`, et le conteneur contenu. La barre sticky `zIndex:30` reste au-dessus.
- La landing (`Landing`) utilise aussi `Shell` → elle aura la barre aussi (cohérent).

- [ ] **Step 3: Build**

Run: `npm run build` → `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add src/features/dames/DamesPage.jsx src/features/garticphone/BramsPhonePage.jsx
git commit -m "feat(jeux): dames + brams-phone en écran de jeu immersif (fond plein viewport + BarreJeu)"
```

---

## Task 3: Acceptation + deploy

- [ ] **Step 1: Acceptation visuelle (webapp-testing)**

Invoquer `webapp-testing` : pour `/echecs` (mode 2 joueurs, 3D), `/dames`, `/brams-phone` → vérifier : (1) AUCUNE navbar du site ; (2) le jeu remplit le viewport ; (3) la `BarreJeu` (← Jeux) est en haut ; (4) board nettement plus grand (échecs 3D sans letterbox vs avant) ; (5) `← Jeux` ramène à `/jeux` ; (6) jouable (un coup échecs/dames, landing brams-phone visible). Screenshots des 3.

- [ ] **Step 2: Build + deploy**

```bash
npm run build
git push
vercel --prod --scope brams-score-by-freydiss-projects --yes
```
Vérifier les 3 routes en prod : pas de navbar, plein écran.

---

## Notes d'exécution
- Pas de test unitaire (layout pur) → build vert + acceptation visuelle.
- Sans PageLayout, ces routes perdent `WelcomeAnimation` (ok, écran de jeu).
- Tuning possible à l'acceptation : hauteur `Plateau3D` (82vh) et `maxWidth` dames si trop/pas assez grand.
