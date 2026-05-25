# Brams Score — Bot Discord One Piece

Bot Discord de suivi d'activité pour serveurs One Piece.
Suit le temps vocal et les messages, attribue des rangs automatiques, et génère des graphiques d'activité.

---

## Prérequis

- Python **3.10+**
- Un bot Discord avec les **Intents privilégiés** activés dans le [portail développeur](https://discord.com/developers/applications) :
  - **Server Members Intent**
  - **Message Content Intent**

---

## Installation

```bash
# Cloner le projet
git clone <url-du-repo>
cd Brams-Score-By-Freydiss

# Installer les dépendances
pip install -r requirements.txt

# Configurer le token
cp .env.example .env
# Remplir DISCORD_TOKEN dans .env
```

---

## Configuration `.env`

```env
DISCORD_TOKEN=ton_token_discord_ici
```

---

## Lancement

```bash
python main.py
```

Le bot démarre un serveur Flask keep-alive sur le port `8080` pour maintenir le processus actif (Replit, Railway, etc.).

---

## Rangs automatiques (basés sur les 7 derniers jours glissants)

| Rang         | Heures vocales requises |
|--------------|------------------------|
| Pirate       | 10h                    |
| Shichibukai  | 25h                    |
| Amiral       | 40h                    |
| Yonko        | 70h                    |

Le bot crée/annonce automatiquement les montées de rang dans le salon `#rappel-rank`.
Il envoie aussi un DM d'alerte si un membre risque de perdre son rang dans les 24h.

---

## Commandes slash

| Commande         | Description                                        | Admin |
|------------------|----------------------------------------------------|-------|
| `/stats`         | Tes stats vocales + messages + graphique (7/14j)   | Non   |
| `/top`           | Top 5 vocal et messages (aujourd'hui / 7j / 14j)   | Non   |
| `/serveur`       | Stats globales + heures de pointe du serveur       | Non   |
| `/tout`          | Vue complète : tes stats + classement + serveur    | Non   |
| `/addheures`     | Ajouter des heures vocales à un membre             | Oui   |
| `/forcerank`     | Recalculer le rang d'un membre manuellement        | Oui   |
| `/recalcberries` | Recalculer les berries vocales de tout le serveur  | Oui   |

---

## Structure du projet

```
├── main.py           # Point d'entrée
├── config.py         # Constantes et configuration
├── keep_alive.py     # Serveur Flask keep-alive
├── storage.py        # Lecture/écriture JSON thread-safe
├── utils.py          # Fonctions pures (temps, rangs, berries)
├── graphs.py         # Génération de graphiques matplotlib
├── ranks.py          # Logique de mise à jour des rangs et alertes
├── cogs/
│   ├── events.py     # Événements Discord + boucle horaire
│   └── commands.py   # Commandes slash
├── requirements.txt
└── .env.example
```

---

## Permissions Discord requises

- `Read Messages / View Channels`
- `Send Messages`
- `Embed Links`
- `Attach Files`
- `Manage Roles` (pour attribuer les rangs)
- `Connect` (pour voir les états vocaux)
