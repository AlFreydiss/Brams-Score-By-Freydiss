# Échecs en vrai 3D (GLTF réaliste) — design

> Statut : **validé** (GO 2026-06-15). Prochaine étape : plan (writing-plans).
> On ne touche QUE le rendu du plateau. chess.js / usePartie / Stockfish / modes / horloge / online / FinPartieModal restent intacts.

## Objectif

Remplacer le faux-3D CSS (échiquier 2D incliné, `Plateau.jsx` `troisD`) par un **vrai 3D three.js/r3f** : plateau qu'on tourne à la souris (orbit), pièces volumétriques réalistes (modèles GLTF), éclairage/ombres, animations de déplacement. Branché sur la logique de jeu existante, drop-in dans tous les modes.

## Contexte (ce qui existe)

- `features/echecs/` complet : `usePartie` (wrap chess.js : `fen, coupsLegaux(sq), jouer({from,to,promotion}), dernierCoup, caseRoiEnEchec, trait`), modes `SoloVsIA / DeuxJoueursLocal / MultiOnline / Matchmaking`, `useStockfish`, `useHorloge`, `useRealtimeGame`, `FinPartieModal`, `SelecteurPromotion`.
- `Plateau.jsx` = wrapper react-chessboard v4 (2D) + un mode `troisD` CSS (à retirer). Interface : `{ partie, orientation, peutJouer(couleur), onCoup(move), taille, interactif, troisD }`.
- `EchecsPage.jsx` : toggle `troisD` (🧊/▦, persisté), passé à chaque mode → `Plateau`.
- Stack 3D DÉJÀ présente : `@react-three/fiber@8` (React 18), `@react-three/drei@9`, `three@0.170`. (`postprocessing`, `rapier` dispo mais hors scope.)

## A. Pipeline asset

- **Source** : "A Beautiful Game" (Khronos glTF-Sample-Assets, **CC-BY 4.0** → crédit obligatoire), `ABeautifulGame.glb` = **43 Mo brut** (vérifié 200 OK). Trop lourd à servir tel quel.
- **Optimisation** (local, une fois) : `npx @gltf-transform/cli optimize` → Draco (géométrie) + textures WebP redimensionnées (≤1k) → cible **~3-5 Mo**. Sortie `echecs3d.glb`.
- **Hébergement** : upload sur **R2** (bucket public du site), URL servie same-origin via le proxy existant si nécessaire (CORS). L'URL finale est une constante `MODELE_3D_URL` dans `constants.js`.
- **Crédit CC-BY** : petite mention "Modèle 3D : A Beautiful Game (Khronos) — CC-BY 4.0" dans un coin discret de la scène 3D / l'écran.
- **Extraction pièces** : on charge le GLB une fois (`useGLTF`), on récupère **un mesh par type** (roi/dame/tour/fou/cavalier/pion) **× 2 couleurs** depuis le graphe (par nom de nœud — noms exacts résolus à l'implémentation en loggant la scène). Géométrie + matériau clonés, instanciés selon le FEN. **L'échiquier est le NÔTRE** (géométrie procédurale, contrôle du raycasting/surbrillances), pas celui du modèle.

## B. `Plateau3D.jsx` (r3f) — interface identique à `Plateau`

`{ partie, orientation, peutJouer, onCoup, interactif }` (drop-in). EchecsPage : quand `troisD` → rend `<Plateau3D>` au lieu de `<Plateau>` (le chemin CSS-3D de `Plateau.jsx` est supprimé ; `Plateau.jsx` redevient 2D pur).

- `<Canvas>` r3f : caméra perspective, `OrbitControls` (drei) bornés (pas sous le plateau, zoom limité), `Environment`/lumières (directional + ambient) + ombres (`shadow-mapSize` modéré).
- **Échiquier** : 64 cases (BoxGeometry fines, matériaux clair/foncé `THEME`), cadre bois, plan d'ombre. Repère : `case 'e4' → (x,z)` via fichier/rangée ; **orientation** = rotation caméra (ou plateau) selon `orientation` ('white'/'black').
- **Pièces** : pour chaque pièce du FEN, un `<primitive>` cloné (géométrie/ matériau du type+couleur), positionné sur sa case, `castShadow`.
- **Surbrillances 3D** : dernier coup (cases teintées), sélection (case dorée), coups légaux (disques lumineux émissifs au-dessus des cases ; anneau pour capture), roi en échec (halo rouge émissif).

## C. Interaction (logique réutilisée)

- **Extraction** : sortir la logique de coup de `Plateau.jsx` (`tenterCoup`, état `caseSelection`, `promo`, `choisirPromotion`) dans un hook partagé **`useInteractionEchecs(partie, { peutJouer, onCoup, interactif })`** → `{ caseSelection, coupsLegauxSel, promo, onCaseClick(square), choisirPromotion, annulerPromo }`. `Plateau` (2D) ET `Plateau3D` le consomment → zéro duplication, comportement identique (clic-clic, promotion via `SelecteurPromotion`).
- **3D → square** : raycasting sur des meshes de case invisibles (un par case) → `onCaseClick(square)`. (Drag non requis : clic-clic suffit et est plus net en 3D.)
- **Animations** : déplacement = lerp position sur ~`ANIM_PIECE_MS` (arc vertical pour le cavalier) ; capture = fondu + retrait ; échec = pulsation du halo. `prefers-reduced-motion` → pas d'anim.
- **Promotion** : `SelecteurPromotion` (HTML) en overlay au-dessus du `<Canvas>`.

## D. Perf / chargement / mobile

- GLB **lazy** (`useGLTF` + `<Suspense fallback="Chargement de l'échiquier 3D…">`), `useGLTF.preload(MODELE_3D_URL)`. Draco decoder (drei).
- Mobile (`IS_MOBILE`/coarse pointer) : `dpr` plafonné (≤1.5), ombres allégées ou off, OrbitControls damping.
- Dégradé : si WebGL indispo ou échec de chargement → fallback sur `Plateau` 2D + message.

## E. Tests & acceptation

- **Unitaire** : `useInteractionEchecs` (logique pure de sélection/coup/promotion) testé node:test (sélection, coup légal, illégal, promotion, désélection) — réutilise chess.js.
- **Coords** : test `squareVers3D('e4')` / `piecesDepuisFen(fen)` (mapping FEN → liste {type,couleur,case}).
- **Acceptation** : `webapp-testing` sur `/echecs` mode local → toggle 3D → jouer quelques coups (clic-clic), vérifier rendu pièces, surbrillances, anim, promotion, échec ; orbit caméra ; perf OK ; fallback 2D toujours fonctionnel.

## Hors scope
Animations physiques (rapier), post-processing avancé, set de pièces alternatifs, board du modèle GLTF (on garde le nôtre). Le faux-3D CSS est SUPPRIMÉ (remplacé par le vrai 3D).

## Risques
- **Poids asset** : si l'optim ne descend pas assez (<6 Mo), réduire davantage les textures / envisager meshopt. Loading state obligatoire.
- **Noms de nœuds GLTF** : résolus à l'implémentation (log du scene graph). Si le modèle expose mal les pièces individuelles, plan B = 6 GLB séparés via `gltf-transform` (un par type).
- **CORS R2** : servir via le proxy same-origin existant si le fetch GLB est bloqué (cf. pipeline médias).
