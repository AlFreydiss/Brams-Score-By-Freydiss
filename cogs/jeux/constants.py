from discord import app_commands

JOIN_TIMEOUT = 60    # secondes de lobby avant lancement automatique
HOUSE_CUT    = 0.05  # 5% prélevés par la maison sur chaque cagnotte
MISE_MIN     = 1_000
MISE_MAX     = 10_000_000

MIN_PLAYERS = {"jackpot": 2, "tournoi": 2, "course": 2, "devinette": 2}
MAX_PLAYERS = {"jackpot": 12, "tournoi": 8, "course": 12, "devinette": 12}

GAME_NAMES = {
    "jackpot":   "🎰 Jackpot Collectif",
    "tournoi":   "⚔️ Tournoi Éclair",
    "course":    "🏁 Course de Pirates",
    "devinette": "🎯 Devinette Secrète",
}
GAME_DESCS = {
    "jackpot":   "Mise commune · gagnant tiré au sort · prend tout",
    "tournoi":   "Brackets 1v1 aux dés · le meilleur gagne le pot",
    "course":    "Parie sur un pirate · les gagnants se partagent la cagnotte",
    "devinette": "Le bot cache un nombre 1–100 · le plus proche remporte tout",
}

GAME_CHOICES = [
    app_commands.Choice(name="🎰 Jackpot Collectif",  value="jackpot"),
    app_commands.Choice(name="⚔️ Tournoi Éclair",      value="tournoi"),
    app_commands.Choice(name="🏁 Course de Pirates",   value="course"),
    app_commands.Choice(name="🎯 Devinette Secrète",   value="devinette"),
]

PIRATES = [
    ("🏴‍☠️", "Luffy"),
    ("⚔️",   "Zoro"),
    ("🍖",   "Sanji"),
    ("🍊",   "Nami"),
]

COLOR_LOBBY  = 0xFFD700
COLOR_WIN    = 0x2ECC71
COLOR_LOSS   = 0xFF4444
COLOR_WAIT   = 0xFFAA00
