# MIGRATION — Refonte « Ton Univers » (MonUniversPage)

## Clés LocalStorage (INCHANGÉES — schéma préservé à l'identique)

| Clé | Schéma | Rôle |
|---|---|---|
| `<ns>_vp` | `{ [epKey]: { completed: bool } }` | Progression vidéo plate (toutes les pages anime) |
| `<ns>_video_progress` | `{ episodes: { [key]: { completed } } }` | Variante structurée (certaines pages) |
| `<ns>_progress` | `{ [chapKey]: 'read' }` | Chapitres lus (scans) |
| `manga_progress` | `{ [chapKey]: 'read' }` | Scans One Piece (clé générique de ScansPage) |

`<ns>` = namespace par anime (aot, fireforce, kaguya, onepiece, …) — liste dans `HUB_ANIMES`.

## Logique métier préservée (fonctions identiques)
- `loadAllProgress()`, `computeVideo()`, `computeChapter()` (totaux connus par anime), `markNext()` (+1 ÉP / +1 CH), `markMax()` (MAX VIDÉO / MAX CH)
- Power Level = `round(video.pct × 0.62 + chapter.pct × 0.38)`
- `done` = vidéo 100 % ET (chapitres 100 % OU pas de chapitres) ; `low` = les deux < 20 %
- Live-sync : `onLiveProgress(refresh)` + poll 15 s ; ouverture via `onOpenMap` (props App.jsx)

## Ce qui change (rendu uniquement)
- DA « Codex Persona 5 » : noir #0A0A0C / rouge #E60012, diagonales (skew), typo display uppercase
- Jauge « Légende » gamifiée à paliers de rangs (Moussaillon → Roi des Pirates) au lieu du % nu
- Cartes : cover dominante + power + anneau ; les 5 actions passent dans un overlay au hover/tap
- État 0 % : « Pas encore commencé » + CTA Commencer (plus de triple 0/12 (0 %))
- Filtres avec compteurs, recherche au raccourci `/`, +1 animé (tick pop), reduced-motion respecté
