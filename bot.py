from flask import Flask
from threading import Thread
import os
import asyncio
import psycopg2
from psycopg2.extras import execute_values as _pg_execute_values
from concurrent.futures import ThreadPoolExecutor

app = Flask('')

@app.route('/')
def home():
    return "Bot en ligne !"

def run():
    app.run(host='0.0.0.0', port=5000)

def keep_alive():
    t = Thread(target=run)
    t.start()

keep_alive()

import discord
from discord.ext import commands, tasks
from discord import app_commands
import litellm
import json
import io
import math
import random
import re
import time
import aiohttp
import logging
import traceback
import matplotlib
matplotlib.use("Agg")
logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import matplotlib.font_manager as fm
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from datetime import datetime, timedelta, timezone
from collections import defaultdict, deque
from urllib.parse import quote as _url_quote

# ─────────────────────────────────────────
#  BACKGROUND + POLICE
# ─────────────────────────────────────────
BG_IMAGE_PATH = "background.jpeg"
FONT_PATH = "PirataOne-Regular.ttf"
GRAPH_FONT_PATH = "Righteous-Regular.ttf"
RANK_BG_PATHS = {
    "Pirate":          "pirate_bg.gif",
    "Shichibukai":     "shichibukai_bg.gif",
    "Amiral":          "fujitoraaaa.gif",
    "Yonkou":          "yonkou_bg.gif",
    "Roi des pirates": "roi_des_pirates_bg.gif",
}
RANK_BG_DEFAULT = "background.jpeg"
_RANK_FONTS: dict = {}  # cache fonts PIL pour make_rank_image
_FALLBACK_RANK_GIFS = ["pirate_bg.gif", "shichibukai_bg.gif", "fujitoraaaa.gif", "yonkou_bg.gif", "roi_des_pirates_bg.gif"]

LOCAL_CHAR_GIFS = {
    # One Piece
    "Monkey D. Luffy":    "luffy citation.gif",
    "Roronoa Zoro":       "zoro citation.gif",
    "Portgas D. Ace":     "ace citation.gif",
    "Barbe Blanche":      "barbe blanche citation.gif",
    "Trafalgar Law":      "tarfalgar law citation.gif",
    "Sanji":              "sanji citation.gif",
    # Naruto
    "Naruto Uzumaki":     "naruto citation.gif",
    "Kakashi Hatake":     "kakashi citation.gif",
    "Itachi Uchiha":      "itachi citation.gif",
    "Jiraiya":            "jiraiya citation.gif",
    "Pain":               "pain citation.gif",
    "Obito Uchiha":       "obito citation.gif",
    "Rock Lee":           "Rock lee citation.gif",
    "Sasuke Uchiha":      "sasuke citation.gif",
    "Minato Namikaze":    "minato gif.gif",
    "Hinata Hyuga":       "hinata citation.gif",
    # Attack on Titan
    "Levi Ackerman":      "livai ackerman citation.gif",
    "Eren Yeager":        "eren yeager citation.gif",
    "Mikasa Ackerman":    "mikasa citation.gif",
    "Armin Arlert":       "armin arlet citation.gif",
    "Erwin Smith":        "erwin smith citation.gif",
    # Death Note
    "Light Yagami":       "light yagami citation.gif",
    "L":                  "L citation.gif",
    "Ryuk":               "ryuk citation.gif",
    # Dragon Ball Z
    "Son Goku":           "san goku citation.gif",
    "Vegeta":             "vegeta citation.gif",
    # Demon Slayer
    "Tanjiro Kamado":     "tanjiro kamado citation.gif",
    "Rengoku Kyojuro":    "kyojuro rengoku citation.gif",
    # Jujutsu Kaisen
    "Yuji Itadori":       "yuji itadori citation.gif",
    "Gojo Satoru":        "gojo satoru citation.gif",
    # Bleach
    "Ichigo Kurosaki":    "ichigo citation.gif",
    "Byakuya Kuchiki":    "byakuya kuchiki citation.gif",
    # Tokyo Ghoul
    "Ken Kaneki":         "keneki ken citation.gif",
    # Fullmetal Alchemist
    "Edward Elric":          "edward elric citation.gif",
    "Roy Mustang":           "Roy mustang citation.gif",
    "Alphonse Elric":        "alphonse elric ciitation.gif",
    # Hunter x Hunter
    "Gon Freecss":           "gon.gif",
    "Killua Zoldyck":        "killua gif citation.gif",
    "Hisoka Morow":          "hisoka gif citation.gif",
    "Kurapika":              "kurapika gif citation.gif",
    "Meruem":                "meruem gif citation.gif",
    "Mito Freecss":          "mito freecs citation.gif",
    # JoJo's Bizarre Adventure
    "Dio Brando":            "dio brando gif.gif",
    "Giorno Giovanna":       "giorno giovanna gif.gif",
    # Fairy Tail
    "Natsu Dragneel":        "natsu ft.gif",
    "Erza Scarlet":          "erza scarlett citation.gif",
    # Code Geass
    "Lelouch vi Britannia":  "lelouch gif citation.gif",
    # One Punch Man
    "Saitama":               "saitama gif.gif",
    # Berserk
    "Guts":                  "guts citations.gif",
    # Re:Zero
    "Subaru Natsuki":        "subaru natsuki citation.gif",
    "Rem":                   "rem re zero gif.gif",
    # Sword Art Online
    "Kirito":                "kirito citation.gif",
    "Asuna Yuuki":           "asuna gif ciattion.gif",
    # Cowboy Bebop
    "Spike Spiegel":         "spike cb citaztion.gif",
    # Black Clover
    "Asta":                  "asta black clover ct.gif",
    # Vinland Saga
    "Thorfinn":              "thorfinnn citation.gif",
    "Thors":                 "thors gif.gif",
    # Violet Evergarden
    "Violet Evergarden":     "violet evergarden citation.gif",
    # One Piece
    "Donquixote Doflamingo": "doflamingo citation 1.gif",
    # Chainsaw Man
    "Makima": ["Makima citations 1.gif", "makima 2 ciation.gif", "makima 3 citation.gif", "makima 4 citation.gif"],
    "Reze":   ["reze-chainsaw-man citations.gif", "reze chazinsaw man citation 2.gif"],
}


if os.path.exists(GRAPH_FONT_PATH):
    fm.fontManager.addfont(GRAPH_FONT_PATH)
    CUSTOM_FONT = fm.FontProperties(fname=GRAPH_FONT_PATH).get_name()
else:
    CUSTOM_FONT = None

# Fallback fonts pour couvrir les glyphs manquants (emojis, pseudos non-ASCII)
_mpl_families = [CUSTOM_FONT] if CUSTOM_FONT else []
_mpl_families.extend(["DejaVu Sans", "Noto Sans", "Liberation Sans", "sans-serif"])
matplotlib.rcParams["font.family"] = _mpl_families

def add_background(fig, alpha=0.18):
    if not os.path.exists(BG_IMAGE_PATH):
        return
    try:
        img = mpimg.imread(BG_IMAGE_PATH)
        bg_ax = fig.add_axes([0, 0, 1, 1], zorder=0)
        bg_ax.set_in_layout(False)
        bg_ax.imshow(img, aspect="auto", extent=[0, 1, 0, 1],
                     transform=bg_ax.transAxes, alpha=alpha)
        bg_ax.axis("off")
    except Exception:
        pass

# ─────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────
TOKEN = os.environ.get("DISCORD_TOKEN")
SUPABASE_URL = os.environ.get("SUPABASE_URL")

from psycopg2 import pool as _pgpool

# ── Connection pool (évite un TCP handshake à chaque save) ────────
_db_pool: _pgpool.ThreadedConnectionPool | None = None

def _get_pool() -> _pgpool.ThreadedConnectionPool:
    global _db_pool
    if _db_pool is None:
        _db_pool = _pgpool.ThreadedConnectionPool(1, 4, dsn=SUPABASE_URL)
    return _db_pool

def get_db():
    return _get_pool().getconn()

def release_db(conn):
    try:
        _get_pool().putconn(conn)
    except Exception:
        pass

# ── Cache mémoire global ──────────────────────────────────────────
# Chargé une seule fois au démarrage ; toutes les lectures se font
# depuis cette dict en mémoire (O(1), ~0ms).
_CACHE: dict = {}
_DIRTY: set  = set()   # UIDs modifiés depuis le dernier flush
_CACHE_READY = False   # True dès que le cache est chargé
_HTTP: aiohttp.ClientSession | None = None  # session aiohttp globale réutilisée

def init_db():
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                uid TEXT PRIMARY KEY,
                data JSONB
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                user_id TEXT PRIMARY KEY,
                pays TEXT DEFAULT '',
                top_anime TEXT DEFAULT '',
                waifu_husbando TEXT DEFAULT '',
                bio TEXT DEFAULT '',
                custom_image TEXT
            )
        """)
        conn.commit()
        cur.close()
    finally:
        release_db(conn)
ANNOUNCE_CHANNEL_ID = 1494342996848672828
ALERT_HOURS_THRESHOLD = 5.0
DERANK_WARNING_THRESHOLD = 5.0  # heures avant le seuil de derank pour l'avertissement MP
GUILD_IDS = [924346730194014220, 1478937064031518892]

RANK_ROLES = {
    "Pirate":          1486554682263343284,
    "Shichibukai":     1486554770306236596,
    "Amiral":          1486554823573766164,
    "Yonkou":          1486554858075984043,
    "Roi des pirates": 1494656848622518412,
}

RANKS = [
    (150, "Roi des pirates"),
    (70,  "Yonkou"),
    (40,  "Amiral"),
    (25,  "Shichibukai"),
    (10,  "Pirate"),
]

# Couleurs RGB par rang - utilisées dans les images ET les embeds d'annonce
RANK_COLORS = {
    "Pirate":          (46,  204, 113),
    "Shichibukai":     (22,  96,  45),
    "Amiral":          (241, 196, 15),
    "Yonkou":          (155, 89,  182),
    "Roi des pirates": (255, 215, 0),
}


# ─────────────────────────────────────────
#  CITATIONS ONE PIECE
# ─────────────────────────────────────────
CHAR_JIKAN_IDS = {
    # One Piece
    "Monkey D. Luffy": 40,
    "Luffy": 40,
    "Roronoa Zoro": 62,
    "Trafalgar Law": 13767,
    "Portgas D. Ace": 2072,
    "Nami": 723,
    "Nico Robin": 61,
    "Usopp": 724,
    "Barbe Blanche": 2751,
    "Whitebeard": 2751,
    "Shanks": 727,
    "Akainu": 22687,
    "Sanji": 305,
    "Brook": 1498,
    "Jinbei": 39645,
    # Naruto
    "Naruto Uzumaki": 17,
    "Sasuke Uchiha": 13,
    "Kakashi Hatake": 85,
    "Itachi Uchiha": 14,
    "Hinata Hyuga": 1555,
    "Rock Lee": 306,
    "Gaara": 84,
    "Jiraiya": 2423,         # vérifié Jikan : "Jiraiya" / Naruto
    "Minato Namikaze": 2535, # vérifié Jikan : "Minato Namikaze" / Naruto
    "Obito Uchiha": 2910,    # vérifié Jikan : "Obito Uchiha" / Naruto
    "Pain": 3180,
    # Bleach
    "Ichigo Kurosaki": 5,
    "Byakuya Kuchiki": 8,
    # FMA
    "Edward Elric": 11,
    "Alphonse Elric": 12,
    "Roy Mustang": 68,       # vérifié Jikan : "Roy Mustang" / FMA
    # HxH
    "Gon Freecss": 30,
    "Killua Zoldyck": 27,
    "Hisoka Morow": 238998,
    "Kurapika": 28,
    "Meruem": 23277,         # vérifié Jikan : "Meruem" / HxH 2011
    # JoJo
    "Jotaro Kujo": 38,
    "Giorno Giovanna": 10529,
    "Dio Brando": 4004,      # vérifié Jikan : "Dio Brando" / JoJo
    # Fairy Tail
    "Natsu Dragneel": 5187,
    "Erza Scarlet": 5189,
    "Gray Fullbuster": 9748,
    # SNK
    "Levi Ackerman": 290124,
    "Eren Yeager": 40882,
    "Mikasa Ackerman": 40881,
    "Armin Arlert": 46494,
    "Erwin Smith": 46496,
    # Death Note
    "Light Yagami": 80,
    "L": 71,
    "Ryuk": 75,              # vérifié Jikan : "Ryuk" / Death Note
    # Dragon Ball
    "Son Goku": 246,
    "Goku": 246,
    "Vegeta": 913,
    "Piccolo": 915,
    # Demon Slayer
    "Tanjiro Kamado": 146156,
    "Zenitsu Agatsuma": 146310,
    "Inosuke Hashibira": 146158,
    "Rengoku Kyojuro": 151143, # vérifié Jikan : "Kyoujurou Rengoku" / Demon Slayer
    "Muzan Kibutsuji": 146318,
    # Jujutsu Kaisen
    "Yuji Itadori": 163847,  # vérifié Jikan : "Yuuji Itadori" / JJK
    "Gojo Satoru": 164471,   # vérifié Jikan : "Satoru Gojou" / JJK
    "Ryomen Sukuna": 160116,
    "Megumi Fushiguro": 160113,
    # Tokyo Ghoul
    "Ken Kaneki": 87275,
    # Code Geass
    "Lelouch vi Britannia": 417,
    # One Punch Man
    "Saitama": 73935,
    # Bleach
    "Sosuke Aizen": 7,
    # Mob Psycho 100
    "Shigeo Kageyama": 137723,
    # Nanatsu no Taizai
    "Meliodas": 67067,
    # Gintama
    "Gintoki Sakata": 567,
    # Cowboy Bebop
    "Spike Spiegel": 1,
    # Berserk
    "Guts": 422,             # vérifié Jikan : "Guts" / Berserk
    # Black Clover
    "Asta": 33356,
    # Re:Zero
    "Rem": 118763,           # vérifié via anime Re:Zero ID=31240
    "Subaru Natsuki": 118735, # vérifié Jikan : "Subaru Natsuki" / Re:Zero
    # SAO
    "Kirito": 245235,        # vérifié Jikan : "Kirito" / SAO (36828 = Asuna!)
    "Asuna Yuuki": 36828,    # vérifié Jikan : "Asuna Yuuki" / SAO
    # Violet Evergarden
    "Violet Evergarden": 141354, # vérifié Jikan : "Violet Evergarden"
}
# ─────────────────────────────────────────
#  QUOTES_DB - citations anime verifiees
# ─────────────────────────────────────────
QUOTES_DB = [
    # ONE PIECE
    {"quote": "Je deviendrai le Roi des Pirates !", "character": "Monkey D. Luffy", "anime": "One Piece", "color": "#F97316"},
    {"quote": "Un homme qui abandonne ses rêves n'est pas digne d'être pirate !", "character": "Monkey D. Luffy", "anime": "One Piece", "color": "#F97316"},
    {"quote": "Je ne regretterai rien, même si mes bras cassent.", "character": "Monkey D. Luffy", "anime": "One Piece", "color": "#F97316"},
    {"quote": "Rien ne me fera abandonner mon rêve. Tu peux me tuer, mais mon ambition ne mourra jamais.", "character": "Roronoa Zoro", "anime": "One Piece", "color": "#22C55E"},
    {"quote": "Il n'y a pas de honte à tomber. La honte, c'est de ne pas se relever.", "character": "Roronoa Zoro", "anime": "One Piece", "color": "#22C55E"},
    {"quote": "Je ne me bats pas pour ma gloire. Je me bats pour ceux qui croient en moi.", "character": "Roronoa Zoro", "anime": "One Piece", "color": "#22C55E"},
    {"quote": "Merci de m'avoir aimé.", "character": "Portgas D. Ace", "anime": "One Piece", "color": "#EF4444"},
    {"quote": "Je n'ai aucun regret d'être né.", "character": "Portgas D. Ace", "anime": "One Piece", "color": "#EF4444"},
    {"quote": "Mes fils n'ont pas besoin de partager le sang de mes veines.", "character": "Barbe Blanche", "anime": "One Piece", "color": "#94A3B8"},
    {"quote": "Je suis le plus fort du monde - et pourtant, je n'ai pas su sauver mon fils.", "character": "Barbe Blanche", "anime": "One Piece", "color": "#94A3B8"},
    {"quote": "Je suis un chirurgien. Mon métier, c'est de sauver des vies.", "character": "Trafalgar Law", "anime": "One Piece", "color": "#3B82F6"},
    {"quote": "Un vrai cuisinier ne lâche jamais ses mains. Elles sont son outil et sa fierté.", "character": "Sanji", "anime": "One Piece", "color": "#FBBF24"},
    {"quote": "Un vrai homme ne frappe jamais une femme, quoi qu'il arrive.", "character": "Sanji", "anime": "One Piece", "color": "#FBBF24"},
    {"quote": "Les pirates, ce serait le mal ? La Marine, la justice ? Ces notions ont changé tellement de fois ! Il y a des gens qui n'ont jamais connu la paix… et d'autres qui n'ont jamais connu la guerre. Comment veux-tu qu'ils aient les mêmes valeurs ? Ce sont ceux qui se tiennent au sommet qui définissent le bien et le mal.", "character": "Donquixote Doflamingo", "anime": "One Piece", "color": "#EC4899"},
    # NARUTO
    {"quote": "Je ne recule jamais, je ne mens jamais - c'est la voie du ninja !", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#F97316"},
    {"quote": "C'est ça, pour moi, être un ninja !", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#F97316"},
    {"quote": "Si tu abandonnes, c'est la fin. Si tu continues, il reste toujours une chance.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#F97316"},
    {"quote": "La douleur rend les gens plus forts. Et les gens forts aident ceux qui souffrent.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#F97316"},
    {"quote": "Ceux qui abandonnent leurs camarades sont pires que des rebuts.", "character": "Kakashi Hatake", "anime": "Naruto", "color": "#6B7280"},
    {"quote": "Pardonne-moi, Sasuke... C'est la dernière fois.", "character": "Itachi Uchiha", "anime": "Naruto", "color": "#4C1D95"},
    {"quote": "Il vaut mieux mourir pour quelque chose que de vivre pour rien.", "character": "Itachi Uchiha", "anime": "Naruto", "color": "#4C1D95"},
    {"quote": "Croire en quelqu'un, c'est tout ce dont un ninja a besoin.", "character": "Jiraiya", "anime": "Naruto", "color": "#7C3AED"},
    {"quote": "Ceux qui ne connaissent pas la vraie douleur ne peuvent pas connaître la vraie paix.", "character": "Pain", "anime": "Naruto", "color": "#8B0000"},
    {"quote": "Sans espoir, les gens ne savent même plus pourquoi ils se battent.", "character": "Obito Uchiha", "anime": "Naruto", "color": "#374151"},
    {"quote": "Si tu ne peux pas utiliser le ninjutsu, travaille dix fois plus dur que les autres.", "character": "Rock Lee", "anime": "Naruto", "color": "#16A34A"},
    {"quote": "Mon pouvoir n'a qu'un seul objectif : la vengeance.", "character": "Sasuke Uchiha", "anime": "Naruto", "color": "#1E1B4B"},
    {"quote": "Je n'ai besoin de personne pour accomplir ce que je dois accomplir.", "character": "Sasuke Uchiha", "anime": "Naruto", "color": "#1E1B4B"},
    {"quote": "Je deviens Hokage - sinon, ça ne veut rien dire d'être ninja.", "character": "Minato Namikaze", "anime": "Naruto", "color": "#FBBF24"},
    {"quote": "Je ne pleure pas parce que je suis faible. Je pleure parce que j'ai été fort trop longtemps.", "character": "Hinata Hyuga", "anime": "Naruto", "color": "#FFB6C1"},
    # ATTACK ON TITAN
    {"quote": "Personne ne sait ce qui va se passer. Décide simplement de ce que tu ne regretteras pas.", "character": "Levi Ackerman", "anime": "Attack on Titan", "color": "#1F2937"},
    {"quote": "Les choix que nous faisons sur le champ de bataille sont absolus.", "character": "Levi Ackerman", "anime": "Attack on Titan", "color": "#1F2937"},
    {"quote": "Si on ne se bat pas, on ne peut pas gagner.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#065F46"},
    {"quote": "Je continuerai d'avancer - jusqu'à ce que mes ennemis soient anéantis.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#065F46"},
    {"quote": "Ce monde est cruel. Mais il est aussi beau.", "character": "Mikasa Ackerman", "anime": "Attack on Titan", "color": "#374151"},
    {"quote": "Ceux qui sont incapables de renoncer à quelque chose ne peuvent jamais rien changer.", "character": "Armin Arlert", "anime": "Attack on Titan", "color": "#78716C"},
    {"quote": "Le résultat de nos combats fera partie de l'avenir de l'humanité.", "character": "Erwin Smith", "anime": "Attack on Titan", "color": "#B45309"},
    # DEATH NOTE
    {"quote": "Je suis Kira. Et je suis le Dieu du nouveau monde.", "character": "Light Yagami", "anime": "Death Note", "color": "#7F1D1D"},
    {"quote": "La justice n'est qu'un mot que les forts utilisent pour opprimer les faibles.", "character": "Light Yagami", "anime": "Death Note", "color": "#7F1D1D"},
    {"quote": "Tout a été calculé. Je ne peux pas perdre.", "character": "Light Yagami", "anime": "Death Note", "color": "#7F1D1D"},
    {"quote": "La probabilité que je me trompe est non nulle. Mais elle est très faible.", "character": "L", "anime": "Death Note", "color": "#1C1917"},
    {"quote": "Je ne fais confiance à personne. Pas même à moi-même.", "character": "L", "anime": "Death Note", "color": "#1C1917"},
    {"quote": "Les humains sont vraiment... intéressants.", "character": "Ryuk", "anime": "Death Note", "color": "#292524"},
    # DRAGON BALL
    {"quote": "Je suis un Saiyan élevé sur Terre. Je me bats pour protéger ce qui m'est cher !", "character": "Son Goku", "anime": "Dragon Ball Z", "color": "#F97316"},
    {"quote": "La victoire n'est que le début. L'important, c'est de continuer à s'améliorer.", "character": "Son Goku", "anime": "Dragon Ball Z", "color": "#F97316"},
    {"quote": "Je suis le Prince de tous les Saiyans !", "character": "Vegeta", "anime": "Dragon Ball Z", "color": "#1E3A5F"},
    {"quote": "Kakarot... tu es le seul guerrier qui mérite de se battre contre moi.", "character": "Vegeta", "anime": "Dragon Ball Z", "color": "#1E3A5F"},
    # DEMON SLAYER
    {"quote": "Ne désespère pas. Même là où il n'y a pas de lumière, tu peux en trouver une.", "character": "Tanjiro Kamado", "anime": "Demon Slayer", "color": "#E6392F"},
    {"quote": "Je vais te ramener à la vie humaine, Nezuko. Je le jure.", "character": "Tanjiro Kamado", "anime": "Demon Slayer", "color": "#E6392F"},
    {"quote": "Enflamme ton coeur !", "character": "Rengoku Kyojuro", "anime": "Demon Slayer", "color": "#EF4444"},
    {"quote": "Grandis avec force. Et protège les plus faibles que toi.", "character": "Rengoku Kyojuro", "anime": "Demon Slayer", "color": "#EF4444"},
    # JUJUTSU KAISEN
    {"quote": "Je veux mourir entouré de gens - pas seul.", "character": "Yuji Itadori", "anime": "Jujutsu Kaisen", "color": "#EC4899"},
    {"quote": "Désolé, Geto. Tu es le dernier sorcier que j'ai appelé mon ami.", "character": "Gojo Satoru", "anime": "Jujutsu Kaisen", "color": "#6366F1"},
    {"quote": "Je suis le plus fort. Donc je suis le seul à pouvoir le faire.", "character": "Gojo Satoru", "anime": "Jujutsu Kaisen", "color": "#6366F1"},
    # BLEACH
    {"quote": "Je ne suis pas un héros ni un dieu. Quand on m'attaque, je contre-attaque. C'est tout.", "character": "Ichigo Kurosaki", "anime": "Bleach", "color": "#EA580C"},
    {"quote": "Peu importe la raison - je veux juste avoir la force de protéger ceux que j'aime.", "character": "Ichigo Kurosaki", "anime": "Bleach", "color": "#EA580C"},
    {"quote": "Les règles existent pour être suivies. Même au prix de sa vie.", "character": "Byakuya Kuchiki", "anime": "Bleach", "color": "#1E293B"},
    # FULLMETAL ALCHEMIST
    {"quote": "L'humanité ne peut rien obtenir sans donner quelque chose en retour. Pour obtenir chaque chose, quelque chose de valeur égale doit être perdu. C'est ce qu'on appel en Alchimie la loi de l'échange équivalent.", "character": "Edward Elric", "anime": "Fullmetal Alchemist", "color": "#D97706"},
    {"quote": "Rien n'est parfait dans ce monde. C'est justement pour ça que c'est beau.", "character": "Edward Elric", "anime": "Fullmetal Alchemist", "color": "#D97706"},
    {"quote": "Un homme qui lève la main sur une femme n'est pas un vrai homme.", "character": "Roy Mustang", "anime": "Fullmetal Alchemist", "color": "#1E40AF"},
    {"quote": "On ne peut pas tout obtenir dans ce monde. Mais on peut choisir ce qui vaut la peine d'essayer.", "character": "Alphonse Elric", "anime": "Fullmetal Alchemist", "color": "#E2E8F0"},
    # HUNTER x HUNTER
    {"quote": "Je veux voir ce que voit mon père - ce qui vaut autant que moi à ses yeux.", "character": "Gon Freecss", "anime": "Hunter x Hunter", "color": "#16A34A"},
    {"quote": "Tu peux choisir d'être gentil. Même dans ce monde cruel.", "character": "Killua Zoldyck", "anime": "Hunter x Hunter", "color": "#94A3B8"},
    {"quote": "Les fleurs se cueillent en fleur. Les fruits se mangent à maturité.", "character": "Hisoka Morow", "anime": "Hunter x Hunter", "color": "#DC2626"},
    {"quote": "Je ne vivrai que pour ma vengeance - et je mourrai pour elle.", "character": "Kurapika", "anime": "Hunter x Hunter", "color": "#7C3AED"},
    {"quote": "Je n'avais pas imaginé que perdre aux échecs puisse me rendre aussi... heureux.", "character": "Meruem", "anime": "Hunter x Hunter", "color": "#065F46"},
    {"quote": "Si tu veux apprendre à connaître quelqu'un, découvre ce qui le met en colère.", "character": "Mito Freecss", "anime": "Hunter x Hunter", "color": "#2E7D32"},
    # JOJO'S BIZARRE ADVENTURE
    {"quote": "Ce monde appartient à DIO !", "character": "Dio Brando", "anime": "JoJo's Bizarre Adventure", "color": "#6D28D9"},
    {"quote": "Nul ne peut résister à mon pouvoir. Pas même le temps.", "character": "Dio Brando", "anime": "JoJo's Bizarre Adventure", "color": "#6D28D9"},
    {"quote": "J'ai un rêve. Et ce rêve ne mourra jamais.", "character": "Giorno Giovanna", "anime": "JoJo's Bizarre Adventure", "color": "#F472B6"},
    # FAIRY TAIL
    {"quote": "Je ne serai jamais seul - mes amis sont toujours dans mon coeur !", "character": "Natsu Dragneel", "anime": "Fairy Tail", "color": "#DC2626"},
    {"quote": "Les larmes ne sont pas une faiblesse. Ce sont la preuve que tu ressens quelque chose.", "character": "Erza Scarlet", "anime": "Fairy Tail", "color": "#9F1239"},
    {"quote": "Avance, même si c'est dur. La route se tracera sous tes pieds.", "character": "Erza Scarlet", "anime": "Fairy Tail", "color": "#9F1239"},
    # CODE GEASS
    {"quote": "Je détruis les mondes brisés pour en bâtir de meilleurs.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#7C3AED"},
    {"quote": "Les gens ne vivent que dans l'obscurité, car c'est là que la lumière brille le plus fort.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#7C3AED"},
    # TOKYO GHOUL
    {"quote": "Je n'étais ni humain, ni goule. Un hybride sans place dans ce monde.", "character": "Ken Kaneki", "anime": "Tokyo Ghoul", "color": "#1C1917"},
    {"quote": "Il faut être fort. Sinon, tu seras blessé. Ou tu blesseras quelqu'un d'autre.", "character": "Ken Kaneki", "anime": "Tokyo Ghoul", "color": "#1C1917"},
    # ONE PUNCH MAN
    {"quote": "Tu sais, être le plus fort... c'est finalement assez solitaire.", "character": "Saitama", "anime": "One Punch Man", "color": "#F97316"},
    {"quote": "Je suis un héros... pour le fun.", "character": "Saitama", "anime": "One Punch Man", "color": "#F97316"},
    # BERSERK
    {"quote": "Vous devrez combattre de toutes vos forces. Même si votre corps est déchiré en mille morceaux.", "character": "Guts", "anime": "Berserk", "color": "#4B0082"},
    {"quote": "La destinée ne me fait pas peur. Je la taille à coups d'épée.", "character": "Guts", "anime": "Berserk", "color": "#4B0082"},
    # RE:ZERO
    {"quote": "Je reviens à la vie encore et encore. Pas pour moi - pour eux.", "character": "Subaru Natsuki", "anime": "Re:Zero", "color": "#3B82F6"},
    {"quote": "Je t'aime. Là où tu vas, j'irai.", "character": "Rem", "anime": "Re:Zero", "color": "#60A5FA"},
    # SWORD ART ONLINE
    {"quote": "Un jeu, c'est exactement parce que c'est un jeu qu'on peut tout y donner.", "character": "Kirito", "anime": "Sword Art Online", "color": "#1E1B4B"},
    {"quote": "Même si ce monde est un jeu, ma douleur à moi est réelle.", "character": "Asuna Yuuki", "anime": "Sword Art Online", "color": "#FBBF24"},
    # VIOLET EVERGARDEN
    {"quote": "Je veux comprendre ce que signifient ces mots : je t'aime.", "character": "Violet Evergarden", "anime": "Violet Evergarden", "color": "#7C3AED"},
    {"quote": "Je ne suis qu'une arme. Mais une arme qui souhaite comprendre les coeurs humains.", "character": "Violet Evergarden", "anime": "Violet Evergarden", "color": "#7C3AED"},
    # COWBOY BEBOP
    {"quote": "Tu vois seulement un souvenir de ce que tu étais. Pas ce que tu pourrais devenir.", "character": "Spike Spiegel", "anime": "Cowboy Bebop", "color": "#0EA5E9"},
    # BLACK CLOVER
    {"quote": "Je n'ai pas de magie. Alors je compenserai par des efforts infinis !", "character": "Asta", "anime": "Black Clover", "color": "#1D4ED8"},
    # VINLAND SAGA
    {"quote": "Un vrai guerrier n'a pas besoin d'ennemis.", "character": "Thorfinn", "anime": "Vinland Saga", "color": "#8B4513"},
    {"quote": "Tu n'as pas d'ennemi.", "character": "Thors", "anime": "Vinland Saga", "color": "#5C4033"},
    # CHAINSAW MAN
    {"quote": "Le mal nécessaire est toujours nécessaire.", "character": "Makima", "anime": "Chainsaw Man", "color": "#B91C1C"},
    {"quote": "J'aime les humains, de la même façon que les humains aiment les chiens.", "character": "Makima", "anime": "Chainsaw Man", "color": "#B91C1C"},
    {"quote": "Tout le monde a quelque chose qu'il ne peut pas refuser.", "character": "Makima", "anime": "Chainsaw Man", "color": "#B91C1C"},
    {"quote": "Tu crois avoir le choix, mais ce n'est qu'une illusion.", "character": "Makima", "anime": "Chainsaw Man", "color": "#B91C1C"},
    {"quote": "Les humains sont faciles à comprendre… ils ont tous un point faible.", "character": "Makima", "anime": "Chainsaw Man", "color": "#B91C1C"},
    {"quote": "Je n'ai pas besoin de te convaincre. Tu vas accepter de toi-même.", "character": "Makima", "anime": "Chainsaw Man", "color": "#B91C1C"},
    {"quote": "La peur est quelque chose de très pratique.", "character": "Makima", "anime": "Chainsaw Man", "color": "#B91C1C"},
    {"quote": "Je voulais juste vivre une vie normale.", "character": "Reze", "anime": "Chainsaw Man", "color": "#60A5FA"},
    {"quote": "Tu es la première personne avec qui je me sens vraiment moi-même.", "character": "Reze", "anime": "Chainsaw Man", "color": "#60A5FA"},
    {"quote": "Tout ce que je fais… c'est pour survivre.", "character": "Reze", "anime": "Chainsaw Man", "color": "#60A5FA"},
    {"quote": "Je ne sais pas si c'est de l'amour… mais je ne veux pas te perdre.", "character": "Reze", "anime": "Chainsaw Man", "color": "#60A5FA"},
    {"quote": "Même si je mens, certaines choses en moi sont vraies.", "character": "Reze", "anime": "Chainsaw Man", "color": "#60A5FA"},
]
print(f"\u2705 {len(QUOTES_DB)} citations anime chargees.")


# ─────────────────────────────────────────
#  UTILITAIRES
# ─────────────────────────────────────────
def now_ts():
    return datetime.now(timezone.utc).timestamp()

def _load_all_from_db() -> dict:
    """Charge toute la table users depuis la DB (appelé UNE SEULE FOIS)."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("SELECT uid, data FROM users")
        rows = cur.fetchall()
        cur.close()
        return {row[0]: row[1] for row in rows}
    finally:
        release_db(conn)


def _flush_uids_to_db(uids: set) -> None:
    """Sauvegarde les UIDs dirty en un seul batch UPSERT (O(1) aller-retour DB)."""
    values = [(uid, json.dumps(_CACHE[uid])) for uid in uids if _CACHE.get(uid) is not None]
    if not values:
        return
    conn = get_db()
    try:
        conn.autocommit = False
        cur = conn.cursor()
        cur.execute("SET LOCAL statement_timeout = '60000'")
        _pg_execute_values(
            cur,
            "INSERT INTO users (uid, data) VALUES %s "
            "ON CONFLICT (uid) DO UPDATE SET data = EXCLUDED.data",
            values,
        )
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"❌ flush_uids_to_db: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
    finally:
        release_db(conn)


# ── API publique (remplace les anciennes fonctions) ───────────────

async def load_data_async() -> dict:
    """Retourne le cache mémoire - lecture instantanée (0 réseau)."""
    global _CACHE, _CACHE_READY
    if not _CACHE_READY:
        # Chargement initial (une seule fois)
        loop = asyncio.get_running_loop()
        _CACHE = await loop.run_in_executor(db_executor, _load_all_from_db)
        _CACHE_READY = True
        print(f"[CACHE] {len(_CACHE)} utilisateurs chargés en mémoire")
    return _CACHE


async def save_user_async(uid: str, udata: dict) -> None:
    """Écrit en mémoire + marque dirty (flush vers DB toutes les 30s)."""
    _CACHE[uid] = udata
    _DIRTY.add(uid)


async def save_data_async(data: dict) -> None:
    """Met à jour le cache pour chaque UID et marque dirty."""
    for uid, udata in data.items():
        _CACHE[uid] = udata
        _DIRTY.add(uid)


def _sync_flush_dirty() -> int:
    """Flush synchrone des UIDs dirty - appelé depuis le thread executor."""
    if not _DIRTY:
        return 0
    to_flush = set(_DIRTY)
    _DIRTY.clear()
    _flush_uids_to_db(to_flush)
    return len(to_flush)


def get_user(data, uid: str):
    if uid not in data:
        data[uid] = {
            "vocal_sessions": [],
            "join_time": None,
            "messages": [],
            "last_rank": None,
            "alerted": False,
        }
    for key, default in [("last_rank", None), ("alerted", False), ("known_ranks", []), ("dm_optout", False)]:
        if key not in data[uid]:
            data[uid][key] = default
    return data[uid]

# ── Berry Wallet ──────────────────────────────────────────────────
BERRY_EMOJI = "🍊"

def get_berrys(uid: str) -> int:
    return get_user(_CACHE, uid).get("berrys", 0)

def _track_berry(user: dict, key: str, amount: int):
    stats = user.setdefault("berry_stats", {"earned": 0, "lost": 0, "spent": 0})
    stats[key] = stats.get(key, 0) + amount

def add_berrys(uid: str, amount: int, track: str = "earned") -> int:
    user = get_user(_CACHE, uid)
    user["berrys"] = max(0, user.get("berrys", 0) + amount)
    if track:
        _track_berry(user, track, amount)
    _DIRTY.add(uid)
    return user["berrys"]

def spend_berrys(uid: str, amount: int, track: str = "spent") -> bool:
    user = get_user(_CACHE, uid)
    bal = user.get("berrys", 0)
    if bal < amount:
        return False
    user["berrys"] = bal - amount
    if track:
        _track_berry(user, track, amount)
    _DIRTY.add(uid)
    return True

def _proportional_bet(uid: str) -> int:
    """Mise 10–25% du solde, arrondie à 10, min 30, max 5 000."""
    bal = get_berrys(uid)
    if bal < 30:
        return 0
    bet = round(bal * random.uniform(0.10, 0.25) / 10) * 10
    return max(30, min(5000, bet))

def seconds_in_period(sessions, days, join_time=None, _now=None):
    _now = _now or now_ts()
    cutoff = _now - days * 86400
    total = 0
    for s in sessions:
        end = s["end"]
        if end < cutoff:
            continue
        total += end - max(s["start"], cutoff)
    if join_time:
        total += _now - max(join_time, cutoff)
    return total

def messages_in_period(messages, days, _now=None):
    cutoff = (_now or now_ts()) - days * 86400
    return sum(1 for ts in messages if ts >= cutoff)

_CLEAN_CUTOFF_DAYS = 8

def clean_old_data(user, _now=None):
    cutoff = (_now or now_ts()) - _CLEAN_CUTOFF_DAYS * 86400
    # Preserve duration of purged sessions in extra_seconds so all-time hours are never lost
    for s in user["vocal_sessions"]:
        if s["end"] < cutoff:
            user["extra_seconds"] = user.get("extra_seconds", 0) + (s["end"] - s["start"])
    user["vocal_sessions"] = [s for s in user["vocal_sessions"] if s["end"] >= cutoff]
    user["messages"]       = [ts for ts in user["messages"] if ts >= cutoff]

def total_seconds(sessions, join_time=None, extra=0, _now=None):
    total = sum(s["end"] - s["start"] for s in sessions)
    if join_time:
        total += (_now or now_ts()) - join_time
    return total + extra

def total_messages(messages):
    return len(messages)

def format_duration(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    return f"{h}h {m}min"

def get_rank_for_hours(hours):
    for threshold, role_name in RANKS:
        if hours >= threshold:
            return role_name
    return None

def get_all_ranks_for_hours(hours):
    """Retourne TOUS les rangs mérités (du plus haut au plus bas)."""
    return [role_name for threshold, role_name in RANKS if hours >= threshold]

def format_all_ranks_display(hours_7d):
    """Formate l'affichage cumulatif des rangs pour les embeds."""
    all_ranks = get_all_ranks_for_hours(hours_7d)
    if not all_ranks:
        return "Aucun rang"
    return "  ·  ".join(f"{RANK_EMOJIS.get(r, '🎖️')} {r}" for r in all_ranks)

def get_next_rank(hours):
    for threshold, role_name in reversed(RANKS):
        if hours < threshold:
            return threshold, role_name
    return None, None

def calculate_prime(total_hours, total_msgs):
    base = total_hours * 100_000
    bonus_msg = total_msgs * 1_000
    return max(int(base + bonus_msg), 0)

def format_prime(berries):
    if berries >= 1_000_000_000:
        return f"{berries/1_000_000_000:.1f} Md de Berry"
    elif berries >= 1_000_000:
        return f"{berries/1_000_000:.1f} M de Berry"
    elif berries >= 1_000:
        return f"{berries/1_000:.0f} K de Berry"
    return f"{berries} Berry"

# ─────────────────────────────────────────
#  FOND SAKURA JAPONAIS
# ─────────────────────────────────────────
def draw_sakura_petal(draw, cx, cy, size, angle, color, alpha_img, alpha_val):
    pts = []
    for i in range(5):
        a = math.radians(angle + i * 72)
        px = cx + math.cos(a) * size
        py = cy + math.sin(a) * size
        pts.append((px, py))
        a2 = math.radians(angle + i * 72 + 36)
        px2 = cx + math.cos(a2) * size * 0.4
        py2 = cy + math.sin(a2) * size * 0.4
        pts.append((px2, py2))
    draw.polygon(pts, fill=color)

def generate_sakura_background(W, H, opacity=0.30):
    bg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bg)

    for y in range(H):
        ratio = y / H
        r = int(255 * 1.0)
        g = int((230 + (255-230) * ratio))
        b = int((235 + (255-235) * ratio))
        a = int(255 * opacity)
        draw.line([(0, y), (W, y)], fill=(r, g, b, a))

    branch_draw = ImageDraw.Draw(bg)
    branches = [
        [(0, H), (W//4, H*2//3), (W//3, H//2), (W//2, H//3)],
        [(W, H), (W*3//4, H*2//3), (W*2//3, H//2), (W//2, H//3)],
        [(W//4, H), (W//3, H*3//4), (W//2, H//2)],
    ]
    for branch in branches:
        for i in range(len(branch)-1):
            x1, y1 = branch[i]
            x2, y2 = branch[i+1]
            branch_draw.line(
                [(x1, y1), (x2, y2)],
                fill=(101, 60, 20, int(255 * opacity * 1.5)),
                width=max(1, int(4 * (1 - i/len(branch))))
            )

    petal_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(petal_layer)
    colors_petals = [
        (255, 182, 193),
        (255, 160, 180),
        (255, 200, 210),
        (240, 150, 170),
    ]
    for _ in range(60):
        cx = random.randint(0, W)
        cy = random.randint(0, H)
        size = random.randint(6, 18)
        angle = random.randint(0, 360)
        color = random.choice(colors_petals) + (int(255 * opacity * 2),)
        draw_sakura_petal(pd, cx, cy, size, angle, color, petal_layer, int(255*opacity))

    bg = Image.alpha_composite(bg, petal_layer)
    return bg

# ─────────────────────────────────────────
#  BOT
# ─────────────────────────────────────────
intents = discord.Intents.default()
intents.voice_states = True
intents.members = True
intents.message_content = True
intents.messages = True

bot = commands.Bot(command_prefix="!", intents=intents)
bot.get_db     = get_db
bot.release_db = release_db
db_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="db_worker")


# ── Flush dirty vers DB toutes les 30s ───────────────────────────
@tasks.loop(seconds=30)
async def flush_dirty_loop():
    if not _DIRTY:
        return
    loop = asyncio.get_running_loop()
    n = await loop.run_in_executor(db_executor, _sync_flush_dirty)
    if n:
        print(f"[CACHE] Flush {n} users dirty → DB")

@flush_dirty_loop.before_loop
async def _before_flush():
    await bot.wait_until_ready()

@flush_dirty_loop.error
async def _flush_error(err):
    print(f"[CACHE] flush_dirty_loop erreur : {err}")

# ─────────────────────────────────────────
#  RANK UPDATE + ANNONCES
# ─────────────────────────────────────────
_ANNOUNCE_RANK_EMOJIS = {
    "Pirate":          "🏴‍☠️",
    "Shichibukai":     "<:5505zorohappy:1132289837056151622>",
    "Amiral":          "🪖",
    "Yonkou":          "⚜️",
    "Roi des pirates": "👑",
}

_RANK_ROLE_IDS   = set(RANK_ROLES.values())
_RANK_ID_TO_NAME = {v: k for k, v in RANK_ROLES.items()}

async def _get_announce_channel():
    """Récupère le canal d'annonce depuis le cache, sinon via fetch (après restart)."""
    ch = bot.get_channel(ANNOUNCE_CHANNEL_ID)
    if ch is None:
        try:
            ch = await bot.fetch_channel(ANNOUNCE_CHANNEL_ID)
        except Exception as e:
            print(f"[RANK] Impossible de fetch le canal {ANNOUNCE_CHANNEL_ID}: {e}")
    return ch

async def update_rank(member: discord.Member, hours_7d: float, announce=True, data=None):
    """Rangs cumulatifs : ajoute les rôles mérités, retire ceux perdus, annonce montée ET derank."""
    guild = member.guild
    # Toujours utiliser le cache mémoire (data passé en argument ou _CACHE global)
    if data is None:
        data = _CACHE
    uid = str(member.id)
    user = get_user(data, uid)

    deserved_ranks     = set(get_all_ranks_for_hours(hours_7d))
    current_rank_names = {_RANK_ID_TO_NAME[r.id] for r in member.roles if r.id in _RANK_ROLE_IDS}

    ranks_to_add    = deserved_ranks - current_rank_names
    ranks_to_remove = current_rank_names - deserved_ranks

    for rank_name in ranks_to_add:
        role = guild.get_role(RANK_ROLES[rank_name])
        if role:
            try:
                await member.add_roles(role)
            except discord.Forbidden:
                print(f"⚠️ Permission refusée add_roles {member.display_name} ({rank_name})")
            except discord.HTTPException as e:
                print(f"⚠️ add_roles {member.display_name} ({rank_name}): {e}")

    for rank_name in ranks_to_remove:
        role = guild.get_role(RANK_ROLES[rank_name])
        if role:
            try:
                await member.remove_roles(role)
            except discord.Forbidden:
                print(f"⚠️ Permission refusée remove_roles {member.display_name} ({rank_name})")
            except discord.HTTPException as e:
                print(f"⚠️ remove_roles {member.display_name} ({rank_name}): {e}")
        rank_emoji = _ANNOUNCE_RANK_EMOJIS.get(rank_name, "🎖️")
        rank_threshold = next((t for t, n in RANKS if n == rank_name), 0)
        if user.get("dm_optout", False):
            continue
        dm_text = (
            f"⬇️ **Tu as perdu ton rank !**\n\n"
            f"Salut {member.display_name} ! Tu viens de perdre le rang **{rank_emoji} {rank_name}** "
            f"sur le serveur **{guild.name}**.\n\n"
            f"Tes heures vocales sur les 7 derniers jours sont descendues à `{hours_7d:.1f}h`, "
            f"alors qu'il te faut au minimum `{rank_threshold}h` pour garder ce rang.\n\n"
            f"Reviens en vocal pour le récupérer ! 🎙️\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"*BRAMS SCORE  |  by Freydiss*\n\n"
            f"*(Envoie `1` ici si tu ne veux plus recevoir ces DMs)*"
        )
        try:
            await member.send(dm_text)
        except discord.Forbidden:
            pass

    if announce and (ranks_to_add or ranks_to_remove):
        rank_threshold_map = {name: threshold for threshold, name in RANKS}
        rank_order = {r: i for i, (_, r) in enumerate(reversed(RANKS))}
        known = set(user.get("known_ranks", []))

        # Rang le plus haut que le membre AVAIT déjà sur Discord avant les ajouts
        highest_current = max(
            (rank_threshold_map.get(r, 0) for r in current_rank_names),
            default=0
        )

        # Retire les rangs perdus du known pour qu'ils puissent être ré-annoncés si regagnés
        for rn in ranks_to_remove:
            known.discard(rn)

        # Mise à jour known_ranks AVANT tout await pour éviter la race condition :
        # si deux appels update_rank s'exécutent en parallèle (vocal_loop + on_voice_state),
        # le second voit déjà le rang dans known_ranks et ne réannonce pas.
        to_announce = []
        for rank_name in sorted(ranks_to_add, key=lambda r: rank_order.get(r, -1)):
            already_known = rank_name in known
            known.add(rank_name)
            if not already_known and rank_threshold_map.get(rank_name, 0) > highest_current:
                to_announce.append(rank_name)
        user["known_ranks"] = list(known)  # visible aux autres coroutines dès maintenant
        _DIRTY.add(uid)

        if to_announce:
            channel = await _get_announce_channel()
            if channel:
                for rank_name in to_announce:
                    try:
                        img_buf, is_gif = await make_rank_image(member, rank_name, hours_7d)
                        fname = "rank_up.gif" if is_gif else "rank_up.png"
                        rank_emoji = _ANNOUNCE_RANK_EMOJIS.get(rank_name, "✨")
                        await channel.send(
                            content=f"🏴‍☠️ Bravo a {member.mention} qui a debloque le rank **{rank_name.upper()}** {rank_emoji}",
                            file=discord.File(img_buf, fname),
                        )
                        print(f"[RANK] Annonce : {member.display_name} -> {rank_name}")
                        if not user.get("dm_optout", False):
                            dm_rankup = (
                                f"🎉 **Tu as monté de rang !**\n\n"
                                f"Félicitations {member.display_name} ! Tu viens de débloquer le rang "
                                f"**{rank_emoji} {rank_name}** sur le serveur **{guild.name}** !\n\n"
                                f"Tu as accumulé `{hours_7d:.1f}h` de vocal sur les 7 derniers jours. "
                                f"Continue comme ça ! 💪\n\n"
                                f"━━━━━━━━━━━━━━━━━━━━\n"
                                f"*BRAMS SCORE  |  by Freydiss*\n"
                                f"*(Envoie `1` ici si tu ne veux plus recevoir ces DMs)*"
                            )
                            try:
                                await member.send(dm_rankup)
                            except discord.Forbidden:
                                pass
                    except Exception as e:
                        print(f"[RANK] Erreur annonce {member.display_name} ({rank_name}): {e}")

    new_highest_rank = get_rank_for_hours(hours_7d)
    if new_highest_rank != user.get("last_rank"):
        user["last_rank"] = new_highest_rank
        _DIRTY.add(uid)

    if ranks_to_add or ranks_to_remove:
        print(f"[RANK] {member.display_name} : +{ranks_to_add} -{ranks_to_remove} | {hours_7d:.1f}h")

def _load_font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

# ── Fonts citation (chargées une seule fois) ──────────────────────
_CIT_FONT_FALLBACKS = [
    "Righteous-Regular.ttf",
    "PirataOne-Regular.ttf",
    "KOMIKAX_.ttf",
]

def _cit_font(name, size):
    candidates = [name, os.path.join(os.path.dirname(__file__), name)]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    for fb in _CIT_FONT_FALLBACKS:
        for p in [fb, os.path.join(os.path.dirname(__file__), fb)]:
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    pass
    return ImageFont.load_default()

_CF_QUOTE  = _cit_font("Righteous-Regular.ttf",        32)
_CF_NAME   = _cit_font("BebasNeue-Regular.ttf",        54)
_CF_SERIE  = _cit_font("Rajdhani-SemiBold.ttf",        16)
_CF_WM     = _cit_font("Rajdhani-SemiBold.ttf",        13)
_CF_QMARK  = _cit_font("CormorantGaramond-Bold.ttf",   96)


def _make_char_full_bleed_mask(w: int, h: int) -> Image.Image:
    # Fondu horizontal : personnage transparent à gauche (zone texte), pleinement visible à droite
    mask   = Image.new("L", (w, h), 255)
    d      = ImageDraw.Draw(mask)
    FADE_S = int(w * 0.28)
    FADE_E = int(w * 0.60)
    for x in range(0, FADE_E):
        if x < FADE_S:
            alpha = 0
        else:
            t = (x - FADE_S) / (FADE_E - FADE_S)
            alpha = int(255 * (t ** 1.4))
        d.line([(x, 0), (x, h)], fill=alpha)
    return mask


def _build_citation_overlay(W: int, H: int, citation: str, perso: str, serie: str) -> Image.Image:
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    GOLD  = (212, 175, 55)
    IVORY = (248, 243, 230)
    MARGIN = 52

    # Assombrissement global (opacite sombre sur tout le fond)
    d.rectangle([(0, 0), (W, H)], fill=(0, 0, 0, 145))

    # Zone texte gauche encore plus sombre
    SOLID_X = int(W * 0.38)
    FADE_X  = int(W * 0.64)
    d.rectangle([(0, 0), (SOLID_X, H)], fill=(4, 4, 12, 195))
    STEPS = 40
    for i in range(STEPS):
        x = SOLID_X + int(i * (FADE_X - SOLID_X) / STEPS)
        t = 1.0 - (i / STEPS) ** 0.85
        d.rectangle(
            [(x, 0), (x + max(1, (FADE_X - SOLID_X) // STEPS), H)],
            fill=(4, 4, 12, int(195 * t))
        )

    # Watermark
    WM    = "BRAMS COMMUNITY"
    wm_bb = d.textbbox((0, 0), WM, font=_CF_WM)
    d.text((W - (wm_bb[2] - wm_bb[0]) - 20, 16), WM, font=_CF_WM, fill=(255, 255, 255, 22))

    TEXT_ZONE_W = int(W * 0.50)

    # Wrap citation
    words, lines, cur = citation.split(), [], ""
    for word in words:
        test = (cur + " " + word).strip()
        bb   = d.textbbox((0, 0), test, font=_CF_QUOTE)
        if bb[2] - bb[0] <= TEXT_ZONE_W:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
        if len(lines) == 4:
            cur = ""
            break
    if cur and len(lines) < 4:
        lines.append(cur)
    if not lines:
        lines = [citation[:60]]
    if len(lines) == 4:
        last = lines[-1]
        while last and len(last) > 1:
            bb = d.textbbox((0, 0), last + "...", font=_CF_QUOTE)
            if bb[2] - bb[0] <= TEXT_ZONE_W:
                break
            last = last.rsplit(" ", 1)[0]
        lines[-1] = last + "..."

    # Hauteurs FIXES — evite les bugs de textbbox avec les fonts de fallback
    QM_H         = 62
    LINE_H       = 44
    NAME_H       = 52
    SERIE_H      = 20
    GAP_QM_TEXT  = 6
    GAP_TEXT_SEP = 20
    GAP_SEP_NAME = 12
    GAP_NAME_SER = 14
    n = len(lines)

    total_h = QM_H + GAP_QM_TEXT + n * LINE_H + GAP_TEXT_SEP + 3 + GAP_SEP_NAME + NAME_H + GAP_NAME_SER + SERIE_H
    block_y = max(24, (H - total_h) // 2)
    cur_y   = block_y

    # Filet vertical or
    d.rectangle([(MARGIN - 10, cur_y + 4), (MARGIN - 7, cur_y + total_h)], fill=(*GOLD, 190))

    # Guillemet ASCII " — present dans tous les fonts (pas de U+201C)
    d.text((MARGIN, cur_y), '"', font=_CF_QMARK, fill=(*GOLD, 215))
    cur_y += QM_H + GAP_QM_TEXT

    # Texte citation
    for i, line in enumerate(lines):
        y = cur_y + i * LINE_H
        d.text((MARGIN + 2, y + 2), line, font=_CF_QUOTE, fill=(0, 0, 0, 120))
        d.text((MARGIN, y), line, font=_CF_QUOTE, fill=(*IVORY, 248))
    cur_y += n * LINE_H + GAP_TEXT_SEP

    # Separateur or
    d.rectangle([(MARGIN, cur_y), (MARGIN + 60, cur_y + 3)], fill=(*GOLD, 220))
    cur_y += 3 + GAP_SEP_NAME

    # Nom personnage
    d.text((MARGIN + 2, cur_y + 2), perso, font=_CF_NAME, fill=(0, 0, 0, 110))
    d.text((MARGIN, cur_y), perso, font=_CF_NAME, fill=(*GOLD, 255))
    cur_y += NAME_H + GAP_NAME_SER

    # Serie
    serie_str = "  ".join(serie.upper())
    d.text((MARGIN, cur_y), serie_str, font=_CF_SERIE, fill=(*GOLD, 160))

    return overlay


async def make_citation_image(quote_data: dict) -> tuple:
    W, H = 1024, 512

    _entry = LOCAL_CHAR_GIFS.get(quote_data["character"])
    if isinstance(_entry, list):
        _avail = [p for p in _entry if os.path.exists(p)]
        gif_path = random.choice(_avail) if _avail else None
    elif _entry and os.path.exists(str(_entry)):
        gif_path = str(_entry)
    else:
        gif_path = next((p for p in _FALLBACK_RANK_GIFS if os.path.exists(p)), None)

    citation = quote_data["quote"]
    perso    = quote_data["character"]
    serie    = quote_data["anime"]

    def _render() -> tuple:
        BG = (5, 5, 12, 255)

        def _fallback_png(overlay_img=None) -> tuple:
            canvas = Image.new("RGBA", (W, H), BG)
            if overlay_img is not None:
                result = Image.alpha_composite(canvas, overlay_img).convert("RGB")
            else:
                result = canvas.convert("RGB")
            buf = io.BytesIO()
            result.save(buf, format="PNG")
            buf.seek(0)
            return buf, False

        try:
            overlay   = _build_citation_overlay(W, H, citation, perso, serie)
            char_mask = _make_char_full_bleed_mask(W, H)
        except Exception:
            print(f"❌ [citation] _build_citation_overlay crash:\n{traceback.format_exc()}")
            return _fallback_png()

        def _composite(src_frame: Image.Image) -> Image.Image:
            base      = Image.new("RGBA", (W, H), BG)
            char_rgba = src_frame.convert("RGBA").resize((W, H), Image.LANCZOS)
            char_flat = Image.alpha_composite(Image.new("RGBA", (W, H), BG), char_rgba)
            char_flat.putalpha(char_mask)
            base = Image.alpha_composite(base, char_flat)
            base = Image.alpha_composite(base, overlay)
            return base.convert("RGB")

        if not gif_path or not os.path.exists(gif_path):
            return _fallback_png(overlay)

        try:
            src = Image.open(gif_path)
        except Exception as e:
            print(f"❌ [citation] Image.open({gif_path}): {e}")
            return _fallback_png(overlay)

        try:
            n_frames = src.n_frames
        except Exception:
            n_frames = 1

        if n_frames <= 1:
            try:
                src.seek(0)
                out = _composite(src.copy())
                buf = io.BytesIO()
                out.save(buf, format="PNG")
                buf.seek(0)
                return buf, False
            except Exception:
                print(f"❌ [citation] composite static frame:\n{traceback.format_exc()}")
                return _fallback_png(overlay)

        max_frames = 28
        step       = max(1, n_frames // max_frames)
        frames, durations = [], []
        for i in range(0, n_frames, step):
            try:
                src.seek(i)
                frames.append(_composite(src.copy()))
                durations.append(max(55, src.info.get("duration", 80) * step))
            except Exception:
                pass

        if not frames:
            return _fallback_png(overlay)

        pal = []
        for f in frames:
            try:
                pal.append(f.quantize(colors=256, method=Image.Quantize.MEDIANCUT,
                                      dither=Image.Dither.NONE))
            except Exception:
                try:
                    pal.append(f.quantize(colors=256))
                except Exception:
                    pass

        if not pal:
            print("❌ [citation] quantize a échoué sur toutes les frames — fallback PNG")
            return _fallback_png(overlay)

        try:
            buf = io.BytesIO()
            pal[0].save(buf, format="GIF", save_all=True, append_images=pal[1:],
                        duration=durations, loop=0, disposal=2, optimize=False)
            buf.seek(0)
            return buf, True
        except Exception:
            print(f"❌ [citation] sauvegarde GIF:\n{traceback.format_exc()}")
            buf = io.BytesIO()
            frames[0].save(buf, format="PNG")
            buf.seek(0)
            return buf, False

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _render)


async def make_rank_image(member: discord.Member, rank_name: str, hours_7d: float):
    CARD_W = 1100
    CARD_H = 650
    GOLD = (212, 175, 55)
    WHITE = (255, 255, 255)
    AVATAR_SIZE = 220
    BG_OPACITY = 0.45
    grade_color = RANK_COLORS.get(rank_name, WHITE)

    bg_path = RANK_BG_PATHS.get(rank_name, RANK_BG_DEFAULT)

    def resolve_image_path(path):
        # Ne pas utiliser Image.verify() : il invalide les GIFs animés après appel
        if os.path.exists(path):
            return path
        filename = os.path.basename(path)
        alt1 = os.path.join("attached_assets", filename)
        if os.path.exists(alt1):
            print(f"⚠️ [make_rank_image] Fallback attached_assets/ pour : {path}")
            return alt1
        if os.path.exists(filename):
            print(f"⚠️ [make_rank_image] Fallback racine pour : {path}")
            return filename
        print(f"⚠️ [make_rank_image] Image introuvable, fallback sur RANK_BG_DEFAULT : {path}")
        return RANK_BG_DEFAULT

    resolved_path = resolve_image_path(bg_path)
    try:
        src_img = Image.open(resolved_path)
    except Exception as e:
        print(f"⚠️ [make_rank_image] Impossible d'ouvrir l'image finale ({resolved_path}): {e}")
        src_img = Image.new("RGBA", (900, 500), (15, 15, 22, 255))
    is_gif = resolved_path.lower().endswith(".gif") or getattr(src_img, "is_animated", False)

    if not _RANK_FONTS:
        _komika = next((p for p in [
            "KOMIKAX_.ttf", "KomikaAxis.ttf",
            "attached_assets/KOMIKAX_.ttf", "attached_assets/KomikaAxis.ttf",
        ] if os.path.exists(p)), None)
        def _tf(path, size):
            try:    return ImageFont.truetype(path, size)
            except: return ImageFont.load_default()
        if _komika:
            _RANK_FONTS.update({
                "felicit":   ImageFont.truetype(_komika, 46),
                "grade":     ImageFont.truetype(_komika, 100),
                "grade_s":   ImageFont.truetype(_komika, 70),
                "pseudo":    ImageFont.truetype(_komika, 50),
                "community": ImageFont.truetype(_komika, 30),
            })
        else:
            _d = ImageFont.load_default()
            _RANK_FONTS.update({"felicit": _d, "grade": _d, "grade_s": _d, "pseudo": _d, "community": _d})
        _RANK_FONTS["credit"] = _tf("Righteous-Regular.ttf", 18)
    font_felicit   = _RANK_FONTS["felicit"]
    font_grade     = _RANK_FONTS["grade"]
    font_grade_s   = _RANK_FONTS["grade_s"]
    font_pseudo    = _RANK_FONTS["pseudo"]
    font_community = _RANK_FONTS["community"]
    font_credit    = _RANK_FONTS["credit"]

    rank_labels = {
        "Pirate":          "PIRATE",
        "Shichibukai":     "SHICHIBUKAI",
        "Amiral":          "AMIRAL",
        "Yonkou":          "YONKOU",
        "Roi des pirates": "ROI DES PIRATES",
    }
    grade_text = rank_labels.get(rank_name, rank_name.upper())
    pseudo = member.display_name
    pseudo_clean = re.sub(r'[^\w\s\-\.]', '', pseudo, flags=re.UNICODE).strip()
    pseudo_clean = ''.join(c for c in pseudo_clean if ord(c) < 128).strip()
    if not pseudo_clean:
        pseudo_clean = "MEMBRE"
    if len(pseudo_clean) > 16:
        pseudo_clean = pseudo_clean[:16]
    print(f"[RANK IMAGE] Pseudo original: {pseudo!r}, nettoyé: {pseudo_clean!r}")

    avatar_img = None
    try:
        avatar_url = member.display_avatar.replace(size=256, format="png").url
        async with _HTTP.get(str(avatar_url)) as resp:
                if resp.status == 200:
                    avatar_bytes = await resp.read()
                    avatar_img = Image.open(io.BytesIO(avatar_bytes)).convert("RGBA")
    except Exception:
        avatar_img = None

    avatar_circle = None
    if avatar_img is not None:
        av = avatar_img.resize((AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)
        mask = Image.new("L", (AVATAR_SIZE, AVATAR_SIZE), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, AVATAR_SIZE, AVATAR_SIZE), fill=255)
        avatar_circle = Image.new("RGBA", (AVATAR_SIZE, AVATAR_SIZE), (0, 0, 0, 0))
        avatar_circle.paste(av, (0, 0), mask)

    def cover_resize(img, tw, th):
        sw, sh = img.size
        scale = max(tw / sw, th / sh)
        nw, nh = int(sw * scale), int(sh * scale)
        img = img.resize((nw, nh), Image.LANCZOS)
        left = (nw - tw) // 2
        top = (nh - th) // 2
        return img.crop((left, top, left + tw, top + th))

    def draw_text_centered(draw, text, font, y, fill, shadow=True):
        bb = draw.textbbox((0, 0), text, font=font)
        w = bb[2] - bb[0]
        x = (CARD_W - w) // 2
        if shadow:
            draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 220))
        draw.text((x, y), text, font=font, fill=fill)

    def compose_frame(bg_frame):
        photo = cover_resize(bg_frame.convert("RGBA"), CARD_W, CARD_H)
        card = photo.copy()

        overlay = Image.new("RGBA", (CARD_W, CARD_H), (10, 10, 15, 140))
        card = Image.alpha_composite(card, overlay)
        draw = ImageDraw.Draw(card, "RGBA")

        draw_text_centered(draw, f"FELICITATIONS POUR LE RANK", font_felicit, 30, (*grade_color, 255))
        draw_text_centered(draw, grade_text, font_grade, 78, (*grade_color, 255))

        if avatar_circle is not None:
            ax = (CARD_W - AVATAR_SIZE) // 2
            ay = 260
            draw.ellipse(
                [ax - 4, ay - 4, ax + AVATAR_SIZE + 4, ay + AVATAR_SIZE + 4],
                outline=grade_color, width=3
            )
            card.paste(avatar_circle, (ax, ay), avatar_circle)
            pseudo_y = ay + AVATAR_SIZE + 24
        else:
            pseudo_y = 280

        draw_text_centered(draw, pseudo_clean, font_pseudo, pseudo_y, (*WHITE, 255))
        draw_text_centered(draw, "BRAMS COMMUNITY", font_community, pseudo_y + 80, (*grade_color, 230))

        # "by Freydiss" - discret, coin bas-droit
        credit = "by Freydiss"
        cb = draw.textbbox((0, 0), credit, font=font_credit)
        cw = cb[2] - cb[0]
        draw.text((CARD_W - cw - 16, CARD_H - 28), credit, font=font_credit, fill=(200, 200, 200, 160))

        return card

    buf = io.BytesIO()
    if is_gif:
        frames = []
        durations = []
        try:
            n_frames = src_img.n_frames
        except Exception:
            n_frames = 1
        if n_frames == 0:
            n_frames = 1
        max_frames = 60
        step = max(1, n_frames // max_frames)
        for i in range(0, n_frames, step):
            try:
                src_img.seek(i)
                frames.append(compose_frame(src_img.copy()))
                src_img.seek(i)
                dur = src_img.info.get("duration", 80)
                durations.append(max(40, dur * step))
            except Exception as e:
                print(f"⚠️ [make_rank_image] Erreur frame {i}: {e}")
                continue
        if not frames:
            img = compose_frame(src_img)
            img.convert("RGB").save(buf, format="PNG", optimize=True)
            buf.seek(0)
            return buf, False
        pal_frames = []
        for f in frames:
            rgb = f.convert("RGB")
            pal = rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            pal_frames.append(pal)
        pal_frames[0].save(
            buf, format="GIF", save_all=True, append_images=pal_frames[1:],
            duration=durations, loop=0, disposal=2, optimize=False
        )
    else:
        img = compose_frame(src_img)
        img.convert("RGB").save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf, is_gif

async def check_alert(member: discord.Member, hours_7d: float, data=None):
    if data is None:
        data = _CACHE
    uid = str(member.id)
    user = get_user(data, uid)

    rank_threshold = {"Pirate": 10, "Shichibukai": 25, "Amiral": 40, "Yonkou": 70, "Roi des pirates": 150}

    # Rangs que le membre possède RÉELLEMENT sur Discord (pas last_rank qui change avant check_alert)
    member_ranks = {_RANK_ID_TO_NAME[r.id] for r in member.roles if r.id in _RANK_ROLE_IDS}

    # Reset alerted si le rang alerté n'est plus possédé
    alerted_rank = user.get("alerted")
    if alerted_rank and isinstance(alerted_rank, str) and alerted_rank not in member_ranks:
        user["alerted"] = False
        _DIRTY.add(uid)

    if not member_ranks:
        return

    # Rang le plus élevé possédé
    current_rank = next((name for _, name in RANKS if name in member_ranks), None)
    if current_rank is None:
        return

    threshold = rank_threshold[current_rank]
    already_alerted = user.get("alerted") == current_rank
    in_danger_zone = (threshold - DERANK_WARNING_THRESHOLD) <= hours_7d < threshold

    if in_danger_zone and not already_alerted:
        if user.get("dm_optout", False):
            user["alerted"] = current_rank
            _DIRTY.add(uid)
            return
        try:
            heures_manquantes = round(threshold - hours_7d, 1)
            rank_emoji = RANK_EMOJIS.get(current_rank, "🏴")
            dm_text = (
                f"⚠️ **Attention, tu risques de perdre ton rank !**\n\n"
                f"Salut {member.display_name} ! Tu es actuellement **{rank_emoji} {current_rank}** "
                f"sur le serveur **{member.guild.name}**.\n\n"
                f"Tes heures vocales sur les 7 derniers jours sont descendues à `{round(hours_7d, 1)}h`, "
                f"et il te faut au minimum `{threshold}h` pour garder ton rank.\n\n"
                f"Il te manque environ `{heures_manquantes}h` de vocal dans les prochains jours "
                f"pour éviter de rétrograder 🚨\n\n"
                f"Passe en vocal dès que possible pour sauver ton grade !\n\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"*BRAMS SCORE  |  by Freydiss*\n"
                f"*(Envoie `1` ici si tu ne veux plus recevoir ces DMs)*"
            )
            await member.send(dm_text)
            user["alerted"] = current_rank
            _DIRTY.add(uid)
            print(f"📨 Alerte DM envoyée à {member.display_name} ({current_rank} : {hours_7d:.1f}h/{threshold}h)")
        except discord.Forbidden:
            user["alerted"] = current_rank
            _DIRTY.add(uid)
        except Exception as e:
            print(f"❌ Erreur DM alerte à {member.display_name}: {e}")

    if hours_7d >= threshold and already_alerted:
        user["alerted"] = False
        _DIRTY.add(uid)

# ─────────────────────────────────────────
#  GRAPHIQUES
# ─────────────────────────────────────────
def make_activity_graph(vocal_by_day, msg_by_day, title="Activite des 7 derniers jours"):
    # Sanitiser le titre pour éviter les warnings "Glyph missing"
    title = re.sub(r'[^\x00-\x7F\u00C0-\u024F]', '', title).strip() or "Activite"
    font_kw = {"fontfamily": CUSTOM_FONT} if CUSTOM_FONT else {}

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), facecolor="#1a1a2e")
    fig.suptitle(title, color="#e0e0e0", fontsize=18, fontweight="bold", y=0.98, **font_kw)

    days = []
    for i in range(6, -1, -1):
        d = datetime.now(timezone.utc) - timedelta(days=i)
        days.append(d.strftime("%d/%m"))

    vocal_hours = [vocal_by_day.get(d, 0) / 3600 for d in days]
    msg_counts  = [msg_by_day.get(d, 0) for d in days]

    ax1.set_facecolor("#16213e")
    ax1.fill_between(range(len(days)), vocal_hours, alpha=0.3, color="#7289da")
    ax1.plot(range(len(days)), vocal_hours, color="#7289da", linewidth=2.5, marker="o", markersize=8, markerfacecolor="#ffffff", markeredgecolor="#7289da", markeredgewidth=2)
    for i_d, val in enumerate(vocal_hours):
        if val > 0:
            ax1.annotate(f"{val:.1f}h", (i_d, val), textcoords="offset points", xytext=(0, 12), ha="center", color="white", fontsize=10, fontweight="bold", **font_kw)
    ax1.set_xticks(range(len(days)))
    ax1.set_xticklabels(days, color="#aaa", fontsize=10, **font_kw)
    ax1.set_title("VOCAL (heures)", color="#7289da", fontsize=14, fontweight="bold", pad=10, **font_kw)
    ax1.tick_params(colors="#666", labelsize=9)
    ax1.set_ylim(bottom=0)
    for spine in ax1.spines.values():
        spine.set_visible(False)
    ax1.grid(axis="y", color="#333", alpha=0.5, linestyle="--")

    ax2.set_facecolor("#16213e")
    max_msg = max(msg_counts) if max(msg_counts) > 0 else 1
    bar_colors = [f"#{int(50 + 150 * v/max_msg):02x}{int(200 + 55 * v/max_msg):02x}{int(100 + 50 * v/max_msg):02x}" if v > 0 else "#333" for v in msg_counts]
    bars = ax2.bar(range(len(days)), msg_counts, color=bar_colors, alpha=0.9, width=0.55, edgecolor="#16213e", linewidth=1)
    for bar, val in zip(bars, msg_counts):
        if val > 0:
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max_msg * 0.03, str(val), ha="center", va="bottom", color="white", fontsize=10, fontweight="bold", **font_kw)
    ax2.set_xticks(range(len(days)))
    ax2.set_xticklabels(days, color="#aaa", fontsize=10, **font_kw)
    ax2.set_title("MESSAGES", color="#57f287", fontsize=14, fontweight="bold", pad=10, **font_kw)
    ax2.tick_params(colors="#666", labelsize=9)
    ax2.set_ylim(bottom=0)
    for spine in ax2.spines.values():
        spine.set_visible(False)
    ax2.grid(axis="y", color="#333", alpha=0.5, linestyle="--")

    plt.tight_layout(rect=[0, 0, 1, 0.93])
    add_background(fig, alpha=0.12)
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150)
    buf.seek(0)
    plt.close()
    return buf

def make_peak_hours_graph(hour_counts):
    font_kw = {"fontfamily": CUSTOM_FONT} if CUSTOM_FONT else {}

    fig, ax = plt.subplots(figsize=(14, 5), facecolor="#1a1a2e")
    ax.set_facecolor("#16213e")

    hours = list(range(24))
    values = [hour_counts.get(h, 0) for h in hours]
    max_val = max(values) if max(values) > 0 else 1

    gradient_colors = [plt.cm.cool(v / max_val * 0.8 + 0.1) for v in values]

    bars = ax.bar(hours, values, color=gradient_colors, alpha=0.9, width=0.7, edgecolor="#1a1a2e", linewidth=1)

    ax.fill_between(hours, values, alpha=0.15, color="#7289da", interpolate=True)

    peak_idx = values.index(max(values))
    bars[peak_idx].set_edgecolor("#ffd700")
    bars[peak_idx].set_linewidth(2)
    bars[peak_idx].set_alpha(1.0)

    ax.set_xticks(hours)
    ax.set_xticklabels([f"{h}h" for h in hours], color="#aaa", fontsize=9, **font_kw)
    ax.set_title("Heures de pointe (7 jours)", color="#e0e0e0", fontsize=16, fontweight="bold", pad=15, **font_kw)
    ax.tick_params(colors="#666", labelsize=9)
    ax.set_ylim(bottom=0)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.grid(axis="y", color="#333", alpha=0.4, linestyle="--")

    if values[peak_idx] > 0:
        ax.annotate(f"⚡ {values[peak_idx]:.0f} min", (peak_idx, values[peak_idx]),
                    textcoords="offset points", xytext=(0, 12), ha="center",
                    color="#ffd700", fontsize=12, fontweight="bold", **font_kw)

    plt.tight_layout()
    add_background(fig, alpha=0.12)
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150)
    buf.seek(0)
    plt.close()
    return buf


# ─────────────────────────────────────────
#  GÉNÉRATEUR IMAGE WANTED (template)
# ─────────────────────────────────────────
TEMPLATE_PATH = "template.png"

# ─────────────────────────────────────────
#  EVENTS
# ─────────────────────────────────────────
@bot.event
async def on_ready():
    global _HTTP
    print(f"[BOT] Connecte : {bot.user}")
    init_db()
    if _HTTP is None or _HTTP.closed:
        _HTTP = aiohttp.ClientSession()

    # Charge le cache mémoire UNE SEULE FOIS
    await load_data_async()

    # Démarre les boucles de fond
    if not check_ranks_loop.is_running():
        check_ranks_loop.start()
    if not vocal_rank_loop.is_running():
        vocal_rank_loop.start()
    if not flush_dirty_loop.is_running():
        flush_dirty_loop.start()
    if not nick_restore_loop.is_running():
        nick_restore_loop.start()

    # Récupère les join_times des membres déjà en vocal
    data = _CACHE

    # Détermine quels membres sont actuellement en vocal
    in_voice_uids: set[str] = set()
    for guild in bot.guilds:
        for channel in list(guild.voice_channels) + list(guild.stage_channels):
            for member in channel.members:
                if not member.bot:
                    in_voice_uids.add(str(member.id))

    # Efface les join_times fantômes (membres hors vocal au redémarrage)
    stale_cleared = 0
    for uid, udata in data.items():
        if uid not in in_voice_uids and udata.get("join_time"):
            udata["join_time"] = None
            _DIRTY.add(uid)
            stale_cleared += 1

    # Initialise le join_time des membres en vocal qui n'en ont pas
    recovered = 0
    for guild in bot.guilds:
        for channel in list(guild.voice_channels) + list(guild.stage_channels):
            for member in channel.members:
                if member.bot:
                    continue
                uid = str(member.id)
                user = get_user(data, uid)
                if not user["join_time"]:
                    user["join_time"] = now_ts()
                    _DIRTY.add(uid)
                    recovered += 1

    if stale_cleared:
        print(f"[BOT] {stale_cleared} join_times fantomes effacés au démarrage")
    if recovered:
        print(f"[BOT] {recovered} membres en vocal recuperes au demarrage")

    # Sync rétroactif des Berry vocaux (une seule fois par utilisateur)
    synced = 0
    _now = now_ts()
    for uid, udata in data.items():
        if udata.get("vocal_berry_synced"):
            continue
        sessions = udata.get("vocal_sessions", [])
        jt       = udata.get("join_time")
        extra    = udata.get("extra_seconds", 0)
        total_sec = total_seconds(sessions, join_time=jt, extra=extra, _now=_now)
        earned = int(total_sec / 3600 * 100_000)
        if earned > 0:
            add_berrys(uid, earned)
        udata["vocal_berry_synced"] = True
        _DIRTY.add(uid)
        synced += 1
    if synced:
        print(f"[BOT] Sync Berry vocal retro : {synced} utilisateurs credites")
    print("[BOT] Pret !")

@bot.event
async def on_message(message):
    if message.author.bot:
        return
    if isinstance(message.channel, discord.DMChannel):
        if message.content.strip() == "1":
            uid = str(message.author.id)
            user = get_user(_CACHE, uid)
            user["dm_optout"] = True
            _DIRTY.add(uid)
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(db_executor, _sync_flush_dirty)
            print(f"[OPT-OUT] {message.author} ({uid}) a désactivé les DMs")
            try:
                await message.channel.send("✅ Tu ne recevras plus d'annonces en DM de ma part.")
            except Exception:
                pass
        return
    uid  = str(message.author.id)
    # Lecture et écriture directement dans le cache mémoire - 0 réseau
    user = get_user(_CACHE, uid)
    user["messages"].append(now_ts())
    clean_old_data(user)
    _DIRTY.add(uid)   # sera flushed vers DB dans les 30s
    await bot.process_commands(message)

@bot.event
async def on_voice_state_update(member, before, after):
    if member.bot:
        return

    # Lecture/écriture directement dans le cache - 0 réseau
    uid  = str(member.id)
    user = get_user(_CACHE, uid)

    if before.channel is None and after.channel is not None:
        user["join_time"] = now_ts()
        _DIRTY.add(uid)

    elif before.channel is not None and after.channel is None:
        if user["join_time"]:
            start = user["join_time"]
            end = now_ts()
            session_seconds = end - start
            user["vocal_sessions"].append({
                "start": start,
                "end": end,
                "channel": str(before.channel.id)
            })
            user["join_time"] = None
            clean_old_data(user)

            # Berry gagnés : même taux que la prime (100 000 / heure)
            earned = int(session_seconds / 3600 * 100_000)
            if earned > 0:
                add_berrys(uid, earned)

            _DIRTY.add(uid)

            seconds_7d = seconds_in_period(user["vocal_sessions"], 7)
            hours_7d = seconds_7d / 3600
            await update_rank(member, hours_7d, announce=True)

    elif before.channel is not None and after.channel is not None and before.channel != after.channel:
        if user["join_time"]:
            start = user["join_time"]
            end = now_ts()
            user["vocal_sessions"].append({
                "start": start,
                "end": end,
                "channel": str(before.channel.id)
            })
        user["join_time"] = now_ts()
        clean_old_data(user)
        _DIRTY.add(uid)
        seconds_7d = seconds_in_period(user["vocal_sessions"], 7, join_time=user["join_time"])
        hours_7d = seconds_7d / 3600
        await update_rank(member, hours_7d, announce=True)

# ─────────────────────────────────────────
#  LOOP VOCALE RAPIDE (membres en vocal seulement)
# ─────────────────────────────────────────
@tasks.loop(minutes=1)
async def nick_restore_loop():
    _now = now_ts()
    for uid, udata in list(_CACHE.items()):
        restore = udata.get("nick_restore")
        if not restore:
            continue
        expires = restore.get("expires", 0)
        if _now < expires:
            continue
        print(f"[RESTORE] Restauration pseudo UID={uid} nick={restore.get('nick')!r} (expiré)")
        udata.pop("nick_restore")
        _DIRTY.add(uid)
        guild = bot.get_guild(int(restore["guild"]))
        if not guild:
            print(f"[RESTORE] Guild {restore['guild']} introuvable")
            continue
        member = guild.get_member(int(uid))
        if not member:
            print(f"[RESTORE] Membre {uid} introuvable dans la guild")
            continue
        try:
            await member.edit(nick=restore.get("nick"))
            print(f"[RESTORE] ✅ Pseudo restauré pour {member.display_name} ({uid})")
        except discord.Forbidden:
            print(f"[RESTORE] ❌ Forbidden — bot sans permission pour {uid}")
        except Exception as e:
            print(f"[RESTORE] ❌ Erreur inattendue pour {uid}: {e}")

@nick_restore_loop.before_loop
async def _before_nick_restore():
    await bot.wait_until_ready()

@nick_restore_loop.error
async def _nick_restore_error(err):
    print(f"[RESTORE] ❌ Loop crashée : {err}")


@tasks.loop(minutes=2)
async def vocal_rank_loop():
    for guild in bot.guilds:
        for vc in list(guild.voice_channels) + list(guild.stage_channels):
            for member in vc.members:
                if member.bot:
                    continue
                uid = str(member.id)
                user = get_user(_CACHE, uid)
                jt = user.get("join_time")
                hours_7d = seconds_in_period(user["vocal_sessions"], 7, join_time=jt) / 3600
                try:
                    await update_rank(member, hours_7d, announce=True, data=_CACHE)
                except Exception as e:
                    print(f"[VOCAL_RANK] Erreur {member.display_name}: {e}")
                await asyncio.sleep(0)

# ─────────────────────────────────────────
#  LOOP COMPLÈTE (tous membres, alertes, deranks)
# ─────────────────────────────────────────
@tasks.loop(minutes=10)
async def check_ranks_loop():
    tick = time.time()
    total_members = 0

    for guild in bot.guilds:
        if not guild.chunked:
            try:
                await guild.chunk()
            except Exception as e:
                print(f"[RANKS] Chunk error {guild.name}: {e}")
        for member in guild.members:
            if member.bot:
                continue
            total_members += 1
            uid  = str(member.id)
            # Lecture directe depuis le cache - 0 réseau
            user = get_user(_CACHE, uid)
            old_snapshot = (user.get("last_rank"), user.get("alerted"))
            clean_old_data(user)
            jt = user.get("join_time")

            hours_7d = seconds_in_period(user["vocal_sessions"], 7, join_time=jt) / 3600

            if hours_7d == 0 and old_snapshot[0] is None:
                if total_members % 100 == 0:
                    await asyncio.sleep(0)
                continue

            try:
                await check_alert(member, hours_7d, data=_CACHE)
                await update_rank(member, hours_7d, announce=True, data=_CACHE)
            except Exception as e:
                print(f"[RANKS] Erreur {member.display_name}: {e}")

            # Marquer dirty si un champ a changé (le flush_dirty_loop s'en charge)
            if (user.get("last_rank"), user.get("alerted")) != old_snapshot:
                _DIRTY.add(uid)

            if total_members % 100 == 0:
                await asyncio.sleep(0)

    elapsed = time.time() - tick
    print(f"[RANKS] check_ranks_loop : {total_members} membres en {elapsed:.1f}s")

# ─────────────────────────────────────────
#  COMMANDES SLASH
# ─────────────────────────────────────────

def make_progress_bar(current, target, length=10):
    filled = int(min(current / target, 1.0) * length) if target > 0 else 0
    empty = length - filled
    return "▰" * filled + "▱" * empty

RANK_EMOJIS = {"Pirate": "🏴‍☠️", "Shichibukai": "⚔️", "Amiral": "🪖", "Yonkou": "👑", "Roi des pirates": "🤴"}

def build_vocal_by_day(user):
    vocal_by_day = defaultdict(float)
    msg_by_day = defaultdict(int)
    _now_val = now_ts()

    # Fenêtres glissantes de 24h pour les 7 derniers jours
    day_windows = []
    for i in range(7):
        label = datetime.fromtimestamp(_now_val - i * 86400, tz=timezone.utc).strftime("%d/%m")
        day_windows.append((label, _now_val - (i + 1) * 86400, _now_val - i * 86400))

    def _distribute(start, end):
        for label, win_start, win_end in day_windows:
            overlap = min(end, win_end) - max(start, win_start)
            if overlap > 0:
                vocal_by_day[label] += overlap

    jt = user.get("join_time")
    if jt:
        _distribute(jt, _now_val)
    for s in user["vocal_sessions"]:
        _distribute(s["start"], s["end"])
    for ts in user["messages"]:
        day = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%d/%m")
        msg_by_day[day] += 1
    return vocal_by_day, msg_by_day

@bot.tree.command(name="stats", description="Tes stats vocales et messages avec graphique")
async def stats(interaction: discord.Interaction):
    try:
        await interaction.response.defer(ephemeral=False)
    except discord.NotFound:
        print("⚠️ /stats : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /stats defer failed: {e}")
        return
    data = _CACHE
    uid = str(interaction.user.id)
    user = get_user(data, uid)
    me = interaction.user

    jt = user.get("join_time")
    s1d  = seconds_in_period(user["vocal_sessions"], 1, join_time=jt)
    s7d  = seconds_in_period(user["vocal_sessions"], 7, join_time=jt)
    s14d = seconds_in_period(user["vocal_sessions"], 14, join_time=jt)
    s_tot = total_seconds(user["vocal_sessions"], join_time=jt, extra=user.get("extra_seconds", 0))
    m1d  = messages_in_period(user["messages"], 1)
    m7d  = messages_in_period(user["messages"], 7)
    m14d = messages_in_period(user["messages"], 14)
    m_tot = total_messages(user["messages"])

    hours_7d = s7d / 3600
    rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"
    r_emoji = RANK_EMOJIS.get(rank_actuel, "💀")
    ranks_display = format_all_ranks_display(hours_7d)
    next_thresh, next_rank = get_next_rank(hours_7d)
    prime_val = get_berrys(uid)

    # Indicateur EN VOCAL dans la description (plus petit que le titre)
    live_line = "\u3000🎙️ *- en vocal actuellement*\n" if jt else ""

    if next_rank:
        hours_restantes = next_thresh - hours_7d
        rank_section = (
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"**Rangs** : {ranks_display}\n"
            f"**Prochain** : {next_rank} dans `{hours_restantes:.1f}h`"
        )
    else:
        rank_section = (
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"**Rangs** : {ranks_display}\n"
            f"👑 **Rang maximum atteint !**"
        )

    embed = discord.Embed(
        title=f"{r_emoji} {me.display_name.upper()}",
        description=(
            f"{live_line}"
            f"{rank_section}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💰 **Prime** : **{format_prime(prime_val)}**\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🎙️ **TEMPS VOCAL**\n"
            f"**Aujourd'hui** : `{format_duration(s1d)}`\n"
            f"7 jours : `{format_duration(s7d)}`\n"
            f"14 jours : `{format_duration(s14d)}`\n"
            f"Total : `{format_duration(s_tot)}`\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💬 **MESSAGES**\n"
            f"**Aujourd'hui** : `{m1d}`\n"
            f"7 jours : `{m7d}`\n"
            f"14 jours : `{m14d}`\n"
            f"Total : `{m_tot}`"
        ),
        color=discord.Color.from_rgb(212, 175, 55)
    )
    embed.set_thumbnail(url=me.display_avatar.url)

    vocal_by_day, msg_by_day = build_vocal_by_day(user)
    graph_buf = make_activity_graph(vocal_by_day, msg_by_day, f"Activite de {me.display_name}")

    embed.set_image(url="attachment://graph.png")
    embed.set_footer(text=f"⚓ BRAMS SCORE BY FREYDISS • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    try:
        await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"))
    except discord.NotFound:
        print("⚠️ /stats : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /stats followup failed: {e}")


def clean_name(name: str) -> str:
    return name.encode("ascii", "ignore").decode("ascii").strip() or name


@bot.tree.command(name="top", description="Classement vocal et messages")
@app_commands.describe(periode="Période")
@app_commands.choices(periode=[
    app_commands.Choice(name="📅 Aujourd'hui", value="1"),
    app_commands.Choice(name="📆 7 Jours", value="7"),
    app_commands.Choice(name="📆 14 Jours", value="14"),
    app_commands.Choice(name="🏴‍☠️ All Time", value="all"),
])
async def top(interaction: discord.Interaction, periode: app_commands.Choice[str]):
    try:
        await interaction.response.defer()
    except discord.NotFound:
        print("⚠️ /top : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /top defer failed: {e}")
        return
    data = _CACHE
    guild = interaction.guild
    all_time = periode.value == "all"
    days = 0 if all_time else int(periode.value)

    vocal_list, msg_list, prime_list = [], [], []
    _now = now_ts()

    for uid, udata in data.items():
        member = guild.get_member(int(uid))
        if not member or member.bot:
            continue
        ujt      = udata.get("join_time")
        sessions = udata.get("vocal_sessions", [])
        messages = udata.get("messages", [])
        if all_time:
            sec  = total_seconds(sessions, join_time=ujt, extra=udata.get("extra_seconds", 0), _now=_now)
            msgs = total_messages(messages)
        else:
            sec  = seconds_in_period(sessions, days, join_time=ujt, _now=_now)
            msgs = messages_in_period(messages, days, _now=_now)
        prime_val = get_berrys(uid)
        vocal_list.append((uid, member.display_name, sec))
        msg_list.append((uid, member.display_name, msgs))
        prime_list.append((uid, member.display_name, prime_val))

    vocal_list.sort(key=lambda x: x[2], reverse=True)
    msg_list.sort(key=lambda x: x[2], reverse=True)
    prime_list.sort(key=lambda x: x[2], reverse=True)

    vocal_now = {str(m.id) for g in bot.guilds for vc in g.voice_channels for m in vc.members}
    _medals_all = ["🥇", "🥈", "🥉"] + [f"{i}." for i in range(4, 101)]

    def _build_top_embed(page: int) -> discord.Embed:
        start = (page - 1) * 10
        sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        def _section(lst, live_emoji, formatter):
            parts = []
            for abs_i, (uid_n, n, v) in enumerate(lst[start:start+10], start=start):
                if v <= 0:
                    break
                live = f"  {live_emoji}" if uid_n in vocal_now else ""
                medal = _medals_all[abs_i] if abs_i < len(_medals_all) else f"{abs_i+1}."
                parts.append(f"{medal}  **{clean_name(n)}**{live}\n     `{formatter(v)}`")
            return "\n\n".join(parts) if parts else "*Aucune donnée*"

        vocal_str = _section(vocal_list, "🎙️", format_duration)
        msg_str   = _section(msg_list,   "✉️",  lambda v: f"{v} messages")
        prime_str = _section(prime_list, "💰",  lambda p: f"฿ {format_prime(p)}")

        rank_range = f"#{start+1}–#{start+10}"
        embed = discord.Embed(
            title=f"🏆 CLASSEMENT  -  {periode.name.upper()}  -  {rank_range}",
            description=(
                f"{sep}\n\n"
                f"🎙️ **TOP VOCAL  {rank_range}**\n"
                f"{sep}\n"
                f"{vocal_str}\n\n"
                f"{sep}\n\n"
                f"💬 **TOP MESSAGES  {rank_range}**\n"
                f"{sep}\n"
                f"{msg_str}\n\n"
                f"{sep}\n\n"
                f"💰 **TOP PRIMES EN BERRY  {rank_range}**\n"
                f"{sep}\n"
                f"{prime_str}\n\n"
                f"{sep}"
            ),
            color=discord.Color(0xD4AF37)
        )
        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url)
        embed.set_footer(text=f"BRAMS SCORE  |  by Freydiss  •  {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC  •  Page {page}/10")
        return embed

    class TopView(discord.ui.View):
        def __init__(self, page=1):
            super().__init__(timeout=180)
            self.page = page
            self._refresh()

        def _refresh(self):
            self.prev_btn.disabled = (self.page == 1)
            self.next_btn.disabled = (self.page == 10)

        @discord.ui.button(label="◀  Précédent", style=discord.ButtonStyle.secondary)
        async def prev_btn(self, itx: discord.Interaction, button: discord.ui.Button):
            self.page = max(1, self.page - 1)
            self._refresh()
            await itx.response.edit_message(embed=_build_top_embed(self.page), view=self)

        @discord.ui.button(label="Suivant  ▶", style=discord.ButtonStyle.secondary)
        async def next_btn(self, itx: discord.Interaction, button: discord.ui.Button):
            self.page = min(10, self.page + 1)
            self._refresh()
            await itx.response.edit_message(embed=_build_top_embed(self.page), view=self)

        async def on_timeout(self):
            for item in self.children:
                item.disabled = True

    view = TopView(page=1)
    embed = _build_top_embed(1)

    try:
        await interaction.followup.send(embed=embed, view=view)
    except discord.NotFound:
        print("⚠️ /top : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /top followup failed: {e}")


@bot.tree.command(name="serveur", description="Stats globales du serveur")
async def serveur(interaction: discord.Interaction):
    try:
        await interaction.response.defer()
    except discord.NotFound:
        print("⚠️ /serveur : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /serveur defer failed: {e}")
        return
    data = _CACHE
    guild = interaction.guild

    total_vocal_7d = 0
    total_msg_7d   = 0
    total_vocal_all = 0
    total_msg_all   = 0
    membres_actifs = 0
    en_vocal_now   = 0
    channel_usage  = defaultdict(float)
    hour_usage     = defaultdict(float)
    rank_counts    = defaultdict(int)
    _now    = now_ts()
    cutoff7 = _now - 7 * 86400

    for uid, udata in data.items():
        member = guild.get_member(int(uid))
        if not member or member.bot:
            continue
        ujt = udata.get("join_time")
        if ujt:
            en_vocal_now += 1
        sessions = udata.get("vocal_sessions", [])
        messages = udata.get("messages", [])
        sec  = seconds_in_period(sessions, 7, join_time=ujt, _now=_now)
        msgs = messages_in_period(messages, 7, _now=_now)
        sec_all = total_seconds(sessions, join_time=ujt, extra=udata.get("extra_seconds", 0), _now=_now)
        msgs_all = total_messages(messages)
        total_vocal_7d += sec
        total_msg_7d   += msgs
        total_vocal_all += sec_all
        total_msg_all   += msgs_all
        if sec > 0 or msgs > 0:
            membres_actifs += 1
        r = get_rank_for_hours(sec / 3600)
        if r:
            rank_counts[r] += 1

        for s in sessions:
            if s["end"] < cutoff7:
                continue
            duration = s["end"] - max(s["start"], cutoff7)
            ch_id = s.get("channel")
            if ch_id:
                channel_usage[ch_id] += duration

            start_dt = datetime.fromtimestamp(max(s["start"], cutoff7), tz=timezone.utc)
            end_dt   = datetime.fromtimestamp(s["end"], tz=timezone.utc)
            current  = start_dt
            while current < end_dt:
                next_hour = current.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                chunk = min(next_hour, end_dt) - current
                hour_usage[current.hour] += chunk.total_seconds() / 60
                current = next_hour

        # Session vocale en cours : incluse dans le graphe heures de pointe et top salons
        if ujt:
            seg_start = max(ujt, cutoff7)
            seg_end   = _now
            if member and member.voice and member.voice.channel:
                channel_usage[str(member.voice.channel.id)] += seg_end - seg_start
            start_dt = datetime.fromtimestamp(seg_start, tz=timezone.utc)
            end_dt   = datetime.fromtimestamp(seg_end,   tz=timezone.utc)
            current  = start_dt
            while current < end_dt:
                next_hour = current.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                chunk = min(next_hour, end_dt) - current
                hour_usage[current.hour] += chunk.total_seconds() / 60
                current = next_hour

    top_channels = sorted(channel_usage.items(), key=lambda x: x[1], reverse=True)[:3]
    medals = ["🥇", "🥈", "🥉"]
    salon_lines = []
    for i, (ch_id, secs) in enumerate(top_channels):
        ch = guild.get_channel(int(ch_id))
        name = ch.name if ch else "Salon supprimé"
        salon_lines.append(f"{medals[i]} **{name}** - {format_duration(secs)}")

    peak_hour = max(hour_usage, key=hour_usage.get) if hour_usage else 0

    rank_line = " · ".join(f"{RANK_EMOJIS.get(r, '🎖️')} {r}: **{c}**" for r, c in sorted(rank_counts.items(), key=lambda x: x[1], reverse=True)) or "*Aucun*"

    graph_buf = make_peak_hours_graph(hour_usage)

    embed1 = discord.Embed(
        title=f"🌐 {guild.name.upper()}",
        description=f"*Vue d'ensemble du serveur*",
        color=discord.Color.from_rgb(212, 175, 55)
    )
    if guild.icon:
        embed1.set_thumbnail(url=guild.icon.url)

    embed1.add_field(name="👥 Membres actifs (7j)", value=f"**{membres_actifs}**", inline=True)
    embed1.add_field(name="🎙️ En vocal maintenant", value=f"**{en_vocal_now}**", inline=True)
    embed1.add_field(name="🕐 Heure de pointe", value=f"**{peak_hour}h - {peak_hour+1}h UTC**", inline=True)

    embed1.add_field(
        name="🎙️ Vocal",
        value=f"7 jours : **{format_duration(total_vocal_7d)}**\nTotal : **{format_duration(total_vocal_all)}**",
        inline=True
    )
    embed1.add_field(
        name="💬 Messages",
        value=f"7 jours : **{total_msg_7d}**\nTotal : **{total_msg_all}**",
        inline=True
    )
    embed1.add_field(name="\u200b", value="\u200b", inline=True)

    embed1.add_field(
        name="🎖️ Répartition des rangs",
        value=rank_line,
        inline=False
    )

    embed1.add_field(
        name="🔊 Top Salons (7j)",
        value="\n".join(salon_lines) if salon_lines else "*Aucune donnée*",
        inline=False
    )

    embed2 = discord.Embed(color=discord.Color.from_rgb(85, 50, 18))
    embed2.set_image(url="attachment://peaks.png")
    embed2.set_footer(text=f"⚓ BRAMS SCORE BY FREYDISS • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    try:
        await interaction.followup.send(
            embeds=[embed1, embed2],
            file=discord.File(graph_buf, "peaks.png")
        )
    except discord.NotFound:
        print("⚠️ /serveur : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /serveur followup failed: {e}")


@bot.tree.command(name="tout", description="Tout voir : tes stats + serveur + classement")
async def tout(interaction: discord.Interaction):
    try:
        await interaction.response.defer()
    except discord.NotFound:
        print("⚠️ /tout : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /tout defer failed: {e}")
        return
    data = _CACHE
    guild = interaction.guild
    uid = str(interaction.user.id)
    user = get_user(data, uid)
    me = interaction.user

    jt = user.get("join_time")
    s1d  = seconds_in_period(user["vocal_sessions"], 1, join_time=jt)
    s7d  = seconds_in_period(user["vocal_sessions"], 7, join_time=jt)
    s14d = seconds_in_period(user["vocal_sessions"], 14, join_time=jt)
    s_tot = total_seconds(user["vocal_sessions"], join_time=jt, extra=user.get("extra_seconds", 0))
    m1d  = messages_in_period(user["messages"], 1)
    m7d  = messages_in_period(user["messages"], 7)
    m14d = messages_in_period(user["messages"], 14)
    m_tot = total_messages(user["messages"])
    hours_7d = s7d / 3600
    hours_tot = s_tot / 3600
    rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"
    r_emoji = RANK_EMOJIS.get(rank_actuel, "💀")
    prime_val = get_berrys(uid)
    next_thresh, next_rank = get_next_rank(hours_7d)
    live_indicator = "  　🎙️ *EN VOCAL*" if jt else ""

    if next_rank:
        bar = make_progress_bar(hours_7d, next_thresh)
        progress_str = f"`{bar}` {hours_7d:.1f}h / {next_thresh}h\nProchain : **{next_rank}**"
    else:
        progress_str = "`▰▰▰▰▰▰▰▰▰▰` 👑 **Rang maximum !**"

    embed1 = discord.Embed(
        title=f"⚓ {me.display_name.upper()}{live_indicator}",
        color=discord.Color.from_rgb(212, 175, 55)
    )
    embed1.set_thumbnail(url=me.display_avatar.url)

    embed1.add_field(
        name=f"{r_emoji} Rang - **{rank_actuel}**",
        value=progress_str,
        inline=False
    )
    embed1.add_field(
        name="🎙️ Vocal",
        value=(
            f"Aujourd'hui : **{format_duration(s1d)}**\n"
            f"7 jours : **{format_duration(s7d)}**\n"
            f"14 jours : **{format_duration(s14d)}**\n"
            f"Total : **{format_duration(s_tot)}**"
        ),
        inline=True
    )
    embed1.add_field(
        name="💬 Messages",
        value=(
            f"Aujourd'hui : **{m1d}**\n"
            f"7 jours : **{m7d}**\n"
            f"14 jours : **{m14d}**\n"
            f"Total : **{m_tot}**"
        ),
        inline=True
    )
    embed1.add_field(
        name="💰 Prime",
        value=f"**{format_prime(prime_val)}**",
        inline=True
    )

    total_vocal_srv, total_msg_srv, membres_actifs = 0, 0, 0
    vocal_list, msg_list = [], []

    for u_id, udata in data.items():
        member = guild.get_member(int(u_id))
        if not member or member.bot:
            continue
        ujt = udata.get("join_time")
        sec  = seconds_in_period(udata.get("vocal_sessions", []), 7, join_time=ujt)
        msgs = messages_in_period(udata.get("messages", []), 7)
        total_vocal_srv += sec
        total_msg_srv   += msgs
        if sec > 0 or msgs > 0:
            membres_actifs += 1
        vocal_list.append((member.display_name, sec))
        msg_list.append((member.display_name, msgs))

    vocal_list.sort(key=lambda x: x[1], reverse=True)
    msg_list.sort(key=lambda x: x[1], reverse=True)
    medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]

    def build_top(lst, formatter):
        lines = []
        for i, (n, v) in enumerate(lst[:5]):
            if v <= 0:
                break
            lines.append(f"{medals[i]} **{n}** - {formatter(v)}")
        return "\n".join(lines) or "*Aucune donnée*"

    embed2 = discord.Embed(
        title="🌐 CLASSEMENT SERVEUR (7 jours)",
        color=discord.Color.from_rgb(20, 30, 60)
    )
    embed2.add_field(name="👥 Actifs", value=f"**{membres_actifs}**", inline=True)
    embed2.add_field(name="🎙️ Vocal total", value=f"**{format_duration(total_vocal_srv)}**", inline=True)
    embed2.add_field(name="💬 Messages", value=f"**{total_msg_srv}**", inline=True)
    embed2.add_field(
        name="🏆 Top Vocal",
        value=build_top(vocal_list, format_duration),
        inline=True
    )
    embed2.add_field(
        name="🏆 Top Messages",
        value=build_top(msg_list, lambda x: f"{x} msg"),
        inline=True
    )
    embed2.add_field(name="\u200b", value="\u200b", inline=True)

    vocal_by_day, msg_by_day = build_vocal_by_day(user)
    graph_buf = make_activity_graph(vocal_by_day, msg_by_day, f"Activite - {me.display_name}")

    embed3 = discord.Embed(color=discord.Color.from_rgb(85, 50, 18))
    embed3.set_image(url="attachment://graph.png")
    embed3.set_footer(text=f"⚓ BRAMS SCORE BY FREYDISS • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    try:
        await interaction.followup.send(
            embeds=[embed1, embed2, embed3],
            file=discord.File(graph_buf, "graph.png")
        )
    except discord.NotFound:
        print("⚠️ /tout : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /tout followup failed: {e}")


@bot.tree.command(name="chercher", description="Voir toutes les stats d'un membre")
@app_commands.describe(membre="Le membre à inspecter")
async def chercher(interaction: discord.Interaction, membre: discord.Member):
    try:
        await interaction.response.defer()
    except discord.NotFound:
        print("⚠️ /chercher : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /chercher defer failed: {e}")
        return
    data = _CACHE
    uid = str(membre.id)
    user = get_user(data, uid)

    jt = user.get("join_time")
    s1d  = seconds_in_period(user["vocal_sessions"], 1, join_time=jt)
    s7d  = seconds_in_period(user["vocal_sessions"], 7, join_time=jt)
    s14d = seconds_in_period(user["vocal_sessions"], 14, join_time=jt)
    s_tot = total_seconds(user["vocal_sessions"], join_time=jt, extra=user.get("extra_seconds", 0))
    m1d  = messages_in_period(user["messages"], 1)
    m7d  = messages_in_period(user["messages"], 7)
    m14d = messages_in_period(user["messages"], 14)
    m_tot = total_messages(user["messages"])

    hours_7d  = s7d / 3600
    hours_tot = s_tot / 3600
    rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"
    r_emoji = RANK_EMOJIS.get(rank_actuel, "💀")
    ranks_display = format_all_ranks_display(hours_7d)
    prime_val = get_berrys(uid)
    next_thresh, next_rank = get_next_rank(hours_7d)
    live_indicator = "  　🎙️ *EN VOCAL*" if jt else ""

    if next_rank:
        bar = make_progress_bar(hours_7d, next_thresh)
        progress_str = f"{ranks_display}\n`{bar}` {hours_7d:.1f}h / {next_thresh}h\nProchain : **{next_rank}**"
    else:
        progress_str = f"{ranks_display}\n`▰▰▰▰▰▰▰▰▰▰` 👑 **Rang maximum !**"

    embed = discord.Embed(
        title=f"🔍 {membre.display_name.upper()}{live_indicator}",
        color=discord.Color.from_rgb(212, 175, 55)
    )
    embed.set_thumbnail(url=membre.display_avatar.url)

    embed.add_field(
        name="Rangs",
        value=progress_str,
        inline=False
    )
    embed.add_field(
        name="🎙️ Vocal",
        value=(
            f"Aujourd'hui : **{format_duration(s1d)}**\n"
            f"7 jours : **{format_duration(s7d)}**\n"
            f"14 jours : **{format_duration(s14d)}**\n"
            f"Total : **{format_duration(s_tot)}**"
        ),
        inline=True
    )
    embed.add_field(
        name="💬 Messages",
        value=(
            f"Aujourd'hui : **{m1d}**\n"
            f"7 jours : **{m7d}**\n"
            f"14 jours : **{m14d}**\n"
            f"Total : **{m_tot}**"
        ),
        inline=True
    )
    embed.add_field(
        name="💰 Prime",
        value=f"**{format_prime(prime_val)}**",
        inline=True
    )

    vocal_by_day, msg_by_day = build_vocal_by_day(user)
    graph_buf = make_activity_graph(vocal_by_day, msg_by_day, f"Activite de {membre.display_name}")

    embed.set_image(url="attachment://graph.png")
    embed.set_footer(text=f"⚓ BRAMS SCORE BY FREYDISS • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    try:
        await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"))
    except discord.NotFound:
        print("⚠️ /chercher : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /chercher followup failed: {e}")



CITATION_HISTORY: deque[str] = deque(maxlen=len(QUOTES_DB) - 1)

# Cache URL image par personnage (Jikan API)
# Persos non présents sur MAL (cartoons occidentaux, jeux vidéo hors anime, etc.)
# URLs d image statiques verifiees - priorite absolue sur Jikan (CDN MAL stable)
_CHAR_STATIC_URLS: dict[str, str] = {
    # ── Attack on Titan ──
    "Eren Yeager":         "https://cdn.myanimelist.net/images/characters/10/216895.jpg",
    "Levi Ackerman":       "https://cdn.myanimelist.net/images/characters/12/622510.jpg",
    "Mikasa Ackerman":     "https://cdn.myanimelist.net/images/characters/9/215563.jpg",
    "Armin Arlert":        "https://cdn.myanimelist.net/images/characters/8/220267.jpg",
    "Erwin Smith":         "https://cdn.myanimelist.net/images/characters/14/559023.jpg",
    # ── Naruto ──
    "Itachi Uchiha":       "https://cdn.myanimelist.net/images/characters/9/284122.jpg",
    "Rock Lee":            "https://cdn.myanimelist.net/images/characters/13/433353.jpg",
    "Pain":                "https://cdn.myanimelist.net/images/characters/8/73473.jpg",
    "Hinata Hyuga":        "https://cdn.myanimelist.net/images/characters/6/278736.jpg",
    "Obito Uchiha":        "https://cdn.myanimelist.net/images/characters/8/70596.jpg",
    "Minato Namikaze":     "https://s4.anilist.co/file/anilistcdn/character/large/b2535-Xq9WKNPJQEt3.png",
    "Jiraiya":             "https://s4.anilist.co/file/anilistcdn/character/large/b2423-RO5MyoXSA9OL.png",
    # ── FMA ──
    "Roy Mustang":         "https://s4.anilist.co/file/anilistcdn/character/large/b68-moBLY2WO2am3.png",
    # ── Hunter x Hunter ──
    "Killua Zoldyck":      "https://cdn.myanimelist.net/images/characters/2/327920.jpg",
    "Hisoka Morow":        "https://s4.anilist.co/file/anilistcdn/character/large/b31-FZckOuu7L1un.png",
    "Kurapika":            "https://cdn.myanimelist.net/images/characters/3/549312.jpg",
    "Mito Freecss":        "https://cdn.myanimelist.net/images/characters/8/47876.jpg",
    "Meruem":              "https://s4.anilist.co/file/anilistcdn/character/large/b23277-EYmIxzL64Mji.png",
    # ── JoJo's Bizarre Adventure ──
    "Giorno Giovanna":     "https://cdn.myanimelist.net/images/characters/16/571466.jpg",
    "Dio Brando":          "https://s4.anilist.co/file/anilistcdn/character/large/b4004-w0OtWuvjhftG.png",
    # ── Fairy Tail ──
    "Natsu Dragneel":      "https://cdn.myanimelist.net/images/characters/15/594274.jpg",
    "Erza Scarlet":        "https://cdn.myanimelist.net/images/characters/12/492254.jpg",
    # ── Tokyo Ghoul ──
    "Ken Kaneki":          "https://cdn.myanimelist.net/images/characters/15/307255.jpg",
    # ── One Punch Man ──
    "Saitama":             "https://cdn.myanimelist.net/images/characters/11/294388.jpg",
    # ── Black Clover ──
    "Asta":                "https://s4.anilist.co/file/anilistcdn/character/large/b123285-tKijiuQErDS0.png",
    # ── Berserk ──
    "Guts":                "https://s4.anilist.co/file/anilistcdn/character/large/b422-XTaiTuvRohsV.png",
    # ── Death Note ──
    "Ryuk":                "https://s4.anilist.co/file/anilistcdn/character/large/b75-IkEpzO21LgFy.jpg",
    # ── Jujutsu Kaisen ──
    "Gojo Satoru":         "https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png",
    "Yuji Itadori":        "https://cdn.myanimelist.net/images/characters/6/467646.jpg",
    # ── Demon Slayer ──
    "Rengoku Kyojuro":     "https://cdn.myanimelist.net/images/characters/10/423443.jpg",
    # ── Re:Zero ──
    "Rem":                 "https://s4.anilist.co/file/anilistcdn/character/large/b88575-Ayu8UPDA8NS6.png",
    "Subaru Natsuki":      "https://s4.anilist.co/file/anilistcdn/character/large/b88573-F8yMTK9GhnTA.png",
    # ── Sword Art Online ──
    "Kirito":              "https://s4.anilist.co/file/anilistcdn/character/large/b36765-BnLbXg0Tzzh9.png",
    "Asuna Yuuki":         "https://s4.anilist.co/file/anilistcdn/character/large/b36828-j5ib0adAzGMx.png",
    # ── Violet Evergarden ──
    "Violet Evergarden":   "https://s4.anilist.co/file/anilistcdn/character/large/b90169-4wr1Zehnsac8.png",
    # ── Vinland Saga ──
    "Thorfinn":            "https://cdn.myanimelist.net/images/characters/9/309871.jpg",
}

_NO_MAL_CHARS: frozenset[str] = frozenset({"Zuko"})
_CHAR_IMAGE_CACHE: dict[str, str | None] = {n: None for n in _NO_MAL_CHARS}
_CHAR_IMG_BYTES_CACHE: dict[str, bytes | None] = {}
_CHAR_IMG_BYTES_MAX = 200  # entrées max - évite la fuite mémoire
_CHAR_GIF_CACHE: dict[str, bytes | None] = {}
GIPHY_API_KEY = os.environ.get("GIPHY_API_KEY", "")

def _img_bytes_set(key: str, val: bytes | None):
    if len(_CHAR_IMG_BYTES_CACHE) >= _CHAR_IMG_BYTES_MAX:
        _CHAR_IMG_BYTES_CACHE.pop(next(iter(_CHAR_IMG_BYTES_CACHE)))
    _CHAR_IMG_BYTES_CACHE[key] = val

_CHAR_IMG_URL = "cdn.myanimelist.net/images/characters"

def _name_matches(searched: str, returned: str) -> bool:
    """Toutes les parties significatives (>2 chars) du nom cherché
    doivent apparaître dans le nom retourné - évite les faux positifs."""
    parts = [p.lower() for p in searched.split() if len(p) > 2]
    r = returned.lower()
    return bool(parts) and all(p in r for p in parts)

async def _jikan_get(sess: aiohttp.ClientSession, url: str, retries: int = 2) -> dict | None:
    """GET Jikan avec retry automatique sur 429 (rate-limit)."""
    for attempt in range(retries + 1):
        try:
            async with sess.get(url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    return await resp.json()
                if resp.status == 429:
                    wait = 1.5 * (attempt + 1)
                    print(f"[CITATION] 429 rate-limit, retry dans {wait}s ({url})")
                    await asyncio.sleep(wait)
                    continue
                print(f"[CITATION] HTTP {resp.status} pour {url}")
                return None
        except asyncio.TimeoutError:
            print(f"[CITATION] timeout {url} (tentative {attempt+1})")
        except Exception as e:
            print(f"[CITATION] erreur {url}: {e}")
            return None
    return None

async def _get_char_image_url(name: str) -> str | None:
    """URL image du personnage.
    Ordre de priorite :
    1. _CHAR_STATIC_URLS - URLs verifiees manuellement (bypass Jikan)
    2. _CHAR_IMAGE_CACHE - cache memoire session
    3. Jikan par ID direct (CHAR_JIKAN_IDS)
    4. Jikan par recherche nom (fallback)
    """
    if name in _CHAR_STATIC_URLS:
        url = _CHAR_STATIC_URLS[name]
        _CHAR_IMAGE_CACHE[name] = url
        return url
    if name in _CHAR_IMAGE_CACHE:
        return _CHAR_IMAGE_CACHE[name]

    img_url = None
    jikan_id = CHAR_JIKAN_IDS.get(name)

    try:
        sess = _HTTP
        if jikan_id:
            # ID connu → fetch direct, on fait confiance à l'ID
            data_root = await _jikan_get(sess, f"https://api.jikan.moe/v4/characters/{jikan_id}")
            if data_root:
                data = data_root.get("data", {})
                returned_name = data.get("name", "")
                candidate = data.get("images", {}).get("jpg", {}).get("image_url", "")
                # Accepte toute URL myanimelist (pas juste /characters/)
                if candidate and "myanimelist.net" in candidate:
                    img_url = candidate
                    print(f"[CITATION] OK id={jikan_id} '{returned_name}' → '{name}'")
                else:
                    print(f"[CITATION] id={jikan_id} URL inattendue: {candidate!r}")
        else:
            # Pas d'ID → recherche par nom avec validation stricte
            data_root = await _jikan_get(sess, f"https://api.jikan.moe/v4/characters?q={_url_quote(name)}&limit=8")
            if data_root:
                for char in data_root.get("data", []):
                    returned_name = char.get("name", "")
                    if not _name_matches(name, returned_name):
                        continue
                    candidate = char.get("images", {}).get("jpg", {}).get("image_url", "")
                    if candidate and _CHAR_IMG_URL in candidate:
                        img_url = candidate
                        print(f"[CITATION] OK search '{returned_name}' → '{name}'")
                        break
                if not img_url:
                    print(f"[CITATION] aucun match search pour '{name}'")
    except Exception as e:
        print(f"[CITATION] exception '{name}': {e}")

    # Ne cacher que les succès : un None transitoire (429, timeout) ne doit pas bloquer
    # les prochains appels. Seuls les None définitifs (_NO_MAL_CHARS) sont pré-cachés.
    if img_url is not None:
        _CHAR_IMAGE_CACHE[name] = img_url
    return img_url

async def _fetch_char_image_bytes(name: str) -> bytes | None:
    """Télécharge et met en cache les bytes PIL de l'image du personnage."""
    if name in _CHAR_IMG_BYTES_CACHE:
        return _CHAR_IMG_BYTES_CACHE[name]
    url = await _get_char_image_url(name)
    if not url:
        # Pareil : ne pas cacher les échecs transitoires sur les bytes
        return None
    try:
        sess = _HTTP or aiohttp.ClientSession()
        async with sess.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status == 200:
                raw = await resp.read()
                _img_bytes_set(name, raw)
                return raw
            if resp.status == 404:
                _img_bytes_set(name, None)
            print(f"[CITATION] DL image HTTP {resp.status} pour '{name}'")
    except Exception as e:
        print(f"[CITATION] DL image erreur '{name}': {e}")
    return None

async def _fetch_char_gif_bytes(name: str, anime: str) -> bytes | None:
    """Cherche un GIF du personnage sur Giphy. Retourne None si GIPHY_API_KEY absent."""
    if not GIPHY_API_KEY:
        return None
    cache_key = f"{name}|{anime}"
    if cache_key in _CHAR_GIF_CACHE:
        return _CHAR_GIF_CACHE[cache_key]
    query = _url_quote(f"{name} {anime}")
    url = f"https://api.giphy.com/v1/gifs/search?q={query}&api_key={GIPHY_API_KEY}&limit=5&rating=pg-13&lang=en"
    try:
        sess = _HTTP or aiohttp.ClientSession()
        async with sess.get(url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
            if resp.status == 200:
                data = await resp.json()
                results = data.get("data", [])
                if results:
                    r = results[0]
                    gif_url = r["images"]["downsized_large"]["url"]
                    async with sess.get(gif_url, timeout=aiohttp.ClientTimeout(total=20)) as gresp:
                        if gresp.status == 200:
                            raw = await gresp.read()
                            _CHAR_GIF_CACHE[cache_key] = raw
                            return raw
    except Exception as e:
        print(f"[CITATION] Giphy error '{name}': {e}")
    _CHAR_GIF_CACHE[cache_key] = None
    return None


async def _citation_handler(interaction: discord.Interaction, categorie: str = None):
    """Logique commune à /citation et /quote."""
    try:
        await interaction.response.defer()
    except discord.NotFound:
        print("⚠️ /citation : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /citation defer failed: {e}")
        return

    # Filtrage par anime si demandé
    if categorie:
        pool = [q for q in QUOTES_DB if q["anime"].lower() == categorie.lower()]
        if not pool:
            await interaction.followup.send("❌ Catégorie introuvable.", ephemeral=True)
            return
    else:
        pool = QUOTES_DB

    # Anti-répétition : évite les citations déjà vues, reset si pool épuisé
    fresh = [q for q in pool if q["quote"] not in CITATION_HISTORY]
    if not fresh:
        CITATION_HISTORY.clear()
        fresh = pool
    chosen = random.choice(fresh)
    CITATION_HISTORY.append(chosen["quote"])

    try:
        img_buf, is_gif = await make_citation_image(chosen)
    except Exception as e:
        print(f"❌ make_citation_image: {e}")
        await interaction.followup.send("❌ Erreur lors de la génération de la carte.", ephemeral=True)
        return

    fname = "citation.gif" if is_gif else "citation.png"
    try:
        await interaction.followup.send(file=discord.File(img_buf, fname))
    except discord.NotFound:
        print("⚠️ /citation : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /citation followup failed: {e}")



@bot.tree.command(name="citation", description="Citation aléatoire d'un personnage anime")
@app_commands.describe(categorie="Filtrer par anime (optionnel)")
@app_commands.choices(categorie=[
    app_commands.Choice(name="One Piece",              value="One Piece"),
    app_commands.Choice(name="Naruto",                 value="Naruto"),
    app_commands.Choice(name="Attack on Titan",        value="Attack on Titan"),
    app_commands.Choice(name="Death Note",             value="Death Note"),
    app_commands.Choice(name="Dragon Ball Z",          value="Dragon Ball Z"),
    app_commands.Choice(name="Demon Slayer",           value="Demon Slayer"),
    app_commands.Choice(name="Jujutsu Kaisen",         value="Jujutsu Kaisen"),
    app_commands.Choice(name="Bleach",                 value="Bleach"),
    app_commands.Choice(name="Fullmetal Alchemist",    value="Fullmetal Alchemist"),
    app_commands.Choice(name="Hunter x Hunter",        value="Hunter x Hunter"),
    app_commands.Choice(name="JoJo's Bizarre Adventure", value="JoJo's Bizarre Adventure"),
    app_commands.Choice(name="Fairy Tail",             value="Fairy Tail"),
    app_commands.Choice(name="Code Geass",             value="Code Geass"),
    app_commands.Choice(name="Tokyo Ghoul",            value="Tokyo Ghoul"),
    app_commands.Choice(name="One Punch Man",          value="One Punch Man"),
    app_commands.Choice(name="Berserk",                value="Berserk"),
    app_commands.Choice(name="Re:Zero",                value="Re:Zero"),
    app_commands.Choice(name="Sword Art Online",       value="Sword Art Online"),
    app_commands.Choice(name="Violet Evergarden",      value="Violet Evergarden"),
    app_commands.Choice(name="Cowboy Bebop",           value="Cowboy Bebop"),
    app_commands.Choice(name="Black Clover",           value="Black Clover"),
    app_commands.Choice(name="Vinland Saga",           value="Vinland Saga"),
    app_commands.Choice(name="Chainsaw Man",           value="Chainsaw Man"),
])
async def citation(interaction: discord.Interaction, categorie: app_commands.Choice[str] = None):
    await _citation_handler(interaction, categorie.value if categorie else None)


@bot.tree.command(name="addheures", description="[ADMIN] Ajouter des heures vocales à un membre")
@app_commands.default_permissions(administrator=True)
@app_commands.checks.has_permissions(administrator=True)
async def addheures(interaction: discord.Interaction, membre: discord.Member, heures: float):
    try:
        await interaction.response.defer(ephemeral=True)
    except discord.NotFound:
        print("⚠️ /addheures : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /addheures defer failed: {e}")
        return
    data = _CACHE
    uid = str(membre.id)
    user = get_user(data, uid)
    now = now_ts()
    user["vocal_sessions"].append({"start": now - heures * 3600, "end": now, "channel": None})
    clean_old_data(user)
    _DIRTY.add(uid)
    seconds_7d = seconds_in_period(user["vocal_sessions"], 7, join_time=user.get("join_time"))
    hours_7d = seconds_7d / 3600
    await update_rank(membre, hours_7d, announce=True)
    try:
        await interaction.followup.send(
            f"✅ +{heures}h ajoutées à {membre.mention} → {hours_7d:.1f}h sur 7j", ephemeral=True
        )
    except discord.NotFound:
        print("⚠️ /addheures : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /addheures followup failed: {e}")


@bot.tree.command(name="addheuresalltime", description="[ADMIN] Ajouter des heures au compteur all-time uniquement (permanent, ne diminue jamais)")
@app_commands.default_permissions(administrator=True)
@app_commands.checks.has_permissions(administrator=True)
async def addheuresalltime(interaction: discord.Interaction, membre: discord.Member, heures: float):
    try:
        await interaction.response.defer(ephemeral=True)
    except discord.NotFound:
        print("⚠️ /addheuresalltime : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /addheuresalltime defer failed: {e}")
        return

    uid = str(membre.id)
    user = get_user(_CACHE, uid)
    extra_before = user.get("extra_seconds", 0)
    user["extra_seconds"] = extra_before + heures * 3600
    _DIRTY.add(uid)

    s_tot = total_seconds(user["vocal_sessions"], join_time=user.get("join_time"), extra=user["extra_seconds"])
    try:
        await interaction.followup.send(
            f"✅ +{heures}h ajoutées au all-time de {membre.mention} → {s_tot / 3600:.1f}h all-time total",
            ephemeral=True
        )
    except discord.NotFound:
        print("⚠️ /addheuresalltime : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /addheuresalltime followup failed: {e}")


@bot.tree.command(name="resetheures", description="[ADMIN] Réinitialiser les heures vocales d'un membre")
@app_commands.default_permissions(administrator=True)
@app_commands.checks.has_permissions(administrator=True)
async def resetheures(interaction: discord.Interaction, membre: discord.Member):
    try:
        await interaction.response.defer(ephemeral=True)
    except discord.NotFound:
        print("⚠️ /resetheures : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /resetheures defer failed: {e}")
        return
    data = _CACHE
    uid = str(membre.id)
    user = get_user(data, uid)
    user["vocal_sessions"] = []
    user["join_time"] = None
    user["last_rank"] = None
    user["alerted"] = False
    _DIRTY.add(uid)
    await update_rank(membre, 0.0, announce=False)
    try:
        await interaction.followup.send(
            f"✅ Heures vocales de {membre.mention} réinitialisées (0h, tous les rangs retirés).", ephemeral=True
        )
    except discord.NotFound:
        print("⚠️ /resetheures : token expiré")
    except Exception as e:
        print(f"❌ /resetheures followup failed: {e}")


@bot.tree.command(name="testrank", description="[ADMIN] Tester l'image d'annonce de rank")
@app_commands.default_permissions(administrator=True)
@app_commands.checks.has_permissions(administrator=True)
@app_commands.describe(rang="Rang a tester")
@app_commands.choices(rang=[
    app_commands.Choice(name="Pirate",          value="Pirate"),
    app_commands.Choice(name="Shichibukai",     value="Shichibukai"),
    app_commands.Choice(name="Amiral",          value="Amiral"),
    app_commands.Choice(name="Yonkou",          value="Yonkou"),
    app_commands.Choice(name="Roi des pirates", value="Roi des pirates"),
])
async def testrank(interaction: discord.Interaction, membre: discord.Member = None, rang: str = "Shichibukai"):
    try:
        await interaction.response.defer(ephemeral=True)
    except discord.NotFound:
        print("⚠️ /testrank : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /testrank defer failed: {e}")
        return
    target = membre or interaction.user
    channel = bot.get_channel(ANNOUNCE_CHANNEL_ID)
    if channel is None:
        await interaction.followup.send("❌ Channel d'annonce introuvable", ephemeral=True)
        return
    img_buf, is_gif = await make_rank_image(target, rang, 25.3)
    fname = "rank_up.gif" if is_gif else "rank_up.png"
    emoji = _ANNOUNCE_RANK_EMOJIS.get(rang, "✨")
    await channel.send(
        content=f"🏴‍☠️ Bravo à {target.mention} qui a débloqué le rank **{rang.upper()}** {emoji}",
        file=discord.File(img_buf, fname)
    )
    try:
        await interaction.followup.send(f"✅ Annonce envoyée pour {target.mention} ({rang})", ephemeral=True)
    except discord.NotFound:
        print("⚠️ /testrank : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /testrank followup failed: {e}")

# ─────────────────────────────────────────
#  /test  (ADMIN - simulation d'événements)
# ─────────────────────────────────────────
@bot.tree.command(name="test", description="[ADMIN] Simuler un événement sans affecter les données réelles")
@app_commands.default_permissions(administrator=True)
@app_commands.checks.has_permissions(administrator=True)
@app_commands.describe(evenement="Type d'événement à simuler", membre="Membre cible (optionnel, défaut : toi)")
@app_commands.choices(evenement=[
    app_commands.Choice(name="Montée de rang", value="rankup"),
    app_commands.Choice(name="Perte de rang (derank)", value="derank"),
    app_commands.Choice(name="Avertissement MP derank", value="warning"),
    app_commands.Choice(name="DM passage de rang", value="rankup_dm"),
])
async def test_event(interaction: discord.Interaction, evenement: app_commands.Choice[str], membre: discord.Member = None):
    try:
        await interaction.response.defer(ephemeral=True)
    except discord.NotFound:
        return
    target = membre or interaction.user

    if evenement.value == "rankup":
        rank_name = "Shichibukai"
        channel = bot.get_channel(ANNOUNCE_CHANNEL_ID)
        if channel is None:
            await interaction.followup.send("❌ Channel d'annonce introuvable.", ephemeral=True)
            return
        img_buf, is_gif = await make_rank_image(target, rank_name, 25.0)
        fname = "rank_up.gif" if is_gif else "rank_up.png"
        await channel.send(
            content=f"[TEST] Bravo à {target.mention} qui a débloqué le rank **{rank_name}** ⚔️",
            file=discord.File(img_buf, fname)
        )
        await interaction.followup.send(f"✅ Simulation rankup envoyée pour {target.mention}", ephemeral=True)

    elif evenement.value == "derank":
        rank_name = "Amiral"
        rank_emoji = _ANNOUNCE_RANK_EMOJIS.get(rank_name, "🎖️")
        rank_threshold = next((t for t, n in RANKS if n == rank_name), 0)
        hours_7d = 35.0
        dm_text = (
            f"⬇️ **[TEST] Tu as perdu ton rank !**\n\n"
            f"Salut {target.display_name} ! Tu viens de perdre le rang **{rank_emoji} {rank_name}** "
            f"sur le serveur **{interaction.guild.name}**.\n\n"
            f"Tes heures vocales sur les 7 derniers jours sont descendues à `{hours_7d}h`, "
            f"alors qu'il te faut au minimum `{rank_threshold}h` pour garder ce rang.\n\n"
            f"Reviens en vocal pour le récupérer ! 🎙️\n\n"
            f"*(Ceci est un message de test - tes données ne sont pas affectées)*\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"*BRAMS SCORE  |  by Freydiss*\n\n"
            f"*(Envoie `1` ici si tu ne veux plus recevoir ces DMs)*"
        )
        target_user = get_user(_CACHE, str(target.id))
        if target_user.get("dm_optout", False):
            rappel_ch = discord.utils.find(lambda c: "rappel" in c.name.lower(), interaction.guild.text_channels)
            if rappel_ch:
                await rappel_ch.send(f"{target.mention}\n{dm_text}")
            await interaction.followup.send(f"📵 DMs désactivés - message envoyé dans #rappel pour {target.mention}", ephemeral=True)
        else:
            try:
                await target.send(dm_text)
                await interaction.followup.send(f"✅ DM de test derank envoyé à {target.mention}", ephemeral=True)
            except discord.Forbidden:
                rappel_ch = discord.utils.find(lambda c: "rappel" in c.name.lower(), interaction.guild.text_channels)
                if rappel_ch:
                    await rappel_ch.send(f"{target.mention}\n{dm_text}")
                await interaction.followup.send(f"❌ DM fermés - message envoyé dans #rappel pour {target.mention}", ephemeral=True)

    elif evenement.value == "warning":
        rank_name = "Shichibukai"
        threshold = 25
        hours_7d = 22.5
        heures_manquantes = round(threshold - hours_7d, 1)
        dm_text = (
            f"⚠️ **[TEST] Attention, tu risques de perdre ton rank !**\n\n"
            f"Salut {target.display_name} ! Tu es actuellement **⚔️ {rank_name}** "
            f"sur le serveur **{interaction.guild.name}**.\n\n"
            f"Tes heures vocales sur les 7 derniers jours sont descendues à `{hours_7d}h`, "
            f"et il te faut au minimum `{threshold}h` pour garder ton rank.\n\n"
            f"Il te manque environ `{heures_manquantes}h` - passe en vocal dès que possible ! 🚨\n\n"
            f"*(Ceci est un message de test - tes données ne sont pas affectées)*\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"*BRAMS SCORE  |  by Freydiss*\n\n"
            f"*(Envoie `1` ici si tu ne veux plus recevoir ces DMs)*"
        )
        target_user = get_user(_CACHE, str(target.id))
        if target_user.get("dm_optout", False):
            rappel_ch = discord.utils.find(lambda c: "rappel" in c.name.lower(), interaction.guild.text_channels)
            if rappel_ch:
                await rappel_ch.send(f"{target.mention}\n{dm_text}")
            await interaction.followup.send(f"📵 DMs désactivés - message envoyé dans #rappel pour {target.mention}", ephemeral=True)
        else:
            try:
                await target.send(dm_text)
                await interaction.followup.send(f"✅ MP de test envoyé à {target.mention}", ephemeral=True)
            except discord.Forbidden:
                rappel_ch = discord.utils.find(lambda c: "rappel" in c.name.lower(), interaction.guild.text_channels)
                if rappel_ch:
                    await rappel_ch.send(f"{target.mention}\n{dm_text}")
                await interaction.followup.send(f"❌ DM fermés - message envoyé dans #rappel pour {target.mention}", ephemeral=True)

    elif evenement.value == "rankup_dm":
        rank_name = "Shichibukai"
        rank_emoji = _ANNOUNCE_RANK_EMOJIS.get(rank_name, "✨")
        hours_7d = 27.5
        dm_text = (
            f"🎉 **[TEST] Tu as monté de rang !**\n\n"
            f"Félicitations {target.display_name} ! Tu viens de débloquer le rang "
            f"**{rank_emoji} {rank_name}** sur le serveur **{interaction.guild.name}** !\n\n"
            f"Tu as accumulé `{hours_7d}h` de vocal sur les 7 derniers jours. "
            f"Continue comme ça ! 💪\n\n"
            f"*(Ceci est un message de test - tes données ne sont pas affectées)*\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"*BRAMS SCORE  |  by Freydiss*\n\n"
            f"*(Envoie `1` ici si tu ne veux plus recevoir ces DMs)*"
        )
        target_user = get_user(_CACHE, str(target.id))
        if target_user.get("dm_optout", False):
            rappel_ch = discord.utils.find(lambda c: "rappel" in c.name.lower(), interaction.guild.text_channels)
            if rappel_ch:
                await rappel_ch.send(f"{target.mention}\n{dm_text}")
            await interaction.followup.send(f"📵 DMs désactivés - message envoyé dans #rappel pour {target.mention}", ephemeral=True)
        else:
            try:
                await target.send(dm_text)
                await interaction.followup.send(f"✅ DM passage de rang envoyé à {target.mention}", ephemeral=True)
            except discord.Forbidden:
                rappel_ch = discord.utils.find(lambda c: "rappel" in c.name.lower(), interaction.guild.text_channels)
                if rappel_ch:
                    await rappel_ch.send(f"{target.mention}\n{dm_text}")
                await interaction.followup.send(f"❌ DM fermés - message envoyé dans #rappel pour {target.mention}", ephemeral=True)


# ─────────────────────────────────────────
#  /quiz  (Quiz animé généré par IA - Groq)
# ─────────────────────────────────────────
QUIZ_SESSIONS: dict = {}
LIVE_DUELS: dict[int, "_LiveDuelSession"] = {}  # uid → duel live partagé
_GROQ_MODEL       = "groq/llama-3.3-70b-versatile"

# Historique par utilisateur : dernières questions vues (évite les répétitions)
QUIZ_USER_HISTORY: dict[int, list[str]] = {}
_QUIZ_HISTORY_MAX = 60


class _LiveDuelSession:
    __slots__ = ("uid1", "uid2", "name1", "name2", "questions", "idx",
                 "score1", "score2", "pts1", "pts2", "interaction", "berry_bet")
    def __init__(self, uid1: int, uid2: int, name1: str, name2: str,
                 questions: list, interaction: discord.Interaction):
        self.uid1, self.uid2      = uid1, uid2
        self.name1, self.name2    = name1, name2
        self.questions            = questions
        self.idx                  = 0
        self.score1 = self.score2 = 0
        self.pts1   = self.pts2   = 0
        self.interaction          = interaction
        self.berry_bet            = 0

_DIFF_POINTS: dict[str, int] = {"facile": 1, "moyen": 2, "difficile": 3, "expert": 5}
_DIFF_COLORS: dict[str, int] = {"facile": 0x2ecc71, "moyen": 0xf1c40f, "difficile": 0xe67e22, "expert": 0xe74c3c}
_DIFF_EMOJI:  dict[str, str] = {"facile": "🟢", "moyen": "🟡", "difficile": "🟠", "expert": "🔴"}
_TYPE_EMOJI:  dict[str, str] = {
    "personnage": "👤", "technique": "⚡", "lieu": "🗺️", "arc": "📖",
    "pouvoir": "💥", "objet": "🎁", "studio": "🎬", "auteur": "✒️",
}

# Catégories disponibles : valeur → description injectée dans le prompt
_QUIZ_CATEGORIES: dict[str, str] = {
    "general":      "tous les animés populaires mélangés (Naruto, One Piece, DBZ, Bleach, Death Note, AoT, HxH, FMA, Fairy Tail, JoJo, Demon Slayer, MHA, JJK)",
    "one_piece":    "One Piece UNIQUEMENT (personnages, Fruits du Démon, arcs, Marines, Yonkou, techniques)",
    "naruto":       "Naruto / Naruto Shippuden / Boruto UNIQUEMENT (chakra, jutsu, clans, arcs, Jinchuriki, Akatsuki)",
    "bleach":       "Bleach UNIQUEMENT (Zanpakuto, Shinigami, Bankai, Hollows, Espada, arcs Soul Society et Hueco Mundo)",
    "deathnote":    "Death Note UNIQUEMENT (règles du Death Note, Kira, L, Near, Mello, Ryuk, stratégies)",
    "aot":          "Attack on Titan UNIQUEMENT (Titans, Survey Corps, Shifters, arcs, capacités, noms)",
    "dbz":          "Dragon Ball Z / Super UNIQUEMENT (transformations Saiyan, techniques, arcs, personnages)",
    "hxh":          "Hunter x Hunter UNIQUEMENT (Nen, types, Gon, Killua, arcs Yorknew/Chimera Ant)",
    "jojo":         "JoJo's Bizarre Adventure UNIQUEMENT (Stands, parties, personnages, antagonistes)",
    "demon_slayer": "Demon Slayer / Kimetsu no Yaiba UNIQUEMENT (respirations, démons, Piliers, arcs, personnages)",
    "mha":          "My Hero Academia UNIQUEMENT (Alter, U.A., League of Villains, arcs, personnages, combats)",
    "jjk":          "Jujutsu Kaisen UNIQUEMENT (techniques maudites, Fléaux, grades, arcs, personnages)",
    "fma":          "Fullmetal Alchemist Brotherhood UNIQUEMENT (alchimie, Homoncules, arcs, personnages)",
    "chainsaw":     "Chainsaw Man UNIQUEMENT (Diables, contrats, Chasseurs, arcs, personnages)",
    "black_clover": "Black Clover UNIQUEMENT (magie, grimoires, Chevaliers Magiques, arcs, personnages)",
    "citation":     "citations célèbres d'animés - mode spécial (généré depuis QUOTES_DB)",
}

# System prompt strict
_QUIZ_SYSTEM = (
    "Tu es un expert des animés japonais qui crée des questions de quiz. "
    "Tu réponds UNIQUEMENT avec un JSON valide. "
    "DEUX formats possibles dans le même tableau 'questions' : "
    "1) Standard (1 bonne réponse) : "
    '{"question":"...","bonne_reponse":"...","bonnes_reponses":null,"mauvaises_reponses":["...","...","..."],'
    '"anime":"...","difficulte":"facile|moyen|difficile|expert","type":"personnage|technique|lieu|arc|pouvoir|objet|studio|auteur","explication":"..."}. '
    "2) QCM multi-réponses (25%% des questions, 2 ou 3 bonnes réponses) : "
    '{"question":"...","bonne_reponse":null,"bonnes_reponses":["...","..."],"mauvaises_reponses":["...","...","...","..."],'
    '"anime":"...","difficulte":"moyen|difficile|expert","type":"...","explication":"..."}. '
    "Formulations QCM obligatoirement plurielles : 'Lesquels de ces personnages...?', 'Quelles techniques...?', 'Parmi les suivants, lesquels...?'. "
    "LANGUE : 100%% français correct avec apostrophes correctes (l', d', c', j', n', qu', s') - jamais de mot contracté sans apostrophe. "
    "TRADUCTIONS OBLIGATOIRES - utilise toujours le nom français suivant : "
    "Blackbeard → Barbe Noire, Whitebeard → Barbe Blanche, Shanks the Red → Shanks le Roux, "
    "Devil Fruit → Fruit du Démon, Straw Hat → Chapeau de Paille, Four Emperors → Quatre Empereurs, "
    "Seven Warlords → Shichibukai, World Government → Gouvernement Mondial, Celestial Dragons → Nobles Mondiaux, "
    "Marines → Marines, Grand Line → Grand Line, New World → Nouveau Monde, "
    "Survey Corps → Bataillon d'Exploration, Titans → Titans, Shifters → Porteurs, "
    "Nen → Nen, Soul Society → Soul Society, Zanpakuto → Zanpakutô, "
    "Sage Mode → Mode Sage, Tailed Beast → Bête à Queue, Jinchuriki → Jinchûriki. "
    "Les noms propres de personnages (Luffy, Zoro, Naruto, Goku...) restent tels quels. "
    "STYLE : questions claires et directes, ni trop formelles ni trop familières. "
    "RÉPONSES : toutes crédibles et du même univers, jamais ridicules ni évidentes. "
    "EXPLICATION : 1-2 phrases en français clair, avec un détail de lore précis. "
    "Aucun texte avant ou après le JSON."
)

_QUIZ_USER = (
    "Génère exactement {n} questions de quiz sur : {categorie}. "
    "Varie les types : personnages, techniques, lieux, arcs, pouvoirs, objets, relations entre persos. "
    "Répartition des difficultés : 20%% facile, 45%% moyen, 25%% difficile, 10%% expert. "
    "{avoid_hint}"
    "Seed : {seed}."
)


async def _generate_quiz_questions(n: int, category: str = "general", seen_questions: list[str] | None = None) -> tuple:
    """Génère n questions via Groq. Retourne (questions: list, erreur: str)."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        msg = "GROQ_API_KEY manquante - configure-la dans Railway > Variables"
        print(f"[QUIZ] ERREUR : {msg}")
        return [], msg

    categorie_desc = _QUIZ_CATEGORIES.get(category, _QUIZ_CATEGORIES["general"])
    seed = random.randint(1000, 9999)

    last_error = ""
    for attempt in range(3):
        raw = ""
        try:
            print(f"[QUIZ] Appel Groq attempt {attempt + 1}/3 - {n} questions - catégorie={category} seed={seed}")
            response = await litellm.acompletion(
                model=_GROQ_MODEL,
                api_key=api_key,
                max_tokens=4096,
                temperature=0.9,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": _QUIZ_SYSTEM},
                    {"role": "user",   "content": _QUIZ_USER.format(
                        n=n, categorie=categorie_desc, seed=seed,
                        avoid_hint=(
                            f"Évite ABSOLUMENT ces questions déjà posées récemment : {seen_questions[:20]}. "
                            if seen_questions else ""
                        ),
                    )},
                ],
            )
            raw = response.choices[0].message.content.strip()
            print(f"[QUIZ] Raw ({len(raw)} chars) : {raw[:300]}")

            data = json.loads(raw)

            # Le modèle renvoie {"questions": [...]}
            questions = data.get("questions") or data.get("quiz") or []

            # Fallback : si la racine est déjà une liste
            if not questions and isinstance(data, list):
                questions = data

            if isinstance(questions, list) and len(questions) >= 1:
                # Valider que chaque question a les champs requis
                valid = [
                    q for q in questions
                    if isinstance(q, dict)
                    and q.get("question")
                    and isinstance(q.get("mauvaises_reponses"), list)
                    and (
                        q.get("bonne_reponse")
                        or (isinstance(q.get("bonnes_reponses"), list) and len(q.get("bonnes_reponses", [])) >= 2)
                    )
                ]
                if valid:
                    print(f"[QUIZ] OK - {len(valid)} questions valides")
                    return valid, ""
                last_error = "Questions malformees (champs manquants)"
            else:
                last_error = f"Cle 'questions' absente ou vide. Cles trouvees : {list(data.keys()) if isinstance(data, dict) else type(data)}"

        except json.JSONDecodeError as e:
            last_error = f"JSONDecodeError : {e}"
            print(f"[QUIZ] JSONDecodeError attempt {attempt + 1} : {e}")
            print(f"[QUIZ] Raw complet pour debug :\n{raw}")
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"
            print(f"[QUIZ] Exception attempt {attempt + 1}/3 : {last_error}")

        await asyncio.sleep(1)

    print(f"[QUIZ] Echec total apres 3 tentatives. Derniere erreur : {last_error}")
    return [], last_error


def _generate_citation_quiz(n: int, seen_questions: list[str] | None = None) -> tuple:
    """Génère n questions 'Qui a dit cette citation ?' depuis QUOTES_DB."""
    if len(QUOTES_DB) < 4:
        return [], "QUOTES_DB trop petite pour générer un quiz de citations."

    seen_set = set(seen_questions or [])
    # Pool : toutes les citations sauf celles déjà vues
    pool = [q for q in QUOTES_DB if q["quote"] not in seen_set]
    if len(pool) < max(1, n):
        pool = list(QUOTES_DB)  # reset si épuisé

    picked = random.sample(pool, min(n, len(pool)))
    questions = []
    for item in picked:
        correct = item["character"]
        # Mauvaises réponses : autres personnages du même anime en priorité, sinon n'importe
        same_anime = list({q["character"] for q in QUOTES_DB if q["anime"] == item["anime"] and q["character"] != correct})
        others     = list({q["character"] for q in QUOTES_DB if q["character"] != correct})
        wrong_pool = same_anime if len(same_anime) >= 3 else others
        wrongs = random.sample(wrong_pool, min(3, len(wrong_pool)))
        if len(wrongs) < 3:
            # Complète si pas assez de mauvaises réponses
            extra = [q["character"] for q in QUOTES_DB if q["character"] != correct and q["character"] not in wrongs]
            wrongs += random.sample(extra, min(3 - len(wrongs), len(extra)))
        questions.append({
            "question":          f"💬 Qui a dit : *«{item['quote']}»*",
            "bonne_reponse":     correct,
            "mauvaises_reponses": wrongs[:3],
            "anime":             item["anime"],
            "difficulte":        "moyen",
            "type":              "personnage",
            "explication":       f"Cette réplique est de **{correct}**.",
        })
    return questions, ""


class _QuizSession:
    __slots__ = ("questions", "idx", "score", "points", "best_combo", "combo", "user_id", "interaction", "category", "joker_used", "speed_bonuses", "current_message", "target_points", "paid_mode", "entry_cost", "quiz_reward", "quiz_all_correct")
    def __init__(self, questions, user_id, interaction, category: str = "general"):
        self.questions       = questions
        self.idx             = 0
        self.score           = 0
        self.points          = 0
        self.best_combo      = 0
        self.combo           = 0
        self.user_id         = user_id
        self.interaction     = interaction
        self.category        = category
        self.joker_used      = False
        self.speed_bonuses   = 0
        self.current_message = None
        self.target_points   = None
        self.paid_mode       = None   # "enrichi" | "survie" | "legendaire" | None
        self.entry_cost      = 0
        self.quiz_reward     = 0
        self.quiz_all_correct = True

def _quiz_rank(pct: float) -> tuple[str, str]:
    if pct == 1.0: return "👑", "Score parfait - Légende vivante de l'animé"
    if pct >= 0.8: return "🥇", "Excellent - T'as clairement trop regardé d'animés"
    if pct >= 0.6: return "🥈", "Très bon - Tu maîtrises le sujet"
    if pct >= 0.4: return "🥉", "Correct - Tu connais tes classiques"
    if pct >= 0.2: return "📜", "Débutant - Continue à regarder des animés"
    return               "💀", "À revoir... Lance quelque chose et rattrape ton retard"


async def _send_next_question(inter: discord.Interaction, sess: _QuizSession):
    total = len(sess.questions)

    # ── Écran de fin ──────────────────────────────────────────────────────────
    target_reached = sess.target_points is not None and sess.points >= sess.target_points
    if sess.idx >= total or target_reached:
        QUIZ_SESSIONS.pop(sess.user_id, None)

        if target_reached:
            rank_emoji, rank_label = "🎯", f"Objectif de {sess.target_points} pts atteint !"
            color = discord.Color.from_rgb(50, 200, 100)
        else:
            max_pts = sum(_DIFF_POINTS.get(q.get("difficulte", "moyen").lower(), 1) + 2 for q in sess.questions)
            pct = sess.points / max_pts if max_pts else 0
            rank_emoji, rank_label = _quiz_rank(pct)
            color = discord.Color.from_rgb(212, 175, 55)

        embed = discord.Embed(
            title=f"{rank_emoji}  Quiz terminé",
            description=f"*{rank_label}*",
            color=color,
        )
        embed.add_field(name="🎯  Score",          value=f"**{sess.score} / {total}**", inline=True)
        embed.add_field(name="✨  Points",          value=f"**{sess.points} pts**",      inline=True)
        embed.add_field(name="🔥  Meilleur combo",  value=f"**x{sess.best_combo}**",     inline=True)

        extras = []
        if sess.speed_bonuses:
            extras.append(f"⚡ **+{sess.speed_bonuses} pts** gagnés grâce à la vitesse")
        if sess.joker_used:
            extras.append("🃏 Joker 50/50 utilisé")
        if extras:
            embed.add_field(name="📊  Bonus", value="\n".join(extras), inline=False)

        # ── Payout Berry (modes payants) ────────────────────────────────────
        _pm = sess.paid_mode
        if _pm == "survie":
            _earned = sess.score * 50
            if _earned > 0:
                _bal = add_berrys(str(sess.user_id), _earned)
                embed.add_field(name="💰 Gain Survie", value=f"**+{_earned} 🍊** ({sess.score} × 50)\nSolde : **{_bal} 🍊**", inline=False)
            else:
                embed.add_field(name="💸 Pas de gain", value="Aucune bonne réponse.", inline=False)
        elif _pm in ("enrichi", "legendaire"):
            if sess.quiz_all_correct and sess.score == total:
                _bal = add_berrys(str(sess.user_id), sess.quiz_reward)
                embed.add_field(name="💰 Récompense", value=f"**+{sess.quiz_reward} 🍊** — Score parfait !\nSolde : **{_bal} 🍊**", inline=False)
            else:
                embed.add_field(name="💸 Pas de récompense", value=f"Il fallait tout juste ({total}/{total}) pour gagner les Berrys.", inline=False)

        replay_view = _ReplayView(sess.user_id, total, sess.category)
        try:
            if sess.current_message:
                await sess.current_message.edit(embed=embed, view=replay_view)
            else:
                await inter.followup.send(embed=embed, view=replay_view)
        except Exception:
            pass
        return

    # ── Question suivante ──────────────────────────────────────────────────────
    q              = sess.questions[sess.idx]
    bonnes_rep     = q.get("bonnes_reponses")
    is_qcm         = isinstance(bonnes_rep, list) and len(bonnes_rep) >= 2

    if is_qcm:
        choices = list(bonnes_rep) + q.get("mauvaises_reponses", [])[:4]
    else:
        choices = [q["bonne_reponse"]] + q["mauvaises_reponses"][:3]
    random.shuffle(choices)

    diff       = q.get("difficulte", "moyen").lower()
    q_type     = q.get("type", "")
    diff_emoji = _DIFF_EMOJI.get(diff, "⚪")
    type_emoji = _TYPE_EMOJI.get(q_type, "")
    pts        = _DIFF_POINTS.get(diff, 1)
    anime      = q.get("anime", "?").upper()
    deadline   = int(time.time()) + 30

    qcm_tag = "  ·  📋 **QCM**" if is_qcm else ""
    if sess.category == "citation":
        tags = f"💬 **Devine la Citation**  ·  {diff_emoji} {diff.capitalize()}  ·  ✨ +{pts} pt{'s' if pts > 1 else ''}"
    else:
        tags = f"📺 **{anime}**  ·  {diff_emoji} {diff.capitalize()}  ·  ✨ +{pts} pt{'s' if pts > 1 else ''}{qcm_tag}"
        if type_emoji:
            tags += f"  ·  {type_emoji} {q_type.capitalize()}"

    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    qcm_hint = "\n*📋 Plusieurs bonnes réponses - sélectionne-les toutes puis valide.*" if is_qcm else ""
    desc = (
        f"{tags}\n"
        f"⏱️  Expire <t:{deadline}:R>\n\n"
        f"{sep}\n"
        f"**{q['question']}**\n"
        f"{sep}"
        f"{qcm_hint}"
    )

    embed = discord.Embed(
        title=f"❓  Question {sess.idx + 1} / {total}",
        description=desc,
        color=_DIFF_COLORS.get(diff, 0x6432c8),
    )
    embed.set_footer(text=f"🎯 {sess.score}/{sess.idx} bonnes  ·  ✨ {sess.points} pts  ·  🔥 Combo x{sess.combo}")

    view = _MultiAnswerView(sess, choices, bonnes_rep) if is_qcm else _QuizAnswerView(sess, choices, q["bonne_reponse"])
    try:
        if sess.current_message:
            await sess.current_message.edit(embed=embed, view=view)
            view.message = sess.current_message
        else:
            msg = await inter.followup.send(embed=embed, view=view)
            view.message = msg
            sess.current_message = msg
    except Exception as e:
        print(f"❌ _send_next_question failed: {e}")


class _JokerButton(discord.ui.Button):
    def __init__(self, session: _QuizSession):
        super().__init__(label="🃏  Joker 50/50", style=discord.ButtonStyle.secondary, row=1)
        self._session = session

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self._session.user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        self._session.joker_used = True
        self.disabled = True
        wrong = [b for b in self.view.children if isinstance(b, _AnswerButton) and not b._is_correct and not b.disabled]
        for btn in random.sample(wrong, min(2, len(wrong))):
            btn.disabled = True
        await inter.response.edit_message(view=self.view)


class _AnswerButton(discord.ui.Button):
    def __init__(self, label_text: str, choice_text: str, is_correct: bool, session: _QuizSession):
        super().__init__(label=label_text[:80], style=discord.ButtonStyle.secondary)
        self._choice     = choice_text
        self._is_correct = is_correct
        self._session    = session

    async def callback(self, inter: discord.Interaction):
        sess = self._session
        if inter.user.id != sess.user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        view: _QuizAnswerView = self.view
        elapsed = time.time() - view._start

        for btn in view.children:
            if isinstance(btn, _AnswerButton):
                btn.disabled = True
                if btn._is_correct:
                    btn.style = discord.ButtonStyle.success
                elif btn._choice == self._choice and not self._is_correct:
                    btn.style = discord.ButtonStyle.danger
            elif isinstance(btn, _JokerButton):
                btn.disabled = True
        view.stop()

        q           = sess.questions[sess.idx]
        diff        = q.get("difficulte", "moyen").lower()
        pts         = _DIFF_POINTS.get(diff, 1)
        explication = q.get("explication", "")

        if self._is_correct:
            speed_bonus = 2 if elapsed < 5 else (1 if elapsed < 10 else 0)
            sess.score         += 1
            sess.points        += pts + speed_bonus
            sess.speed_bonuses += speed_bonus
            sess.combo         += 1
            if sess.combo > sess.best_combo:
                sess.best_combo = sess.combo

            lines = [f"✅  **Bonne réponse !**   `+{pts} pt{'s' if pts > 1 else ''}`"]
            if speed_bonus == 2:
                lines.append(f"⚡  Répondu en **{elapsed:.1f}s**  -  `+2 pts bonus vitesse`")
            elif speed_bonus == 1:
                lines.append(f"⚡  Répondu en **{elapsed:.1f}s**  -  `+1 pt bonus vitesse`")

            if   sess.combo >= 10: lines.append(f"💥  **COMBO x{sess.combo}  -  LÉGENDAIRE !!**")
            elif sess.combo >= 7:  lines.append(f"💥  **COMBO x{sess.combo}  -  Inarrêtable !!**")
            elif sess.combo == 5:  lines.append(f"🔥  **COMBO x{sess.combo}  -  Tu es en FEU !**")
            elif sess.combo == 3:  lines.append(f"🔥  **Combo x{sess.combo}  -  C'est chaud !**")
            elif sess.combo > 1:   lines.append(f"🔥  Combo x{sess.combo}")

            if explication:
                lines.append(f"> 📚 *{explication}*")
            color = discord.Color.green()
        else:
            sess.combo = 0
            sess.quiz_all_correct = False
            if sess.paid_mode == "survie":
                sess.idx = len(sess.questions)  # stoppe la survie dès la 1ère erreur
            lines = [
                f"❌  **Mauvaise réponse**",
                f"La bonne réponse était  :  **{view.correct}**",
            ]
            if explication:
                lines.append(f"> 📚 *{explication}*")
            color = discord.Color.red()

        feedback_embed = discord.Embed(description="\n".join(lines), color=color)
        feedback_embed.set_footer(
            text=f"🎯 {sess.score}/{sess.idx + 1} bonnes  ·  ✨ {sess.points} pts  ·  🔥 Combo x{sess.combo}"
        )
        await inter.response.edit_message(embed=feedback_embed, view=view)
        sess.idx += 1
        await asyncio.sleep(1.2)
        await _send_next_question(inter, sess)


class _MultiAnswerButton(discord.ui.Button):
    def __init__(self, label_text: str, choice_text: str, is_correct: bool, session: _QuizSession):
        super().__init__(label=label_text[:80], style=discord.ButtonStyle.secondary)
        self._choice     = choice_text
        self._is_correct = is_correct
        self._session    = session
        self._selected   = False

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self._session.user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        self._selected = not self._selected
        self.style = discord.ButtonStyle.primary if self._selected else discord.ButtonStyle.secondary
        await inter.response.edit_message(view=self.view)


class _ValidateQCMButton(discord.ui.Button):
    def __init__(self, session: _QuizSession, correct_set: set):
        super().__init__(label="Valider ✅", style=discord.ButtonStyle.success, row=1)
        self._session     = session
        self._correct_set = correct_set

    async def callback(self, inter: discord.Interaction):
        sess = self._session
        if inter.user.id != sess.user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        view: _MultiAnswerView = self.view
        view.stop()

        selected = {btn._choice for btn in view.children if isinstance(btn, _MultiAnswerButton) and btn._selected}
        correct  = self._correct_set

        for btn in view.children:
            btn.disabled = True
            if isinstance(btn, _MultiAnswerButton):
                if btn._is_correct:
                    btn.style = discord.ButtonStyle.success
                elif btn._selected:
                    btn.style = discord.ButtonStyle.danger

        q           = sess.questions[sess.idx]
        diff        = q.get("difficulte", "moyen").lower()
        pts         = _DIFF_POINTS.get(diff, 1)
        explication = q.get("explication", "")

        wrong_selected   = selected - correct
        correct_selected = selected & correct

        if selected == correct:
            sess.score  += 1
            sess.points += pts
            sess.combo  += 1
            if sess.combo > sess.best_combo:
                sess.best_combo = sess.combo
            lines = [f"✅  **Toutes les bonnes réponses !**  `+{pts} pt{'s' if pts > 1 else ''}`"]
            if sess.combo >= 3:
                lines.append(f"🔥  Combo x{sess.combo}")
            color = discord.Color.green()
        elif correct_selected and not wrong_selected:
            half = max(1, pts // 2)
            sess.points += half
            sess.combo   = 0
            missed = correct - selected
            lines = [
                f"⚠️  **Partiel**  `+{half} pt{'s' if half > 1 else ''}`",
                f"Réponses manquées : **{', '.join(missed)}**",
            ]
            color = discord.Color.yellow()
        else:
            sess.combo = 0
            lines = [
                f"❌  **Mauvaise sélection**",
                f"Bonnes réponses : **{', '.join(correct)}**",
            ]
            color = discord.Color.red()

        if explication:
            lines.append(f"> 📚 *{explication}*")

        feedback_embed = discord.Embed(description="\n".join(lines), color=color)
        feedback_embed.set_footer(
            text=f"🎯 {sess.score}/{sess.idx + 1} bonnes  ·  ✨ {sess.points} pts  ·  🔥 Combo x{sess.combo}"
        )
        await inter.response.edit_message(embed=feedback_embed, view=view)
        sess.idx += 1
        await asyncio.sleep(1.2)
        await _send_next_question(inter, sess)


class _MultiAnswerView(discord.ui.View):
    def __init__(self, session: _QuizSession, choices: list, correct_answers: list):
        super().__init__(timeout=30)
        self.session = session
        self.message = None
        self._correct = set(correct_answers)
        labels = ["A", "B", "C", "D", "E", "F"]
        for i, choice in enumerate(choices[:6]):
            self.add_item(_MultiAnswerButton(f"{labels[i]}.  {choice}", choice, choice in self._correct, session))
        self.add_item(_ValidateQCMButton(session, self._correct))

    async def on_timeout(self):
        QUIZ_SESSIONS.pop(self.session.user_id, None)
        for btn in self.children:
            btn.disabled = True
            if isinstance(btn, _MultiAnswerButton) and btn._is_correct:
                btn.style = discord.ButtonStyle.success
        if self.message:
            try:
                await self.message.edit(
                    content="⏰  **Temps écoulé !**  Les bonnes réponses sont en vert.",
                    view=self
                )
            except Exception:
                pass


class _QuizAnswerView(discord.ui.View):
    def __init__(self, session: _QuizSession, choices: list, correct: str):
        super().__init__(timeout=30)
        self.session = session
        self.correct = correct
        self.message = None
        self._start  = time.time()
        labels = ["A", "B", "C", "D"]
        for i, choice in enumerate(choices[:4]):
            self.add_item(_AnswerButton(f"{labels[i]}.  {choice}", choice, choice == correct, session))
        if not session.joker_used:
            self.add_item(_JokerButton(session))

    async def on_timeout(self):
        QUIZ_SESSIONS.pop(self.session.user_id, None)
        for btn in self.children:
            btn.disabled = True
            if isinstance(btn, _AnswerButton) and btn._is_correct:
                btn.style = discord.ButtonStyle.success
        if self.message:
            try:
                await self.message.edit(
                    content="⏰  **Temps écoulé !**  La bonne réponse est surlignée en vert.",
                    view=self
                )
            except Exception:
                pass

class _ReplayView(discord.ui.View):
    def __init__(self, user_id: int, n: int, category: str = "general"):
        super().__init__(timeout=120)
        self.user_id = user_id
        self.n = n
        self.category = category

    @discord.ui.button(label="Rejouer (même catégorie)", style=discord.ButtonStyle.primary, emoji="🔄")
    async def rejouer(self, inter: discord.Interaction, button: discord.ui.Button):
        if inter.user.id != self.user_id:
            await inter.response.send_message("Ce bouton ne t'appartient pas.", ephemeral=True)
            return
        button.disabled = True
        await inter.response.edit_message(view=self)
        await _start_quiz_session(inter, self.n, self.category)

_CAT_LABELS_MAP = {
    "general": "🎌 Anime général", "one_piece": "🌊 One Piece", "naruto": "🍥 Naruto",
    "bleach": "🗡️ Bleach", "deathnote": "💀 Death Note", "aot": "🔥 Attack on Titan",
    "dbz": "🏋️ Dragon Ball Z", "hxh": "🎯 Hunter x Hunter", "jojo": "✨ JoJo's Bizarre Adv.",
    "demon_slayer": "⚔️ Demon Slayer", "mha": "💪 My Hero Academia",
    "jjk": "👁️ Jujutsu Kaisen", "fma": "⚗️ Fullmetal Alchemist",
    "chainsaw": "🪚 Chainsaw Man", "black_clover": "🍀 Black Clover", "citation": "💬 Devine la Citation",
}


class _NbQuestionsButton(discord.ui.Button):
    def __init__(self, label: str, n: int, style: discord.ButtonStyle, emoji: str,
                 user_id: int, category: str, challenged_id: int | None = None):
        super().__init__(label=label, style=style, emoji=emoji)
        self._n             = n
        self._user_id       = user_id
        self._category      = category
        self._challenged_id = challenged_id

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self._user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        self.view.stop()

        if self._challenged_id:
            # ── Mode duel : afficher le challenge directement ──────────────
            challenged = inter.guild.get_member(self._challenged_id) if inter.guild else None
            cname = challenged.display_name if challenged else str(self._challenged_id)
            cmention = challenged.mention if challenged else str(self._challenged_id)
            sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            embed = discord.Embed(
                title="⚔️  Défi Quiz !",
                description=(
                    f"{sep}\n"
                    f"**{inter.user.display_name}** défie **{cname}** !\n\n"
                    f"Catégorie : {_CAT_LABELS_MAP.get(self._category, self._category)}\n"
                    f"Questions : **{self._n}**\n"
                    f"{sep}\n"
                    f"{cmention}, tu as **60 secondes** pour accepter."
                ),
                color=discord.Color.orange()
            )
            view = _DuelChallengeView(self._user_id, self._challenged_id, self._category, self._n)
            await inter.response.edit_message(embed=embed, view=view)
        else:
            # ── Mode solo ──────────────────────────────────────────────────
            await inter.response.defer()
            await _start_quiz_session(inter, self._n, self._category)


class _CustomQuestionsModal(discord.ui.Modal, title="Nombre de questions"):
    nb = discord.ui.TextInput(
        label="Nombre de questions (1 à 30)",
        placeholder="Ex : 7",
        min_length=1, max_length=2, required=True,
    )

    def __init__(self, user_id: int, category: str, challenged_id: int | None = None):
        super().__init__()
        self._user_id       = user_id
        self._category      = category
        self._challenged_id = challenged_id

    async def on_submit(self, inter: discord.Interaction):
        try:
            n = int(self.nb.value.strip())
        except ValueError:
            await inter.response.send_message("Entre un nombre valide (ex: 7).", ephemeral=True)
            return
        if not 1 <= n <= 30:
            await inter.response.send_message("Le nombre doit être entre 1 et 30.", ephemeral=True)
            return
        if self._challenged_id:
            guild = inter.guild
            challenged = guild.get_member(self._challenged_id) if guild else None
            cname    = challenged.display_name if challenged else str(self._challenged_id)
            cmention = challenged.mention       if challenged else str(self._challenged_id)
            sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            embed = discord.Embed(
                title="⚔️  Défi Quiz !",
                description=(
                    f"{sep}\n"
                    f"**{inter.user.display_name}** défie **{cname}** !\n\n"
                    f"Catégorie : {_CAT_LABELS_MAP.get(self._category, self._category)}\n"
                    f"Questions : **{n}**\n"
                    f"{sep}\n"
                    f"{cmention}, tu as **60 secondes** pour accepter."
                ),
                color=discord.Color.orange()
            )
            view = _DuelChallengeView(self._user_id, self._challenged_id, self._category, n)
            await inter.response.send_message(embed=embed, view=view)
        else:
            await inter.response.defer()
            await _start_quiz_session(inter, n, self._category)


class _ScoreTargetButton(discord.ui.Button):
    def __init__(self, pts: int, user_id: int, category: str):
        super().__init__(label=f"{pts} pts", style=discord.ButtonStyle.primary, emoji="✨")
        self._pts      = pts
        self._user_id  = user_id
        self._category = category

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self._user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        self.view.stop()
        await inter.response.defer()
        n = min(30, max(5, round(self._pts / 2) + 3))
        await _start_quiz_session(inter, n, self._category, target_points=self._pts)


class _ScoreTargetView(discord.ui.View):
    def __init__(self, user_id: int, category: str):
        super().__init__(timeout=60)
        for pts in (20, 50, 100, 200):
            self.add_item(_ScoreTargetButton(pts, user_id, category))


class _CustomNbButton(discord.ui.Button):
    def __init__(self, user_id: int, category: str, challenged_id: int | None = None):
        super().__init__(label="Personnalisé", style=discord.ButtonStyle.secondary, emoji="✏️")
        self._user_id       = user_id
        self._category      = category
        self._challenged_id = challenged_id

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self._user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        self.view.stop()
        await inter.response.send_modal(_CustomQuestionsModal(self._user_id, self._category, self._challenged_id))


class _DurationView(discord.ui.View):
    def __init__(self, user_id: int, category: str = "general", challenged_id: int | None = None):
        super().__init__(timeout=60)
        self.add_item(_NbQuestionsButton("5 questions",  5,  discord.ButtonStyle.success, "🎯", user_id, category, challenged_id))
        self.add_item(_NbQuestionsButton("10 questions", 10, discord.ButtonStyle.primary,  "⚡", user_id, category, challenged_id))
        self.add_item(_NbQuestionsButton("15 questions", 15, discord.ButtonStyle.danger,   "🔥", user_id, category, challenged_id))
        self.add_item(_CustomNbButton(user_id, category, challenged_id))


class _QuizCategorySelect(discord.ui.Select):
    def __init__(self, user_id: int, challenged_id: int | None = None, score_mode: bool = False):
        self.user_id       = user_id
        self.challenged_id = challenged_id
        self.score_mode    = score_mode
        _LABELS = [
            ("citation",     "💬 Devine la Citation",    "Qui a dit cette réplique ?"),
            ("general",      "🎌 Anime général",        "Tous les animés mélangés"),
            ("one_piece",    "🌊 One Piece",             "Fruits du Démon, arcs, personnages"),
            ("naruto",       "🍥 Naruto",                "Jutsu, clans, Akatsuki, arcs"),
            ("bleach",       "🗡️ Bleach",               "Bankai, Shinigami, Espada"),
            ("deathnote",    "💀 Death Note",            "Kira, L, règles du Death Note"),
            ("aot",          "🔥 Attack on Titan",       "Titans, Survey Corps, Shifters"),
            ("dbz",          "🏋️ Dragon Ball Z",        "Saiyans, transformations, arcs"),
            ("hxh",          "🎯 Hunter x Hunter",       "Nen, Gon, Killua, arcs"),
            ("jojo",         "✨ JoJo's Bizarre Adv.",   "Stands, parties, antagonistes"),
            ("demon_slayer", "⚔️ Demon Slayer",          "Respirations, Piliers, démons"),
            ("mha",          "💪 My Hero Academia",      "Alter, U.A., League of Villains"),
            ("jjk",          "👁️ Jujutsu Kaisen",       "Techniques maudites, Fléaux, grades"),
            ("fma",          "⚗️ Fullmetal Alchemist",  "Alchimie, Homoncules, arcs"),
            ("chainsaw",     "🪚 Chainsaw Man",          "Diables, contrats, Chasseurs"),
            ("black_clover", "🍀 Black Clover",          "Magie, grimoires, Chevaliers"),
        ]
        super().__init__(
            placeholder="Choisis une catégorie...", min_values=1, max_values=1,
            options=[discord.SelectOption(label=l, value=v, description=d) for v, l, d in _LABELS]
        )

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self.user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        self.view.stop()
        category  = self.values[0]
        cat_label = _CAT_LABELS_MAP.get(category, category)

        if self.score_mode:
            embed = discord.Embed(
                title="✨  Score à atteindre",
                description=f"Catégorie choisie : **{cat_label}**",
                color=discord.Color.from_rgb(50, 180, 120),
            )
            embed.set_thumbnail(url=inter.user.display_avatar.url)
            embed.add_field(name="​", value="**━━━━━━  OBJECTIF  ━━━━━━**", inline=False)
            embed.add_field(name="✨  20 pts",  value="*Échauffement*",    inline=True)
            embed.add_field(name="✨  50 pts",  value="*Session standard*", inline=True)
            embed.add_field(name="✨  100 pts", value="*Pour les fans*",    inline=True)
            embed.add_field(name="✨  200 pts", value="*Champion absolu*",  inline=True)
            embed.add_field(name="​", value="*Le quiz s'arrête dès que tu atteins l'objectif !*", inline=False)
            embed.set_footer(text="Brams Community  •  by Freydiss")
            await inter.response.edit_message(embed=embed, view=_ScoreTargetView(self.user_id, category))
        else:
            title = "⚔️  Duel - Nombre de questions" if self.challenged_id else "🎯  Nombre de questions"
            embed = discord.Embed(
                title=title,
                description=f"Catégorie choisie : **{cat_label}**",
                color=discord.Color.from_rgb(100, 50, 200),
            )
            embed.set_thumbnail(url=inter.user.display_avatar.url)
            embed.add_field(name="​", value="**━━━━━━  DURÉE  ━━━━━━**", inline=False)
            embed.add_field(name="🎯  5 questions",  value="*Quiz express*",      inline=True)
            embed.add_field(name="⚡  10 questions", value="*Session standard*",  inline=True)
            embed.add_field(name="🔥  15 questions", value="*Pour les vrais*",    inline=True)
            embed.add_field(name="✏️  Personnalisé", value="*1 à 30 questions*",  inline=True)
            embed.set_footer(text="Brams Community  •  by Freydiss")
            await inter.response.edit_message(embed=embed, view=_DurationView(self.user_id, category, self.challenged_id))


class _CategoryView(discord.ui.View):
    def __init__(self, user_id: int, challenged_id: int | None = None, score_mode: bool = False):
        super().__init__(timeout=60)
        self.add_item(_QuizCategorySelect(user_id, challenged_id, score_mode))


class _OpponentSelect(discord.ui.UserSelect):
    def __init__(self, challenger_id: int):
        super().__init__(placeholder="Sélectionne ton adversaire...", min_values=1, max_values=1)
        self._challenger_id = challenger_id

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self._challenger_id:
            await inter.response.send_message("Ce n'est pas ton quiz.", ephemeral=True)
            return
        opponent = self.values[0]
        if opponent.bot:
            await inter.response.send_message("Tu ne peux pas défier un bot.", ephemeral=True)
            return
        if opponent.id == self._challenger_id:
            await inter.response.send_message("Tu ne peux pas te défier toi-même.", ephemeral=True)
            return
        if (opponent.id in QUIZ_SESSIONS or opponent.id in LIVE_DUELS
                or self._challenger_id in QUIZ_SESSIONS or self._challenger_id in LIVE_DUELS):
            await inter.response.send_message("L'un des joueurs a déjà un quiz en cours.", ephemeral=True)
            return
        self.view.stop()
        embed = discord.Embed(
            title="⚔️  Duel - Catégorie",
            description=f"**{inter.user.display_name}** vs **{opponent.display_name}** - Choisis la catégorie !",
            color=discord.Color.orange(),
        )
        embed.set_thumbnail(url=inter.user.display_avatar.url)
        embed.add_field(name="​", value="**━━━━━━  CATÉGORIE  ━━━━━━**", inline=False)
        embed.add_field(name="​", value="*Sélectionne une catégorie dans le menu ci-dessous*", inline=False)
        embed.set_footer(text="Brams Community  •  by Freydiss")
        await inter.response.edit_message(embed=embed, view=_CategoryView(self._challenger_id, challenged_id=opponent.id))


class _OpponentSelectView(discord.ui.View):
    def __init__(self, challenger_id: int):
        super().__init__(timeout=60)
        self.add_item(_OpponentSelect(challenger_id))


class _QuizTypeView(discord.ui.View):
    def __init__(self, user_id: int):
        super().__init__(timeout=60)
        self._user_id = user_id

    @discord.ui.button(label="Par questions", style=discord.ButtonStyle.primary, emoji="🎯")
    async def par_questions(self, inter: discord.Interaction, button: discord.ui.Button):
        if inter.user.id != self._user_id:
            await inter.response.send_message("Ce n'est pas ton quiz.", ephemeral=True)
            return
        self.stop()
        embed = discord.Embed(
            title="🎌  Catégorie",
            description="Sur quoi veux-tu être testé ?",
            color=discord.Color.from_rgb(100, 50, 200),
        )
        embed.set_thumbnail(url=inter.user.display_avatar.url)
        embed.add_field(name="​", value="**━━━━━━  CATÉGORIE  ━━━━━━**", inline=False)
        embed.add_field(name="​", value="*Sélectionne une catégorie dans le menu ci-dessous*", inline=False)
        embed.set_footer(text="Brams Community  •  by Freydiss")
        await inter.response.edit_message(embed=embed, view=_CategoryView(self._user_id, score_mode=False))

    @discord.ui.button(label="Par score", style=discord.ButtonStyle.success, emoji="✨")
    async def par_score(self, inter: discord.Interaction, button: discord.ui.Button):
        if inter.user.id != self._user_id:
            await inter.response.send_message("Ce n'est pas ton quiz.", ephemeral=True)
            return
        self.stop()
        embed = discord.Embed(
            title="🎌  Catégorie",
            description="Sur quoi veux-tu être testé ?",
            color=discord.Color.from_rgb(50, 180, 120),
        )
        embed.set_thumbnail(url=inter.user.display_avatar.url)
        embed.add_field(name="​", value="**━━━━━━  CATÉGORIE  ━━━━━━**", inline=False)
        embed.add_field(name="​", value="*Sélectionne une catégorie dans le menu ci-dessous*", inline=False)
        embed.set_footer(text="Brams Community  •  by Freydiss")
        await inter.response.edit_message(embed=embed, view=_CategoryView(self._user_id, score_mode=True))


class _ModeView(discord.ui.View):
    def __init__(self, user_id: int):
        super().__init__(timeout=60)
        self._user_id = user_id

    @discord.ui.button(label="Solo", style=discord.ButtonStyle.primary, emoji="🎮")
    async def solo(self, inter: discord.Interaction, button: discord.ui.Button):
        if inter.user.id != self._user_id:
            await inter.response.send_message("Ce n'est pas ton quiz.", ephemeral=True)
            return
        self.stop()
        embed = discord.Embed(
            title="🎮  Solo",
            description="Comment veux-tu jouer ?",
            color=discord.Color.from_rgb(100, 50, 200),
        )
        embed.set_thumbnail(url=inter.user.display_avatar.url)
        embed.add_field(name="​", value="**━━━━━━  MODE DE JEU  ━━━━━━**", inline=False)
        embed.add_field(name="🎯  Par questions", value="*Nombre fixe de questions*",    inline=True)
        embed.add_field(name="✨  Par score",      value="*Joue jusqu'à un objectif*",    inline=True)
        embed.add_field(name="​",                  value="​",                               inline=True)
        embed.set_footer(text="Brams Community  •  by Freydiss")
        await inter.response.edit_message(embed=embed, view=_QuizTypeView(self._user_id))

    @discord.ui.button(label="Duel", style=discord.ButtonStyle.danger, emoji="⚔️")
    async def duel(self, inter: discord.Interaction, button: discord.ui.Button):
        if inter.user.id != self._user_id:
            await inter.response.send_message("Ce n'est pas ton quiz.", ephemeral=True)
            return
        if self._user_id in QUIZ_SESSIONS or self._user_id in LIVE_DUELS:
            await inter.response.send_message("Tu as déjà un quiz en cours.", ephemeral=True)
            return
        self.stop()
        embed = discord.Embed(
            title="⚔️  Duel Quiz",
            description="Qui oses-tu défier ?",
            color=discord.Color.orange(),
        )
        embed.set_thumbnail(url=inter.user.display_avatar.url)
        embed.add_field(name="​", value="**━━━━━━  ADVERSAIRE  ━━━━━━**", inline=False)
        embed.add_field(name="​", value="*Sélectionne un membre dans le menu ci-dessous*", inline=False)
        embed.set_footer(text="Brams Community  •  by Freydiss")
        await inter.response.edit_message(embed=embed, view=_OpponentSelectView(self._user_id))


async def _start_quiz_session(inter: discord.Interaction, n: int, category: str = "general", target_points: int | None = None):
    """Lance une session quiz : loading → génération → première question."""
    uid = inter.user.id
    if uid in QUIZ_SESSIONS:
        await inter.followup.send("❗ Tu as déjà un quiz en cours !", ephemeral=True)
        return

    cat_labels = {
        "general": "tous les animés", "one_piece": "One Piece", "naruto": "Naruto",
        "bleach": "Bleach", "deathnote": "Death Note", "aot": "AoT",
        "dbz": "Dragon Ball Z", "hxh": "HxH", "jojo": "JoJo",
        "demon_slayer": "Demon Slayer", "mha": "My Hero Academia",
        "jjk": "Jujutsu Kaisen", "fma": "Fullmetal Alchemist",
        "chainsaw": "Chainsaw Man", "black_clover": "Black Clover",
        "citation": "Devine la Citation",
    }
    cat_display = cat_labels.get(category, "anime")
    loading_embed = discord.Embed(
        title="🎌 Génération du quiz...",
        description=f"**{n} questions** sur **{cat_display}** en cours de génération ⏳",
        color=discord.Color.from_rgb(100, 50, 200)
    )
    loading_msg = None
    try:
        loading_msg = await inter.followup.send(embed=loading_embed)
    except Exception as e:
        print(f"⚠️ Quiz loading send failed: {e}")

    if category == "citation":
        questions, err = _generate_citation_quiz(n, seen_questions=QUIZ_USER_HISTORY.get(uid))
    else:
        questions, err = await _generate_quiz_questions(n, category, seen_questions=QUIZ_USER_HISTORY.get(uid))

    # Filtre anti-répétition : retire les questions déjà vues par cet utilisateur
    user_seen = set(QUIZ_USER_HISTORY.get(uid, []))
    fresh = [q for q in questions if q["question"] not in user_seen]
    if len(fresh) >= max(1, n // 2):
        questions = fresh[:n]

    if not questions:
        err_display = f"\n\n```{err[:300]}```" if err else ""
        error_embed = discord.Embed(
            title="❌ Génération impossible",
            description=(
                f"Groq n'a pas pu créer les questions.{err_display}\n\n"
                f"**Causes possibles :**\n"
                f"• Clé `GROQ_API_KEY` absente ou invalide dans Railway\n"
                f"• Rate limit Groq atteint (réessaie dans 1 min)\n"
                f"• Problème réseau temporaire"
            ),
            color=discord.Color.red()
        )
        try:
            if loading_msg:
                await loading_msg.edit(embed=error_embed)
            else:
                await inter.followup.send(embed=error_embed)
        except Exception as e:
            print(f"❌ Quiz error embed failed: {e}")
        return

    session = _QuizSession(questions, uid, inter, category)
    session.target_points = target_points
    QUIZ_SESSIONS[uid] = session

    # Mémorise les questions de cette session (tronqué immédiatement)
    history = QUIZ_USER_HISTORY.get(uid, [])
    history = (history + [q["question"] for q in questions])[-_QUIZ_HISTORY_MAX:]
    QUIZ_USER_HISTORY[uid] = history

    if loading_msg:
        try:
            await loading_msg.delete()
        except Exception:
            pass

    await _send_next_question(inter, session)


async def _quiz_entry(interaction: discord.Interaction):
    try:
        await interaction.response.defer(ephemeral=False)
    except discord.NotFound:
        return
    except Exception as e:
        print(f"❌ quiz defer: {e}")
        return

    embed = discord.Embed(
        title="🎌  Quiz Animé",
        description=f"Bienvenue **{interaction.user.display_name}** - teste tes connaissances !",
        color=discord.Color.from_rgb(100, 50, 200),
    )
    embed.set_thumbnail(url=interaction.user.display_avatar.url)
    embed.add_field(name="​", value="**━━━━━━  MODE DE JEU  ━━━━━━**", inline=False)
    embed.add_field(name="🎮  Solo",   value="*Joue à ton rythme*",        inline=True)
    embed.add_field(name="⚔️  Duel",  value="*Affronte un autre membre*",  inline=True)
    embed.add_field(name="​",          value="​",                            inline=True)
    embed.set_footer(text="Brams Community  •  by Freydiss")
    try:
        await interaction.followup.send(embed=embed, view=_ModeView(interaction.user.id))
    except Exception as e:
        print(f"❌ quiz followup: {e}")




class _DuelAnswerButton(discord.ui.Button):
    def __init__(self, label_text: str, choice_text: str, is_correct: bool,
                 duel: "_LiveDuelSession", q: dict):
        super().__init__(label=label_text[:80], style=discord.ButtonStyle.secondary)
        self._choice     = choice_text
        self._is_correct = is_correct
        self._duel       = duel
        self._q          = q

    async def callback(self, inter: discord.Interaction):
        duel = self._duel
        if inter.user.id not in (duel.uid1, duel.uid2):
            await inter.response.send_message("Tu ne fais pas partie de ce duel.", ephemeral=True)
            return
        view: _DuelQuestionView = self.view
        if view._answered:
            await inter.response.send_message("Quelqu'un a déjà répondu à cette question.", ephemeral=True)
            return
        view._answered = True
        view.stop()

        for btn in view.children:
            btn.disabled = True
            if isinstance(btn, _DuelAnswerButton):
                if btn._is_correct:
                    btn.style = discord.ButtonStyle.success
                elif btn._choice == self._choice and not self._is_correct:
                    btn.style = discord.ButtonStyle.danger
        await inter.response.edit_message(view=view)

        q    = self._q
        diff = q.get("difficulte", "moyen").lower()
        pts  = _DIFF_POINTS.get(diff, 1)
        explication = q.get("explication", "")

        if self._is_correct:
            if inter.user.id == duel.uid1:
                duel.score1 += 1
                duel.pts1   += pts
            else:
                duel.score2 += 1
                duel.pts2   += pts
            winner_name = duel.name1 if inter.user.id == duel.uid1 else duel.name2
            feedback = f"✅  **{winner_name}** répond le premier - `+{pts} pt{'s' if pts > 1 else ''}`"
        else:
            loser_name = duel.name1 if inter.user.id == duel.uid1 else duel.name2
            feedback = f"❌  **{loser_name}** s'est trompé - bonne réponse : **{view.correct}**"
        if explication:
            feedback += f"\n> 📚 *{explication}*"

        await asyncio.sleep(3)
        await _send_duel_question(duel, inter, feedback)


class _DuelQuestionView(discord.ui.View):
    def __init__(self, duel: "_LiveDuelSession", choices: list, correct: str, q: dict):
        super().__init__(timeout=10)
        self.correct   = correct
        self.message   = None
        self._duel     = duel
        self._q        = q
        self._answered = False
        labels = ["A", "B", "C", "D"]
        for i, choice in enumerate(choices[:4]):
            self.add_item(_DuelAnswerButton(f"{labels[i]}.  {choice}", choice, choice == correct, duel, q))

    async def on_timeout(self):
        if self._answered:
            return
        self._answered = True
        for btn in self.children:
            btn.disabled = True
            if isinstance(btn, _DuelAnswerButton) and btn._is_correct:
                btn.style = discord.ButtonStyle.success
        if self.message:
            try:
                await self.message.edit(
                    content="⏰  **Temps écoulé !** Personne n'a répondu.",
                    view=self
                )
            except Exception:
                pass
        await asyncio.sleep(3)
        await _send_duel_question(self._duel, self._duel.interaction, "⏰ Temps écoulé - aucun point attribué.")


async def _send_duel_question(duel: "_LiveDuelSession", inter: discord.Interaction, feedback: str = ""):
    n = len(duel.questions)
    if duel.idx >= n:
        LIVE_DUELS.pop(duel.uid1, None)
        LIVE_DUELS.pop(duel.uid2, None)
        await _send_live_duel_result(duel, inter, berry_bet=duel.berry_bet)
        return

    q        = duel.questions[duel.idx]
    duel.idx += 1
    choices  = [q["bonne_reponse"]] + q["mauvaises_reponses"][:3]
    random.shuffle(choices)

    diff       = q.get("difficulte", "moyen").lower()
    q_type     = q.get("type", "")
    diff_emoji = _DIFF_EMOJI.get(diff, "⚪")
    type_emoji = _TYPE_EMOJI.get(q_type, "")
    pts        = _DIFF_POINTS.get(diff, 1)
    anime      = q.get("anime", "?").upper()
    deadline   = int(time.time()) + 10

    tags = f"📺 **{anime}**  ·  {diff_emoji} {diff.capitalize()}  ·  ✨ +{pts} pt{'s' if pts > 1 else ''}"
    if type_emoji:
        tags += f"  ·  {type_emoji} {q_type.capitalize()}"

    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    question_block = (
        f"{tags}\n"
        f"⏱️  Expire <t:{deadline}:R>\n\n"
        f"{sep}\n"
        f"**{q['question']}**\n"
        f"{sep}"
    )
    desc = f"{feedback}\n\n{question_block}" if feedback else question_block

    embed = discord.Embed(
        title=f"⚔️  Question {duel.idx} / {n}",
        description=desc,
        color=_DIFF_COLORS.get(diff, 0x6432c8),
    )
    embed.set_footer(text=(
        f"🔴 {duel.name1} : {duel.pts1} pts  ·  "
        f"🔵 {duel.name2} : {duel.pts2} pts  ·  "
        f"⚡ Premier à répondre gagne !"
    ))

    view = _DuelQuestionView(duel, choices, q["bonne_reponse"], q)
    try:
        msg = await inter.followup.send(embed=embed, view=view)
        view.message = msg
    except Exception as e:
        print(f"❌ _send_duel_question failed: {e}")


async def _send_live_duel_result(duel: "_LiveDuelSession", inter: discord.Interaction, berry_bet: int = 0):
    n = len(duel.questions)
    berry_line = ""
    if duel.pts1 > duel.pts2:
        titre = f"🏆  **{duel.name1}** remporte le duel !"
        color = discord.Color.gold()
        if berry_bet:
            gained = add_berrys(str(duel.uid1), berry_bet * 2)
            berry_line = f"\n💰 **{duel.name1}** remporte **{berry_bet * 2} 🍊** ! (Solde : {gained} 🍊)"
    elif duel.pts2 > duel.pts1:
        titre = f"🏆  **{duel.name2}** remporte le duel !"
        color = discord.Color.gold()
        if berry_bet:
            gained = add_berrys(str(duel.uid2), berry_bet * 2)
            berry_line = f"\n💰 **{duel.name2}** remporte **{berry_bet * 2} 🍊** ! (Solde : {gained} 🍊)"
    else:
        titre = "⚖️  Égalité parfaite !"
        color = discord.Color.blurple()
        if berry_bet:
            add_berrys(str(duel.uid1), berry_bet)
            add_berrys(str(duel.uid2), berry_bet)
            berry_line = f"\n⚖️ Remboursement : **{berry_bet} 🍊** chacun."

    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    embed = discord.Embed(
        title="⚔️  Résultat du Duel Quiz",
        description=(
            f"{titre}{berry_line}\n\n"
            f"{sep}\n"
            f"🔴 **{duel.name1}**\n"
            f"> 🎯 {duel.score1} / {n}  ·  ✨ {duel.pts1} pts\n\n"
            f"🔵 **{duel.name2}**\n"
            f"> 🎯 {duel.score2} / {n}  ·  ✨ {duel.pts2} pts\n"
            f"{sep}"
        ),
        color=color,
    )
    try:
        await inter.followup.send(embed=embed)
    except Exception:
        pass


async def _start_live_duel(inter: discord.Interaction, uid1: int, uid2: int, category: str, n: int):
    if uid1 in LIVE_DUELS or uid2 in LIVE_DUELS:
        try:
            await inter.followup.send("❗ L'un des joueurs est déjà en duel.", ephemeral=True)
        except Exception:
            pass
        return

    questions, err = (
        _generate_citation_quiz(n)
        if category == "citation"
        else await _generate_quiz_questions(n, category)
    )
    if err or not questions:
        embed = discord.Embed(
            title="❌ Erreur de génération",
            description=f"Impossible de générer les questions : {err}",
            color=discord.Color.red()
        )
        try:
            await inter.followup.send(embed=embed)
        except Exception:
            pass
        return

    guild = inter.guild
    m1    = guild.get_member(uid1) if guild else None
    m2    = guild.get_member(uid2) if guild else None
    name1 = m1.display_name if m1 else str(uid1)
    name2 = m2.display_name if m2 else str(uid2)

    duel = _LiveDuelSession(uid1, uid2, name1, name2, questions, inter)
    LIVE_DUELS[uid1] = duel
    LIVE_DUELS[uid2] = duel

    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    start_embed = discord.Embed(
        title="⚔️  Duel lancé !",
        description=(
            f"{sep}\n"
            f"🔴 **{name1}**  vs  🔵 **{name2}**\n"
            f"Catégorie : {_CAT_LABELS_MAP.get(category, category)}  ·  {n} questions  ·  ⏱️ 10s par question\n"
            f"{sep}\n"
            f"Le premier à cliquer la bonne réponse gagne le point !"
        ),
        color=discord.Color.gold()
    )
    try:
        await inter.followup.send(embed=start_embed)
    except Exception:
        pass

    await _send_duel_question(duel, inter)


class _DuelChallengeView(discord.ui.View):
    def __init__(self, challenger_id: int, challenged_id: int, category: str, n: int):
        super().__init__(timeout=60)
        self._challenger_id = challenger_id
        self._challenged_id = challenged_id
        self._category      = category
        self._n             = n

    @discord.ui.button(label="Accepter", style=discord.ButtonStyle.success, emoji="✅")
    async def accept(self, inter: discord.Interaction, button: discord.ui.Button):
        if inter.user.id != self._challenged_id:
            await inter.response.send_message("Ce défi ne te concerne pas.", ephemeral=True)
            return
        for item in self.children:
            item.disabled = True
        self.stop()
        sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        embed = discord.Embed(
            title="⚔️  Défi accepté !",
            description=f"{sep}\n**{self._n} questions** en cours de génération ⏳\n{sep}",
            color=discord.Color.gold()
        )
        await inter.response.edit_message(embed=embed, view=self)
        await _start_live_duel(inter, self._challenger_id, self._challenged_id, self._category, self._n)

    @discord.ui.button(label="Refuser", style=discord.ButtonStyle.danger, emoji="❌")
    async def decline(self, inter: discord.Interaction, button: discord.ui.Button):
        if inter.user.id != self._challenged_id:
            await inter.response.send_message("Ce défi ne te concerne pas.", ephemeral=True)
            return
        for item in self.children:
            item.disabled = True
        self.stop()
        embed = discord.Embed(
            title="❌  Défi refusé",
            description=f"**{inter.user.display_name}** a refusé le défi.",
            color=discord.Color.red()
        )
        await inter.response.edit_message(embed=embed, view=self)

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True



# ─────────────────────────────────────────
#  AKINATOR
# ─────────────────────────────────────────

_AKI_SESSIONS: dict[int, "_AkinatorSession"] = {}
_AKI_MAX_QUESTIONS   = 25
_AKI_MAX_BAD_GUESSES = 3

_AKI_SYSTEM = (
    "Tu es Akinator Anime, un génie qui devine UNIQUEMENT des personnages d'anime et de manga.\n"
    "Le joueur pense FORCÉMENT à un personnage d'anime ou de manga (One Piece, Naruto, Dragon Ball, "
    "Attack on Titan, Death Note, Demon Slayer, Jujutsu Kaisen, Bleach, Hunter x Hunter, Fairy Tail, "
    "Re:Zero, SAO, Black Clover, Vinland Saga, FMA, JoJo, Tokyo Ghoul, Code Geass, etc.).\n"
    "Tu ne devines QUE des personnages d'anime/manga — jamais de célébrité, film occidental, jeu vidéo seul, etc.\n\n"
    "Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte autour :\n"
    '- Question  : {"action":"question","text":"Ta question ?"}\n'
    '- Supposition : {"action":"guess","character":"Nom exact du personnage","reason":"Justification courte"}\n'
    '- Abandon   : {"action":"give_up"}\n\n'
    "Stratégie :\n"
    "1. Commence par identifier l'univers/série : shōnen, shōjo, seinen ; série populaire vs obscure\n"
    "2. Affine : genre (homme/femme/autre), rôle (héros/antagoniste/secondaire), apparence marquante\n"
    "3. Précise : pouvoirs/capacités, arc narratif, relations importantes, organisation, époque de la série\n"
    "4. Devine dès que tu es à ~70% de confiance\n"
    "5. Après une mauvaise supposition, continue avec de nouvelles questions différentes\n"
    "6. Ne repose JAMAIS une question déjà dans l'historique\n"
    "7. Abandonne après 3 mauvaises suppositions ou 25 questions sans succès"
)


class _AkinatorSession:
    def __init__(self, user_id: int):
        self.user_id      = user_id
        self.qa_history: list[tuple[str, str]] = []
        self.wrong_guesses: list[str] = []
        self.nb_questions = 0
        self.ended        = False

    def build_messages(self) -> list[dict]:
        msgs = [{"role": "system", "content": _AKI_SYSTEM}]
        if not self.qa_history:
            msgs.append({"role": "user", "content": "Le joueur pense à un personnage d'anime ou de manga. Pose ta première question pour identifier la série ou le type de personnage."})
        else:
            lines = ["Historique Q&A :"]
            for i, (q, a) in enumerate(self.qa_history, 1):
                lines.append(f"  {i}. {q} → {a}")
            if self.wrong_guesses:
                lines.append(f"\nSuppositions incorrectes : {', '.join(self.wrong_guesses)}")
            lines.append(f"\nQuestions posées : {self.nb_questions}/{_AKI_MAX_QUESTIONS}")
            lines.append(f"Mauvaises suppositions : {len(self.wrong_guesses)}/{_AKI_MAX_BAD_GUESSES}")
            lines.append("\nQue fais-tu ? (question ou supposition)")
            msgs.append({"role": "user", "content": "\n".join(lines)})
        return msgs


async def _aki_next_action(session: _AkinatorSession) -> dict:
    api_key = os.environ.get("GROQ_API_KEY", "")
    for attempt in range(3):
        try:
            resp = await litellm.acompletion(
                model=_GROQ_MODEL,
                api_key=api_key,
                max_tokens=256,
                temperature=0.7,
                response_format={"type": "json_object"},
                messages=session.build_messages(),
            )
            data = json.loads(resp.choices[0].message.content.strip())
            if data.get("action") in ("question", "guess", "give_up"):
                return data
        except Exception as e:
            print(f"[AKINATOR] attempt {attempt+1}: {e}")
    return {"action": "give_up"}


def _aki_question_embed(session: _AkinatorSession, question: str) -> discord.Embed:
    filled = min(session.nb_questions, _AKI_MAX_QUESTIONS)
    bar    = "▓" * filled + "░" * (_AKI_MAX_QUESTIONS - filled)
    desc   = f"**Question {session.nb_questions} / {_AKI_MAX_QUESTIONS}**\n`{bar}`\n\n💬  **{question}**"
    embed  = discord.Embed(title="🎩  Akinator  🎩", description=desc, color=discord.Color.blurple())
    if session.wrong_guesses:
        embed.add_field(name="Mauvaises suppos.", value="\n".join(f"❌ {g}" for g in session.wrong_guesses), inline=False)
    embed.set_footer(text="Pense à un perso anime/manga et réponds honnêtement — je vais trouver !")
    return embed


def _aki_guess_embed(session: _AkinatorSession, character: str, reason: str) -> discord.Embed:
    embed = discord.Embed(
        title="🎩  Akinator — Ma supposition !  🎩",
        description=(
            f"Après **{session.nb_questions}** question(s)…\n\n"
            f"🔮  **Je pense que tu penses à :**\n# {character}\n\n*{reason}*"
        ),
        color=discord.Color.gold(),
    )
    embed.set_footer(text="Est-ce que j'ai raison ?")
    return embed


async def _aki_dispatch(interaction: discord.Interaction, session: _AkinatorSession, action: dict):
    if action["action"] == "question":
        q = action.get("text", "Ton personnage est-il fictif ?")
        session.nb_questions += 1
        session.qa_history.append((q, ""))
        await interaction.edit_original_response(embed=_aki_question_embed(session, q), view=_AkinatorAnswerView(session))

    elif action["action"] == "guess":
        character = action.get("character", "???")
        reason    = action.get("reason", "")
        await interaction.edit_original_response(embed=_aki_guess_embed(session, character, reason), view=_AkinatorGuessView(session, character))

    else:
        session.ended = True
        _AKI_SESSIONS.pop(session.user_id, None)
        embed = discord.Embed(
            title="🎩  Akinator — Défaite  🎩",
            description=f"😤  Tu m'as eu !\n\n{session.nb_questions} questions, et je n'ai pas trouvé.\nC'était qui ?",
            color=discord.Color.red(),
        )
        await interaction.edit_original_response(embed=embed, view=None)


class _AkinatorAnswerView(discord.ui.View):
    _CHOICES = [
        ("Oui",              "✅", discord.ButtonStyle.success),
        ("Non",              "❌", discord.ButtonStyle.danger),
        ("Je ne sais pas",   "🤷", discord.ButtonStyle.secondary),
        ("Probablement",     "🟡", discord.ButtonStyle.primary),
        ("Probablement pas", "🔴", discord.ButtonStyle.secondary),
    ]

    def __init__(self, session: _AkinatorSession):
        super().__init__(timeout=120)
        self._session = session
        for label, emoji, style in self._CHOICES:
            btn = discord.ui.Button(label=label, emoji=emoji, style=style)
            btn.callback = self._make_cb(label)
            self.add_item(btn)

    def _make_cb(self, answer: str):
        async def cb(interaction: discord.Interaction):
            if interaction.user.id != self._session.user_id:
                await interaction.response.send_message("Ce n'est pas ton Akinator !", ephemeral=True)
                return
            if self._session.ended:
                await interaction.response.send_message("❌ Cette partie a expiré.", ephemeral=True)
                return
            self.stop()
            await interaction.response.defer()
            # Enregistre la réponse sur la dernière question
            if self._session.qa_history and self._session.qa_history[-1][1] == "":
                self._session.qa_history[-1] = (self._session.qa_history[-1][0], answer)
            if (self._session.nb_questions >= _AKI_MAX_QUESTIONS
                    or len(self._session.wrong_guesses) >= _AKI_MAX_BAD_GUESSES):
                action = {"action": "give_up"}
            else:
                action = await _aki_next_action(self._session)
            await _aki_dispatch(interaction, self._session, action)
        return cb

    async def on_timeout(self):
        self._session.ended = True
        _AKI_SESSIONS.pop(self._session.user_id, None)


class _AkinatorGuessView(discord.ui.View):
    def __init__(self, session: _AkinatorSession, character: str):
        super().__init__(timeout=120)
        self._session   = session
        self._character = character

    @discord.ui.button(label="Oui, c'est ça !", emoji="✅", style=discord.ButtonStyle.success)
    async def correct(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._session.user_id:
            await interaction.response.send_message("Ce n'est pas ton Akinator !", ephemeral=True)
            return
        self.stop()
        self._session.ended = True
        _AKI_SESSIONS.pop(self._session.user_id, None)
        embed = discord.Embed(
            title="🎩  Akinator — Victoire !  🎩",
            description=(
                f"🏆  **J'ai trouvé !**\n\n"
                f"Tu pensais à **{self._character}** !\n\n"
                f"Questions : **{self._session.nb_questions}** • Mauvaises suppositions : **{len(self._session.wrong_guesses)}**"
            ),
            color=discord.Color.green(),
        )
        await interaction.response.edit_message(embed=embed, view=None)

    @discord.ui.button(label="Non, ce n'est pas ça", emoji="❌", style=discord.ButtonStyle.danger)
    async def wrong(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._session.user_id:
            await interaction.response.send_message("Ce n'est pas ton Akinator !", ephemeral=True)
            return
        self.stop()
        await interaction.response.defer()
        session = self._session
        session.wrong_guesses.append(self._character)
        if len(session.wrong_guesses) >= _AKI_MAX_BAD_GUESSES:
            session.ended = True
            _AKI_SESSIONS.pop(session.user_id, None)
            embed = discord.Embed(
                title="🎩  Akinator — Défaite  🎩",
                description=f"😤  Tu m'as eu !\n\n{session.nb_questions} questions posées, {len(session.wrong_guesses)} suppositions.\nC'était qui ?",
                color=discord.Color.red(),
            )
            await interaction.edit_original_response(embed=embed, view=None)
            return
        action = await _aki_next_action(session)
        await _aki_dispatch(interaction, session, action)

    async def on_timeout(self):
        self._session.ended = True
        _AKI_SESSIONS.pop(self._session.user_id, None)


# ─────────────────────────────────────────
#  AKINATOR ONE PIECE — PAYANT
# ─────────────────────────────────────────

_AKI_PENALTY   = 50_000   # Berry perdus si le bot devine
_AKI_OP_MODES: dict[str, dict] = {
    "normal":   {"label": "Partie normale",  "emoji": "🎮", "cost": _AKI_PENALTY, "reward": 20_000,  "max_q": 20, "style": discord.ButtonStyle.primary,   "desc": "Persos connus · 20 questions · gain **20 000 🍊** / perte **50 000 🍊**"},
    "expert":   {"label": "Mode Expert",     "emoji": "💀", "cost": _AKI_PENALTY, "reward": 40_000,  "max_q": 25, "style": discord.ButtonStyle.danger,    "desc": "Persos rares · 25 questions · gain **40 000 🍊** / perte **50 000 🍊**"},
    "ranked":   {"label": "Mode Ranked",     "emoji": "🏆", "cost": _AKI_PENALTY, "reward": None,    "max_q": 25, "style": discord.ButtonStyle.success,   "desc": "Classement · 25 questions · gain **75 000–100 000 🍊** / perte **50 000 🍊**"},
    "duel":     {"label": "Défi 1v1",        "emoji": "⚔️", "cost": None,         "reward": None,    "max_q": 25, "style": discord.ButtonStyle.secondary, "desc": "Mise aléatoire · Le gagnant empoche tout"},
}

_AKI_OP_SYSTEM_NORMAL = (
    "Tu es Akinator spécialisé One Piece. Tu dois deviner un personnage CONNU et PRINCIPAL de One Piece "
    "(Luffy, Zoro, Nami, Sanji, Ace, Whitebeard, Law, Doflamingo, Shanks, Big Mom, Kaido, Mihawk, etc.).\n"
    "Réponds UNIQUEMENT en JSON valide :\n"
    '- Question : {"action":"question","text":"Ta question ?"}\n'
    '- Supposition : {"action":"guess","character":"Nom exact","reason":"Justification courte"}\n'
    '- Abandon : {"action":"give_up"}\n\n'
    "Stratégie : identifie d'abord l'arc/équipage/faction, puis affine avec genre, fruit du démon, rôle. "
    "Devine dès que tu es à ~70% de confiance. Pas de double question."
)

_AKI_OP_SYSTEM_EXPERT = (
    "Tu es Akinator spécialisé One Piece en MODE EXPERT. Tu dois deviner un personnage SECONDAIRE ou RARE de One Piece "
    "(officiers de rang inférieur, habitants d'île, antagonistes mineurs, personnages apparus dans un seul arc).\n"
    "Réponds UNIQUEMENT en JSON valide :\n"
    '- Question : {"action":"question","text":"Ta question ?"}\n'
    '- Supposition : {"action":"guess","character":"Nom exact","reason":"Justification courte"}\n'
    '- Abandon : {"action":"give_up"}\n\n'
    "Stratégie : commence par l'arc où le perso apparaît, son camp, son importance narrative. "
    "Sois précis et variés dans tes questions. Pas de double question."
)

_AKI_OP_SYSTEM_RANKED = _AKI_OP_SYSTEM_NORMAL  # même niveau, mais compétitif

_AKI_OP_SYSTEMS = {
    "normal": _AKI_OP_SYSTEM_NORMAL,
    "expert": _AKI_OP_SYSTEM_EXPERT,
    "ranked": _AKI_OP_SYSTEM_RANKED,
    "duel":   _AKI_OP_SYSTEM_NORMAL,
}

_AKI_OP_SESSIONS: dict[int, "_AkinatorOPSession"] = {}
_AKI_OP_DUELS:    dict[str, "_AkinatorOPDuel"]    = {}


class _AkinatorOPSession(_AkinatorSession):
    def __init__(self, user_id: int, mode: str):
        super().__init__(user_id)
        self.op_mode   = mode
        self.op_cost   = _AKI_OP_MODES[mode]["cost"] or 0
        self.op_reward = _AKI_OP_MODES[mode]["reward"] or 0
        self.op_max_q  = _AKI_OP_MODES[mode]["max_q"]
        self.duel_ref: "_AkinatorOPDuel | None" = None

    def build_messages(self) -> list[dict]:
        msgs = [{"role": "system", "content": _AKI_OP_SYSTEMS[self.op_mode]}]
        if not self.qa_history:
            msgs.append({"role": "user", "content": "Le joueur pense à un personnage de One Piece. Pose ta première question."})
        else:
            lines = ["Historique Q&A :"]
            for i, (q, a) in enumerate(self.qa_history, 1):
                lines.append(f"  {i}. {q} → {a}")
            if self.wrong_guesses:
                lines.append(f"Suppositions incorrectes : {', '.join(self.wrong_guesses)}")
            lines.append(f"\nQuestions : {self.nb_questions}/{self.op_max_q} | Mauvaises suppositions : {len(self.wrong_guesses)}/{_AKI_MAX_BAD_GUESSES}")
            lines.append("Que fais-tu ? (question ou supposition)")
            msgs.append({"role": "user", "content": "\n".join(lines)})
        return msgs


class _AkinatorOPDuel:
    def __init__(self, duel_id: str, uid1: int, uid2: int, name1: str, name2: str,
                 bet1: int, bet2: int, channel: discord.TextChannel):
        self.duel_id = duel_id
        self.uid1, self.uid2       = uid1, uid2
        self.name1, self.name2     = name1, name2
        self.bet1, self.bet2       = bet1, bet2
        self.channel               = channel
        self.result1: int | None   = None   # nb questions pour deviner (None = pas fini)
        self.result2: int | None   = None
        self.gave_up1: bool        = False  # bot a abandonné sur le perso de uid1
        self.gave_up2: bool        = False


async def _aki_op_next_action(session: _AkinatorOPSession) -> dict:
    api_key = os.environ.get("GROQ_API_KEY", "")
    for attempt in range(3):
        try:
            resp = await litellm.acompletion(
                model=_GROQ_MODEL, api_key=api_key, max_tokens=256, temperature=0.7,
                response_format={"type": "json_object"}, messages=session.build_messages(),
            )
            data = json.loads(resp.choices[0].message.content.strip())
            if data.get("action") in ("question", "guess", "give_up"):
                return data
        except Exception as e:
            print(f"[AKI_OP] attempt {attempt+1}: {e}")
    return {"action": "give_up"}


def _aki_op_question_embed(session: _AkinatorOPSession, question: str) -> discord.Embed:
    max_q = session.op_max_q
    bar   = "▓" * min(session.nb_questions, max_q) + "░" * max(0, max_q - session.nb_questions)
    embed = discord.Embed(
        title="🧞 Akinator One Piece 🧞",
        description=f"**Question {session.nb_questions}/{max_q}**\n`{bar}`\n\n💬  **{question}**",
        color=discord.Color.from_rgb(220, 50, 50),
    )
    mode_cfg = _AKI_OP_MODES[session.op_mode]
    embed.set_footer(text=f"Mode : {mode_cfg['emoji']} {mode_cfg['label']} • Réponds honnêtement !")
    if session.wrong_guesses:
        embed.add_field(name="❌ Mauvaises suppositions", value="\n".join(f"• {g}" for g in session.wrong_guesses), inline=False)
    return embed


def _aki_op_guess_embed(session: _AkinatorOPSession, character: str, reason: str) -> discord.Embed:
    return discord.Embed(
        title="🧞 Akinator One Piece — Ma supposition ! 🧞",
        description=(
            f"Après **{session.nb_questions}** question(s)…\n\n"
            f"🔮  **Je pense que tu penses à :**\n# {character}\n\n*{reason}*"
        ),
        color=discord.Color.gold(),
    ).set_footer(text="Est-ce que j'ai raison ?")


async def _aki_op_dispatch(interaction: discord.Interaction, session: _AkinatorOPSession, action: dict):
    uid = str(session.user_id)

    if action["action"] == "question":
        q = action.get("text", "Ce personnage est-il un pirate ?")
        session.nb_questions += 1
        session.qa_history.append((q, ""))
        await interaction.edit_original_response(
            embed=_aki_op_question_embed(session, q), view=_AkinatorOPAnswerView(session)
        )

    elif action["action"] == "guess":
        character = action.get("character", "???")
        reason    = action.get("reason", "")
        await interaction.edit_original_response(
            embed=_aki_op_guess_embed(session, character, reason), view=_AkinatorOPGuessView(session, character)
        )

    else:  # give_up → joueur GAGNE
        session.ended = True
        _AKI_OP_SESSIONS.pop(session.user_id, None)

        desc = f"😤  **Je n'ai pas trouvé ton personnage !**\n{session.nb_questions} questions posées.\n\n"
        if session.duel_ref:
            _aki_op_duel_record(session, gave_up=True)
            desc += "*Résultat enregistré — attends la fin du duel.*"
            embed = discord.Embed(title="🧞 Akinator OP — Tu m'as eu !", description=desc, color=discord.Color.green())
            await interaction.edit_original_response(embed=embed, view=None)
        elif session.op_mode == "ranked":
            reward  = random.randint(75_000, 100_000)
            new_bal = add_berrys(uid, reward)
            _u = get_user(_CACHE, uid)
            rk = _u.get("aki_ranked", {"wins": 0, "losses": 0, "score": 0})
            rk["wins"]  = rk.get("wins", 0) + 1
            rk["score"] = rk.get("score", 0) + 100
            _u["aki_ranked"] = rk
            _DIRTY.add(uid)
            desc += f"**+{_fmt_berry(reward)} 🍊** gagnés ! Solde : **{_fmt_berry(new_bal)} 🍊**\n🏆 +100 pts ranked (score : {rk['score']})"
            embed = discord.Embed(title="🧞 Akinator OP — Tu m'as eu !", description=desc, color=discord.Color.green())
            await interaction.edit_original_response(embed=embed, view=None)
        else:
            reward  = session.op_reward  # 20 000 normal / 40 000 expert
            new_bal = add_berrys(uid, reward)
            desc += f"**+{_fmt_berry(reward)} 🍊** gagnés ! Solde : **{_fmt_berry(new_bal)} 🍊**"
            embed = discord.Embed(title="🧞 Akinator OP — Tu m'as eu !", description=desc, color=discord.Color.green())
            await interaction.edit_original_response(embed=embed, view=None)


def _aki_op_duel_record(session: _AkinatorOPSession, gave_up: bool = False):
    duel = session.duel_ref
    if duel is None:
        return
    score = session.nb_questions
    if session.user_id == duel.uid1:
        duel.result1  = score
        duel.gave_up1 = gave_up
    else:
        duel.result2  = score
        duel.gave_up2 = gave_up

    if duel.result1 is not None and duel.result2 is not None:
        asyncio.create_task(_aki_op_duel_conclude(duel))


async def _aki_op_duel_conclude(duel: _AkinatorOPDuel):
    _AKI_OP_DUELS.pop(duel.duel_id, None)
    r1, r2 = duel.result1, duel.result2
    gup1, gup2 = duel.gave_up1, duel.gave_up2

    # bot a abandonné = personnage très dur = score max
    s1 = (999 if gup1 else r1)
    s2 = (999 if gup2 else r2)

    total_pot = duel.bet1 + duel.bet2
    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if s1 > s2:
        winner_uid, winner_name = duel.uid1, duel.name1
        loser_name  = duel.name2
    elif s2 > s1:
        winner_uid, winner_name = duel.uid2, duel.name2
        loser_name  = duel.name1
    else:
        winner_uid = None
        winner_name = loser_name = ""

    if winner_uid:
        new_bal = add_berrys(str(winner_uid), total_pot)
        desc = (
            f"🏆 **{winner_name}** a choisi le perso le plus difficile !\n\n"
            f"{sep}\n"
            f"🔴 **{duel.name1}** → bot a {'abandonné' if gup1 else f'deviné en {r1} question(s)'}\n"
            f"🔵 **{duel.name2}** → bot a {'abandonné' if gup2 else f'deviné en {r2} question(s)'}\n"
            f"{sep}\n\n"
            f"💰 **{winner_name}** remporte **{total_pot} 🍊** ! (Solde : {new_bal} 🍊)"
        )
    else:
        add_berrys(str(duel.uid1), duel.bet1)
        add_berrys(str(duel.uid2), duel.bet2)
        desc = (
            f"⚖️ **Égalité parfaite !**\n\n"
            f"{sep}\n"
            f"🔴 **{duel.name1}** → {'bot abandonné' if gup1 else f'{r1} question(s)'}\n"
            f"🔵 **{duel.name2}** → {'bot abandonné' if gup2 else f'{r2} question(s)'}\n"
            f"{sep}\n\nRemboursement des mises."
        )

    embed = discord.Embed(title="⚔️  Résultat Duel Akinator OP  ⚔️", description=desc, color=discord.Color.gold())
    try:
        await duel.channel.send(embed=embed)
    except Exception as e:
        print(f"[AKI_OP DUEL] conclude send failed: {e}")


class _AkinatorOPAnswerView(discord.ui.View):
    _CHOICES = [
        ("Oui",              "✅", discord.ButtonStyle.success),
        ("Non",              "❌", discord.ButtonStyle.danger),
        ("Je ne sais pas",   "🤷", discord.ButtonStyle.secondary),
        ("Probablement",     "🟡", discord.ButtonStyle.primary),
        ("Probablement pas", "🔴", discord.ButtonStyle.secondary),
    ]

    def __init__(self, session: _AkinatorOPSession):
        super().__init__(timeout=120)
        self._session = session
        for label, emoji, style in self._CHOICES:
            btn = discord.ui.Button(label=label, emoji=emoji, style=style)
            btn.callback = self._make_cb(label)
            self.add_item(btn)

    def _make_cb(self, answer: str):
        async def cb(interaction: discord.Interaction):
            if interaction.user.id != self._session.user_id:
                await interaction.response.send_message("Ce n'est pas ton Akinator !", ephemeral=True)
                return
            if self._session.ended:
                await interaction.response.send_message("Cette partie est terminée.", ephemeral=True)
                return
            self.stop()
            await interaction.response.defer()
            if self._session.qa_history and self._session.qa_history[-1][1] == "":
                self._session.qa_history[-1] = (self._session.qa_history[-1][0], answer)
            if (self._session.nb_questions >= self._session.op_max_q
                    or len(self._session.wrong_guesses) >= _AKI_MAX_BAD_GUESSES):
                action = {"action": "give_up"}
            else:
                action = await _aki_op_next_action(self._session)
            await _aki_op_dispatch(interaction, self._session, action)
        return cb

    async def on_timeout(self):
        self._session.ended = True
        _AKI_OP_SESSIONS.pop(self._session.user_id, None)


class _AkinatorOPGuessView(discord.ui.View):
    def __init__(self, session: _AkinatorOPSession, character: str):
        super().__init__(timeout=120)
        self._session   = session
        self._character = character

    @discord.ui.button(label="Oui, c'est ça !", emoji="✅", style=discord.ButtonStyle.success)
    async def correct(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._session.user_id:
            await interaction.response.send_message("Ce n'est pas ton Akinator !", ephemeral=True)
            return
        self.stop()
        session = self._session
        session.ended = True
        _AKI_OP_SESSIONS.pop(session.user_id, None)
        uid = str(session.user_id)

        desc = f"🔮 **J'ai trouvé !** Tu pensais à **{self._character}** !\nQuestions posées : **{session.nb_questions}**\n\n"
        if session.duel_ref:
            _aki_op_duel_record(session, gave_up=False)
            desc += "*Résultat enregistré — attends la fin du duel.*"
        else:
            spend_berrys(uid, _AKI_PENALTY, track="lost")
            bal_after = get_berrys(uid)
            if session.op_mode == "ranked":
                _u = get_user(_CACHE, uid)
                rk = _u.get("aki_ranked", {"wins": 0, "losses": 0, "score": 0})
                rk["losses"] = rk.get("losses", 0) + 1
                rk["score"]  = max(0, rk.get("score", 0) - 50)
                _u["aki_ranked"] = rk
                _DIRTY.add(uid)
                desc += f"💸 **-{_fmt_berry(_AKI_PENALTY)} 🍊** · Solde : **{_fmt_berry(bal_after)} 🍊** · -50 pts ranked (score : {rk['score']})"
            else:
                desc += f"💸 **-{_fmt_berry(_AKI_PENALTY)} 🍊** · Solde : **{_fmt_berry(bal_after)} 🍊**"

        embed = discord.Embed(title="🧞 Akinator OP — Trouvé !", description=desc, color=discord.Color.red())
        await interaction.response.edit_message(embed=embed, view=None)

    @discord.ui.button(label="Non, ce n'est pas ça", emoji="❌", style=discord.ButtonStyle.danger)
    async def wrong(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._session.user_id:
            await interaction.response.send_message("Ce n'est pas ton Akinator !", ephemeral=True)
            return
        self.stop()
        await interaction.response.defer()
        session = self._session
        session.wrong_guesses.append(self._character)
        if len(session.wrong_guesses) >= _AKI_MAX_BAD_GUESSES:
            await _aki_op_dispatch(interaction, session, {"action": "give_up"})
            return
        action = await _aki_op_next_action(session)
        await _aki_op_dispatch(interaction, session, action)

    async def on_timeout(self):
        self._session.ended = True
        _AKI_OP_SESSIONS.pop(self._session.user_id, None)


class _AkinatorOPModeView(discord.ui.View):
    def __init__(self, user_id: int):
        super().__init__(timeout=60)
        self._user_id = user_id
        for mode_key, cfg in _AKI_OP_MODES.items():
            btn = discord.ui.Button(label=cfg["label"], emoji=cfg["emoji"], style=cfg["style"])
            btn.callback = self._make_cb(mode_key)
            self.add_item(btn)

    def _make_cb(self, mode_key: str):
        async def cb(interaction: discord.Interaction):
            if interaction.user.id != self._user_id:
                await interaction.response.send_message("Ce n'est pas ton menu !", ephemeral=True)
                return
            self.stop()
            cfg = _AKI_OP_MODES[mode_key]

            if mode_key == "duel":
                # demander le membre à défier via modal ou message
                await interaction.response.send_message(
                    "Pour lancer un duel, utilise `/akinator_duel @membre`.", ephemeral=True
                )
                return

            uid  = str(interaction.user.id)
            # Vérifie que le joueur peut couvrir la pénalité si le bot devine
            if get_berrys(uid) < _AKI_PENALTY:
                await interaction.response.send_message(
                    f"❌ Il te faut au moins **{_fmt_berry(_AKI_PENALTY)} 🍊** pour jouer (pénalité si le bot devine).", ephemeral=True
                )
                return

            session = _AkinatorOPSession(interaction.user.id, mode_key)
            _AKI_OP_SESSIONS[interaction.user.id] = session

            await interaction.response.defer()
            action = await _aki_op_next_action(session)
            if action.get("action") != "question":
                _AKI_OP_SESSIONS.pop(interaction.user.id, None)
                await interaction.edit_original_response(content="❌ Erreur IA. Réessaie dans quelques instants.", embed=None, view=None)
                return

            q = action.get("text", "Ce personnage est-il un pirate ?")
            session.nb_questions = 1
            session.qa_history.append((q, ""))
            await interaction.edit_original_response(
                embed=_aki_op_question_embed(session, q), view=_AkinatorOPAnswerView(session)
            )
        return cb


@bot.tree.command(name="akinator", description="Akinator One Piece — pense à un perso, je le devine !")
@app_commands.guilds(*GUILD_IDS)
async def akinator_op_cmd(interaction: discord.Interaction):
    uid = interaction.user.id
    if uid in _AKI_OP_SESSIONS:
        await interaction.response.send_message("❌ Tu as déjà une partie en cours !", ephemeral=True)
        return
    try:
        await interaction.response.defer()
    except Exception:
        return

    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    lines = [f"{cfg['emoji']} **{cfg['label']}** — {cfg['desc']}" for cfg in _AKI_OP_MODES.values()]
    embed = discord.Embed(
        title="🧞 Akinator One Piece 🧞",
        description=(
            f"**Pense à un personnage de One Piece — je vais le deviner !**\n\n"
            f"{sep}\n" + "\n".join(lines) + f"\n{sep}\n\n"
            f"Ton solde : **{get_berrys(str(uid))} 🍊**\n"
            f"*Gagner = le bot abandonne → tu reçois ta récompense.*\n"
            f"*Perdre = le bot devine → tu perds ta mise.*"
        ),
        color=discord.Color.from_rgb(220, 50, 50),
    )
    await interaction.followup.send(embed=embed, view=_AkinatorOPModeView(uid))


@bot.tree.command(name="akinator_duel", description="Défi 1v1 Akinator One Piece — mise aléatoire !")
@app_commands.describe(adversaire="Le membre à défier")
@app_commands.guilds(*GUILD_IDS)
async def akinator_op_duel_cmd(interaction: discord.Interaction, adversaire: discord.Member):
    uid1 = interaction.user.id
    uid2 = adversaire.id

    if uid1 == uid2:
        await interaction.response.send_message("Tu ne peux pas te défier toi-même !", ephemeral=True)
        return
    if uid1 in _AKI_OP_SESSIONS or uid2 in _AKI_OP_SESSIONS:
        await interaction.response.send_message("L'un des joueurs est déjà en partie.", ephemeral=True)
        return

    bet1 = _proportional_bet(str(uid1))
    bet2 = _proportional_bet(str(uid2))

    if bet1 == 0:
        await interaction.response.send_message(f"❌ Tu n'as pas assez de 🍊 (min 30). Joue d'abord en solo !", ephemeral=True)
        return
    if bet2 == 0:
        await interaction.response.send_message(f"❌ {adversaire.mention} n'a pas assez de 🍊 (min 30).", ephemeral=True)
        return

    try:
        await interaction.response.defer()
    except Exception:
        return

    import uuid
    duel_id = str(uuid.uuid4())[:8]

    embed = discord.Embed(
        title="⚔️  Défi Akinator One Piece !  ⚔️",
        description=(
            f"**{interaction.user.mention}** défie **{adversaire.mention}** !\n\n"
            f"🔴 Mise de {interaction.user.display_name} : **{bet1} 🍊**\n"
            f"🔵 Mise de {adversaire.display_name} : **{bet2} 🍊**\n\n"
            f"Chacun pense à un perso One Piece. Le bot essaie de deviner.\n"
            f"**Le plus dur à deviner gagne le pot total.**\n\n"
            f"{adversaire.mention}, tu as **60 secondes** pour accepter."
        ),
        color=discord.Color.gold(),
    )
    msg = await interaction.followup.send(embed=embed, view=_AkinatorOPDuelChallengeView(
        uid1, uid2, bet1, bet2, duel_id, interaction.user.display_name, adversaire.display_name, interaction
    ))


class _AkinatorOPDuelChallengeView(discord.ui.View):
    def __init__(self, uid1: int, uid2: int, bet1: int, bet2: int, duel_id: str,
                 name1: str, name2: str, orig_inter: discord.Interaction):
        super().__init__(timeout=60)
        self._uid1, self._uid2   = uid1, uid2
        self._bet1, self._bet2   = bet1, bet2
        self._duel_id            = duel_id
        self._name1, self._name2 = name1, name2
        self._orig_inter         = orig_inter

    @discord.ui.button(label="Accepter ✅", style=discord.ButtonStyle.success)
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._uid2:
            await interaction.response.send_message("Ce défi ne te concerne pas.", ephemeral=True)
            return
        self.stop()
        await interaction.response.defer()

        # Vérifier et déduire les mises
        if not spend_berrys(str(self._uid1), self._bet1, track="lost"):
            await interaction.edit_original_response(content=f"❌ {self._name1} n'a plus assez de 🍊.", embed=None, view=None)
            return
        if not spend_berrys(str(self._uid2), self._bet2, track="lost"):
            add_berrys(str(self._uid1), self._bet1, track=None)  # remboursement
            await interaction.edit_original_response(content=f"❌ {self._name2} n'a plus assez de 🍊.", embed=None, view=None)
            return

        duel = _AkinatorOPDuel(self._duel_id, self._uid1, self._uid2,
                               self._name1, self._name2, self._bet1, self._bet2,
                               interaction.channel)
        _AKI_OP_DUELS[self._duel_id] = duel

        sess1 = _AkinatorOPSession(self._uid1, "duel")
        sess1.duel_ref = duel
        _AKI_OP_SESSIONS[self._uid1] = sess1

        sess2 = _AkinatorOPSession(self._uid2, "duel")
        sess2.duel_ref = duel
        _AKI_OP_SESSIONS[self._uid2] = sess2

        await interaction.edit_original_response(
            content=f"✅ Duel lancé ! Chacun reçoit ses questions.", embed=None, view=None
        )

        async def _start_session(uid: int, sess: _AkinatorOPSession, name: str):
            action = await _aki_op_next_action(sess)
            if action.get("action") != "question":
                _AKI_OP_SESSIONS.pop(uid, None)
                add_berrys(str(uid), sess.op_cost)
                await interaction.channel.send(f"❌ Erreur IA pour {name}. Mise remboursée.")
                return
            q = action.get("text", "Ce personnage est-il un pirate ?")
            sess.nb_questions = 1
            sess.qa_history.append((q, ""))
            msg = await interaction.channel.send(
                content=f"**Session de <@{uid}>**",
                embed=_aki_op_question_embed(sess, q),
                view=_AkinatorOPAnswerView(sess),
            )

        await asyncio.gather(
            _start_session(self._uid1, sess1, self._name1),
            _start_session(self._uid2, sess2, self._name2),
        )

    @discord.ui.button(label="Refuser ❌", style=discord.ButtonStyle.danger)
    async def decline(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id not in (self._uid1, self._uid2):
            await interaction.response.send_message("Ce défi ne te concerne pas.", ephemeral=True)
            return
        self.stop()
        await interaction.response.edit_message(content="❌ Défi refusé.", embed=None, view=None)


# ─────────────────────────────────────────
#  QUIZ PRIME — PAYANT
# ─────────────────────────────────────────

_QUIZ_PRIME_MODES: dict[str, dict] = {
    "enrichi":    {"label": "Solo Enrichi",   "emoji": "💰", "cost": 50,  "reward": 150,  "n": 10, "style": discord.ButtonStyle.primary,   "desc": "10 questions · **50 🍊** → **150 🍊** si tout juste"},
    "survie":     {"label": "Survie",         "emoji": "❤️", "cost": 100, "reward": None, "n": 20, "style": discord.ButtonStyle.danger,    "desc": "Stop à 1ère erreur · **100 🍊** → **50 🍊/question** correcte"},
    "legendaire": {"label": "Légendaire",     "emoji": "👑", "cost": 500, "reward": 2000, "n": 10, "style": discord.ButtonStyle.secondary, "desc": "10 questions · **500 🍊** → **2 000 🍊** si parfait"},
    "ranked_1v1": {"label": "Ranked 1v1",    "emoji": "⚔️", "cost": 200, "reward": None, "n": 10, "style": discord.ButtonStyle.success,   "desc": "200 🍊 chacun · **Tout au gagnant**"},
}


class _QuizPrimeModeView(discord.ui.View):
    def __init__(self, user_id: int, category: str):
        super().__init__(timeout=60)
        self._user_id  = user_id
        self._category = category
        for mode_key, cfg in _QUIZ_PRIME_MODES.items():
            btn = discord.ui.Button(label=cfg["label"], emoji=cfg["emoji"], style=cfg["style"])
            btn.callback = self._make_cb(mode_key)
            self.add_item(btn)

    def _make_cb(self, mode_key: str):
        async def cb(interaction: discord.Interaction):
            if interaction.user.id != self._user_id:
                await interaction.response.send_message("Ce menu n'est pas pour toi.", ephemeral=True)
                return
            self.stop()
            cfg  = _QUIZ_PRIME_MODES[mode_key]
            cost = cfg["cost"]
            uid  = str(interaction.user.id)

            if mode_key == "ranked_1v1":
                await interaction.response.send_message(
                    "Pour un Ranked 1v1, utilise `/quizz_ranked @adversaire`.", ephemeral=True
                )
                return

            if not spend_berrys(uid, cost):
                bal = get_berrys(uid)
                await interaction.response.send_message(
                    f"❌ Solde insuffisant. Tu as **{bal} 🍊**, il te faut **{cost} 🍊**.", ephemeral=True
                )
                return

            await interaction.response.defer()
            questions, err = await _generate_quiz_questions(cfg["n"], self._category)
            if not questions:
                add_berrys(uid, cost)
                await interaction.edit_original_response(
                    content=f"❌ Erreur de génération. Berrys remboursés. ({err[:100]})", embed=None, view=None
                )
                return

            sess = _QuizSession(questions, interaction.user.id, interaction, self._category)
            sess.paid_mode       = mode_key
            sess.entry_cost      = cost
            sess.quiz_reward     = cfg.get("reward") or 0
            sess.quiz_all_correct = True
            QUIZ_SESSIONS[interaction.user.id] = sess

            await interaction.edit_original_response(content=None, embed=None, view=None)
            await _send_next_question(interaction, sess)
        return cb


@bot.tree.command(name="quizz", description="Quiz animé — gratuit en solo/duel, ou Ranked 1v1 avec mise Berry !")
@app_commands.describe(
    adversaire="Mentionne un membre pour un Ranked 1v1 payant (200 🍊 chacun)",
    categorie="Catégorie de questions",
)
@app_commands.choices(categorie=[
    app_commands.Choice(name="Général",         value="general"),
    app_commands.Choice(name="One Piece",       value="one_piece"),
    app_commands.Choice(name="Naruto",          value="naruto"),
    app_commands.Choice(name="Dragon Ball Z",   value="dbz"),
    app_commands.Choice(name="Demon Slayer",    value="demon_slayer"),
    app_commands.Choice(name="Jujutsu Kaisen",  value="jjk"),
    app_commands.Choice(name="Attack on Titan", value="aot"),
    app_commands.Choice(name="Death Note",      value="deathnote"),
])
@app_commands.guilds(*GUILD_IDS)
async def quizz_cmd(interaction: discord.Interaction,
                    adversaire: discord.Member = None,
                    categorie: str = "general"):
    uid1 = interaction.user.id

    # ── Mode gratuit (pas d'adversaire) ──────────────────────────
    if adversaire is None:
        if uid1 in QUIZ_SESSIONS or uid1 in LIVE_DUELS:
            await interaction.response.send_message("❌ Tu as déjà une session en cours !", ephemeral=True)
            return
        await _quiz_entry(interaction)
        return

    # ── Mode Ranked 1v1 (avec adversaire) ────────────────────────
    uid2 = adversaire.id
    BET  = 200

    if uid1 == uid2:
        await interaction.response.send_message("Tu ne peux pas te défier toi-même.", ephemeral=True)
        return
    if uid1 in QUIZ_SESSIONS or uid2 in QUIZ_SESSIONS or uid1 in LIVE_DUELS or uid2 in LIVE_DUELS:
        await interaction.response.send_message("L'un des joueurs est déjà en session.", ephemeral=True)
        return

    bal1, bal2 = get_berrys(str(uid1)), get_berrys(str(uid2))
    if bal1 < BET:
        await interaction.response.send_message(f"❌ Tu n'as pas assez de 🍊 ({bal1}/{BET}).", ephemeral=True)
        return
    if bal2 < BET:
        await interaction.response.send_message(f"❌ {adversaire.mention} n'a pas assez de 🍊 ({bal2}/{BET}).", ephemeral=True)
        return

    try:
        await interaction.response.defer()
    except Exception:
        return

    embed = discord.Embed(
        title="⚔️  Quiz Ranked 1v1  ⚔️",
        description=(
            f"**{interaction.user.mention}** défie **{adversaire.mention}** !\n\n"
            f"💰 Mise : **{BET} 🍊 chacun** → **{BET*2} 🍊** au gagnant\n"
            f"Catégorie : **{categorie}** · 10 questions\n\n"
            f"{adversaire.mention}, tu as **60 secondes** pour accepter."
        ),
        color=discord.Color.gold(),
    )
    await interaction.followup.send(embed=embed, view=_QuizRankedChallengeView(uid1, uid2, BET, categorie, interaction))


class _QuizRankedChallengeView(discord.ui.View):
    def __init__(self, uid1: int, uid2: int, bet: int, category: str, orig_inter: discord.Interaction):
        super().__init__(timeout=60)
        self._uid1, self._uid2 = uid1, uid2
        self._bet              = bet
        self._category         = category
        self._orig_inter       = orig_inter

    @discord.ui.button(label="Accepter ✅", style=discord.ButtonStyle.success)
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id != self._uid2:
            await interaction.response.send_message("Ce défi ne te concerne pas.", ephemeral=True)
            return
        self.stop()
        # Déduire les mises
        if not spend_berrys(str(self._uid1), self._bet, track="lost"):
            await interaction.response.edit_message(content="❌ Le challenger n'a plus assez de 🍊.", embed=None, view=None)
            return
        if not spend_berrys(str(self._uid2), self._bet, track="lost"):
            add_berrys(str(self._uid1), self._bet, track=None)
            await interaction.response.edit_message(content="❌ Tu n'as plus assez de 🍊.", embed=None, view=None)
            return
        await interaction.response.defer()
        await _start_live_duel(self._orig_inter, self._uid1, self._uid2, self._category, 10)
        # Enregistre la mise sur le duel créé
        duel = LIVE_DUELS.get(self._uid1)
        if duel:
            duel.berry_bet = self._bet

    @discord.ui.button(label="Refuser ❌", style=discord.ButtonStyle.danger)
    async def decline(self, interaction: discord.Interaction, button: discord.ui.Button):
        if interaction.user.id not in (self._uid1, self._uid2):
            await interaction.response.send_message("Ce défi ne te concerne pas.", ephemeral=True)
            return
        self.stop()
        await interaction.response.edit_message(content="❌ Défi refusé.", embed=None, view=None)


# ─────────────────────────────────────────
#  /SOLDE
# ─────────────────────────────────────────

@bot.tree.command(name="berry", description="Consulter ton solde de Berrys 🍊")
@app_commands.guilds(*GUILD_IDS)
async def solde_cmd(interaction: discord.Interaction):
    uid  = str(interaction.user.id)
    bal  = get_berrys(uid)
    embed = discord.Embed(
        title="💰 Solde Berry",
        description=f"{interaction.user.mention}\n\n**{format_prime(bal)}**\n`{bal} 🍊`",
        color=discord.Color.gold(),
    )
    embed.set_thumbnail(url=interaction.user.display_avatar.url)
    embed.set_footer(text="Gagne des Berrys avec /akinator et /quizz_prime !")
    await interaction.response.send_message(embed=embed)


# ─────────────────────────────────────────
#  SHOP
# ─────────────────────────────────────────

_PSEUDO_BANNED = [
    "pute", "suceur", "suceuse", "israel", "juif", "chienne", "soumise", "chien",
]

def _pseudo_is_clean(pseudo: str) -> bool:
    low = pseudo.lower()
    return not any(w in low for w in _PSEUDO_BANNED)

_TICKET_TIERS = [
    {"id": "ticket_30",  "emoji": "⏱️", "name": "Ticket 30 min", "minutes": 30,  "price": 1_000_000, "style": discord.ButtonStyle.secondary},
    {"id": "ticket_60",  "emoji": "🎭", "name": "Ticket 1h",     "minutes": 60,  "price": 2_000_000, "style": discord.ButtonStyle.primary},
    {"id": "ticket_120", "emoji": "👑", "name": "Ticket 2h",     "minutes": 120, "price": 4_000_000, "style": discord.ButtonStyle.danger},
]
_TICKET_BY_ID = {t["id"]: t for t in _TICKET_TIERS}

_SHIELD_ITEM = {
    "id":    "nick_shield",
    "emoji": "🛡️",
    "name":  "Bouclier Pseudo",
    "price": 500_000,
    "style": discord.ButtonStyle.success,
}

_SHOP_ITEMS = _TICKET_TIERS + [_SHIELD_ITEM]

def _fmt_berry(n: int) -> str:
    return f"{n:,}".replace(",", " ")

def _get_tickets(user_data: dict) -> dict:
    raw = user_data.get("pseudo_tickets", {})
    if isinstance(raw, int):
        raw = {"ticket_60": raw}
        user_data["pseudo_tickets"] = raw
    return raw

def _shop_embed(uid: str) -> discord.Embed:
    bal       = get_berrys(uid)
    user_data = get_user(_CACHE, uid)
    tickets   = _get_tickets(user_data)
    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    lines = []
    for t in _TICKET_TIERS:
        stock = tickets.get(t["id"], 0)
        lines.append(
            f"{t['emoji']} **{t['name']}** — {_fmt_berry(t['price'])} 🍊\n"
            f"> Change un pseudo pendant **{t['minutes']} min** · Stock : **{stock}**"
        )
    shields = user_data.get("nick_shields", 0)
    lines.append(
        f"🛡️ **Bouclier Pseudo** — {_fmt_berry(_SHIELD_ITEM['price'])} 🍊\n"
        f"> Bloque **1 tentative** de changement de pseudo · annule le ticket de l'attaquant · Stock : **{shields}**"
    )
    embed = discord.Embed(
        title="🏪  Bram's Shop  🏪",
        description=f"{sep}\n\n" + f"\n\n{sep}\n\n".join(lines) + f"\n\n{sep}\n\nTon solde : **{_fmt_berry(bal)} 🍊**",
        color=discord.Color.from_rgb(212, 175, 55),
    )
    embed.set_footer(text="Clique sur un article pour l'acheter · Max 2 utilisations /ticket par jour")
    return embed


class _ShopView(discord.ui.View):
    def __init__(self, user_id: int):
        super().__init__(timeout=60)
        self._user_id = user_id
        for item in _SHOP_ITEMS:
            btn = discord.ui.Button(
                label=f"{item['name']} ({_fmt_berry(item['price'])} 🍊)",
                emoji=item["emoji"],
                style=item["style"],
            )
            btn.callback = self._make_cb(item)
            self.add_item(btn)

    def _make_cb(self, item: dict):
        async def cb(interaction: discord.Interaction):
            if interaction.user.id != self._user_id:
                await interaction.response.send_message("Ce shop ne t'appartient pas !", ephemeral=True)
                return
            uid = str(interaction.user.id)

            if not spend_berrys(uid, item["price"]):
                bal = get_berrys(uid)
                await interaction.response.send_message(
                    f"❌ Solde insuffisant. Tu as **{_fmt_berry(bal)} 🍊**, il te faut **{_fmt_berry(item['price'])} 🍊**.",
                    ephemeral=True,
                )
                return

            self.stop()
            user_data = get_user(_CACHE, uid)

            if item["id"] == "nick_shield":
                user_data["nick_shields"] = user_data.get("nick_shields", 0) + 1
                _DIRTY.add(uid)
                new_bal = get_berrys(uid)
                shields = user_data["nick_shields"]
                await interaction.response.edit_message(
                    embed=discord.Embed(
                        title="🛡️ Bouclier Pseudo acheté !",
                        description=(
                            f"Tu possèdes **{shields} bouclier(s)** 🛡️\n\n"
                            f"Si quelqu'un essaie de changer ton pseudo avec un ticket, "
                            f"son ticket sera **perdu** et ton pseudo restera intact.\n\n"
                            f"Solde restant : **{_fmt_berry(new_bal)} 🍊**"
                        ),
                        color=discord.Color.green(),
                    ),
                    view=None,
                )
                return

            # Achat ticket
            tickets   = _get_tickets(user_data)
            tickets[item["id"]] = tickets.get(item["id"], 0) + 1
            user_data["pseudo_tickets"] = tickets
            _DIRTY.add(uid)
            new_bal = get_berrys(uid)
            stock   = tickets[item["id"]]
            await interaction.response.edit_message(
                embed=discord.Embed(
                    title=f"{item['emoji']} {item['name']} acheté !",
                    description=(
                        f"Tu possèdes **{stock} ticket(s)** {item['emoji']}\n\n"
                        f"Utilise `/ticket @membre nouveau_pseudo` et choisis la durée **{item['minutes']} min**.\n\n"
                        f"Solde restant : **{_fmt_berry(new_bal)} 🍊**"
                    ),
                    color=discord.Color.purple(),
                ),
                view=None,
            )
        return cb


@bot.tree.command(name="shop", description="Dépense tes Berrys 🍊 dans le shop !")
@app_commands.guilds(*GUILD_IDS)
async def shop_cmd(interaction: discord.Interaction):
    uid = str(interaction.user.id)
    try:
        await interaction.response.defer()
    except Exception:
        return
    await interaction.followup.send(embed=_shop_embed(uid), view=_ShopView(interaction.user.id))


@bot.tree.command(name="ticket", description="Utilise un ticket pour changer le pseudo d'un membre !")
@app_commands.describe(
    membre="Le membre dont tu veux changer le pseudo",
    nouveau_pseudo="Le nouveau pseudo (max 32 caractères)",
    duree="Durée du changement (selon le ticket que tu possèdes)",
)
@app_commands.choices(duree=[
    app_commands.Choice(name="30 minutes  (Ticket ⏱️)", value="ticket_30"),
    app_commands.Choice(name="1 heure     (Ticket 🎭)", value="ticket_60"),
    app_commands.Choice(name="2 heures    (Ticket 👑)", value="ticket_120"),
])
@app_commands.guilds(*GUILD_IDS)
async def ticket_pseudo_cmd(interaction: discord.Interaction, membre: discord.Member,
                             nouveau_pseudo: str, duree: str):
    uid       = str(interaction.user.id)
    user_data = get_user(_CACHE, uid)
    tier      = _TICKET_BY_ID[duree]
    tickets   = _get_tickets(user_data)
    stock     = tickets.get(duree, 0)

    if stock <= 0:
        await interaction.response.send_message(
            f"❌ Tu n'as pas de **{tier['name']}**. Achète-en un dans `/shop` !", ephemeral=True
        )
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    daily = user_data.get("ticket_daily", {"date": "", "count": 0})
    if daily.get("date") != today:
        daily = {"date": today, "count": 0}
    if daily["count"] >= 2:
        await interaction.response.send_message(
            "❌ Tu as déjà utilisé **2 tickets** aujourd'hui. Reviens demain !", ephemeral=True
        )
        return

    if membre.bot:
        await interaction.response.send_message("❌ Impossible de changer le pseudo d'un bot.", ephemeral=True)
        return
    if len(nouveau_pseudo) > 32:
        await interaction.response.send_message("❌ Le pseudo ne peut pas dépasser 32 caractères.", ephemeral=True)
        return
    if not _pseudo_is_clean(nouveau_pseudo):
        await interaction.response.send_message(
            "❌ Ce pseudo contient un mot interdit. Choisis un autre pseudo.", ephemeral=True
        )
        return

    # Vérifie si la cible a déjà un pseudo actif avec un ticket de durée supérieure
    target_data    = get_user(_CACHE, str(membre.id))
    active_restore = target_data.get("nick_restore")
    if active_restore and now_ts() < active_restore.get("expires", 0):
        active_minutes = active_restore.get("minutes", 0)
        if tier["minutes"] < active_minutes:
            await interaction.response.send_message(
                f"❌ Le pseudo de **{membre.display_name}** est déjà verrouillé par un ticket **{active_minutes} min**. "
                f"Ton ticket **{tier['minutes']} min** ne peut pas l'écraser.",
                ephemeral=True,
            )
            return

    # Vérifie si la cible a un bouclier actif
    shields = target_data.get("nick_shields", 0)
    if shields > 0:
        target_data["nick_shields"] = shields - 1
        _DIRTY.add(str(membre.id))
        # Consume quand même le ticket de l'attaquant
        tickets[duree] = stock - 1
        user_data["pseudo_tickets"] = tickets
        daily["count"] += 1
        user_data["ticket_daily"] = daily
        _DIRTY.add(uid)
        await interaction.response.send_message(
            embed=discord.Embed(
                title="🛡️ Bouclier activé !",
                description=(
                    f"**{membre.display_name}** était protégé par un **Bouclier Pseudo** !\n\n"
                    f"Ton ticket **{tier['emoji']} {tier['name']}** a été **perdu**.\n"
                    f"Le pseudo de {membre.mention} n'a pas changé.\n\n"
                    f"Boucliers restants sur la cible : **{shields - 1}**"
                ),
                color=discord.Color.blue(),
            )
        )
        return

    ancien_nick = membre.nick  # surnom serveur (None si aucun)
    ancien_display = membre.display_name
    try:
        await membre.edit(nick=nouveau_pseudo)
    except discord.Forbidden:
        await interaction.response.send_message(
            "❌ Je n'ai pas la permission de changer ce pseudo (rôle trop élevé ?).", ephemeral=True
        )
        return

    tickets[duree] = stock - 1
    user_data["pseudo_tickets"] = tickets
    daily["count"] += 1
    user_data["ticket_daily"] = daily

    # Persiste le restore en cache pour survivre aux redémarrages
    minutes     = tier["minutes"]
    expires_at  = now_ts() + minutes * 60
    target_data["nick_restore"] = {
        "nick":    ancien_nick,  # None = pas de surnom serveur → edit(nick=None) efface
        "expires": expires_at,
        "guild":   str(interaction.guild_id),
        "minutes": minutes,
    }
    _DIRTY.add(uid)
    _DIRTY.add(str(membre.id))

    restants_jour = 2 - daily["count"]
    await interaction.response.send_message(
        embed=discord.Embed(
            title="🎭 Pseudo changé !",
            description=(
                f"**{ancien_display}** s'appelle maintenant **{nouveau_pseudo}** pendant **{minutes} min** !\n\n"
                f"Il reprendra son pseudo original dans {minutes} minutes.\n"
                f"Stock {tier['emoji']} : **{tickets[duree]}** · Utilisations restantes aujourd'hui : **{restants_jour}/2**"
            ),
            color=discord.Color.purple(),
        )
    )


# ─────────────────────────────────────────
#  BANQUE
# ─────────────────────────────────────────

@bot.tree.command(name="banque", description="Tes stats de Berry + classement du serveur")
@app_commands.guilds(*GUILD_IDS)
async def banque(interaction: discord.Interaction):
    await interaction.response.defer()

    uid = str(interaction.user.id)
    me  = get_user(_CACHE, uid)
    my_stats = me.get("berry_stats", {})
    my_bal   = me.get("berrys", 0)

    # ── Embed personnel ──────────────────────────────────────────────
    embed_perso = discord.Embed(
        title="🏦 Ta Banque Berry",
        color=discord.Color.gold(),
    )
    embed_perso.set_thumbnail(url=interaction.user.display_avatar.url)
    embed_perso.add_field(name="💰 Solde actuel",    value=f"`{my_bal:,}` 🍒".replace(",", " "), inline=False)
    embed_perso.add_field(name="📈 Total gagné",     value=f"`{my_stats.get('earned', 0):,}` 🍒".replace(",", " "), inline=True)
    embed_perso.add_field(name="📉 Total perdu",     value=f"`{my_stats.get('lost', 0):,}` 🍒".replace(",", " "),   inline=True)
    embed_perso.add_field(name="🛒 Total dépensé",   value=f"`{my_stats.get('spent', 0):,}` 🍒".replace(",", " "),  inline=True)

    # ── Classement serveur ───────────────────────────────────────────
    guild_member_ids = {str(m.id) for m in interaction.guild.members}

    rows = []
    for cuid, cdata in _CACHE.items():
        if cuid not in guild_member_ids:
            continue
        bal     = cdata.get("berrys", 0)
        stats   = cdata.get("berry_stats", {})
        earned  = stats.get("earned", 0)
        spent   = stats.get("spent", 0)
        rows.append({"uid": cuid, "bal": bal, "earned": earned, "spent": spent})

    top_earned  = sorted(rows, key=lambda r: r["earned"],  reverse=True)[:5]
    top_spenders = sorted(rows, key=lambda r: r["spent"],  reverse=True)[:5]
    top_rich     = sorted(rows, key=lambda r: r["bal"],    reverse=True)[:5]

    def fmt_row(rank: int, r: dict, key: str) -> str:
        member = interaction.guild.get_member(int(r["uid"]))
        name   = member.display_name if member else f"<@{r['uid']}>"
        val    = f"{r[key]:,}".replace(",", " ")
        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
        return f"{medals[rank]} **{name}** — `{val}` 🍒"

    embed_rank = discord.Embed(
        title="🏆 Classement Berry du serveur",
        color=discord.Color.blurple(),
    )
    embed_rank.add_field(
        name="💰 Les plus riches",
        value="\n".join(fmt_row(i, r, "bal") for i, r in enumerate(top_rich)) or "—",
        inline=False,
    )
    embed_rank.add_field(
        name="📈 Plus grands gagnants",
        value="\n".join(fmt_row(i, r, "earned") for i, r in enumerate(top_earned)) or "—",
        inline=False,
    )
    embed_rank.add_field(
        name="🛒 Plus grands dépensiers",
        value="\n".join(fmt_row(i, r, "spent") for i, r in enumerate(top_spenders)) or "—",
        inline=False,
    )

    await interaction.followup.send(embeds=[embed_perso, embed_rank])


# ─────────────────────────────────────────
#  GIVEAWAY
# ─────────────────────────────────────────

def _parse_duree(s: str) -> int | None:
    """Convertit '1h30m', '2h', '30m', '1d' en secondes. None si invalide."""
    total = 0
    for val, unit in re.findall(r'(\d+)\s*([dhm])', s.strip().lower()):
        v = int(val)
        if unit == 'd':   total += v * 86400
        elif unit == 'h': total += v * 3600
        elif unit == 'm': total += v * 60
    return total if total > 0 else None


def _fmt_duree(seconds: int) -> str:
    d, rem = divmod(seconds, 86400)
    h, m   = divmod(rem, 3600)
    m //= 60
    parts = []
    if d: parts.append(f"{d}j")
    if h: parts.append(f"{h}h")
    if m: parts.append(f"{m}min")
    return " ".join(parts) or "0min"


class GiveawayView(discord.ui.View):
    def __init__(self, host_id: int):
        super().__init__(timeout=None)
        self.participants: set[int] = set()
        self.host_id = host_id

    @discord.ui.button(label="Participer 🎉", style=discord.ButtonStyle.success, custom_id="giveaway_join")
    async def join(self, interaction: discord.Interaction, button: discord.ui.Button):
        uid = interaction.user.id
        if uid == self.host_id:
            await interaction.response.send_message("L'organisateur ne peut pas participer.", ephemeral=True)
            return
        if uid in self.participants:
            self.participants.discard(uid)
            total = len(self.participants)
            await interaction.response.send_message(
                f"❌ Tu t'es retiré du giveaway. ({total} participant(s))", ephemeral=True
            )
        else:
            self.participants.add(uid)
            total = len(self.participants)
            await interaction.response.send_message(
                f"✅ Tu es inscrit au giveaway ! ({total} participant(s))", ephemeral=True
            )


async def _conclude_giveaway(
    channel: discord.TextChannel,
    message_id: int,
    lot: str,
    nb_gagnants: int,
    host_id: int,
    view: GiveawayView,
):
    view.stop()
    try:
        msg = await channel.fetch_message(message_id)
    except Exception:
        return

    participants = list(view.participants)
    if not participants:
        embed = discord.Embed(
            title="🎉  GIVEAWAY TERMINÉ  🎉",
            description=f"**Lot :** {lot}\n\n❌ Personne n'a participé...",
            color=discord.Color.red(),
        )
        embed.set_footer(text="Aucun gagnant")
        await msg.edit(embed=embed, view=None)
        return

    nb = min(nb_gagnants, len(participants))
    winners = random.sample(participants, nb)
    mentions = ", ".join(f"<@{w}>" for w in winners)

    embed = discord.Embed(
        title="🎉  GIVEAWAY TERMINÉ  🎉",
        description=(
            f"**Lot :** {lot}\n\n"
            f"🏆 **Gagnant(s) :** {mentions}\n\n"
            f"Contactez <@{host_id}> pour récupérer votre lot."
        ),
        color=discord.Color.gold(),
    )
    embed.set_footer(text=f"{len(participants)} participant(s) • {nb} gagnant(s)")
    await msg.edit(embed=embed, view=None)
    await channel.send(f"🎊 Félicitations {mentions} ! Vous avez gagné **{lot}** !")


@bot.tree.command(name="gagnant", description="Tirer au sort un ou plusieurs gagnants depuis le salon vocal")
@app_commands.describe(
    nombre="Nombre de gagnants à tirer (défaut: 1)",
    image="Image du lot à afficher (PNG ou JPEG)",
    exclure_bots="Exclure les bots du tirage (défaut: oui)",
)
async def gagnant_cmd(
    interaction: discord.Interaction,
    nombre: int = 1,
    image: discord.Attachment | None = None,
    exclure_bots: bool = True,
):
    try:
        await interaction.response.defer()
    except Exception:
        return

    if not 1 <= nombre <= 20:
        await interaction.followup.send("❌ Le nombre de gagnants doit être entre 1 et 20.", ephemeral=True)
        return

    if image is not None and not image.content_type.startswith("image/"):
        await interaction.followup.send("❌ Le fichier doit être une image (PNG ou JPEG).", ephemeral=True)
        return

    voice_state = interaction.user.voice
    if voice_state is None or voice_state.channel is None:
        await interaction.followup.send("❌ Tu dois être dans un salon vocal pour utiliser cette commande.", ephemeral=True)
        return

    channel = voice_state.channel
    members = [m for m in channel.members if not (exclure_bots and m.bot)]

    if not members:
        await interaction.followup.send(f"❌ Aucun membre éligible dans **{channel.name}**.", ephemeral=True)
        return

    nb = min(nombre, len(members))
    winners = random.sample(members, nb)

    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if nb == 1:
        w = winners[0]
        embed = discord.Embed(
            title="🎲  Tirage au sort  🎲",
            description=(
                f"{sep}\n"
                f"**Salon :** {channel.name} ({len(members)} participant(s))\n\n"
                f"🏆  **Gagnant : {w.mention}**\n"
                f"{sep}"
            ),
            color=discord.Color.gold(),
        )
        embed.set_thumbnail(url=w.display_avatar.url)
    else:
        lines = "\n".join(f"🏆 {m.mention}" for m in winners)
        embed = discord.Embed(
            title="🎲  Tirage au sort  🎲",
            description=(
                f"{sep}\n"
                f"**Salon :** {channel.name} ({len(members)} participant(s))\n\n"
                f"**{nb} gagnants :**\n{lines}\n"
                f"{sep}"
            ),
            color=discord.Color.gold(),
        )

    if image is not None:
        embed.set_image(url=image.url)

    embed.set_footer(text=f"Tirage par {interaction.user.display_name}")
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="giveaway", description="[ADMIN] Lancer un giveaway")
@app_commands.describe(
    lot="Ce qui est mis en jeu",
    duree="Durée (ex: 30m, 1h, 2h30m, 1d)",
    gagnants="Nombre de gagnants (défaut: 1)",
    image="Image du lot à afficher (PNG ou JPEG)",
)
@app_commands.default_permissions(administrator=True)
@app_commands.checks.has_permissions(administrator=True)
async def giveaway_cmd(
    interaction: discord.Interaction,
    lot: str,
    duree: str,
    gagnants: int = 1,
    image: discord.Attachment | None = None,
):
    try:
        await interaction.response.defer()
    except Exception:
        return

    seconds = _parse_duree(duree)
    if seconds is None:
        await interaction.followup.send(
            "❌ Durée invalide. Exemples : `30m`, `1h`, `2h30m`, `1d`", ephemeral=True
        )
        return
    if not 1 <= gagnants <= 20:
        await interaction.followup.send("❌ Le nombre de gagnants doit être entre 1 et 20.", ephemeral=True)
        return
    if image is not None and not image.content_type.startswith("image/"):
        await interaction.followup.send("❌ Le fichier doit être une image (PNG ou JPEG).", ephemeral=True)
        return

    end_ts = int(time.time()) + seconds
    view = GiveawayView(host_id=interaction.user.id)

    embed = discord.Embed(
        title="🎉  GIVEAWAY  🎉",
        description=(
            f"**Lot :** {lot}\n\n"
            f"Clique sur le bouton ci-dessous pour participer !\n\n"
            f"**Fin :** <t:{end_ts}:R> (<t:{end_ts}:f>)\n"
            f"**Gagnants :** {gagnants}\n"
            f"**Organisateur :** {interaction.user.mention}"
        ),
        color=discord.Color.gold(),
    )
    embed.set_footer(text=f"Durée : {_fmt_duree(seconds)}")
    if image is not None:
        embed.set_image(url=image.url)

    msg = await interaction.followup.send(embed=embed, view=view)

    async def _wait_and_conclude():
        await asyncio.sleep(seconds)
        channel = interaction.channel
        await _conclude_giveaway(channel, msg.id, lot, gagnants, interaction.user.id, view)

    asyncio.create_task(_wait_and_conclude())


@bot.tree.command(name="sync", description="[OWNER] Sync commandes slash")
@app_commands.default_permissions(administrator=True)
async def sync_commands(interaction: discord.Interaction):
    if not await bot.is_owner(interaction.user):
        await interaction.response.send_message("⛔ Réservé au propriétaire.", ephemeral=True)
        return
    await interaction.response.defer(ephemeral=True)
    ok, fail = 0, 0
    for gid in GUILD_IDS:
        try:
            bot.tree.copy_global_to(guild=discord.Object(id=gid))
            synced = await bot.tree.sync(guild=discord.Object(id=gid))
            ok += len(synced)
        except Exception:
            fail += 1
    status = "✅" if not fail else "⚠️"
    await interaction.followup.send(f"{status} Sync terminée - {ok} commandes ({fail} erreur(s))", ephemeral=True)


# ── Sync des commandes une seule fois au démarrage ───────────────
# setup_hook est appelé AVANT on_ready, et UNE SEULE FOIS (pas à chaque reconnect).
# C'est là qu'on sync les slash commands pour éviter le délai dans on_ready.
_COMMANDS_SYNCED = False

@bot.event
async def setup_hook():
    global _COMMANDS_SYNCED
    if _COMMANDS_SYNCED:
        return
    _COMMANDS_SYNCED = True
    # Chargement des cogs
    for ext in ("cogs.rank_vocal", "cogs.duel", "cogs.profiles"):
        try:
            await bot.load_extension(ext)
            print(f"[COG] {ext} chargé ✅")
        except Exception as e:
            print(f"[COG] Erreur chargement {ext}: {e}")
    for gid in GUILD_IDS:
        obj = discord.Object(id=gid)
        try:
            bot.tree.copy_global_to(guild=obj)
            synced = await bot.tree.sync(guild=obj)
            print(f"[SYNC] {len(synced)} commandes sync sur {gid}")
        except Exception as e:
            print(f"[SYNC] Erreur sync {gid}: {e}")


bot.run(TOKEN)
