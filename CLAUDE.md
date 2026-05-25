# CLAUDE.md — Règles permanentes du projet Brams-Score-By-Freydiss

## RÈGLE OBLIGATOIRE : Commit automatique après chaque modification

Après CHAQUE modification, ajout ou suppression de code dans un ou plusieurs fichiers,
Claude doit **automatiquement** exécuter les commandes suivantes sans attendre :

```bash
git add .
git commit -m "feat/fix/refactor: description courte et claire des changements"
git push
```

- Toujours montrer la sortie des commandes git (message de commit + résultat du push).
- Le message de commit doit être en français, clair et précis.
- Préfixes à utiliser : `feat:` (nouvelle fonctionnalité), `fix:` (correction de bug), `refactor:` (refactorisation), `chore:` (maintenance).
- Ne jamais grouper plusieurs sessions de travail dans un seul commit — un commit par série de changements liés.

---

## Contexte du projet

**Bot Discord One Piece** — Brams Score by Freydiss  
Langage : Python (discord.py + app_commands)  
Base de données : PostgreSQL via psycopg2 (Supabase)  
IA : Anthropic Claude (quiz animé)  
Hébergement : Railway (le keep-alive Flask sur port 5000 est conservé pour compatibilité, mais Railway gère le uptime nativement)

### Fichiers principaux
- `bot.py` — code principal du bot
- `background.jpeg` — fond par défaut des cartes de rang
- `*.gif` — fonds animés par rang (pirate_bg.gif, shichibukai_bg.gif, fujitoraaaa.gif, yonkou_bg.gif, roi_des_pirates_bg.gif)
- `PirataOne-Regular.ttf` / `Righteous-Regular.ttf` / `KOMIKAX_.ttf` — polices

---

## Système de Ranks

| Rang             | Seuil (heures vocales / 7j) | ID Rôle Discord       |
|------------------|-----------------------------|-----------------------|
| Pirate           | 10h                         | 1486554682263343284   |
| Shichibukai      | 25h                         | 1486554770306236596   |
| Amiral           | 40h                         | 1486554823573766164   |
| Yonkou           | 70h                         | 1486554858075984043   |
| Roi des pirates  | 150h                        | 1494656848622518412   |

- Les rangs sont **cumulatifs** (un membre peut avoir plusieurs rangs).
- Le canal d'annonce est `ANNOUNCE_CHANNEL_ID = 1494342996848672828`.

---

## Conventions de code

- Pas de commentaires évidents — uniquement les WHY non-évidents.
- Pas de `Image.open().verify()` sur les GIFs (invalide les frames après appel).
- Toujours utiliser `await interaction.response.defer()` avant toute opération longue.
- Les commandes slash sont sync sur `GUILD_IDS = [924346730194014220, 1478937064031518892]`.
