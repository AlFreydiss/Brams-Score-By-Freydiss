# Guess Who — design

Jeu multijoueur en ligne de Brams Community : imiter des sons cultes d'anime,
le moins bien noté perd une vie, le premier éliminé fait un gage.

Date : 2026-10-01 · Statut : validé en discussion, à relire avant plan.

## 1. Intention

- **Pour qui** : les membres de la communauté (et leurs invités sans compte),
  chacun sur son téléphone ou son PC, souvent en vocal Discord à côté.
- **Ce qui fait rire** : reproduire « Yamete kudasai », un « Rasengan ! » ou un
  bout d'opening, réécouter les imitations des autres avec leurs noms, et voir
  qui finit avec le gage.
- **Succès** : une partie à 3–8 joueurs se joue de bout en bout sans blocage,
  sur mobile comme sur PC, en ~10 minutes.

### Demandé explicitement

- Chaque joueur écrit un gage au début.
- Une bande son est jouée à tout le monde, chacun doit la reproduire.
- Tout le monde vote pour le meilleur ; le moins bien noté perd une vie.
- 2 vies ; le premier éliminé fait un gage.
- En ligne, chacun sur son appareil.
- Sons : openings, mèmes japonais, techniques d'anime en VO et en VF.
- Pack de sons généré automatiquement au lancement.
- Égalité : revote entre les ex aequo.
- Gage tiré au sort parmi ceux des autres, puis fin de partie.
- Imitations affichées **avec les noms** pendant le vote.
- Tables dédiées (pas de réutilisation des tables Tournoi).
- Nom : **Guess Who**.

### Hypothèses (à corriger si besoin)

- 3 à 8 joueurs.
- Revote encore à égalité → tous les ex aequo perdent une vie.
- Plusieurs joueurs à 0 vie au même tour → chacun tire son gage.
- Durées : gages 45 s, écoute 20 s, imitation 40 s, vote 45 s, revote 25 s.

## 2. Déroulé d'une partie

| Phase | Durée | Ce qui se passe |
|---|---|---|
| `lobby` | — | L'hôte crée le salon (code 4 lettres), les autres rejoignent. L'hôte lance à partir de 3 joueurs. |
| `gages` | 45 s | Chacun écrit un gage (≤ 140 caractères), invisible des autres. Pas de gage → gage de secours tiré d'une liste. |
| `listen` | 20 s | Le son du tour se joue sur chaque appareil, titre affiché (« Rasengan — Naruto (VF) »). Réécoute libre. |
| `record` | 40 s | Chacun s'enregistre. Durée max = durée du son + 3 s. Réessais illimités avant validation. Personne n'entend les autres. |
| `vote` | 45 s | Original + imitations avec nom et avatar, réécoute libre. Un vote pour la meilleure, jamais la sienne. Modifiable jusqu'à la fin du chrono. |
| `revote` | 25 s | Seulement en cas d'égalité au plus petit score : vote entre les ex aequo uniquement. Tout le monde vote, ex aequo compris (pas pour soi). |
| `result` | 8 s | Votes reçus par joueur, cœur brisé pour le(s) perdant(s). |
| `gage` | 10 s | Roue animée parmi les gages des **autres** joueurs, gage tiré affiché en grand chez tous. |
| `end` | — | Récap : votes reçus sur la partie, meilleure imitation. Bouton « Rejouer » (hôte). |

Enchaînement : `lobby → gages → (listen → record → vote → [revote] → result)×N → gage → end`.
Après `result`, si personne n'est à 0 vie → nouveau tour avec un nouveau son.

### Règles de calcul (côté serveur)

- Score d'un joueur au tour = nombre de votes reçus en `vote`.
- Joueur sans imitation → il n'apparaît pas comme choix de vote et **perd
  d'office une vie**, sans revote (validé avec l'utilisateur au plan).
- Sinon : perdant(s) = score minimal. Plusieurs ex aequo → `revote` entre eux.
- Au lancement, seuls les joueurs encore connectés reçoivent une place.
- En `revote`, le(s) moins voté(s) perd(ent) 1 vie. Encore égalité → tous les
  ex aequo du revote perdent 1 vie.
- Si un seul joueur a envoyé une imitation, personne d'autre n'ayant de choix
  valable : tous ceux sans imitation perdent 1 vie, sans vote.
- Un joueur à 0 vie déclenche la phase `gage`. Tirage parmi les gages des
  autres joueurs encore dans le salon ; s'il n'y en a pas, gage de secours.
- Un son n'est jamais rejoué dans la même partie (`used_clips`).

### Déconnexions

- Les chronos avancent quoi qu'il arrive : un joueur absent ne bloque rien.
- Hôte absent (pas de `touch` depuis 20 s) → n'importe quel joueur peut
  appeler `guesswho_promote_host` (même logique que Freydiss Phone).
- L'avancement de phase est déclenché par l'hôte à l'échéance, ou par
  n'importe quel joueur si l'échéance est dépassée de 5 s (filet de sécurité).
  La fonction est idempotente : elle vérifie la phase et le tour attendus.

## 3. Données (Supabase)

Migration unique `supabase/migrations/20261001_guess_who.sql`, à coller dans
l'éditeur SQL Supabase.

### Tables

`guesswho_rooms`
- `id uuid pk`, `code text unique`, `host_user text`, `status text`
  (`lobby|playing|ended`), `phase text`, `round int`, `phase_ends_at timestamptz`
- `clip jsonb` (son du tour : id, titre, anime, langue, url, durée)
- `used_clips text[]`, `tied text[]` (ex aequo en revote)
- `last_result jsonb` (scores du tour, perdants), `gage_result jsonb`
  (joueur, texte du gage, auteur)
- `settings jsonb`, `created_at`, `updated_at`

`guesswho_players`
- `room_id uuid fk`, `user_id text`, `name text`, `avatar text`, `seat int`
- `lives int default 2`, `is_host bool`, `last_seen timestamptz`
- `total_votes int default 0` (récap de fin)
- `secret_token uuid` et `gage text` : **jamais exposés** (RLS + vue publique sans ces colonnes)

`guesswho_takes`
- `room_id`, `round`, `user_id`, `audio_url text`, `duration real`, `created_at`
- unique (`room_id`, `round`, `user_id`) — un nouvel envoi remplace l'ancien

`guesswho_votes`
- `room_id`, `round`, `stage text` (`vote|revote`), `voter text`, `target text`
- unique (`room_id`, `round`, `stage`, `voter`)

### Sécurité

- RLS activée, aucune écriture directe : tout passe par des fonctions
  `security definer` qui vérifient `secret_token`.
- Lecture publique : salons, joueurs (sans token ni gage), imitations
  (seulement à partir de la phase `vote` du tour), votes (seulement après le
  `result` du tour, pour ne pas influencer).

### Fonctions serveur

| Fonction | Rôle |
|---|---|
| `guesswho_create(code, user, name, avatar)` | Crée le salon, renvoie le token de l'hôte. |
| `guesswho_join(code, user, name, avatar, token?)` | Rejoint ou reprend sa place, renvoie le token. Refus si partie lancée et joueur inconnu (il devient spectateur). |
| `guesswho_start(code, token)` | Hôte, ≥ 3 joueurs → phase `gages`. |
| `guesswho_submit_gage(code, token, text)` | Pendant `gages`. |
| `guesswho_submit_take(code, token, url, duration)` | Pendant `record` du tour courant. |
| `guesswho_vote(code, token, target)` | Pendant `vote`/`revote`, cible valide, pas soi. |
| `guesswho_advance(code, token, expected_phase, expected_round)` | Calcule et passe à la phase suivante (choix du son, scores, vies, revote, gage). Idempotente. |
| `guesswho_replay(code, token)` | Hôte : vies à 2, tour 0, phase `gages`. |
| `guesswho_touch` / `guesswho_promote_host` | Présence et reprise d'hôte. |

Le choix du son du tour se fait dans `guesswho_advance` à partir d'une table
`guesswho_clips` (id, titre, anime, langue, url, durée, `enabled`), remplie par
le script du pack. Le serveur tire un son actif non encore utilisé.

## 4. Pack de sons

- Fichiers sur R2 sous `guesswho/clips/<id>.mp3` (mono, ~96 kb/s, 2–8 s).
- Script `scripts/guesswho-build-clips.mjs` :
  - **Techniques** : liste de mots-clés par anime (Rasengan, Chidori,
    Kamehameha, Extension du territoire / Ryōiki Tenkai, Getsuga Tenshō,
    Respiration de l'eau, Gomu Gomu no…), recherchés dans les sous-titres VTT
    des épisodes déjà sur R2. Pour chaque occurrence : découpe de 0,3 s avant à
    1,5 s après la réplique, sur la piste VF et la piste JA quand l'épisode a
    les deux. Plafond par mot-clé pour varier.
  - **Openings** : extrait de 6 s dans les openings du catalogue Blind Test,
    début du premier refrain repéré par l'énergie audio (pic de volume
    soutenu), sinon à 0:20.
  - Sortie : SQL d'insertion dans `guesswho_clips` + page d'écoute locale.
- **Validation** : tu écoutes le pack sur la page d'écoute, tu décoches ce qui
  ne va pas ; seuls les sons validés passent `enabled = true`.
- Cible : 40–60 sons validés au lancement. Mèmes hors épisodes (« Yamete
  kudasai »…) : ajout ultérieur à partir de fichiers que tu fournis.

## 5. Front

- Routes : `/guess-who` (créer / rejoindre) et `/guess-who/:code` (salon).
  Entrée « Guess Who » dans la barre de navigation, juste après « Frds Phone »
  (ex-« Freydiss Phone », renommé), et carte dans la page des jeux.
- `src/lib/guessWhoRooms.js` : appels REST directs aux fonctions (bornés à
  10 s, comme `garticRooms.js`) + abonnement temps réel au salon.
- `src/lib/guessWhoAudio.js` : enregistrement (réutilise `CAN_RECORD` /
  `AUDIO_MIME` de `doublageStudio.js`), envoi R2 via `/api/r2-presign` si
  connecté, sinon audio inline en data URL (opus ~24 kb/s, ≤ 60 Ko).
- `src/features/guesswho/` : `GuessWhoHome`, `GuessWhoRoom` et un composant
  par phase (`GagesPhase`, `ListenPhase`, `RecordPhase`, `VotePhase`,
  `ResultPhase`, `GageWheel`, `EndScreen`), plus `Lives` (cœurs) et `Timer`.
- Chrono affiché à partir de `phase_ends_at` (heure serveur, décalage
  d'horloge corrigé au chargement).

### Cas d'erreur

- Micro refusé ou absent → message clair avec la marche à suivre ; le joueur
  reste dans la partie mais ne peut pas imiter (score 0 ce tour).
- Envoi d'imitation qui échoue → 2 nouvelles tentatives, puis repli inline.
- Son du tour qui ne charge pas → bouton « Réessayer » ; l'hôte peut passer
  au son suivant (`guesswho_advance` avec `skip_clip`).
- Plus de son disponible → la partie continue en réutilisant les sons déjà
  joués.

## 6. Tests

- Fonctions SQL : scénarios scriptés (vote simple, égalité + revote, égalité
  persistante, joueur sans imitation, double élimination, tirage du gage qui
  exclut le sien, rejouer).
- Partie complète automatisée : 3 navigateurs Playwright avec faux micro
  (`--use-fake-device-for-media-stream`), de la création à l'écran de fin.
- Manuel : micro sur iPhone/Safari et Android/Chrome.

## 7. Hors périmètre

- Mode « tous sur un seul écran ».
- Classement global, historique des parties.
- Mèmes hors épisodes tant que tu n'as pas fourni les fichiers.
- Page admin d'ajout de sons (le script + la page d'écoute suffisent au lancement).
