# Brams Phone — Phase 1 : socle sécurisé + jouable bout-en-bout

> Design doc. Statut : **à valider**. Une fois approuvé → plan d'implémentation (writing-plans).
> Phase 1 de 4 (cf. [[project-brams-phone]]). Phases 2-4 (canvas pro, reveal cinématique, polish) = hors scope ici.

## Objectif

Rendre la partie **réellement sécurisée** (anti-triche serveur) et **robuste bout-en-bout** (lobby → write → draw → describe → reveal) à 4+ joueurs, en construisant sur le scaffold v1 existant (1710 l., 16 tests verts). Pas encore le polish visuel max (phases ultérieures) — mais le flow complet tourne, sans triche possible.

## Contrainte fondatrice

Sign-in anonyme Supabase **désactivé** (`anonymous_provider_disabled`, confirmé 2026-06-14) → pas de RLS par `auth.uid()`. Décision validée : **anti-triche par token secret + RPC SECURITY DEFINER** (pas d'activation anon, pas d'open RLS). Identité = `user_id` texte (Brams/Discord si connecté, sinon `guestId()` localStorage).

## État actuel (ce sur quoi on construit)

- **Tables** `gartic_rooms / gartic_players / gartic_pages`, **RLS ouverte** (`using(true)`) — les pages des autres sont lisibles via l'inspecteur = triche triviale. C'est CE point qu'on ferme.
- **RPC** : `gartic_now / gartic_start / gartic_advance / gartic_my_book` (cette dernière "advisoire", non sécurisante).
- **`src/lib/garticRooms.js`** : REST-direct anti-hang (`rest()`/`rpc()`) + `subscribeRoom` (postgres_changes rooms/players/pages). Fonctions : `createRoom, joinRoom, fetchRoom, fetchPlayers, submitPage, fillMissingPage, fetchPrevPage, fetchAllPages, setReady, touchPlayer, setConnected, promoteSelfHost, startGame, advance, myBook, serverNow`.
- **`useGarticRoom.js`** : join, abonnement, horloge serveur calibrée, heartbeat 10s, boucle hôte (avance au timeout/tous soumis en lisant TOUTES les pages — **casse en RLS deny**), migration hôte (siège connecté le plus bas, >22s), spectateur (join tardif), watchdog focus.
- **`logic/rotation.js`** (pur, testé) : `bookForSeat(seat,r,n)=((seat-r)%n+n)%n`, `seatForBook`, `pageType`, `seatTask`, `buildAlbums`. **Inchangé.**

## A. Architecture anti-triche (cœur de la Phase 1)

### Schéma
- `gartic_players` : **+ `secret_token uuid not null default gen_random_uuid()`**. Émis au join, renvoyé **uniquement** au joueur concerné. Jamais exposé en lecture publique.

### RLS (durcissement)
| Table | SELECT direct | INSERT/UPDATE direct | Accès |
|---|---|---|---|
| `gartic_rooms` | **autorisé** (anon) — aucun secret, nécessaire au postgres_changes des transitions | **deny** | écriture via RPC host only |
| `gartic_players` | **deny** (sinon `secret_token` fuite) | **deny** | tout via RPC ; liveness via canal Realtime |
| `gartic_pages` | **deny** | **deny** | tout via RPC SECURITY DEFINER |

### RPC (toutes SECURITY DEFINER, `search_path=public`)
Token = preuve d'identité ; chaque RPC résout `player→seat→round` côté serveur.

- `gartic_join(p_code, p_user, p_name, p_avatar) → jsonb` : upsert joueur (idempotent : si le joueur existe déjà, **renvoie son token existant** → support reconnexion). Retour `{ player_id, seat, secret_token, room }`. Refuse si room `status≠lobby` → `{ spectator:true }`.
- `gartic_room_state(p_code) → jsonb` : `{ room, players:[{user_id,display_name,avatar_url,seat,is_host,is_ready,connected,last_seen}] }` — **sans `secret_token`, sans contenu de page**. Public-safe. Sert lobby + roster en jeu.
- `gartic_prev_page(p_code, p_token) → jsonb` : valide token → renvoie **la seule** page précédente du carnet courant du joueur `{type, content}` (ou null au round 0). Remplace `fetchPrevPage`.
- `gartic_submit(p_code, p_token, p_content) → jsonb` : valide token → calcule `(book, page_index, type)` du siège au round courant (rotation côté serveur) → upsert page (merge). **Impossible d'écrire ailleurs.** Remplace `submitPage`.
- `gartic_submitted_seats(p_code) → int[]` : sièges ayant soumis au **round courant** (dérivé de `page_index=current_round` via `book→seat`). **Compteur sans contenu.** Pour décision d'avance hôte + "X/Y soumis" live. Remplace le `fetchAllPages` de la boucle hôte.
- `gartic_start(p_code, p_token, p_settings) → jsonb` : **valide token=host** → assigne sièges + ouvre `writing` (logique `gartic_start` actuelle).
- `gartic_advance(p_code, p_token) → jsonb` : **valide token=host** → **comble côté serveur les pages manquantes du round** (page vide, AFK-safe) PUIS transition (logique `gartic_advance` actuelle). La gestion AFK passe ainsi serveur (le client ne peut plus lire les pages pour savoir qui manque).
- `gartic_promote_host(p_code, p_token) → jsonb` : migration — autorise le **plus petit siège connecté** à devenir host si l'host courant est périmé (>22s sans `last_seen`). Validé serveur (anti-usurpation).
- `gartic_set_ready(p_code, p_token, p_ready)` / `gartic_touch(p_code, p_token)` : ready + heartbeat (connected/last_seen) du joueur du token.
- `gartic_all_pages(p_code) → jsonb` : **uniquement si `status ∈ (reveal, finished)`** → toutes les pages `{book_id,page_index,type,content, author:{name,avatar}}`. Sinon `{error:'not_reveal'}`. Ouvre tout au reveal. Remplace `fetchAllPages`.

> Toutes `grant execute ... to anon, authenticated`. Garde token générique : `not found / bad token → {error:'unauthorized'}`.

## B. Realtime — hybride (sur l'existant + ce que le brief demande)

- **DB = source de vérité** ; `postgres_changes` sur **`gartic_rooms`** (autorisé) = driver des transitions (status/round/phase_ends_at). On retire l'abo `players`/`pages` (RLS deny → pas d'events) — remplacés par :
- **Canal `room:{code}`** :
  - **Presence** → arrivées/départs/ready **instantanés** au lobby (sans polling). Roster = merge presence + `gartic_room_state` (rafraîchi sur event room/presence).
  - **Broadcast** : `player_submitted` (compteur live, complète `gartic_submitted_seats`), `phase_change` (nudge refresh immédiat), `host_migrated`. (`reaction`/`reveal_step` = Phase 3.)
- **Horloge serveur** inchangée (`phase_ends_at` + `gartic_now`, offset anti-skew déjà calibré).

## C. Refactor client (carte des changements)

`src/lib/garticRooms.js` :
| Avant | Après |
|---|---|
| `joinRoom` (POST players) | `gartic_join` RPC ; stocke `secret_token` en mémoire + `sessionStorage['bp_token_'+code]` (reconnexion) |
| `fetchRoom`+`fetchPlayers` | `gartic_room_state` RPC |
| `submitPage` | `gartic_submit(code, token, content)` |
| `fetchPrevPage` | `gartic_prev_page(code, token)` |
| boucle hôte `fetchAllPages` | `gartic_submitted_seats(code)` |
| `fillMissingPage` (client) | **supprimé** → fait par `gartic_advance` serveur |
| `fetchAllPages` (reveal) | `gartic_all_pages(code)` |
| `setReady/touchPlayer/setConnected` | `gartic_set_ready / gartic_touch` (token) |
| `startGame/advance/promoteSelfHost` | + `p_token` |
| `subscribeRoom` | rooms-only postgres_changes + **nouveau** `joinChannel(code)` (presence + broadcast) |

`useGarticRoom.js` : stocke le token (join/sessionStorage) ; boucle hôte via `gartic_submitted_seats` (l'avance gère le fill serveur) ; presence → `players` dérivés ; émet/écoute broadcast (`player_submitted`, `phase_change`, `host_migrated`) ; reconnexion = re-join (token réutilisé) + resync `gartic_room_state`.

## D. Edge cases
- **Migration host** : `gartic_promote_host` (validation serveur du candidat) + broadcast `host_migrated`. Garde le déclencheur "plus petit siège connecté, >22s".
- **AFK** : `gartic_advance` comble les pages manquantes (vides) serveur → chaîne jamais cassée.
- **Reconnexion** : token en sessionStorage → re-join idempotent + resync complet (`gartic_room_state`) au focus.
- **Join tardif** : `gartic_join` renvoie `spectator:true` si `status≠lobby`.

## E. Tests & acceptation
- **Unitaires (gardés/étendus)** : `rotation.test.js` (N=2..12, personne ne dessine sa propre phrase), `hostLoop.test.js`.
- **Anti-triche (nouveau)** : script `scripts/verify_gartic_rls.mjs` (fetch REST, façon des checks déjà faits sur l'API) vérifiant serveur : (1) SELECT direct `gartic_pages` → **deny** ; (2) `gartic_prev_page` ne renvoie que le carnet du siège ; (3) `gartic_all_pages` → `not_reveal` hors reveal ; (4) `gartic_submit` avec mauvais token → `unauthorized` ; (5) `secret_token` absent de `gartic_room_state`.
- **Acceptation** : `webapp-testing` multi-contexte, partie **4 joueurs** lobby→reveal, zéro bug bloquant ; rotation correcte ; lecture anticipée réellement refusée (vérif serveur).

## Hors scope (phases suivantes)
Moteur canvas pro (P2) ; reveal cinématique + réactions live + carte de partage (P3) ; sons/haptique/transitions/états loading-vide-erreur/a11y (P4) ; hook Discord/Buster (P2 bot).

## Risques / notes
- Migration RLS appliquée via repo bot (`railway run -- py -3 <psycopg2>`, DSN `SUPABASE_URL`). Idempotente, re-jouable. Cf. [[project-site-analytics]] pour le mécanisme DDL.
- `postgres_changes` ne livre pas d'events sur tables RLS-deny → d'où le canal presence/broadcast pour players. Vérifier que les transitions room arrivent toujours (rooms reste SELECT-able).
- Le client supabase-js peut hang sur l'auth → garder REST-direct (`sbRpc`) pour toutes les RPC ; le canal Realtime (presence/broadcast) utilise le client supabase mais sans dépendre de getSession (cf. [[project-supabase-client-hang]]).
