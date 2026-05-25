CATEGORIES = [
    {"id": "cosmetiques", "emoji": "🎨", "name": "Cosmétiques"},
    {"id": "fruits_demon", "emoji": "💎", "name": "Fruits du Démon"},
    {"id": "items_duel",   "emoji": "⚔️", "name": "Items duel"},
    {"id": "roles_temp",   "emoji": "🎫", "name": "Rôles temporaires"},
    {"id": "coffres",      "emoji": "🎁", "name": "Coffres mystères"},
    {"id": "services",     "emoji": "🤝", "name": "Services"},
    {"id": "autre",        "emoji": "📦", "name": "Autre"},
]
CATEGORY_BY_ID  = {c["id"]: c for c in CATEGORIES}
CATEGORY_CHOICES = [(c["emoji"] + " " + c["name"], c["id"]) for c in CATEGORIES]

PRICE_MIN             = 100
PRICE_MAX             = 1_000_000
MAX_ACTIVE_LISTINGS   = 5
MAX_LISTINGS_PER_DAY  = 3
LISTINGS_PER_PAGE     = 5
DELIVERY_TIMEOUT_H    = 48

BANNED_WORDS = [
    "pute", "suceur", "suceuse", "israel", "juif", "chienne", "soumise", "chien",
    "connard", "connasse", "enculer", "fdp", "ntm", "pd", "tapette",
    "nazi", "hitler", "nigger", "nègre", "pédophile",
]

COLOR_ACTIVE = 0xFFD700   # or One Piece
COLOR_SOLD   = 0xE74C3C
COLOR_RESERVED = 0xE67E22
COLOR_PROFILE  = 0x2ECC71
