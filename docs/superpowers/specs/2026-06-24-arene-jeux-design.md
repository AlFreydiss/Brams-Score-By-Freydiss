# Arène — Refonte échecs + dames (2D plein écran, premium sobre)

**Date** : 2026-06-24
**Branche** : `feat/arene-jeux` (off `feat/nouveau-monde`)
**Repo** : `F:/brams-web-clone`
**Périmètre** : `src/games/chess`, `src/games/draughts`, `src/games/_shell`, `src/features/{echecs,dames,games}`

## Objectif

Transformer `/jeux/echecs` et `/jeux/dames` en **arènes 2D plein écran**, premium sobres,
avec un choc visuel (juice), de la profondeur de jeu (analyse/IA), et du social/online.
Zéro 3D. Un seul accent or `#c8a45c` sur fond `#0d0e11`. Le « wow » vient du mouvement
et de la lumière, jamais de la couleur.

Contrainte transverse : tout respecte `prefers-reduced-motion` et garde l'accessibilité
(focus-visible, contraste, target-size) déjà en place.

## État actuel (vérifié)

- **2D strict** les deux. Échecs = `react-chessboard` v5 (`features/echecs/Plateau.jsx`) +
  Stockfish.wasm (`useStockfish`). Dames = board 2D maison (`draughts/board/DraughtsBoard.jsx`) +
  moteur JS (`features/dames/engine/draughts-engine.js`) + IA minimax en Web Worker.
- Shell commun : `src/games/_shell/` (GameUniverse, UniverseHeader, TabNav, transitions, settingsSync).
- Tokens : `src/features/games/neutralTheme.js` (or `#c8a45c`, Bricolage Grotesque / Inter / JetBrains Mono).
- Online : échecs via RPC + polling (`echecs_*`) ; dames via Realtime + `/api/bot-tools?tool=dames-move`
  (`dames_rqueue/rmatches/rmoves/ratings`). Settings via `game_settings` RPC.
- ~7000 lignes de code jeu. Migrations dans `supabase/migrations/`, appliquées par
  `railway run -- py -3 scripts/apply_migration.py <file>` (pas de DSN local → Freydiss lance).

## Architecture cible

Nouveau layer partagé **`src/games/_shell/arena/`** — la seule source de cohérence visuelle,
consommé identiquement par les deux jeux :

```
_shell/arena/
  ArenaLayout.jsx      plein écran : board central + rails verre dépoli flottants + header repliable
  ArenaLight.jsx       vignette ambiante + gradient de lumière qui bascule selon le tour
  useArenaJuice.js     hook physique de pièce (lift/drop spring, snap), trail dernier coup
  Particles.jsx        canvas léger : capture = dissolution en particules or sobres
  fx.js                primitives : screen micro-shake, rim pulse (échec), halo (promotion)
  emotes.js            jeu d'emotes préréglés (anti-toxique, pas de texte libre)
  arenaTokens.js       extension de neutralTheme (rails, glass, glows) — pas de nouvelle couleur
```

`neutralTheme.js` est **étendu** (pas remplacé) avec les tokens verre/glow/rail.

### Découpage en 7 workstreams

| # | Workstream | Fichiers cœur | Dépend de |
|---|-----------|---------------|-----------|
| 1 | **Arena shell** (layout plein écran, lumière, rails) | `_shell/arena/ArenaLayout, ArenaLight, arenaTokens` | — (FONDATION) |
| 2 | **Juice engine** (physique pièce, particules, shake, glows, sons) | `_shell/arena/{useArenaJuice,Particles,fx}.js`, `sons.js`/`sfx.js` | 1 |
| 3 | **Échecs depth** (ECO nommée, analyse post-partie, coach, eval bar) | `chess/logic/openings.js`, `chess/analysis/*`, `chess/ui/EvalBar,MoveList,EndOverlay` | 1,2 |
| 4 | **Dames depth** (IA renforcée + preview rafle + review) | `features/dames/engine/{draughts-ai,draughts-engine}.js`, `draughts/ui/*` | 1,2 |
| 5 | **Online presence + spectateur** | `chess/online/*`, `draughts/online/*`, `_shell/arena` + migration `*_spectator.sql` | 1 |
| 6 | **Social** (emotes in-game, saisons, badges Discord) | `_shell/arena/emotes.js`, `*/online/*`, migrations `*_seasons.sql` | 1,2,5 |
| 7 | **Replay/export** (scrubber complet, PGN/notation, mini-eval coup par coup) | `*/ui/MoveList,MiniBoard`, `chess/analysis`, `draughts/logic` | 1,2,3,4 |

**Séquencement** : 1 d'abord (ancre), puis 2, puis fan-out parallèle de 3/4/5, puis 6/7.
Foundation (1+2) faite par le thread principal = garant de cohérence ; le reste en agents parallèles.

## Détail par axe

### Visuel / juice (WS1, WS2)
- **Layout plein écran** : board géant centré auto-fit, deux rails verre dépoli flottants
  (gauche = joueurs/horloge/eval ; droite = liste de coups + actions), header se replie en jeu.
  Mobile = board plein + drawer bas. Pas de scroll horizontal (gotcha `overflow-x:clip` connu).
- **Lumière** : vignette + gradient subtil qui bascule chaud/froid selon le tour (très léger).
- **Physique pièce** : grab = lift + ombre qui grandit ; drop = glide spring + snap magnétique ;
  trail fantôme du dernier coup ; dots des coups légaux qui respirent.
- **Événements** (reduced-motion safe) : capture = pièce dissoute en particules or + micro-shake ;
  échec = pulse or du rim + glow case roi ; promotion/dame = halo + fanfare synth.
- **Sons synth** : move/capture/check/promote/win, étend `sons.js` (échecs) / `sfx.js` (dames).

### Profondeur (WS3, WS4, WS7)
- **Échecs** : eval bar live améliorée ; détection d'ouverture **ECO** nommée (table locale) ;
  **analyse post-partie** (précision %, classification coups `!`/`?`/`??` via delta Stockfish,
  flèche meilleur coup) ; coach hint à la demande.
- **Dames** : IA plus profonde (minimax + meilleure éval positionnelle + transposition simple) ;
  **preview de la rafle** de capture au survol ; review post-partie.
- **Les deux** : scrubber de replay complet ; export notation/PGN ; mini-eval coup par coup.

### Online / social (WS5, WS6)
- Matchmaking presence-based (canal Supabase presence) — plus réactif que le polling 2500ms.
- **Spectateur** : regarder une ranked live (lecture seule, abonnement Realtime).
- **Emotes/quick-chat** préréglés (anti-toxique).
- **Saisons** + badges liés au Discord, défis entre amis.

## Données (migrations SQL, lancées par Freydiss)

- `*_spectator.sql` : politique RLS lecture seule des matches en cours pour spectateurs.
- `*_seasons.sql` : tables saisons (`game_seasons`, colonnes saison sur ratings) + badges.
- `*_emotes.sql` (si persistance d'emotes nécessaire ; sinon éphémère via Realtime broadcast).
- Réutilise `game_settings`, `dames_r*`, `echecs_*` existants. **Aucune** table d'argent touchée.

## Tests / vérification

- **Playwright** (skill `webapp-testing`) sur le dev local (`npm run dev` = vite) :
  captures live des deux arènes, vérif layout plein écran, juice visible, reduced-motion,
  smoke d'une partie vs IA bout-en-bout, mobile viewport.
- Vérif manuelle online 2 joueurs (matchmaking + spectateur) signalée à Freydiss (besoin 2 sessions).
- **Maxi code review final** : `/code-review` haute intensité + agents reviewers sur le diff complet
  des 7 workstreams avant proposition de merge.

## Hors périmètre (YAGNI v1)

- Pas de 3D. Pas de refonte du netcode de fond (on étend, on ne réécrit pas).
- Pas de chat texte libre (emotes préréglés only).
- Variantes de règles nouvelles (on garde 10×10/8×8 dames, échecs standard).

## Risques

- Online/spectateur touche DB + RLS → migrations à valider par Freydiss avant merge.
- Charge perf du juice sur mobile → budget : canvas particules plafonné, rAF, dégradation reduced-motion.
- Cohérence visuelle entre deux jeux → garantie par l'unicité du layer `_shell/arena`.
