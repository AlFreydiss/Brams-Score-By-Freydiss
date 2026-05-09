import discord
from discord import app_commands

POSITIONS = {
    'capitaine':   {'emoji': '👑',  'max': 1,    'permissions': ['manage_all']},
    'second':      {'emoji': '⚔️',  'max': 1,    'permissions': ['manage_members', 'manage_treasury']},
    'navigateur':  {'emoji': '🧭',  'max': 1,    'permissions': ['manage_alliances']},
    'sniper':      {'emoji': '🎯',  'max': 1,    'permissions': []},
    'cuisinier':   {'emoji': '🍳',  'max': 1,    'permissions': []},
    'medecin':     {'emoji': '⚕️',  'max': 1,    'permissions': []},
    'musicien':    {'emoji': '🎵',  'max': 1,    'permissions': []},
    'bretteur':    {'emoji': '🗡️',  'max': 1,    'permissions': []},
    'charpentier': {'emoji': '🔨',  'max': 1,    'permissions': []},
    'archeologue': {'emoji': '📚',  'max': 1,    'permissions': []},
    'timonier':    {'emoji': '⚓',  'max': 1,    'permissions': []},
    'mousse':      {'emoji': '👤',  'max': None, 'permissions': []},
}

CREW_LEVELS = {
    1:  {'xp_required': 0,       'max_members': 5,  'features': ['basic']},
    2:  {'xp_required': 1_000,   'max_members': 7,  'features': ['basic', 'custom_role_color']},
    3:  {'xp_required': 5_000,   'max_members': 10, 'features': ['basic', 'custom_role_color', 'alliances']},
    4:  {'xp_required': 15_000,  'max_members': 12, 'features': ['basic', 'custom_role_color', 'alliances', 'wars']},
    5:  {'xp_required': 40_000,  'max_members': 15, 'features': ['basic', 'custom_role_color', 'alliances', 'wars', 'shop_discount_5%']},
    6:  {'xp_required': 100_000, 'max_members': 20, 'features': ['basic', 'custom_role_color', 'alliances', 'wars', 'shop_discount_5%', 'custom_crew_emoji']},
    7:  {'xp_required': 250_000, 'max_members': 25, 'features': ['basic', 'custom_role_color', 'alliances', 'wars', 'shop_discount_5%', 'custom_crew_emoji', 'voice_xp_boost_10%']},
    8:  {'xp_required': 500_000, 'max_members': 30, 'features': ['basic', 'custom_role_color', 'alliances', 'wars', 'shop_discount_10%', 'custom_crew_emoji', 'voice_xp_boost_10%']},
    9:  {'xp_required': 1_000_000,'max_members': 40, 'features': ['basic', 'custom_role_color', 'alliances', 'wars', 'shop_discount_10%', 'custom_crew_emoji', 'voice_xp_boost_10%', 'custom_voice_channel']},
    10: {'xp_required': 2_500_000,'max_members': 50, 'features': ['basic', 'custom_role_color', 'alliances', 'wars', 'shop_discount_10%', 'custom_crew_emoji', 'voice_xp_boost_10%', 'custom_voice_channel', 'yonko_status']},
}

COST_CREATE          = 30_000_000
COST_RENAME          = 20_000
MIN_WAR_BET          = 10_000
RENAME_COOLDOWN_DAYS = 30
CREATE_COOLDOWN_DAYS = 7
FLAG_MAX_BYTES       = 5 * 1024 * 1024
MIN_TAG_LEN          = 3
MAX_TAG_LEN          = 5
MIN_NAME_LEN         = 3
MAX_NAME_LEN         = 30
MAX_DESC_LEN         = 200
MIN_WAR_HOURS        = 12
MAX_WAR_HOURS        = 48

XP_MESSAGE           = 1
XP_MESSAGE_CAP       = 50
XP_VOCAL_PER_MIN     = 5
XP_VOCAL_CAP         = 500
XP_DUEL_WIN          = 50
XP_DUEL_LOSS         = 10
XP_PER_100_BERRIES   = 1
XP_QUIZ_WIN          = 200
XP_WAR_WIN           = 5_000
XP_ALLIANCE          = 1_000
XP_SABOTAGE          = 30

CREW_COLOR      = 0xFFD700
DISSOLVE_REFUND = 0.5

WAR_COOLDOWN_DAYS      = 3      # jours avant de pouvoir re-déclarer aux mêmes
SABOTAGE_COST          = 50_000 # berries dépensés par le saboteur (wallet perso)
SABOTAGE_POINTS_STOLEN = 15     # points retirés au score ennemi
CONTRIBUTION_DUEL_WIN  = 500    # contribution ajoutée au membre gagnant un duel

# Bonus de victoire en duel selon le poste du membre (s'ajoute à 50% de base)
POSITION_WAR_BONUS: dict[str, float] = {
    'capitaine':   0.25,
    'second':      0.18,
    'bretteur':    0.18,
    'sniper':      0.12,
    'navigateur':  0.08,
    'timonier':    0.06,
    'cuisinier':   0.04,
    'medecin':     0.04,
    'charpentier': 0.02,
    'archeologue': 0.02,
    'musicien':    0.00,
    'mousse':      0.00,
}

POSITION_CHOICES = [
    app_commands.Choice(name="Second ⚔️",       value="second"),
    app_commands.Choice(name="Navigateur 🧭",   value="navigateur"),
    app_commands.Choice(name="Sniper 🎯",        value="sniper"),
    app_commands.Choice(name="Cuisinier 🍳",     value="cuisinier"),
    app_commands.Choice(name="Médecin ⚕️",       value="medecin"),
    app_commands.Choice(name="Musicien 🎵",      value="musicien"),
    app_commands.Choice(name="Bretteur 🗡️",     value="bretteur"),
    app_commands.Choice(name="Charpentier 🔨",   value="charpentier"),
    app_commands.Choice(name="Archéologue 📚",   value="archeologue"),
    app_commands.Choice(name="Timonier ⚓",      value="timonier"),
    app_commands.Choice(name="Mousse 👤",         value="mousse"),
]
