from discord import app_commands

JOIN_TIMEOUT = 60
HOUSE_CUT    = 0.05
MISE_MIN     = 1_000
MISE_MAX     = 10_000_000

MIN_PLAYERS = {
    "jackpot":   2, "tournoi":   2,
    "course":    2, "devinette": 2,
    "alphabet":  2, "passeoupas": 2,
}
MAX_PLAYERS = {
    "jackpot":   12, "tournoi":   8,
    "course":    12, "devinette": 12,
    "alphabet":  8,  "passeoupas": 10,
}

GAME_NAMES = {
    "jackpot":    "🎰 Jackpot Collectif",
    "tournoi":    "⚔️ Tournoi Éclair",
    "course":     "🏁 Course de Pirates",
    "devinette":  "🎯 Devinette Secrète",
    "alphabet":   "🔤 Jeu de l'Alphabet",
    "passeoupas": "🃏 Passe ou Pas",
}
GAME_DESCS = {
    "jackpot":    "Mise commune · gagnant tiré au sort · prend tout",
    "tournoi":    "Brackets 1v1 aux dés · le meilleur gagne le pot",
    "course":     "Parie sur un pirate · les gagnants se partagent la cagnotte",
    "devinette":  "Le bot cache un nombre 1–100 · le plus proche remporte tout",
    "alphabet":   "Une catégorie, une lettre par tour · rate = éliminé · dernier debout gagne",
    "passeoupas": "Défi aléatoire · Passe (pénalité) ou tente ta chance (vote du groupe)",
}

GAME_CHOICES = [
    app_commands.Choice(name="🎰 Jackpot Collectif",   value="jackpot"),
    app_commands.Choice(name="⚔️ Tournoi Éclair",       value="tournoi"),
    app_commands.Choice(name="🏁 Course de Pirates",    value="course"),
    app_commands.Choice(name="🎯 Devinette Secrète",    value="devinette"),
    app_commands.Choice(name="🔤 Jeu de l'Alphabet",    value="alphabet"),
    app_commands.Choice(name="🃏 Passe ou Pas",          value="passeoupas"),
]

PIRATES = [
    ("🏴‍☠️", "Luffy"),
    ("⚔️",   "Zoro"),
    ("🍖",   "Sanji"),
    ("🍊",   "Nami"),
]

# ── Alphabet ──────────────────────────────────────────────────────────
ALPHABET_LETTERS = "ABCDEFGHIJLMNOPRSTUV"   # Q W X Y Z retirés (trop durs)
ANSWER_TIMEOUT   = 35   # secondes par tour

ALPHABET_CATEGORIES = [
    ("🐾", "Animaux"),
    ("🍕", "Nourriture ou Boissons"),
    ("🌍", "Pays ou Villes"),
    ("🎬", "Films ou Séries"),
    ("⚓", "Personnages One Piece"),
    ("👤", "Prénoms"),
    ("🏆", "Sports"),
    ("🎵", "Artistes ou Groupes musicaux"),
    ("🎮", "Jeux vidéo"),
    ("🌺", "Fruits ou Légumes"),
]

# ── Passe ou Pas ──────────────────────────────────────────────────────
PASSE_PENALTY  = 0.25   # fraction de la mise payée à chaque passe
PASSE_REWARD   = 0.50   # fraction de la mise gagnée si défi réussi
VOTE_TIMEOUT   = 25     # secondes pour voter

DEFIS: list[str] = [
    "Imite un personnage One Piece sans le nommer — les autres doivent deviner",
    "Chante le générique d'un anime pendant 10 secondes",
    "Dis une blague : si personne ne rit, tu perds le défi",
    "Imite l'accent marseillais pendant 20 secondes",
    "Fais 5 pompes en live vocal",
    "Cite les 9 membres de l'équipage de Luffy en moins de 20 secondes",
    "Imite le rire de Luffy (SHISHISHI) pendant 5 secondes sans t'arrêter",
    "Explique One Piece à quelqu'un qui ne connaît pas — en 25 secondes",
    "Nomme 5 fruits du démon One Piece en moins de 15 secondes",
    "Imite quelqu'un dans le salon vocal sans le nommer",
    "Fais le bruit d'une voiture de course sans t'arrêter pendant 8 secondes",
    "Dis ton pire souvenir scolaire en 20 secondes",
    "Récite l'alphabet à l'envers jusqu'à la lettre N",
    "Fais un discours de 15 secondes sur les chaussettes",
    "Nomme 5 Yonkou (passés ou présents) de One Piece",
    "Chante Happy Birthday à quelqu'un dans le salon",
    "Dis 3 choses positives sur la personne à ta droite (dans la liste du vocal)",
    "Imite un animal sans dire lequel — les autres doivent deviner",
    "Compte jusqu'à 20 le plus vite possible",
    "Dis ton plat préféré et explique pourquoi — en moins de 15 secondes",
    "Nomme 4 îles de One Piece en 10 secondes",
    "Fais une impression de quelqu'un de célèbre",
    "Dis 5 prénoms féminins commençant par M en 10 secondes",
    "Cite 3 techniques de combat One Piece avec leur vrai nom",
    "Imite le son d'une moto",
    "Dis 5 pays d'Asie en 10 secondes",
    "Chante une publicité que tout le monde connaît",
    "Nomme le vrai nom de 3 personnages One Piece (pas leur surnom)",
    "Fais semblant de pleurer de façon convaincante pendant 5 secondes",
    "Dis qui est selon toi le personnage le plus fort de One Piece — et défends ton choix en 20s",
]

COLOR_LOBBY = 0xFFD700
COLOR_WIN   = 0x2ECC71
COLOR_LOSS  = 0xFF4444
COLOR_WAIT  = 0xFFAA00
