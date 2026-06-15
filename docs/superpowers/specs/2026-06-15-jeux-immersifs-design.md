# Jeux en mode "écran de jeu" immersif — design

> Statut : **validé** (GO 2026-06-15). Logique de jeu intacte ; purement layout/chrome.
> Cible : `/echecs`, `/dames`, `/brams-phone` passent en plein viewport, sans la navbar du site (comme `/akinator` et `/fredisu`).

## Objectif
Les 3 jeux s'ouvrent en **écran de jeu immersif** : plein viewport, navbar du site retirée, board agrandi (fini le letterbox des échecs 3D), une barre compacte en haut avec retour vers `/jeux`. Référence : Fred'isu / Akinator (déjà rendus hors `PageLayout`).

## Contexte
- `App.jsx` : `PageLayout` = `<div bg #0b0c0e><WelcomeAnimation/><Navbar/>{children}</div>`. `/echecs`, `/dames`, `/brams-phone(/:code)` sont wrappés dedans → navbar visible, paddings pour la dégager. `/akinator` et `/fredisu` sont rendus SANS `PageLayout` (le pattern immersif voulu).
- `EchecsPage` : a déjà un mode `enJeu` compact (paddingTop 78, maxWidth 1640, header compact + toggles 3D/son). Fond radial propre. Plateau3D = `height: min(72vh,560px)` (cap = letterbox).
- `DamesPage` : déjà 3D (`DamesGame3D`/`DamesOnline3D`), header + tabs, contenu `maxWidth 1100`. **Pas de fond propre** (hérite de PageLayout) → à ajouter.
- `BramsPhonePage` : Shell plein viewport + `pageBg` propre + `paddingTop 92` (pour la navbar).

## Design

### A. Sortir les 3 routes de `PageLayout` (App.jsx)
Rendre `<EchecsPage/>`, `<DamesPage/>`, `<BramsPhonePage/>` directement (comme Akinator). Plus de navbar ni WelcomeAnimation sur ces routes.

### B. Barre de jeu partagée — `components/BarreJeu.jsx`
Petit composant réutilisé par les 3 : barre fine sticky en haut (hauteur ~52px), fond translucide sombre + blur, à gauche `← Jeux` (`<Link to="/jeux">`) + titre du jeu, à droite un slot `actions` (toggles spécifiques). Interface : `{ titre, children }`.

### C. Par jeu
- **Échecs** (`EchecsPage`) : remplacer le header maison par `BarreJeu` (les toggles 3D/son passent dans `actions`) ; `paddingTop` réduit (≈ 60, plus de navbar). En jeu : le plateau prend la hauteur dispo → `Plateau3D` height = `calc(100vh - ~120px)` (retrait du cap 560px), le 2D en jeu garde une grande taille. Le bouton "Quitter" des modes ramène au hub échecs (inchangé) ; `← Jeux` sort vers `/jeux`.
- **Dames** (`DamesPage`) : **ajouter un fond plein viewport** (radial sombre maritime), `BarreJeu` en haut, contenu élargi (board prend plus de place : maxWidth ↑ / `width:100%`). DamesGame3D/Online3D inchangés.
- **Brams Phone** (`BramsPhonePage`) : `Shell` garde son `pageBg` ; `paddingTop` réduit ; ajouter `BarreJeu` (← Jeux + "Brams Phone") au-dessus du contenu — la topbar interne du salon (code, quitter) reste.

### D. Intact
Toute la logique : chess.js/Stockfish/modes (échecs), DamesGame3D/Online (dames), useGarticRoom/flow (brams-phone). Seuls le wrapping de route + les conteneurs/paddings/barre changent.

## Tests & acceptation
- `webapp-testing` sur les 3 routes : (1) aucune navbar du site visible ; (2) le jeu remplit le viewport ; (3) board nettement plus grand (échecs 3D sans letterbox) ; (4) `← Jeux` ramène à `/jeux` ; (5) le jeu reste jouable (un coup échecs/dames, lobby brams-phone). Screenshots avant/après.

## Hors scope
Vrai plein écran navigateur (Fullscreen API) — non retenu (immersif in-page suffit). Refonte visuelle des jeux. Le cursor-trail global qui bave sur la scène (effet site) — laissé tel quel (peut être traité plus tard).

## Risques
- Sans `PageLayout`, `DamesPage` perd son fond → bien lui en donner un (sinon body transparent).
- Les modes échecs (`SoloVsIA`/`DeuxJoueursLocal`/`MultiOnline`) ont leur propre conteneur plateau ; pour que le 3D remplisse, ajuster la hauteur côté `Plateau3D` (height responsive) suffit — pas besoin de toucher les modes si le wrapper grandit.
