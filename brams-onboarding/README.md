# Brams Onboarding 🏴‍☠️

Page d'embarquement One Piece pour le serveur Discord **Brams Community**.
Stack : Vite + React, hébergé sur **Netlify**, stockage **Supabase**, intégré au bot **Buster** (Python).

## Aperçu du flow

1. Un membre fait `/onboarding` sur Discord → le bot lui DM un lien perso (token unique, valide 24h).
2. Le membre ouvre le lien → répond à 4 questions thème One Piece.
3. Les réponses sont sauvées dans Supabase via une fonction RPC sécurisée.
4. Le bot poll Supabase toutes les 10s, traite les nouvelles réponses, et attribue les rôles correspondants.

---

## 1️⃣ Setup Supabase

1. Dans Supabase, ouvre **SQL Editor → New query**.
2. Colle tout le contenu de `supabase/schema.sql` et clique **Run**.
3. Récupère :
   - **Project URL** (Project Settings → API)
   - **anon key** (publique, pour le site)
   - **service_role key** (secrète, pour le bot)

## 2️⃣ Setup du site (Netlify)

1. Pose tes images de mosaïque dans `public/mosaic/` (01.jpg → 12.jpg). Voir `public/mosaic/README.txt`.
2. Push ce dossier sur un repo GitHub (sans le dossier `bot/`).
3. Sur Netlify : **Add new site → Import from Git** → sélectionne ton repo.
4. Build settings : laisse les valeurs auto (Netlify lit `netlify.toml`).
5. **Site settings → Environment variables** → ajoute :
   - `VITE_SUPABASE_URL` = ton URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = la anon key
6. Relance un deploy. ✅

### Test en local

```bash
npm install
cp .env.example .env       # remplis avec tes vraies valeurs
npm run dev                # ouvre http://localhost:5173?token=xxx
```

En `npm run dev`, la validation Supabase est bypassée si pas de token, pour itérer rapidement sur le design.

## 3️⃣ Setup du bot (Buster)

1. Copie `bot/onboarding.py` dans ton dossier `cogs/` de Buster.
2. Charge le cog au démarrage du bot :
   ```python
   await bot.load_extension("cogs.onboarding")
   ```
3. Sur Railway, ajoute ces variables d'env :
   - `SUPABASE_URL` = même que le site
   - `SUPABASE_SERVICE_KEY` = service_role key (PAS l'anon)
   - `ONBOARDING_URL` = `https://ton-site.netlify.app`
4. Pour chaque serveur où tu veux activer l'onboarding, ajoute :
   ```
   ONBOARDING_ROLES_<GUILD_ID> = {"passions.anime":111,"passions.gaming":222,"foot.ligue1":333,...}
   ```
   La clé = `question_id.option_value` (voir `src/data/questions.js`).
   La valeur = l'ID du rôle Discord à attribuer.
5. Redémarre le bot, et fais `/onboarding` sur ton serveur pour tester.

## 4️⃣ Personnaliser

- **Questions** → `src/data/questions.js`. Garde les `value` stables si tu changes les libellés (sinon ton mapping de rôles devient obsolète).
- **Couleur d'accent** → variable `--accent` dans `src/index.css`.
- **Polices** → l'`<head>` de `index.html`.
- **Fond mosaïque** → tes images dans `public/mosaic/`.

## Structure

```
brams-onboarding/
├── public/
│   ├── favicon.svg
│   └── mosaic/               # ← tes images ici
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── data/questions.js     # ← édite tes questions ici
│   ├── lib/supabase.js
│   └── components/
│       ├── OnboardingFlow.jsx
│       ├── QuestionStep.jsx
│       ├── MosaicBackground.jsx
│       ├── ProgressBar.jsx
│       ├── DoneScreen.jsx
│       ├── StatusScreen.jsx
│       └── Icon.jsx
├── supabase/
│   └── schema.sql            # ← SQL à exécuter
├── bot/
│   └── onboarding.py         # ← cog à ajouter à Buster
├── index.html
├── netlify.toml
├── package.json
├── vite.config.js
└── .env.example
```

## Sécurité

- L'anon key est publique mais ne donne accès qu'aux 2 fonctions RPC `validate_token` et `submit_onboarding`.
- Aucun accès direct aux tables n'est possible côté client (RLS activé, zéro policy).
- Les tokens sont à usage unique et expirent en 24h.
