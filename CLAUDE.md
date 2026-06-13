# CLAUDE.md — Config de travail (Feydi)

## Règle d'or
1. **Choisis le bon skill AVANT de bosser.** Si un skill couvre la tâche, tu le lances — tu ne pars jamais "à la main" alors qu'un skill existe.
2. **Enchaîne les skills** dans l'ordre logique (direction → exécution → vérif), pas un seul isolé.
3. **Jamais "c'est fini" sans avoir lancé l'app et vérifié** (`verify/run` + `verification-before-completion`).
4. **Réponds en français, cash et direct.** Pas de blabla, pas de sur-formatage dans le chat. Du concret, vite.

---

## Mes projets (contexte permanent)
- **Brams Community** (`brams.community`) — plateforme communauté One Piece/anime. Stack : **Vite + React, inline styles UNIQUEMENT**, Supabase, déploiement Vercel. Identité : warm-ink + or champagne, plaques gravées, Fraunces + Hanken Grotesk.
- **Buster** — bot Discord de Brams. Stack : **Python, discord.py, Supabase, Railway**. Éco "berrys" (casino, banque, leaderboard), système d'équipages, onboarding.
- **MELD** — marque DTC skincare (patchs anti-acné). Landing en itération, direction **Glossier/Rhode** (soft, blush, pill buttons). Fulfillment CJ + AutoDS.

## Comment je bosse (à respecter tout le temps)
- Français casual, shorthand. Output rapide > explications longues.
- **Brams = inline styles only.** Jamais de CSS externe / Tailwind sur les vieux composants. (Tailwind = additif, preflight off, seulement pour le nouveau stack shadcn.)
- **Anti-tells IA** (surtout MELD) : pas de grotesque sans-serif générique, pas de bordures hairline/outline, pas de "big number + petit label + accent gradient" par défaut. Chaque choix doit être justifié par le sujet.
- Bot : factoriser les helpers visuels réutilisables dans `utils/embed_helpers.py` (`get_spacer_file()`, `build_banner()`, etc.).

---

## Quel skill pour quoi (routage)

### Front / UI — Brams & MELD
- **Nouveau composant Brams** : `design-taste-frontend` (direction) → `frontend-design` (exécution, inline styles + identité Brams) → `web-design-guidelines` (a11y + mobile) → `verify/run`.
- **Composant React complexe** (shadcn, charts, états) : `artifacts-builder` + `ui-ux-pro-max` (pour les charts / les 67 styles).
- **Palette / thème** : `theme-factory`. **Cohérence d'une marque** : `brand-guidelines`.
- **Visuels .png/.pdf** (wanted posters, bannières, packshots) : `canvas-design` ; retoucher une image (ex. packshot Grok) : `image-enhancer`.
- **MELD landing** : `brand-guidelines` (garde l'identité MELD) + `frontend-design` (direction Glossier/Rhode) + `content-research-writer` (copy). Zéro tell IA.

### Backend / Bot — Buster
- **Nouvelle feature bot/API** : `senior-backend` → `test-driven-development` ou `generate-tests` → factoriser dans `embed_helpers.py` → `code-review` → `security-review` (si paiement/données perso) → `verify/run`.
- **Serveur MCP** : `mcp-builder`.
- **Code trop lourd** : `simplify`. **Comprendre un codebase** : `graphify`. **Nouveau repo** : `init (CLAUDE.md)`.

### Déploiement / Infra — Vercel
- Push : `vercel:deploy`. Variables d'env : `vercel:env`. Setup projet : `vercel:bootstrap` / `vercel:nextjs`.
- Storage (assets, R2/Supabase) : `vercel:vercel-storage`. IA (Gemini, Brams Score) : `vercel:ai-sdk`. shadcn : `vercel:shadcn`. Protection/rate-limit : `vercel:firewall`. Edge functions : `vercel:vercel-functions`.

### Debug / Qualité
- **Bug** : `systematic-debugging` (on reproduit + on isole, JAMAIS de patch au pif).
- **Avant de dire "fini"** : `verify/run` (lance l'app, vérifie que ça marche) + `check-file` + `verification-before-completion`.

### Contenu / Growth
- Recherche : `deep-research`. Rédaction sourcée : `content-research-writer`. Growth X/Twitter : `twitter-algorithm-optimizer`. Ads concurrents : `competitive-ads-extractor`. Changelog : `changelog-generator`.

### Médias / Fichiers / Communauté
- Giveaway communauté : `raffle-winner-picker`. Nom de domaine (MELD/projets) : `domain-name-brainstormer`. GIF Discord/Slack : `slack-gif-creator`. Ranger des fichiers : `file-organizer`. Factures : `invoice-organizer`. DL YouTube : `youtube-downloader`.

### Connexions / Paiement
- Brancher Gmail / Slack / GitHub / Notion : `connect-apps`. **Paiement** (berry shop Brams, checkout MELD) : `stripe-projects`.

### Méta
- Créer / améliorer un skill : `skill-creator`.

---

## Process obligatoire (superpowers — on ne saute pas d'étape)
- **Avant une grosse feature** : `brainstorming` → `writing-plans` (plan écrit), puis `executing-plans`.
- **Pendant un bug** : `systematic-debugging`.
- **Avant un merge** : `code-review` (+ `security-review` si ça touche paiement, auth ou données users).
- **Avant de livrer** : `verification-before-completion` + lancer l'app. Si je n'ai pas vu que ça tourne, ce n'est pas fini.

## Commandes harness — quand
- `/loop` : tâche répétitive jusqu'à ce que ce soit clean. `/schedule` : agent cron (tâches récurrentes communauté/bot).
- `/code-review ultra` : avant de shipper un gros bloc (review multi-agents). `/compact` : quand le contexte devient lourd.
- `/update-config` : maj de ce fichier. `/fewer-permission-prompts` : sessions où je veux pas valider chaque étape.

## Garde-fous
- Ne prétends jamais qu'un truc marche sans l'avoir lancé/testé.
- Respecte l'identité visuelle de chaque projet (Brams ≠ MELD) et le "inline styles only" de Brams.
- Dans le chat : direct, français, pas de murs de texte ni de bullet à rallonge.
