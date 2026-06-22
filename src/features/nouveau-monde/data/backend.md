# Nouveau Monde — Backend (signatures RPC)

Migration : `supabase/nouveau_monde.sql`.
**À lancer par Freydiss dans le SQL Editor Supabase** (on ne peut pas exécuter la migration ici).

Identité = `auth.uid()` (uuid Supabase), aligné sur Échecs. Le pseudo/avatar est résolu
côté serveur via Discord (`auth.identities` → table `users`), pas besoin de l'envoyer.

## Modèle de données

- `game_ratings (user_id uuid, game text, elo, bounty, wins, losses, draws, games, updated_at)` — PK `(user_id, game)`. **SELECT public**, aucune écriture client.
- `nm_match_history (...)` — historique des matchs. Lecture = ses propres matchs uniquement.
- `game` ∈ `echecs | dames | fredisu | blind_test | brams_phone | brams_arena | brams_island` (= `ratingKey` de `islands.js`).
- **Prime ฿ dérivée de l'ELO côté serveur** : `bounty = max(0, (elo - 800)) * 1000`. Jamais écrite par le client.

## RPC (via `supabase.rpc(name, params)`)

### `nm_report_match(p_game, p_opponent, p_result, p_mode)` — `authenticated`
Calcule l'ELO (Elo standard, **K=32**) des 2 joueurs, met à jour `game_ratings` + bounty, insère l'historique. À appeler par UN seul des deux joueurs en fin de partie classée.
- `p_game text`, `p_opponent uuid|null` (null = solo/score-based), `p_result text` ∈ `a_win|b_win|draw` **du point de vue de l'appelant** (`a_win` = l'appelant gagne), `p_mode text` = `classe|ami|solo` (défaut `classe`).
- Anti-triche : refuse si non authentifié, jeu inconnu, ou `p_opponent = self` en mode `classe`.
- Retour : `{ ok:true, game, elo, elo_delta, bounty, bounty_delta }` (valeurs de l'appelant) ou `{ ok:false, error }`.

### `nm_leaderboard(p_game, p_period)` — `anon` + `authenticated`
Top 50 par ELO (puis bounty) d'un jeu.
- `p_game text`, `p_period text` ∈ `all|week|month` (défaut `all` ; `week`/`month` = filtre d'activité sur l'historique).
- Retour : `{ ok:true, game, period, rows:[{ rang, user_id, elo, bounty, wins, losses, draws, games, username, avatar }] }`.

### `nm_player_log(p_user)` — `anon` + `authenticated` — « Mon Log Pose »
- `p_user uuid`.
- Retour : `{ ok:true, user_id, display:{discord_id,username,avatar}, total_bounty, per_game:[{game,elo,bounty,wins,losses,draws,games}], recent:[{id,game,mode,created_at,is_player_a,opponent,won,elo_delta,bounty_delta}] }` (20 derniers matchs).

### `nm_global_bounty(p_user)` — `anon` + `authenticated`
Prime globale agrégée (somme bounty tous jeux).
- `p_user uuid`.
- Retour : `{ ok:true, user_id, bounty, display:{discord_id,username,avatar} }`.

## Notes d'intégration
- `won` dans `recent` vaut `null` pour une nulle, sinon `true/false` selon le point de vue du joueur.
- Lecture directe possible : `select * from game_ratings where game = '...'` (RLS SELECT public), mais préférer `nm_leaderboard` pour le rang + enrichissement pseudo.
- En solo (`p_opponent = null`) l'ELO bouge contre un adversaire « moyen » (gain/perte ±K/2), sans transfert.
