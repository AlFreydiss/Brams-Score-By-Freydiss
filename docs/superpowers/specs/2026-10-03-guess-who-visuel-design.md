# Guess Who — refonte visuelle sobre (sous-projet 4/4) + relecture du code

Date : 2026-10-03 · Statut : validé en conversation, en attente de relecture du spec

## Objectif

- **Dit par Feydi** : « améliore de malade le visuel, un truc beaucoup plus
  sobre », « relis le code, vérifie que tout marche ».
- **Direction choisie** : identité Brams (encre chaude + champagne, Fraunces +
  Hanken Grotesk), à la place de la « planche de manga » actuelle (papier
  blanc, jaune/rouge/cyan saturés, contours 3 px, ombres dures décalées,
  onomatopées, lignes de vitesse).
- **Approche retenue : A** — thème complet + reprise écran par écran, sans
  changer la logique de jeu ; relecture de tout le code du jeu, bugs corrigés
  en TDD. (Écartées : B couleurs seules → hybride incohérent ; C réécriture des
  écrans → risque sur une logique stable et testée.)
- **Critère de réussite** : chaque écran du jeu, en 390 px et 1280 px, lisible,
  calme et cohérent avec le Tier Studio ; plus aucun contour épais, ombre dure,
  jaune/rouge/cyan saturé ; suite de tests toujours verte.

## Constat

- `src/features/guesswho/manga.jsx` centralise une partie du style : `C`
  (couleurs), `FONT_DISPLAY`/`FONT_BODY`, `GLOBAL_CSS`, `MangaBackdrop`, `Btn`,
  `Timer`, `PhaseFrame`, `PlayerChip`, `LiveRoster`, `Waiting`, `SfxBurst`,
  `alpha`. Les écrans consomment cette API.
- Mais les écrans codent aussi le style manga en dur : ≈ 50 contours 3–4 px,
  ≈ 30 ombres décalées, ≈ 30 `C.yellow`/`C.red` dans 14 fichiers
  (`EndScreen`, `GageWheel`, `GagesPhase`, `GuessWhoPage`, `ListenPhase`,
  `LiveWave`, `Lobby`, `MicSetup`, `Reactions`, `RecordPhase`, `ResultPhase`,
  `VotePhase`, `fx.jsx`, `ui.jsx`).
- L'identité Brams existe déjà : `src/theme/tierStudio.js` (`ink`, `fonts`,
  `plaque()`, `engravedLabel()`, `card()`), polices déjà chargées dans
  `index.html`.

## Section 1 — Système visuel

Nouveau fichier `src/features/guesswho/theme.js` qui **réutilise**
`src/theme/tierStudio.js` (pas de seconde palette) et ajoute ce qui manque au jeu.

- **Couleurs** : fond `#0B0B0C`, surfaces `#161618`, élevé `#1E1E20`, filets
  `rgba(255,255,255,0.07)` ; accent unique champagne `#C7A869` (survol
  `#D9C190`, emphase `#E3D2A6`) ; texte `#EDEAE3` (titres) / `#C7C2B8`
  (corps) / `#9A958B` (secondaire) / `#6B675F` (discret). États mats seulement :
  vie/ok sauge `#7FA38A`, danger brique `#BE6A5A`. Aucun jaune, rouge ou cyan
  saturé.
- **Typo** : Fraunces (titres de phase, nom du son, podium, grands chiffres) ;
  Hanken Grotesk (tout le reste) ; étiquettes en petites capitales espacées
  (`engravedLabel`). Les imports Google Fonts « Dela Gothic One » et
  « M PLUS 1p » sont supprimés de `GLOBAL_CSS`.
- **Formes** : cartes « plaque » (filet 1 px, dégradé léger, ombre douce,
  rayon 14–18 px) ; boutons pilule (principal : fond champagne, texte encre ;
  secondaire : filet + texte clair ; danger : filet brique) ; aucun contour
  > 1,5 px, aucune ombre dure décalée.
- **Fond** : encre unie + grain très léger + halo champagne à peine visible
  derrière la carte active (remplace trame de points et lignes de vitesse).
- **Accessibilité** : contraste AA sur tout texte ; `:focus-visible` = anneau
  champagne 2 px décalé ; cibles tactiles ≥ 44 px ; `prefers-reduced-motion`
  respecté.

### API conservée

`manga.jsx` garde **exactement** ses exports et leurs props (les écrans et les
tests ne changent pas d'import) ; seule la peau change. `C` garde ses clés
(`paper`, `ink`, `tone`, `red`, `yellow`, `cyan`, `text`, `textMut`, `warn`,
`danger`, `ok`, `ember`, `gold`) remappées sur la nouvelle palette, pour que
tout usage oublié reste lisible pendant la transition ; à la fin de la reprise,
plus aucun écran n'utilise `C.yellow`, `C.red` ni `C.cyan`.

## Section 2 — Mouvement et écrans

- **Mouvement** : transitions de phase en fondu + glissement 8 px (≈ 250 ms,
  ressort amorti) ; suppression de `gw-shake`, de `SfxBurst` (rend `null`,
  export conservé) et des lignes de vitesse ; `prefers-reduced-motion` →
  fondu seul.
- **Chrono (`Timer`)** : anneau fin champagne qui se vide ; brique dans les
  5 dernières secondes avec pulsation discrète (pas de clignotement).
- **Salon** : code du salon en grand (Fraunces, chiffres espacés), QR sur
  plaque, joueurs en pastilles avatar + nom, réglages en contrôles segmentés
  sobres, bandeau navigateur intégré en plaque à filet champagne.
- **Gages** : champ texte plaque, compteur de joueurs ayant écrit.
- **Écoute** : nom du son en grand (Fraunces), « animé · langue » en dessous,
  onde fine champagne avec tête de lecture, bouton lecture rond.
- **Enregistrement** : gros bouton micro circulaire ; décompte 3-2-1 en grand
  chiffre Fraunces qui s'estompe ; onde micro en direct + halo qui respire
  pendant la prise ; pastilles d'avatars pour « a envoyé ».
- **Vote** : imitations en cartes plaque ; carte choisie = filet champagne +
  coche, les autres légèrement atténuées.
- **Résultat** : votes révélés un à un (`CountUp` existant) ; vies du perdant
  qui s'éteignent (opacité) ; auréole champagne pour le vainqueur du tour.
- **Roue des gages** : segments encre / champagne alternés, ralentissement
  long, déclic final.
- **Fin** : podium en plaques de 3 hauteurs, médailles patinées (or, argent,
  bronze mats) ; `Confetti` → fine pluie de paillettes champagne, rare et courte.
- **Réactions** : emojis flottants plus petits, plus lents, moins opaques.
- **Sons** : mêmes bruitages, volume général abaissé (`sfx.js`, gain ×0,7).

## Section 3 — Relecture du code et vérification

- **Relecture** de tout `src/features/guesswho`, `src/lib/guessWhoRooms.js`,
  `src/lib/guessWhoAudio.js` et des migrations Guess Who : états impossibles,
  fuites (micro non libéré, timers/rAF non nettoyés, URL d'objet non
  révoquées), comportements iPhone Safari, erreurs avalées.
  - Bug confirmé → test qui échoue (logique pure, hook isolé ou PGlite) puis
    correctif.
  - Point douteux non testable → listé dans le rapport final, non modifié.
- **Aucun changement de logique** dans la refonte : props et appels `g.act.*`
  inchangés ; la suite existante (185 tests) sert de filet.
- **Page de démo** `src/features/guesswho/DemoPage.jsx`, route
  `/guess-who/demo` ajoutée dans `App.jsx` **uniquement si
  `import.meta.env.DEV`** et déclarée avant `/guess-who/:code` : affiche chaque
  écran (salon, gages, écoute, enregistrement, vote, résultat, roue, fin) avec
  un objet `g` factice (`demoState.js`), sans appel réseau ni écriture en base.
  En production la route n'existe pas (`/guess-who/demo` = salon « DEMO »
  normal, comme aujourd'hui).
- **Contrôle visuel** : capture Chromium headless de chaque écran de démo en
  390×844 et 1280×800, regardée avant de conclure ; un écran raté est repris.
- **Livraison** : branche `feat/gw-visuel`, `npm test` + `vite build` verts,
  push sur `main` après accord.

## Hors périmètre

Sous-projets 2 (mobile, au-delà des cibles 44 px et du 390 px vérifié) et
3 (gameplay) ; refonte du reste du site ; nouveaux sons.
