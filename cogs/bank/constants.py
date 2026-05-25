import os

GUILD_IDS           = [int(x) for x in os.environ.get("GUILD_IDS", "924346730194014220,1478937064031518892").split(",")]
ANNOUNCE_CHANNEL_ID = int(os.environ.get("ANNOUNCE_CHANNEL_ID", "0"))

RANKS = [
    {"name": "Mousse",          "threshold": 0,              "emoji": "⚓",  "color": 0x95a5a6},
    {"name": "Matelot",         "threshold": 50_000,         "emoji": "🌊",  "color": 0x3498db},
    {"name": "Pirate Rookie",   "threshold": 250_000,        "emoji": "☠️",  "color": 0x2ecc71},
    {"name": "Super Rookie",    "threshold": 1_000_000,      "emoji": "🗡️",  "color": 0xe67e22},
    {"name": "Capitaine",       "threshold": 5_000_000,      "emoji": "🏴‍☠️", "color": 0xe74c3c},
    {"name": "Supernova",       "threshold": 25_000_000,     "emoji": "⚡",  "color": 0x9b59b6},
    {"name": "Commandant",      "threshold": 100_000_000,    "emoji": "👑",  "color": 0xf1c40f},
    {"name": "Empereur",        "threshold": 500_000_000,    "emoji": "🔱",  "color": 0xff6b35},
    {"name": "Roi des Pirates", "threshold": 1_000_000_000,  "emoji": "🌟",  "color": 0xFFD700},
]

INVEST_RATE      = 0.02
INVEST_INTERVAL  = 12   # heures
INVEST_CAP       = 10_000_000

PILLAGE_SUCCESS  = 0.40
PILLAGE_MIN      = 0.05
PILLAGE_MAX      = 0.15
PILLAGE_PENALTY  = 0.10
PILLAGE_COOLDOWN = 2    # heures

SHOP_ITEMS = [
    {"id": "shield",         "name": "Bouclier de Bartholomew", "emoji": "🛡️", "price": 500_000, "desc": "Immunité au pillage 24h",           "duration_h": 24},
    {"id": "boost_x2",       "name": "Boost ×2 Mini-Jeux",      "emoji": "⚡", "price": 200_000, "desc": "Double les gains aux jeux pendant 1h","duration_h": 1},
    {"id": "lottery_ticket", "name": "Ticket Loterie",           "emoji": "🎟️","price": 50_000,  "desc": "Une chance de remporter le jackpot",  "duration_h": 0},
    {"id": "rank_color",     "name": "Changeur de Couleur",      "emoji": "🎨", "price": 100_000, "desc": "Personnalise la couleur de ton rang",  "duration_h": 0},
]

DAILY_RATIO = 0.30
DAILY_MIN   = 100_000
DAILY_MAX   = 10_000_000

GOLD   = 0xFFD700
RED    = 0xe74c3c
GREEN  = 0x2ecc71
BLUE   = 0x3498db
FOOTER = "Brams Community • Freydiss Bank"
SEP    = "━━━━━━━━━━━━━━━━━━━━━━"

SLOTS_EMOJIS  = ["🍖", "🗡️", "💀", "⚓", "👑", "🔥", "🌊"]
SLOTS_WEIGHTS = [30,   20,   15,   12,    8,    5,    3  ]
SLOTS_MULT    = {"🍖": 2, "🗡️": 3, "💀": 4, "⚓": 5, "👑": 8, "🔥": 10, "🌊": 20}

ROUGE   = frozenset({1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36})
NOIR    = frozenset({2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35})
PIRATES = [("🏴‍☠️","Luffy"),("⚔️","Zoro"),("🍊","Nami"),("🍖","Sanji")]

CARD_VALS  = {"A":11,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":10,"Q":10,"K":10}
CARD_SUITS = ["♠️","♥️","♦️","♣️"]
CARD_RANKS = list(CARD_VALS.keys())
