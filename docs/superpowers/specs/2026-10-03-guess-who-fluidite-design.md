# Guess Who — fluidité (sous-projet 1/4)

Date : 2026-10-03 · Statut : validé en conversation, en attente de relecture du spec

## Contexte et objectif

Programme « améliorer Guess Who » découpé en 4 sous-projets livrés l'un après
l'autre : **1. fluidité / bugs** (ce document), 2. mobile, 3. fun / gameplay,
4. visuel / animations.

Objectif : enchaîner les parties entre potes sans jamais recréer un salon ni
recharger la page.

- **Dit par Feydi** : « Rejouer » ne marche pas ; joueurs qui décrochent,
  micro/enregistrement peu fiable et attentes trop longues gâchent l'ambiance.
  Appareils : iPhone (Safari), PC (navigateur), navigateur intégré de Discord.
- **Hypothèse** : parties sur téléphone, en vocal Discord, 3 à 8 joueurs.
- **Critère de réussite** : 3 parties d'affilée dans le même salon sans
  blocage, toutes les imitations enregistrées et lues.

## Constat (lecture du code, 2026-10-03)

1. `guesswho_start` ne compte que les joueurs vus dans les 22 dernières
   secondes et supprime les autres (hors hôte). Un iPhone verrouillé ou un
   onglet en arrière-plan ne signale plus sa présence : depuis l'écran de fin,
   « Rejouer » éjecte des joueurs qui regardaient le podium, ou échoue avec
   `not_enough_players`. Avant le correctif `baec17fa`, l'erreur était avalée.
2. `inAppBrowser()` détecte déjà Discord/Instagram…, mais l'alerte n'apparaît
   qu'à la phase d'enregistrement, en pleine manche.
3. L'avance anticipée existe (`_gw_all_done`) mais seul l'hôte peut la
   déclencher ; s'il est en veille, on attend l'échéance + 5 s.
4. Aucune erreur client n'est remontée : impossible de savoir ce qui échoue
   réellement (micro, envoi, réseau) sur les appareils des joueurs.

Approche retenue : **A — corrections ciblées + journal d'erreurs** (écartées :
journal seul d'abord, trop lent ; réécriture de la synchro, inutile et risquée).

## Section 1 — Revanche

### Comportement

- Écran de fin : chaque joueur assis voit « Prêt pour la revanche » (bascule),
  plus un compteur « N/M prêts » et l'état prêt de chacun dans la liste.
- L'hôte garde son bouton « Revanche » ; il est toujours cliquable (la règle
  de 3 joueurs reste côté serveur) et affiche la raison d'un refus
  (`startErrorText`, déjà en place).
- Les non-hôtes voient « En attente de l'hôte… » sous leur bouton prêt.

### Serveur (migration `20261003_guess_who_revanche.sql`)

- Passage `gage → end` (dans `_gw_step`) : `ready = false` pour tous les
  joueurs du salon, pour que les « prêts » du salon d'attente ne comptent pas.
- `guesswho_start` quand `phase = 'end'` :
  - présent = `ready = true` **ou** `last_seen > now() - 90 s` ;
  - supprimés = non-hôtes avec `last_seen <= now() - 90 s` **et** `ready = false` ;
  - le reste de la fonction est inchangé (bornes de réglages, 3 à 8 joueurs,
    remise à zéro des sièges, vies, votes, `ready`).
- `guesswho_start` quand `phase = 'lobby'` : inchangé (fenêtre 22 s).
- `guesswho_set_ready` : déjà autorisé en `lobby` et `end`, pas de changement.

### Client

- `EndScreen.jsx` : bouton prêt via `g.act.ready` (même mécanisme que le
  salon, repli silencieux si `unsupported`), compteur, état par joueur.

## Section 2 — Navigateur intégré et avance sans l'hôte

### Alerte navigateur intégré

- `Lobby.jsx` : bandeau en haut du salon si `inAppBrowser(navigator.userAgent)`.
  Texte : « Le micro ne marche pas dans le navigateur de Discord. Ouvre le
  salon dans ton navigateur. » + consigne selon l'appareil + bouton
  « Copier le lien » (réutilise `copyText`).
- Consigne : nouvelle fonction pure `openInBrowserHint(ua)` dans
  `logic/recordFlow.js` → iPhone/iPad : « Touche ⋯ puis Ouvrir dans Safari » ;
  Android : « Touche ⋮ puis Ouvrir dans Chrome » ; sinon : « Copie le lien et
  colle-le dans ton navigateur ».
- Bandeau masquable (état local, `sessionStorage` en try/catch). L'avertissement
  existant de `RecordPhase.jsx` reste.

### Avance anticipée par n'importe quel joueur

- `guesswho_advance` : la condition devient
  `(v_due and v_pl.is_host) or _gw_all_done(r.id) or v_late`.
  N'importe quel joueur assis peut donc avancer une phase où tout le monde a
  fini ; l'avance à l'échéance reste réservée à l'hôte (puis à tous à +5 s,
  comme aujourd'hui). L'idempotence (`stale`) protège des doubles appels.
- Client : `useGuessWhoRoom` appelle déjà `advance` ; vérifier que les
  non-hôtes le tentent quand `prog` indique que tout le monde a fini (sinon
  l'ajouter dans la boucle d'avance existante).

## Section 3 — Journal d'erreurs

### Table et fonction (même migration)

```sql
create table if not exists guesswho_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  room_code text, user_id text,
  kind text not null, detail text, device text
);
alter table guesswho_events enable row level security; -- aucune policy : illisible pour anon/authenticated
```

- `guesswho_log(p_code text, p_user text, p_kind text, p_detail text, p_device text)`,
  `security definer`, accordée à anon/authenticated :
  - `p_kind` ∈ `mic_error`, `upload_failed`, `start_refused`, `offline`,
    `record_timeout`, sinon `{error: 'kind'}` ;
  - `detail` tronqué à 500 caractères, `device` à 80, `room_code` à 8,
    `user_id` à 64 ;
  - au plus 20 événements par `room_code` sur la dernière minute, sinon
    `{error: 'rate'}` sans insertion ;
  - purge à chaque appel des lignes de plus de 30 jours (`delete … where at <
    now() - 30 days`, borné par un index sur `at`).
- Requête de lecture fournie dans `docs/sql/guess-who-events.sql` (erreurs par
  type et appareil sur 7 jours, derniers événements d'un salon).

### Client

- `src/lib/guessWhoLog.js` : `logEvent(code, kind, detail)` fire-and-forget
  (pas d'`await` côté appelant, `catch` silencieux, `rpc` court) ; `device`
  calculé par la fonction pure `deviceSummary(ua)` dans
  `logic/device.js` (ex. `iPhone · Safari 17`, `PC · Chrome 129`,
  `iPhone · Discord`).
- Points d'appel :
  - erreur micro (`RecordPhase`, `MicSetup`) : code d'erreur (`mic_busy`,
    `no_mic`, `denied`, `no_support`…) ;
  - envoi d'imitation en échec après les nouvelles tentatives : message ;
  - refus de `guesswho_start` (salon et revanche) : code d'erreur ;
  - coupure : passage `offline = true` puis retour, avec la durée (> 8 s) ;
  - enregistrement non envoyé à l'échéance (`deadlineAction`).
- Jamais : audio, IP, pseudo. `user_id` = l'identifiant déjà présent dans le salon.

## Tests

- PGlite (`src/features/guesswho/sql/revanche.test.js`) :
  - revanche : joueur en veille 60 s gardé ; joueur prêt en veille 3 min gardé ;
    absent > 90 s non prêt supprimé ; `ready` remis à zéro en arrivant à `end` ;
    salon d'attente toujours à 22 s ;
  - avance : non-hôte avance quand tout le monde a fini ; non-hôte refusé
    `too_early` sinon ; double appel → une seule transition ;
  - journal : type inconnu refusé, débit limité à 20/min/salon, détail tronqué,
    `select` sur `guesswho_events` refusé à anon ;
  - migration recollée deux fois sans erreur ; ajout du fichier à
    `MIGRATIONS` dans `testDb.js`.
- Node : `openInBrowserHint` et `deviceSummary` (iPhone Safari, iPhone
  Discord, Android Chrome, PC Chrome/Firefox/Edge).
- Vérification manuelle : `npm run build`, partie locale à 3 onglets (dont un
  masqué > 30 s sur l'écran de fin) → revanche sans éjection.

## Déploiement

1. Coller `supabase/migrations/20261003_guess_who_revanche.sql` dans l'éditeur
   SQL Supabase (copiée dans le presse-papier au moment de la livraison).
2. Pousser le code. Le client tolère l'absence de la migration : bouton prêt
   masqué si `unsupported`, journal silencieux si la fonction manque.

## Hors périmètre

Sous-projets 2 à 4 (mobile, gameplay, visuel) ; changement du transport
realtime ; page staff de lecture du journal (YAGNI, requête SQL suffisante).
