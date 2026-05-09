BANK_RANKS: list[dict] = [
    {"nom": "Mousse",          "emoji": "🥖", "seuil": 0,              "couleur": 0x8B7355},
    {"nom": "Matelot",         "emoji": "⚓",  "seuil": 100_000,        "couleur": 0x4A90D9},
    {"nom": "Pirate",          "emoji": "🗡️",  "seuil": 1_000_000,      "couleur": 0xE84393},
    {"nom": "Capitaine",       "emoji": "💀",  "seuil": 10_000_000,     "couleur": 0xAA2222},
    {"nom": "Supernova",       "emoji": "👑",  "seuil": 100_000_000,    "couleur": 0xFFAA00},
    {"nom": "Shichibukai",     "emoji": "🌊",  "seuil": 500_000_000,    "couleur": 0x00CED1},
    {"nom": "Yonkou",          "emoji": "🔥",  "seuil": 1_000_000_000,  "couleur": 0xFF4500},
    {"nom": "Roi des Pirates", "emoji": "🐉",  "seuil": 5_000_000_000,  "couleur": 0xFFD700},
]

VAULT_INTEREST_BASE = 0.005       # 0.5%/jour
VAULT_LOCK_RATES    = {7: 0.01, 30: 0.02}  # taux bonus si verrouillé
VAULT_DAILY_CAP     = 50_000      # intérêts max/jour en berries

TRANSFER_FEE_RATE          = 0.02
TRANSFER_CONFIRM_THRESHOLD = 1_000_000
TRANSFER_DAILY_LIMIT       = 5_000_000

CASINO_DAILY_CAP_RATIO = 0.30
CASINO_HOUSE_EDGE      = 0.05

DAILY_MIN    = 50_000
DAILY_MAX    = 500_000
STREAK_BONUS = 0.10   # +10% multiplicateur par jour de streak
STREAK_MAX   = 3.0    # x3 maximum

ACHIEVEMENTS: dict[str, dict] = {
    "premier_million":   {"nom": "Premier Million",       "emoji": "🥇", "desc": "Avoir 1 000 000 ฿ en poche"},
    "rat_a_coffre":      {"nom": "Rat à Coffre",          "emoji": "🐀", "desc": "Déposer 10 000 000 ฿ au coffre"},
    "flambeur":          {"nom": "Flambeur",              "emoji": "🔥", "desc": "Perdre 1 000 000 ฿ au casino en une session"},
    "premier_transfert": {"nom": "Fileur de Berries",     "emoji": "💸", "desc": "Effectuer un premier transfert"},
    "collectionneur":    {"nom": "Collectionneur",        "emoji": "🎖️", "desc": "Débloquer 5 achievements"},
    "roi_casino":        {"nom": "Roi du Casino",         "emoji": "🎰", "desc": "Gagner 5 parties de casino d'affilée"},
    "jackpot":           {"nom": "Jackpot !",             "emoji": "💫", "desc": "Décrocher un jackpot aux slots"},
    "streaker":          {"nom": "Streaker",              "emoji": "🔗", "desc": "Maintenir un streak de 14 jours"},
}

# Slots machine
SLOTS_EMOJIS  = ["🍖", "🗡️", "💀", "⚓", "👑", "🔥", "🌊"]
SLOTS_WEIGHTS = [30,   20,   15,   12,   8,    5,    3   ]
SLOTS_MULT    = {"🍖": 2, "🗡️": 3, "💀": 4, "⚓": 5, "👑": 8, "🔥": 10, "🌊": 20}

# Couleurs embed selon contexte
COLOR_GAIN    = 0x2ECC71
COLOR_LOSS    = 0xE74C3C
COLOR_NEUTRAL = 0xFFD700
COLOR_INFO    = 0x3498DB
