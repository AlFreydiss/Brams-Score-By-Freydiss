from flask import Flask
from threading import Thread
import os
import asyncio
import psycopg2
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
import matplotlib
matplotlib.use("Agg")
logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import matplotlib.font_manager as fm
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from datetime import datetime, timedelta, timezone
from collections import defaultdict

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

def get_db():
    return psycopg2.connect(SUPABASE_URL)

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            data JSONB
        )
    """)
    conn.commit()
    cur.close()
    conn.close()
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

# Couleurs RGB par rang — utilisées dans les images ET les embeds d'annonce
RANK_COLORS = {
    "Pirate":          (46,  204, 113),
    "Shichibukai":     (22,  96,  45),
    "Amiral":          (241, 196, 15),
    "Yonkou":          (155, 89,  182),
    "Roi des pirates": (255, 215, 0),
}

# Cooldown anti-spam : (uid, rank_name) → timestamp dernière annonce
_rank_announce_cooldown: dict = {}
_RANK_ANNOUNCE_COOLDOWN_SECONDS = 300  # 5 minutes

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
    "Itachi Uchiha": 25,
    "Hinata Hyuga": 87,
    "Rock Lee": 73,
    "Gaara": 84,
    "Jiraiya": 52,
    "Minato Namikaze": 53,
    "Obito Uchiha": 167,
    "Pain": 50,
    # Bleach
    "Ichigo Kurosaki": 5,
    "Byakuya Kuchiki": 8,
    # FMA
    "Edward Elric": 11,
    "Alphonse Elric": 12,
    "Roy Mustang": 15,
    "Winry Rockbell": 13,
    # HxH
    "Gon Freecss": 30,
    "Killua Zoldyck": 32,
    "Hisoka Morow": 33,
    "Kurapika": 29,
    # JoJo
    "Jotaro Kujo": 38,
    "Giorno Giovanna": 1660,
    "Dio Brando": 36,
    # Fairy Tail
    "Natsu Dragneel": 9745,
    "Erza Scarlet": 9747,
    "Gray Fullbuster": 9748,
    # SNK
    "Levi Ackerman": 845,
    "Eren Yeager": 849,
    "Mikasa Ackerman": 847,
    "Armin Arlert": 846,
    "Erwin Smith": 843,
    # Death Note
    "Light Yagami": 80,
    # Dragon Ball
    "Son Goku": 246,
    "Goku": 246,
    "Vegeta": 913,
    "Piccolo": 915,
    # Demon Slayer
    "Tanjiro Kamado": 146156,
    "Zenitsu Agatsuma": 146310,
    "Inosuke Hashibira": 146158,
    "Rengoku Kyojuro": 146153,
    "Muzan Kibutsuji": 146318,
    # Jujutsu Kaisen
    "Yuji Itadori": 160111,
    "Gojo Satoru": 160112,
    "Ryomen Sukuna": 160116,
    "Megumi Fushiguro": 160113,
    # Tokyo Ghoul
    "Ken Kaneki": 2037,
    # Code Geass
    "Lelouch vi Britannia": 417,
    # One Punch Man
    "Saitama": 45820,
    # Cowboy Bebop
    "Spike Spiegel": 1,
    # Berserk
    "Guts": 23,
    # Black Clover
    "Asta": 100176,
    # Re:Zero
    "Rem": 136159,
    "Subaru Natsuki": 136160,
    # SAO
    "Kirito": 36828,
    "Asuna Yuuki": 36829,
    # Violet Evergarden
    "Violet Evergarden": 150351,
    # HxH (ajouts — IDs vérifiés uniquement)
    "Meruem": 37,
    # Death Note (ajouts)
    "L": 71,
    "Ryuk": 81,
    # ⚠️ Winry Rockbell : ID 13 = Sasuke → retiré pour éviter mauvaise image
    # Mito Freecss, Isaac Netero : IDs incertains → search par nom (all-parts strict)
}
CHAR_IMAGE_CACHE = {}

async def get_char_image(name):
    if name in CHAR_IMAGE_CACHE:
        return CHAR_IMAGE_CACHE[name]
    jikan_id = CHAR_JIKAN_IDS.get(name)
    try:
        async with aiohttp.ClientSession() as session:
            if jikan_id:
                url = f"https://api.jikan.moe/v4/characters/{jikan_id}"
                async with session.get(url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        img_url = data.get("data", {}).get("images", {}).get("jpg", {}).get("image_url")
                    else:
                        img_url = None
            else:
                # Recherche par nom pour les personnages sans ID connu
                from urllib.parse import quote as _url_quote
                search_url = f"https://api.jikan.moe/v4/characters?q={_url_quote(name)}&limit=1"
                async with session.get(search_url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        chars = data.get("data", [])
                        img_url = chars[0].get("images", {}).get("jpg", {}).get("image_url") if chars else None
                    else:
                        img_url = None
            if img_url:
                async with session.get(img_url) as img_resp:
                    img_bytes = await img_resp.read()
                CHAR_IMAGE_CACHE[name] = img_bytes
                return img_bytes
    except Exception:
        pass
    return None

CITATIONS = [
    # ── ONE PIECE ──
    {"nom": "Monkey D. Luffy", "anime": "One Piece", "citation": "Je vais devenir le Roi des Pirates !", "couleur": 0xf97316, "emoji": ""},
    {"nom": "Monkey D. Luffy", "anime": "One Piece", "citation": "Un homme qui abandonne ses rêves n'est pas digne d'être pirate !", "couleur": 0xf97316, "emoji": ""},
    {"nom": "Monkey D. Luffy", "anime": "One Piece", "citation": "Peu importe le danger, je n'abandonnerai jamais mes amis !", "couleur": 0xf97316, "emoji": ""},
    {"nom": "Roronoa Zoro", "anime": "One Piece", "citation": "Je vais devenir le meilleur épéiste du monde, sinon je mourrai à la tâche.", "couleur": 0x22c55e, "emoji": ""},
    {"nom": "Roronoa Zoro", "anime": "One Piece", "citation": "Il n'y a pas de honte à tomber. La honte, c'est de ne pas se relever.", "couleur": 0x22c55e, "emoji": ""},
    {"nom": "Roronoa Zoro", "anime": "One Piece", "citation": "Je ne me bats pas pour ma gloire. Je me bats pour ceux qui croient en moi.", "couleur": 0x22c55e, "emoji": ""},
    {"nom": "Trafalgar Law", "anime": "One Piece", "citation": "Je ne suis pas un héros. Je suis un chirurgien du destin.", "couleur": 0x3b82f6, "emoji": ""},
    {"nom": "Portgas D. Ace", "anime": "One Piece", "citation": "Même si je dois en mourir, je ne fuirai jamais.", "couleur": 0xef4444, "emoji": ""},
    {"nom": "Portgas D. Ace", "anime": "One Piece", "citation": "Je préfère mourir que d'abandonner ce en quoi je crois.", "couleur": 0xef4444, "emoji": ""},
    {"nom": "Barbe Blanche", "anime": "One Piece", "citation": "Un homme vit pour protéger ce qui lui est cher.", "couleur": 0x94a3b8, "emoji": ""},
    {"nom": "Shanks", "anime": "One Piece", "citation": "Le vrai pouvoir ne vient pas de la force, mais de la volonté.", "couleur": 0xef4444, "emoji": ""},
    {"nom": "Sanji", "anime": "One Piece", "citation": "Un vrai homme ne frappe jamais une femme, quoi qu'il arrive.", "couleur": 0xfbbf24, "emoji": ""},
    # ── NARUTO ──
    {"nom": "Naruto Uzumaki", "anime": "Naruto", "citation": "Je ne recule jamais et je ne mens jamais — c'est ma voie du ninja !", "couleur": 0xf97316, "emoji": ""},
    {"nom": "Naruto Uzumaki", "anime": "Naruto", "citation": "Je deviendrai Hokage, quoi qu'il arrive !", "couleur": 0xf97316, "emoji": ""},
    {"nom": "Naruto Uzumaki", "anime": "Naruto", "citation": "Si tu abandonnes, c'est la fin. Si tu continues, il reste toujours une chance.", "couleur": 0xf97316, "emoji": ""},
    {"nom": "Sasuke Uchiha", "anime": "Naruto", "citation": "Mon pouvoir n'a qu'un seul objectif : la vengeance.", "couleur": 0x1e1b4b, "emoji": ""},
    {"nom": "Sasuke Uchiha", "anime": "Naruto", "citation": "Je n'ai besoin de personne pour accomplir ce que je dois accomplir.", "couleur": 0x1e1b4b, "emoji": ""},
    {"nom": "Kakashi Hatake", "anime": "Naruto", "citation": "Ceux qui abandonnent leurs camarades sont pires que des rebuts.", "couleur": 0x6b7280, "emoji": ""},
    {"nom": "Itachi Uchiha", "anime": "Naruto", "citation": "Pardonne-moi, Sasuke... C'est la dernière fois.", "couleur": 0x4c1d95, "emoji": ""},
    {"nom": "Itachi Uchiha", "anime": "Naruto", "citation": "Il vaut mieux mourir pour quelque chose que de vivre pour rien.", "couleur": 0x4c1d95, "emoji": ""},
    # ── ATTACK ON TITAN ──
    {"nom": "Levi Ackerman", "anime": "Attack on Titan", "citation": "Personne ne sait ce qui va se passer. Décide simplement de ce que tu ne regretteras pas.", "couleur": 0x1f2937, "emoji": ""},
    {"nom": "Levi Ackerman", "anime": "Attack on Titan", "citation": "Les choix que nous faisons sur le champ de bataille sont absolus.", "couleur": 0x1f2937, "emoji": ""},
    {"nom": "Eren Yeager", "anime": "Attack on Titan", "citation": "Je continuerai à avancer jusqu'à ce que je les aie tous exterminés.", "couleur": 0x065f46, "emoji": ""},
    {"nom": "Eren Yeager", "anime": "Attack on Titan", "citation": "Si nous ne nous battons pas, nous ne pouvons pas gagner. Si nous nous battons, nous pouvons gagner.", "couleur": 0x065f46, "emoji": ""},
    {"nom": "Mikasa Ackerman", "anime": "Attack on Titan", "citation": "Ce monde est cruel. Mais il est aussi beau.", "couleur": 0x374151, "emoji": ""},
    {"nom": "Armin Arlert", "anime": "Attack on Titan", "citation": "Ceux qui sont incapables de renoncer à quelque chose ne peuvent jamais rien changer.", "couleur": 0x78716c, "emoji": ""},
    # ── DRAGON BALL Z ──
    {"nom": "Son Goku", "anime": "Dragon Ball Z", "citation": "Je suis un Saiyan elevé sur Terre, et je me bats pour protéger mes amis !", "couleur": 0xf97316, "emoji": ""},
    {"nom": "Son Goku", "anime": "Dragon Ball Z", "citation": "Je ne cherche pas à être le plus fort. Je veux juste protéger ceux qui me sont chers.", "couleur": 0xf97316, "emoji": ""},
    {"nom": "Vegeta", "anime": "Dragon Ball Z", "citation": "Je suis le Prince de tous les Saiyans ! Il n'y a pas un seul être dans cet univers plus fier que moi !", "couleur": 0x1e3a5f, "emoji": ""},
    {"nom": "Vegeta", "anime": "Dragon Ball Z", "citation": "Kakarot... tu es le seul guerrier qui me donne envie de me surpasser.", "couleur": 0x1e3a5f, "emoji": ""},
    # ── DEATH NOTE ──
    {"nom": "Light Yagami", "anime": "Death Note", "citation": "Je vais créer un nouveau monde. Un monde sans crime. Je serai son Dieu.", "couleur": 0x7f1d1d, "emoji": ""},
    {"nom": "Light Yagami", "anime": "Death Note", "citation": "Celui qui gagne, c'est moi. Et le monde sera purifié.", "couleur": 0x7f1d1d, "emoji": ""},
    {"nom": "Light Yagami", "anime": "Death Note", "citation": "Les humains ne font jamais ce qu'on leur dit — mais si facilement ce qu'on leur impose.", "couleur": 0x7f1d1d, "emoji": ""},
    {"nom": "L", "anime": "Death Note", "citation": "Un homme qui ne ment jamais n'a pas besoin d'une bonne mémoire.", "couleur": 0x1c1917, "emoji": ""},
    {"nom": "L", "anime": "Death Note", "citation": "Il y a une probabilité non nulle que je me trompe. Mais elle est très faible.", "couleur": 0x1c1917, "emoji": ""},
    {"nom": "Ryuk", "anime": "Death Note", "citation": "Les humains sont vraiment... intéressants.", "couleur": 0x292524, "emoji": ""},
    # ── BLEACH ──
    {"nom": "Ichigo Kurosaki", "anime": "Bleach", "citation": "Je ne suis pas un héros ni un dieu. Quand on m'attaque, je contre-attaque. C'est tout.", "couleur": 0xea580c, "emoji": ""},
    {"nom": "Ichigo Kurosaki", "anime": "Bleach", "citation": "Peu importe la raison — je veux juste avoir la force de protéger ceux que j'aime.", "couleur": 0xea580c, "emoji": ""},
    {"nom": "Byakuya Kuchiki", "anime": "Bleach", "citation": "La fierté n'est pas quelque chose que l'on gagne. C'est quelque chose que l'on maintient.", "couleur": 0x1e293b, "emoji": ""},
    {"nom": "Byakuya Kuchiki", "anime": "Bleach", "citation": "Les règles existent pour être suivies. Même au prix de sa vie.", "couleur": 0x1e293b, "emoji": ""},
    # ── FAIRY TAIL ──
    {"nom": "Natsu Dragneel", "anime": "Fairy Tail", "citation": "Je ne serai jamais seul — mes amis sont toujours dans mon coeur !", "couleur": 0xdc2626, "emoji": ""},
    {"nom": "Natsu Dragneel", "anime": "Fairy Tail", "citation": "Peu importe combien de fois je tombe, je me relèverai toujours !", "couleur": 0xdc2626, "emoji": ""},
    {"nom": "Erza Scarlet", "anime": "Fairy Tail", "citation": "Les larmes ne sont pas une faiblesse. Ce sont la preuve que tu ressens quelque chose.", "couleur": 0x9f1239, "emoji": ""},
    {"nom": "Erza Scarlet", "anime": "Fairy Tail", "citation": "Avance, meme si c'est dur. La route se tracera sous tes pieds.", "couleur": 0x9f1239, "emoji": ""},
    {"nom": "Makarov Dreyar", "anime": "Fairy Tail", "citation": "La Fairy Tail, c'est une famille. Et une famille, ca ne s'abandonne pas.", "couleur": 0x78350f, "emoji": ""},
    # ── HUNTER x HUNTER ──
    {"nom": "Gon Freecss", "anime": "Hunter x Hunter", "citation": "Si tu abandonnes, c'est deja la fin. Si tu continues, il reste toujours une chance.", "couleur": 0x16a34a, "emoji": ""},
    {"nom": "Gon Freecss", "anime": "Hunter x Hunter", "citation": "Je veux voir ce que voit mon père — ce qui vaut autant que moi a ses yeux.", "couleur": 0x16a34a, "emoji": ""},
    {"nom": "Killua Zoldyck", "anime": "Hunter x Hunter", "citation": "On m'a appris a avancer, toujours. Je ne connais pas le mot renoncer.", "couleur": 0x94a3b8, "emoji": ""},
    {"nom": "Killua Zoldyck", "anime": "Hunter x Hunter", "citation": "La force, c'est ne pas avoir a prouver qu'on est fort.", "couleur": 0x94a3b8, "emoji": ""},
    {"nom": "Hisoka Morow", "anime": "Hunter x Hunter", "citation": "Les perles rares méritent d'être soignées jusqu'a maturité.", "couleur": 0xdc2626, "emoji": ""},
    # ── FULLMETAL ALCHEMIST ──
    {"nom": "Edward Elric", "anime": "Fullmetal Alchemist", "citation": "Une vie humaine n'a pas de prix. Et c'est exactement pour ca que l'alchimie ne peut pas la recréer.", "couleur": 0xd97706, "emoji": ""},
    {"nom": "Edward Elric", "anime": "Fullmetal Alchemist", "citation": "Rien n'est parfait dans ce monde. C'est justement pour ca que c'est beau.", "couleur": 0xd97706, "emoji": ""},
    {"nom": "Roy Mustang", "anime": "Fullmetal Alchemist", "citation": "Ceux qui utilisent le feu doivent être prêts a se brûler.", "couleur": 0x1e40af, "emoji": ""},
    {"nom": "Roy Mustang", "anime": "Fullmetal Alchemist", "citation": "Le rang ne fait pas l'homme. Ce sont ses actes.", "couleur": 0x1e40af, "emoji": ""},
    {"nom": "Alphonse Elric", "anime": "Fullmetal Alchemist", "citation": "On ne peut pas tout obtenir dans ce monde. Mais on peut choisir ce qui vaut la peine d'essayer.", "couleur": 0xe2e8f0, "emoji": ""},
    # ── JOJO'S BIZARRE ADVENTURE ──
    {"nom": "Dio Brando", "anime": "JoJo's Bizarre Adventure", "citation": "Ce monde appartient a DIO !", "couleur": 0x6d28d9, "emoji": ""},
    {"nom": "Dio Brando", "anime": "JoJo's Bizarre Adventure", "citation": "Nul ne peut résister a mon pouvoir. Pas meme le temps.", "couleur": 0x6d28d9, "emoji": ""},
    {"nom": "Jotaro Kujo", "anime": "JoJo's Bizarre Adventure", "citation": "Je n'ai pas besoin de grands discours. Mes poings parlent pour moi.", "couleur": 0x0c4a6e, "emoji": ""},
    {"nom": "Giorno Giovanna", "anime": "JoJo's Bizarre Adventure", "citation": "J'ai un reve. Et ce reve ne mourra jamais.", "couleur": 0xf472b6, "emoji": ""},
    {"nom": "Giorno Giovanna", "anime": "JoJo's Bizarre Adventure", "citation": "Meme dans l'obscurité, la lumière d'un reve ne s'éteint pas.", "couleur": 0xf472b6, "emoji": ""},
    # ── VIOLET EVERGARDEN ──
    {"nom": "Violet Evergarden", "anime": "Violet Evergarden", "citation": "Je veux comprendre ce que signifient ces mots : 'je t'aime'.", "couleur": 0x7c3aed, "emoji": ""},
    {"nom": "Violet Evergarden", "anime": "Violet Evergarden", "citation": "Je ne suis qu'une arme. Mais une arme qui souhaite comprendre les coeurs humains.", "couleur": 0x7c3aed, "emoji": ""},
    {"nom": "Violet Evergarden", "anime": "Violet Evergarden", "citation": "Chaque lettre est une ame qui voyage la ou les mots ne peuvent suffire.", "couleur": 0x7c3aed, "emoji": ""},
    {"nom": "Claudia Hodgins", "anime": "Violet Evergarden", "citation": "Les lettres voyagent la ou les gens ne peuvent aller. Et restent la ou les gens ne peuvent demeurer.", "couleur": 0x1e40af, "emoji": ""},
]

# ─────────────────────────────────────────
#  QUOTES_DB — 150 citations anime (format image premium)
# ─────────────────────────────────────────
QUOTES_DB = [
    # ── ONE PIECE ──
    {"quote": "Je vais devenir le Roi des Pirates !", "character": "Monkey D. Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "Je ne suis pas parfait, mais je suis moi.", "character": "Monkey D. Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "Je suis celui qui va devenir le Roi des Pirates.", "character": "Monkey D. Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "Je ne suis pas un héros. Je suis juste un homme qui veut protéger ce qui lui est précieux.", "character": "Luffy", "anime": "One Piece", "color": "#FF0000"},
    {"quote": "Je ne perds jamais. Soit je gagne, soit j'apprends.", "character": "Luffy", "anime": "One Piece", "color": "#FF0000"},
    {"quote": "La liberté est le plus beau des cadeaux.", "character": "Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "La liberté est tout.", "character": "Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "La liberté est tout ce qui compte.", "character": "Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "La liberté est mon seul but.", "character": "Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "Je ne reculerai jamais.", "character": "Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "Je suis le roi des pirates !", "character": "Monkey D. Luffy", "anime": "One Piece", "color": "#FF4500"},
    {"quote": "Je suis le plus fort du monde.", "character": "Whitebeard", "anime": "One Piece", "color": "#FFFFFF"},
    {"quote": "Les amis sont la famille que l'on choisit.", "character": "Nami", "anime": "One Piece", "color": "#FF69B4"},
    {"quote": "La vie est belle quand on a des amis.", "character": "Nami", "anime": "One Piece", "color": "#FF69B4"},
    # ── NARUTO ──
    {"quote": "Les gens qui sourient même quand ils sont tristes… ce sont les plus forts.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "Je vais devenir Hokage !", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "La douleur rend plus fort.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "Je vais devenir le plus grand Hokage.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "Je vais devenir le plus grand Hokage de tous les temps.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "Les amis sont ma plus grande force.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "Les amis sont ma famille.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "Je vais protéger mes amis.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "La haine engendre la haine. L'amour engendre l'amour.", "character": "Naruto Uzumaki", "anime": "Naruto", "color": "#FF6600"},
    {"quote": "La solitude, c'est pire que la mort.", "character": "Itachi Uchiha", "anime": "Naruto", "color": "#000000"},
    {"quote": "La solitude est la plus grande des douleurs.", "character": "Itachi Uchiha", "anime": "Naruto", "color": "#000000"},
    {"quote": "La solitude est mon seul compagnon.", "character": "Itachi Uchiha", "anime": "Naruto", "color": "#000000"},
    {"quote": "La solitude est ma seule amie.", "character": "Itachi Uchiha", "anime": "Naruto", "color": "#000000"},
    {"quote": "La vie continue, même après la perte.", "character": "Itachi Uchiha", "anime": "Naruto", "color": "#000000"},
    {"quote": "Mon pouvoir n'a qu'un seul but : te protéger.", "character": "Itachi Uchiha", "anime": "Naruto", "color": "#000000"},
    {"quote": "La vengeance est un plat qui se mange froid.", "character": "Sasuke Uchiha", "anime": "Naruto", "color": "#00008B"},
    {"quote": "La vengeance n'apporte que de la souffrance.", "character": "Sasuke Uchiha", "anime": "Naruto", "color": "#00008B"},
    {"quote": "Je ne suis pas un génie. Je suis juste quelqu'un qui travaille dur.", "character": "Rock Lee", "anime": "Naruto", "color": "#228B22"},
    {"quote": "Ceux qui abandonnent leurs camarades sont pires que des rebuts.", "character": "Kakashi Hatake", "anime": "Naruto", "color": "#6B7280"},
    {"quote": "La paix n'existe pas. Il n'y a que des moments de calme avant la tempête.", "character": "Pain", "anime": "Naruto", "color": "#8B0000"},
    {"quote": "Je vais tout détruire... et tout reconstruire.", "character": "Pain", "anime": "Naruto", "color": "#8B0000"},
    {"quote": "Je vais tout reconstruire.", "character": "Pain", "anime": "Naruto", "color": "#8B0000"},
    {"quote": "Je ne pleure pas parce que je suis faible. Je pleure parce que j'ai été fort trop longtemps.", "character": "Hinata Hyuga", "anime": "Naruto", "color": "#FFB6C1"},
    # ── ATTACK ON TITAN ──
    {"quote": "Si tu ne peux pas vaincre la peur, tu ne pourras jamais vaincre la mort.", "character": "Levi Ackerman", "anime": "Attack on Titan", "color": "#2C2F33"},
    {"quote": "La faiblesse n'est pas un crime. Fuir l'est.", "character": "Levi Ackerman", "anime": "Attack on Titan", "color": "#2C2F33"},
    {"quote": "Je ne fais pas de promesses que je ne peux pas tenir.", "character": "Levi Ackerman", "anime": "Attack on Titan", "color": "#2C2F33"},
    {"quote": "Je ne reculerai jamais.", "character": "Levi Ackerman", "anime": "Attack on Titan", "color": "#2C2F33"},
    {"quote": "Je ne reculerai jamais devant rien.", "character": "Levi Ackerman", "anime": "Attack on Titan", "color": "#2C2F33"},
    {"quote": "Les rêves des faibles ne se réalisent jamais.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "La liberté est plus importante que la vie.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "La liberté est mon seul but.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "La liberté, c'est tout ce qui compte.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "Si vous ne vous battez pas, vous ne pouvez pas gagner.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "Je vais tout détruire.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "La vie est un combat.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "Je suis né pour détruire.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "La peur rend faible.", "character": "Eren Yeager", "anime": "Attack on Titan", "color": "#4A4A4A"},
    {"quote": "Les larmes ne résolvent rien.", "character": "Mikasa Ackerman", "anime": "Attack on Titan", "color": "#8B0000"},
    {"quote": "La peur est ce qui nous rend humains.", "character": "Mikasa Ackerman", "anime": "Attack on Titan", "color": "#8B0000"},
    # ── DEATH NOTE ──
    {"quote": "La justice n'est qu'un mot que les forts utilisent pour opprimer les faibles.", "character": "Light Yagami", "anime": "Death Note", "color": "#FFFFFF"},
    {"quote": "La justice, c'est ce que je décide.", "character": "Light Yagami", "anime": "Death Note", "color": "#FFFFFF"},
    {"quote": "La justice, c'est moi.", "character": "Light Yagami", "anime": "Death Note", "color": "#FFFFFF"},
    {"quote": "Je ne suis pas fait pour être normal.", "character": "Light Yagami", "anime": "Death Note", "color": "#FFFFFF"},
    {"quote": "La justice est subjective.", "character": "Light Yagami", "anime": "Death Note", "color": "#FFFFFF"},
    {"quote": "Les mots sont des armes plus puissantes que les épées.", "character": "Light Yagami", "anime": "Death Note", "color": "#FFFFFF"},
    {"quote": "Les mots peuvent blesser plus que les coups.", "character": "Light Yagami", "anime": "Death Note", "color": "#FFFFFF"},
    # ── DRAGON BALL ──
    {"quote": "Je n'abandonnerai jamais.", "character": "Goku", "anime": "Dragon Ball Z", "color": "#FF4500"},
    {"quote": "La vraie force, c'est de se relever après avoir tout perdu.", "character": "Goku", "anime": "Dragon Ball Z", "color": "#FF4500"},
    {"quote": "La famille, c'est ce qu'il y a de plus important.", "character": "Goku", "anime": "Dragon Ball Z", "color": "#FF4500"},
    {"quote": "Je suis né pour ça.", "character": "Goku", "anime": "Dragon Ball Z", "color": "#FF4500"},
    {"quote": "Je vais devenir le plus grand.", "character": "Goku", "anime": "Dragon Ball Z", "color": "#FF4500"},
    {"quote": "Je ne veux pas de pitié. Je veux qu'on me respecte.", "character": "Vegeta", "anime": "Dragon Ball Z", "color": "#0000FF"},
    {"quote": "Je vais te faire regretter d'être né.", "character": "Vegeta", "anime": "Dragon Ball Z", "color": "#0000FF"},
    {"quote": "Je vais te surpasser.", "character": "Vegeta", "anime": "Dragon Ball Z", "color": "#0000FF"},
    {"quote": "Je suis le plus fort.", "character": "Vegeta", "anime": "Dragon Ball Z", "color": "#0000FF"},
    # ── FULLMETAL ALCHEMIST ──
    {"quote": "La mort n'est pas la fin. C'est juste le début d'une nouvelle aventure.", "character": "Edward Elric", "anime": "Fullmetal Alchemist", "color": "#FFD700"},
    {"quote": "La vérité est souvent douloureuse.", "character": "Edward Elric", "anime": "Fullmetal Alchemist", "color": "#FFD700"},
    {"quote": "La vérité est souvent plus douloureuse que le mensonge.", "character": "Edward Elric", "anime": "Fullmetal Alchemist", "color": "#FFD700"},
    {"quote": "La vérité fait mal, mais le mensonge tue.", "character": "Edward Elric", "anime": "Fullmetal Alchemist", "color": "#FFD700"},
    # ── DEMON SLAYER ──
    {"quote": "Le monde n'est pas juste. Mais c'est pour ça qu'il faut le rendre juste.", "character": "Tanjiro Kamado", "anime": "Demon Slayer", "color": "#E6392F"},
    {"quote": "La force, ce n'est pas tout. C'est le cœur qui compte.", "character": "Tanjiro Kamado", "anime": "Demon Slayer", "color": "#E6392F"},
    {"quote": "Je vais protéger tout le monde.", "character": "Tanjiro Kamado", "anime": "Demon Slayer", "color": "#E6392F"},
    {"quote": "Je ne suis pas seul dans ce combat.", "character": "Tanjiro Kamado", "anime": "Demon Slayer", "color": "#E6392F"},
    {"quote": "La vraie force vient du cœur.", "character": "Tanjiro Kamado", "anime": "Demon Slayer", "color": "#E6392F"},
    {"quote": "La force vient de l'intérieur.", "character": "Tanjiro Kamado", "anime": "Demon Slayer", "color": "#E6392F"},
    # ── BLEACH ──
    {"quote": "Je ne me bats pas pour gagner. Je me bats pour ne pas perdre.", "character": "Ichigo Kurosaki", "anime": "Bleach", "color": "#FF0000"},
    {"quote": "Je ne suis pas seul.", "character": "Ichigo Kurosaki", "anime": "Bleach", "color": "#FF0000"},
    {"quote": "Je ne me battrai jamais pour perdre.", "character": "Ichigo Kurosaki", "anime": "Bleach", "color": "#FF0000"},
    # ── CODE GEASS ──
    {"quote": "Un vrai roi protège son peuple, pas l'inverse.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#800080"},
    {"quote": "Je ne regrette rien.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#800080"},
    {"quote": "Je vais changer le monde.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#800080"},
    {"quote": "Je suis né pour régner.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#800080"},
    {"quote": "Je vais tout changer.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#800080"},
    {"quote": "Je vais changer le destin.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#800080"},
    {"quote": "Je ne regrette rien de ce que j'ai fait.", "character": "Lelouch vi Britannia", "anime": "Code Geass", "color": "#800080"},
    # ── ONE PUNCH MAN ──
    {"quote": "Je ne suis pas fort parce que je gagne. Je gagne parce que je suis fort.", "character": "Saitama", "anime": "One Punch Man", "color": "#FF4500"},
    {"quote": "Je suis le plus fort.", "character": "Saitama", "anime": "One Punch Man", "color": "#FF4500"},
    {"quote": "Je suis invincible.", "character": "Saitama", "anime": "One Punch Man", "color": "#FF4500"},
    {"quote": "Je vais te montrer ce qu'est la vraie force.", "character": "Saitama", "anime": "One Punch Man", "color": "#FF4500"},
    {"quote": "Je vais te montrer la vraie force.", "character": "Saitama", "anime": "One Punch Man", "color": "#FF4500"},
    {"quote": "Je suis le roi.", "character": "Saitama", "anime": "One Punch Man", "color": "#FF4500"},
    # ── FAIRY TAIL ──
    {"quote": "La vie sans rêves n'a aucun sens.", "character": "Natsu Dragneel", "anime": "Fairy Tail", "color": "#FF4500"},
    {"quote": "Les rêves valent la peine d'être poursuivis.", "character": "Natsu Dragneel", "anime": "Fairy Tail", "color": "#FF4500"},
    {"quote": "Les rêves sont faits pour être réalisés.", "character": "Natsu Dragneel", "anime": "Fairy Tail", "color": "#FF4500"},
    {"quote": "Les rêves valent la peine d'être défendus.", "character": "Natsu Dragneel", "anime": "Fairy Tail", "color": "#FF4500"},
    {"quote": "Les rêves se réalisent si tu y crois.", "character": "Natsu Dragneel", "anime": "Fairy Tail", "color": "#FF4500"},
    {"quote": "La vie est belle quand on a des rêves.", "character": "Natsu Dragneel", "anime": "Fairy Tail", "color": "#FF4500"},
    # ── HUNTER x HUNTER ──
    {"quote": "Même dans les ténèbres, il y a toujours une lumière.", "character": "Gon Freecss", "anime": "Hunter x Hunter", "color": "#00FF7F"},
    {"quote": "Dans ma prochaine vie, je veux être moi, et te rencontrer à nouveau.", "character": "Gon Freecss", "anime": "Hunter x Hunter", "color": "#388E3C"},
    {"quote": "Je n'ai pas besoin d'amis. J'ai besoin de résultats.", "character": "Hisoka Morow", "anime": "Hunter x Hunter", "color": "#FF00FF"},
    {"quote": "Je vais te tuer... lentement.", "character": "Hisoka Morow", "anime": "Hunter x Hunter", "color": "#FF00FF"},
    {"quote": "Si tu veux apprendre à connaître quelqu'un, découvre ce qui le met en colère.", "character": "Mito Freecss", "anime": "Hunter x Hunter", "color": "#2E7D32"},
    {"quote": "On n'est pas désespérés d'aide, on ne cherche que les forts.", "character": "Isaac Netero", "anime": "Hunter x Hunter", "color": "#5D4037"},
    {"quote": "Pas de donnant-donnant en amitié, tu aides tes amis parce que ce sont tes amis, c'est la seule raison dont tu as besoin.", "character": "Killua Zoldyck", "anime": "Hunter x Hunter", "color": "#B0BEC5"},
    {"quote": "Parce que nous sommes des amis, tu n'as pas besoin de remercier des amis.", "character": "Killua Zoldyck", "anime": "Hunter x Hunter", "color": "#B0BEC5"},
    # ── BERSERK ──
    {"quote": "Si tu ne peux pas protéger ce que tu aimes, alors à quoi sers-tu ?", "character": "Guts", "anime": "Berserk", "color": "#4B0082"},
    {"quote": "La vie est un combat permanent.", "character": "Guts", "anime": "Berserk", "color": "#4B0082"},
    # ── TOKYO GHOUL ──
    {"quote": "Je ne suis pas un monstre. Je suis juste différent.", "character": "Ken Kaneki", "anime": "Tokyo Ghoul", "color": "#FFFFFF"},
    {"quote": "Je ne suis pas normal.", "character": "Ken Kaneki", "anime": "Tokyo Ghoul", "color": "#FFFFFF"},
    # ── BLACK CLOVER ──
    {"quote": "Les rêves deviennent réalité si tu y crois assez fort.", "character": "Asta", "anime": "Black Clover", "color": "#0000FF"},
    {"quote": "Je vais devenir le plus fort.", "character": "Asta", "anime": "Black Clover", "color": "#0000FF"},
    {"quote": "Je vais devenir le plus grand.", "character": "Asta", "anime": "Black Clover", "color": "#0000FF"},
    {"quote": "Je suis celui qui va tout changer.", "character": "Asta", "anime": "Black Clover", "color": "#0000FF"},
    # ── COWBOY BEBOP ──
    {"quote": "La vie est courte. Il faut la vivre à fond.", "character": "Spike Spiegel", "anime": "Cowboy Bebop", "color": "#00BFFF"},
    {"quote": "La mort n'est pas la fin.", "character": "Spike Spiegel", "anime": "Cowboy Bebop", "color": "#00BFFF"},
    {"quote": "La mort n'est qu'un passage.", "character": "Spike Spiegel", "anime": "Cowboy Bebop", "color": "#00BFFF"},
    {"quote": "La vie est belle.", "character": "Spike Spiegel", "anime": "Cowboy Bebop", "color": "#00BFFF"},
    # ── VINLAND SAGA ──
    {"quote": "Un homme qui ne peut pas protéger sa famille ne mérite pas d'en avoir une.", "character": "Thorfinn", "anime": "Vinland Saga", "color": "#8B4513"},
    # ── CLASSROOM OF THE ELITE ──
    {"quote": "Tous les gens ne sont rien d'autre que des outils. Peu importe comment c'est fait… gagner est tout ce qui compte.", "character": "Kiyotaka Ayanokoji", "anime": "Classroom of the Elite", "color": "#1C1C2E"},
]
print(f"✅ {len(QUOTES_DB)} citations anime chargées.")

# ─────────────────────────────────────────
#  UTILITAIRES
# ─────────────────────────────────────────
def now_ts():
    return datetime.now(timezone.utc).timestamp()

def load_data():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT uid, data FROM users")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {row[0]: row[1] for row in rows}

def save_user(uid, udata):
    for attempt in range(3):
        try:
            conn = psycopg2.connect(SUPABASE_URL)
            conn.autocommit = False
            cur = conn.cursor()
            cur.execute("SET LOCAL statement_timeout = '30000'")
            cur.execute("""
                INSERT INTO users (uid, data) VALUES (%s, %s)
                ON CONFLICT (uid) DO UPDATE SET data = EXCLUDED.data
            """, (uid, json.dumps(udata)))
            conn.commit()
            cur.close()
            conn.close()
            return
        except psycopg2.errors.QueryCanceled as e:
            print(f"⚠️ Timeout save_user {uid} (essai {attempt+1}/3): {e}")
            if attempt == 2:
                raise
            time.sleep(1)
        except Exception as e:
            print(f"❌ Erreur save_user {uid}: {e}")
            raise


def save_data(data):
    for attempt in range(3):
        try:
            conn = psycopg2.connect(SUPABASE_URL)
            conn.autocommit = False
            cur = conn.cursor()
            cur.execute("SET LOCAL statement_timeout = '30000'")
            for uid, udata in data.items():
                cur.execute("""
                    INSERT INTO users (uid, data) VALUES (%s, %s)
                    ON CONFLICT (uid) DO UPDATE SET data = EXCLUDED.data
                """, (uid, json.dumps(udata)))
            conn.commit()
            cur.close()
            conn.close()
            return
        except psycopg2.errors.QueryCanceled as e:
            print(f"⚠️ Timeout save_data (essai {attempt+1}/3): {e}")
            if attempt == 2:
                raise
            time.sleep(1)
        except Exception as e:
            print(f"❌ Erreur save_data: {e}")
            raise


async def save_data_async(data):
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(db_executor, save_data, data)

async def save_user_async(uid, udata):
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(db_executor, save_user, uid, udata)

async def load_data_async():
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(db_executor, load_data)


def get_user(data, uid: str):
    if uid not in data:
        data[uid] = {
            "vocal_sessions": [],
            "join_time": None,
            "messages": [],
            "last_rank": None,
            "alerted": False,
        }
    for key in ["last_rank", "alerted"]:
        if key not in data[uid]:
            data[uid][key] = None if key == "last_rank" else False
    return data[uid]

def seconds_in_period(sessions, days, join_time=None):
    cutoff = now_ts() - days * 86400
    total = 0
    for s in sessions:
        start = max(s["start"], cutoff)
        end = s["end"]
        if end < cutoff:
            continue
        total += end - start
    if join_time and join_time > cutoff:
        total += now_ts() - max(join_time, cutoff)
    return total

def messages_in_period(messages, days):
    cutoff = now_ts() - days * 86400
    return sum(1 for ts in messages if ts >= cutoff)

_CLEAN_CUTOFF_DAYS = 8

def clean_old_data(user):
    cutoff = now_ts() - _CLEAN_CUTOFF_DAYS * 86400
    user["vocal_sessions"] = [s for s in user["vocal_sessions"] if s["end"] >= cutoff]
    user["messages"]       = [ts for ts in user["messages"] if ts >= cutoff]

def total_seconds(sessions, join_time=None):
    total = sum(s["end"] - s["start"] for s in sessions)
    if join_time:
        total += now_ts() - join_time
    return total

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

def get_current_rank_threshold(hours):
    for threshold, role_name in RANKS:
        if hours >= threshold:
            return threshold, role_name
    return None, None

def calculate_prime(total_hours, total_msgs):
    base = total_hours * 100_000
    bonus_msg = total_msgs * 5_000
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
db_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="db_worker")

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
    _local_data = data is None
    if _local_data:
        data = await load_data_async()
    uid = str(member.id)
    user = get_user(data, uid)

    deserved_ranks   = set(get_all_ranks_for_hours(hours_7d))
    current_rank_names = {_RANK_ID_TO_NAME[r.id] for r in member.roles if r.id in _RANK_ROLE_IDS}

    ranks_to_add    = deserved_ranks - current_rank_names
    ranks_to_remove = current_rank_names - deserved_ranks

    # Ajouter les rôles manquants
    for rank_name in ranks_to_add:
        role = guild.get_role(RANK_ROLES[rank_name])
        if role:
            try:
                await member.add_roles(role)
            except Exception as e:
                print(f"⚠️ add_roles {member.display_name} ({rank_name}): {e}")

    # Retirer les rôles non mérités (derank)
    for rank_name in ranks_to_remove:
        role = guild.get_role(RANK_ROLES[rank_name])
        if role:
            try:
                await member.remove_roles(role)
            except Exception as e:
                print(f"⚠️ remove_roles {member.display_name} ({rank_name}): {e}")

    rank_order = {r: i for i, (_, r) in enumerate(reversed(RANKS))}

    if announce:
        channel = None
        if ranks_to_add or ranks_to_remove:
            channel = await _get_announce_channel()
            if channel is None:
                print(f"[RANK] Canal d'annonce introuvable (ID={ANNOUNCE_CHANNEL_ID})")

        # ── Annonces de montée de rang (du plus bas au plus haut) ──
        for rank_name in sorted(ranks_to_add, key=lambda r: rank_order.get(r, -1)):
            if not channel:
                break
            cooldown_key = (uid, rank_name)
            last_announced = _rank_announce_cooldown.get(cooldown_key, 0)
            if now_ts() - last_announced < _RANK_ANNOUNCE_COOLDOWN_SECONDS:
                print(f"[RANK] Cooldown actif — annonce skippée : {member.display_name} -> {rank_name}")
                continue
            _rank_announce_cooldown[cooldown_key] = now_ts()
            try:
                img_buf, is_gif = await make_rank_image(member, rank_name, hours_7d)
                fname = "rank_up.gif" if is_gif else "rank_up.png"

                await channel.send(
                    content=f"🏴‍☠️ Bravo a {member.mention} qui a debloque le rank **{rank_name.upper()}** ✨",
                    file=discord.File(img_buf, fname),
                )
                print(f"[RANK] Annonce envoyee : {member.display_name} -> {rank_name}")
            except Exception as e:
                print(f"[RANK] Erreur annonce rank-up {member.display_name} ({rank_name}): {e}")

        # ── Annonces de derank ──
        for rank_name in ranks_to_remove:
            if not channel:
                break
            cooldown_key = (uid, f"derank_{rank_name}")
            last_announced = _rank_announce_cooldown.get(cooldown_key, 0)
            if now_ts() - last_announced < _RANK_ANNOUNCE_COOLDOWN_SECONDS:
                print(f"[RANK] Cooldown actif — derank skippé : {member.display_name} -> -{rank_name}")
                continue
            _rank_announce_cooldown[cooldown_key] = now_ts()
            try:
                emoji   = _ANNOUNCE_RANK_EMOJIS.get(rank_name, "")
                r, g, b = RANK_COLORS.get(rank_name, (150, 150, 150))
                embed = discord.Embed(
                    description=(
                        f"⬇️ {member.mention} a perdu le rang **{rank_name}** {emoji}\n"
                        f"`{hours_7d:.1f}h` vocales sur 7j — seuil non maintenu."
                    ),
                    color=discord.Color.from_rgb(r, g, b),
                )
                embed.set_footer(text="⚓ BRAMS SCORE  |  by Freydiss")
                await channel.send(embed=embed)
                print(f"[RANK] Derank annonce : {member.display_name} -> -{rank_name}")
            except Exception as e:
                print(f"[RANK] Erreur annonce derank {member.display_name} ({rank_name}): {e}")

    new_highest_rank = get_rank_for_hours(hours_7d)
    old_rank = user.get("last_rank")
    if new_highest_rank != old_rank:
        user["last_rank"] = new_highest_rank
        if _local_data:
            await save_user_async(uid, user)

    if ranks_to_add or ranks_to_remove:
        print(f"[RANK] {member.display_name} : +{ranks_to_add} -{ranks_to_remove} | highest={new_highest_rank}")

async def make_citation_image(quote_data: dict) -> io.BytesIO:
    """Génère une carte cinématique 1200x675 — style Whitebeard : fond sombre, portrait droit, texte blanc."""
    W, H = 1200, 675

    # ── Couleur accent ──
    try:
        hex_c = quote_data["color"].lstrip("#").ljust(6, "0")
        accent = tuple(int(hex_c[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        accent = (212, 175, 55)
    if 0.299 * accent[0] + 0.587 * accent[1] + 0.114 * accent[2] < 40:
        accent = (212, 175, 55)

    char_bytes = await _fetch_char_image_bytes(quote_data["character"])

    # ── CANVAS SOMBRE ──
    canvas = Image.new("RGBA", (W, H), (6, 6, 10, 255))

    # ── PORTRAIT PERSONNAGE — remplit toute la partie droite ──
    char_x = W  # fallback si pas d'image
    if char_bytes:
        try:
            ci = Image.open(io.BytesIO(char_bytes)).convert("RGBA")
            # Redimensionner pour remplir toute la hauteur
            ch_w = int(H * ci.width / ci.height)
            # Garantir une largeur minimale visible (portrait étroit → on agrandit)
            ch_w = max(ch_w, 560)
            ci = ci.resize((ch_w, H), Image.LANCZOS)

            r2, g2, b2, a2 = ci.split()
            rgb2 = ImageEnhance.Brightness(Image.merge("RGB", (r2, g2, b2))).enhance(0.78)
            rgb2 = ImageEnhance.Color(rgb2).enhance(0.90)
            ci = Image.merge("RGBA", (*rgb2.split(), a2))

            # Fondu gauche smooth (ease-in-out)
            fade = min(500, ch_w // 2)
            msk = Image.new("L", (ch_w, H), 255)
            md  = ImageDraw.Draw(msk)
            for x in range(fade):
                t = x / fade
                md.line([(x, 0), (x, H)], fill=int(255 * t * t * (3 - 2 * t)))
            ci.putalpha(msk)

            char_x = max(W // 2 - 60, W - ch_w)  # colle à droite, jamais avant le milieu
            canvas.paste(ci, (char_x, 0), ci)
        except Exception as e:
            print(f"[CITATION] PIL image: {e}")

    # ── TEINTE ACCENT sur la zone droite (glow subtil derrière le personnage) ──
    tint = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td   = ImageDraw.Draw(tint)
    for x in range(char_x, W):
        t = (x - char_x) / max(W - char_x, 1)
        a = int(35 * t)   # très doux, juste une teinte
        td.line([(x, 0), (x, H)], fill=(*accent, a))
    canvas = Image.alpha_composite(canvas, tint)

    # ── OVERLAY GAUCHE : zone texte totalement noire ──
    lov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld  = ImageDraw.Draw(lov)
    for x in range(W):
        if x < 560:
            a = 210
        elif x < 880:
            t = (x - 560) / 320
            a = int(210 * (1 - t * t * t))
        else:
            a = 0
        ld.line([(x, 0), (x, H)], fill=(0, 0, 0, a))
    canvas = Image.alpha_composite(canvas, lov)

    # ── VIGNETTE HAUT/BAS ──
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd  = ImageDraw.Draw(vig)
    for y in range(80):
        vd.line([(0, y), (W, y)], fill=(0, 0, 0, int(140 * (1 - y / 80))))
    for y in range(H - 60, H):
        vd.line([(0, y), (W, y)], fill=(0, 0, 0, int(120 * (y - (H - 60)) / 60)))
    canvas = Image.alpha_composite(canvas, vig)

    # ── UTILITAIRES ──
    def _font(path, size):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            return ImageFont.load_default()

    def stroke_text(d, pos, text, font, fill, sw=2):
        x, y = pos
        for dx in range(-sw, sw + 1):
            for dy in range(-sw, sw + 1):
                if dx or dy:
                    d.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, 220))
        d.text(pos, text, font=font, fill=fill)

    def wrap_text(text, font, max_w):
        words, lines, cur = text.split(), [], ""
        for w in words:
            test = (cur + " " + w).strip()
            if draw.textbbox((0, 0), test, font=font)[2] <= max_w:
                cur = test
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    font_deco    = _font("KOMIKAX_.ttf",         300)
    font_char    = _font("PirataOne-Regular.ttf",  76)
    font_anime   = _font("Righteous-Regular.ttf",  36)
    font_quote   = _font("Righteous-Regular.ttf",  46)
    font_quote_s = _font("Righteous-Regular.ttf",  33)
    font_footer  = _font("Righteous-Regular.ttf",  13)

    TX = 56   # marge gauche
    TW = 640  # largeur max zone texte

    # ── GUILLEMET DÉCORATIF (très grand, très transparent) ──
    deco_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(deco_l).text((TX - 18, 20), "\u201c", font=font_deco, fill=(255, 255, 255, 18))
    canvas = Image.alpha_composite(canvas, deco_l)
    draw   = ImageDraw.Draw(canvas)

    # ── NOM DU PERSONNAGE — blanc, gros, uppercase ──
    name_text = quote_data["character"].upper()
    stroke_text(draw, (TX, 22), name_text, font_char, fill=(255, 255, 255, 255), sw=2)
    bb_name = draw.textbbox((TX, 22), name_text, font=font_char)
    name_w, name_h = bb_name[2] - TX, bb_name[3]

    # Ligne accent fine sous le nom
    draw.rectangle([(TX, name_h + 5), (TX + name_w, name_h + 9)], fill=(*accent, 220))

    # ── ANIME — gris clair ──
    anime_y = name_h + 17
    stroke_text(draw, (TX, anime_y), quote_data["anime"], font_anime, fill=(195, 195, 195, 255), sw=1)
    anime_h = draw.textbbox((TX, anime_y), quote_data["anime"], font=font_anime)[3]

    # ── CITATION ──
    raw_quote = f'\u201c{quote_data["quote"]}\u201d'
    lines = wrap_text(raw_quote, font_quote, TW)
    fq, lh = font_quote, 64
    if len(lines) > 6:
        lines = wrap_text(raw_quote, font_quote_s, TW)
        fq, lh = font_quote_s, 50

    zone_top = anime_h + 52
    zone_bot = H - 60
    block_h  = len(lines) * lh
    start_y  = max(zone_top, zone_top + (zone_bot - zone_top - block_h) // 2)

    for i, line in enumerate(lines):
        stroke_text(draw, (TX, start_y + i * lh), line, fq, fill=(245, 245, 245, 255), sw=2)

    # ── LIGNE ACCENT sous la zone texte uniquement ──
    draw.rectangle([(TX, H - 8), (TX + TW, H - 5)], fill=(*accent, 190))

    # ── CRÉDIT discret ──
    footer = "by Freydiss"
    fw = draw.textbbox((0, 0), footer, font=font_footer)[2]
    draw.text((W - fw - 18, H - 22), footer, font=font_footer, fill=(60, 60, 60, 200))

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf


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

    KOMIKA_CANDIDATES = [
        "KOMIKAX_.ttf",
        "KomikaAxis.ttf",
        "attached_assets/KOMIKAX_.ttf",
        "attached_assets/KomikaAxis.ttf",
    ]
    komika_path = next((p for p in KOMIKA_CANDIDATES if os.path.exists(p)), None)
    def _tf(path, size):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            return ImageFont.load_default()

    if komika_path:
        font_felicit   = ImageFont.truetype(komika_path, 46)
        font_grade     = ImageFont.truetype(komika_path, 100)
        font_grade_s   = ImageFont.truetype(komika_path, 70)   # fallback si rank trop long
        font_pseudo    = ImageFont.truetype(komika_path, 50)
        font_community = ImageFont.truetype(komika_path, 30)
    else:
        print("⚠️ [make_rank_image] Aucune police Komika trouvée, fallback défaut")
        font_felicit   = ImageFont.load_default()
        font_grade     = font_felicit
        font_grade_s   = font_felicit
        font_pseudo    = font_felicit
        font_community = font_felicit
    font_credit = _tf("Righteous-Regular.ttf", 18)

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
        async with aiohttp.ClientSession() as session:
            async with session.get(str(avatar_url)) as resp:
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

        # "by Freydiss" — discret, coin bas-droit
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
    _local_data = data is None
    if _local_data:
        data = await load_data_async()
    uid = str(member.id)
    user = get_user(data, uid)

    current_rank = user.get("last_rank")
    if current_rank is None:
        return

    rank_threshold = {"Pirate": 10, "Shichibukai": 25, "Amiral": 40, "Yonkou": 70, "Roi des pirates": 150}
    threshold = rank_threshold.get(current_rank)
    if threshold is None:
        return

    already_alerted = user.get("alerted") == current_rank
    in_danger_zone = (threshold - DERANK_WARNING_THRESHOLD) <= hours_7d < threshold

    if in_danger_zone and not already_alerted:
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
                f"*BRAMS SCORE  |  by Freydiss*"
            )
            await member.send(dm_text)
            user["alerted"] = current_rank
            print(f"📨 Alerte DM envoyée à {member.display_name} ({current_rank} : {hours_7d:.1f}h/{threshold}h)")
            if _local_data:
                await save_user_async(uid, user)
        except discord.Forbidden:
            print(f"🔒 DM fermés pour {member.display_name}, alerte impossible")
        except Exception as e:
            print(f"❌ Erreur DM alerte à {member.display_name}: {e}")

    if hours_7d >= threshold and already_alerted:
        user["alerted"] = None
        if _local_data:
            await save_user_async(uid, user)

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
    print(f"✅ Bot connecté : {bot.user}")
    init_db()
    if not check_ranks_loop.is_running():
        check_ranks_loop.start()
    for gid in GUILD_IDS:
        guild = discord.Object(id=gid)
        try:
            bot.tree.copy_global_to(guild=guild)
            synced = await bot.tree.sync(guild=guild)
            print(f"📡 {len(synced)} commandes sync sur {gid}")
        except Exception as e:
            print(f"⚠️ Erreur sync {gid}: {e}")
    data = await load_data_async()
    recovered = 0
    for guild in bot.guilds:
        for vc in guild.voice_channels:
            for member in vc.members:
                if member.bot:
                    continue
                uid = str(member.id)
                user = get_user(data, uid)
                if not user["join_time"]:
                    user["join_time"] = now_ts()
                    recovered += 1
        for sc in guild.stage_channels:
            for member in sc.members:
                if member.bot:
                    continue
                uid = str(member.id)
                user = get_user(data, uid)
                if not user["join_time"]:
                    user["join_time"] = now_ts()
                    recovered += 1
    if recovered > 0:
        await save_data_async(data)
        print(f"🔄 {recovered} membres en vocal récupérés au démarrage")
    print("✅ Bot prêt !")

@bot.event
async def on_message(message):
    if message.author.bot:
        return
    data = await load_data_async()
    uid = str(message.author.id)
    user = get_user(data, uid)
    user["messages"].append(now_ts())
    clean_old_data(user)
    await save_user_async(uid, user)
    await bot.process_commands(message)

@bot.event
async def on_voice_state_update(member, before, after):
    if member.bot:
        return

    data = await load_data_async()
    uid = str(member.id)
    user = get_user(data, uid)

    if before.channel is None and after.channel is not None:
        user["join_time"] = now_ts()
        await save_user_async(uid, user)

    elif before.channel is not None and after.channel is None:
        if user["join_time"]:
            start = user["join_time"]
            end = now_ts()
            user["vocal_sessions"].append({
                "start": start,
                "end": end,
                "channel": str(before.channel.id)
            })
            user["join_time"] = None
            clean_old_data(user)
            await save_user_async(uid, user)

            seconds_7d = seconds_in_period(user["vocal_sessions"], 7)
            hours_7d = seconds_7d / 3600
            await update_rank(member, hours_7d)

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
        await save_user_async(uid, user)

# ─────────────────────────────────────────
#  LOOP HORAIRE
# ─────────────────────────────────────────
@tasks.loop(hours=1)
async def check_ranks_loop():
    start = time.time()
    print("🔄 check_ranks_loop démarré...")
    try:
        data = await load_data_async()
    except Exception as e:
        print(f"❌ Erreur load_data_async : {e}")
        return
    modified_uids = set()
    total_members = 0

    for guild in bot.guilds:
        if not guild.chunked:
            try:
                await guild.chunk()
                print(f"✅ Chunked {guild.name} ({len(guild.members)} membres)")
            except Exception as e:
                print(f"⚠️ Chunk error {guild.name}: {e}")
        for member in guild.members:
            if member.bot:
                continue
            total_members += 1
            uid = str(member.id)
            user = get_user(data, uid)
            old_last_rank = user.get("last_rank")
            clean_old_data(user)
            jt = user.get("join_time")

            # Membre actuellement en vocal : on skip le rank-up pour éviter de l'assigner
            # silencieusement (announce=False) avant que on_voice_state_update ne puisse l'annoncer.
            # On calcule quand même les heures réelles pour check_alert.
            if jt:
                hours_7d_real = seconds_in_period(user["vocal_sessions"], 7, join_time=jt) / 3600
                if hours_7d_real == 0 and old_last_rank is None:
                    await asyncio.sleep(0.01)
                    continue
                try:
                    await check_alert(member, hours_7d_real, data=data)
                except Exception as e:
                    print(f"⚠️ Erreur check_alert {member.display_name}: {e}")
                await asyncio.sleep(0.01)
                continue

            seconds_7d = seconds_in_period(user["vocal_sessions"], 7)
            hours_7d = seconds_7d / 3600

            # FAST PATH : membre inactif sans rank → skip
            if hours_7d == 0 and old_last_rank is None:
                continue

            try:
                await update_rank(member, hours_7d, announce=False, data=data)
                await check_alert(member, hours_7d, data=data)
                if user.get("last_rank") != old_last_rank:
                    modified_uids.add(uid)
            except Exception as e:
                print(f"⚠️ Erreur {member.display_name}: {e}")
            await asyncio.sleep(0.01)

    if modified_uids:
        print(f"💾 Sauvegarde async de {len(modified_uids)} users modifiés...")
        for uid in modified_uids:
            if uid in data:
                try:
                    await save_user_async(uid, data[uid])
                except Exception as e:
                    print(f"❌ Erreur save {uid}: {e}")

    elapsed = time.time() - start
    print(f"🔄 check_ranks_loop terminé en {elapsed:.1f}s - {total_members} membres, {len(modified_uids)} sauvés")

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
    jt = user.get("join_time")
    if jt:
        today = datetime.fromtimestamp(now_ts(), tz=timezone.utc).strftime("%d/%m")
        vocal_by_day[today] += now_ts() - jt
    for s in user["vocal_sessions"]:
        day = datetime.fromtimestamp(s["end"], tz=timezone.utc).strftime("%d/%m")
        vocal_by_day[day] += s["end"] - s["start"]
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
    data = await load_data_async()
    uid = str(interaction.user.id)
    user = get_user(data, uid)
    me = interaction.user

    jt = user.get("join_time")
    s1d  = seconds_in_period(user["vocal_sessions"], 1, join_time=jt)
    s7d  = seconds_in_period(user["vocal_sessions"], 7, join_time=jt)
    s14d = seconds_in_period(user["vocal_sessions"], 14, join_time=jt)
    s_tot = total_seconds(user["vocal_sessions"], join_time=jt)
    m1d  = messages_in_period(user["messages"], 1)
    m7d  = messages_in_period(user["messages"], 7)
    m14d = messages_in_period(user["messages"], 14)
    m_tot = total_messages(user["messages"])

    hours_7d = s7d / 3600
    rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"
    r_emoji = RANK_EMOJIS.get(rank_actuel, "💀")
    ranks_display = format_all_ranks_display(hours_7d)
    next_thresh, next_rank = get_next_rank(hours_7d)
    prime_val = calculate_prime(s_tot / 3600, m_tot)

    # Indicateur EN VOCAL dans la description (plus petit que le titre)
    live_line = "\u3000🎙️ *— en vocal actuellement*\n" if jt else ""

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
    data = await load_data_async()
    guild = interaction.guild
    all_time = periode.value == "all"
    days = 0 if all_time else int(periode.value)

    vocal_list, msg_list = [], []

    for uid, udata in data.items():
        member = guild.get_member(int(uid))
        if not member or member.bot:
            continue
        ujt = udata.get("join_time")
        if all_time:
            sec = total_seconds(udata.get("vocal_sessions", []), join_time=ujt)
            msgs = total_messages(udata.get("messages", []))
        else:
            sec = seconds_in_period(udata.get("vocal_sessions", []), days, join_time=ujt)
            msgs = messages_in_period(udata.get("messages", []), days)
        vocal_list.append((uid, member.display_name, sec))
        msg_list.append((uid, member.display_name, msgs))

    vocal_list.sort(key=lambda x: x[2], reverse=True)
    msg_list.sort(key=lambda x: x[2], reverse=True)
    medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."]

    vocal_now = {str(m.id) for g in bot.guilds for vc in g.voice_channels for m in vc.members}

    vocal_parts = []
    for i, (uid_n, n, v) in enumerate(vocal_list[:10]):
        if v <= 0:
            break
        live = "  🎙️" if uid_n in vocal_now else ""
        medal = medals[i] if i < len(medals) else f"{i+1}."
        vocal_parts.append(f"{medal}  **{clean_name(n)}**{live}\n     `{format_duration(v)}`")
    vocal_str = "\n\n".join(vocal_parts) if vocal_parts else "*Aucune donnée*"

    msg_parts = []
    for i, (uid_n, n, v) in enumerate(msg_list[:10]):
        if v <= 0:
            break
        live = "  🎙️" if uid_n in vocal_now else ""
        medal = medals[i] if i < len(medals) else f"{i+1}."
        msg_parts.append(f"{medal}  **{clean_name(n)}**{live}\n     `{v} messages`")
    msg_str = "\n\n".join(msg_parts) if msg_parts else "*Aucune donnée*"

    sep = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    embed = discord.Embed(
        title=f"🏆 CLASSEMENT  —  {periode.name.upper()}",
        description=(
            f"{sep}\n\n"
            f"🎙️ **TOP VOCAL**\n"
            f"{sep}\n"
            f"{vocal_str}\n\n"
            f"{sep}\n\n"
            f"💬 **TOP MESSAGES**\n"
            f"{sep}\n"
            f"{msg_str}\n\n"
            f"{sep}"
        ),
        color=discord.Color(0xD4AF37)
    )
    if guild.icon:
        embed.set_thumbnail(url=guild.icon.url)

    embed.set_footer(text=f"BRAMS SCORE  |  by Freydiss  •  {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    try:
        await interaction.followup.send(embed=embed)
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
    data = await load_data_async()
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

    for uid, udata in data.items():
        member = guild.get_member(int(uid))
        if not member or member.bot:
            continue
        ujt = udata.get("join_time")
        if ujt:
            en_vocal_now += 1
        sec  = seconds_in_period(udata.get("vocal_sessions", []), 7, join_time=ujt)
        msgs = messages_in_period(udata.get("messages", []), 7)
        sec_all = total_seconds(udata.get("vocal_sessions", []), join_time=ujt)
        msgs_all = total_messages(udata.get("messages", []))
        total_vocal_7d += sec
        total_msg_7d   += msgs
        total_vocal_all += sec_all
        total_msg_all   += msgs_all
        if sec > 0 or msgs > 0:
            membres_actifs += 1
        r = get_rank_for_hours(sec / 3600)
        if r:
            rank_counts[r] += 1

        for s in udata.get("vocal_sessions", []):
            cutoff = now_ts() - 7 * 86400
            if s["end"] < cutoff:
                continue
            duration = s["end"] - max(s["start"], cutoff)
            ch_id = s.get("channel")
            if ch_id:
                channel_usage[ch_id] += duration

            start_dt = datetime.fromtimestamp(max(s["start"], cutoff), tz=timezone.utc)
            end_dt   = datetime.fromtimestamp(s["end"], tz=timezone.utc)
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
        salon_lines.append(f"{medals[i]} **{name}** — {format_duration(secs)}")

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
    embed1.add_field(name="🕐 Heure de pointe", value=f"**{peak_hour}h — {peak_hour+1}h UTC**", inline=True)

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
    data = await load_data_async()
    guild = interaction.guild
    uid = str(interaction.user.id)
    user = get_user(data, uid)
    me = interaction.user

    jt = user.get("join_time")
    s1d  = seconds_in_period(user["vocal_sessions"], 1, join_time=jt)
    s7d  = seconds_in_period(user["vocal_sessions"], 7, join_time=jt)
    s14d = seconds_in_period(user["vocal_sessions"], 14, join_time=jt)
    s_tot = total_seconds(user["vocal_sessions"], join_time=jt)
    m1d  = messages_in_period(user["messages"], 1)
    m7d  = messages_in_period(user["messages"], 7)
    m14d = messages_in_period(user["messages"], 14)
    m_tot = total_messages(user["messages"])
    hours_7d = s7d / 3600
    hours_tot = s_tot / 3600
    rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"
    r_emoji = RANK_EMOJIS.get(rank_actuel, "💀")
    prime_val = calculate_prime(hours_tot, m_tot)
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
        name=f"{r_emoji} Rang — **{rank_actuel}**",
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
            lines.append(f"{medals[i]} **{n}** — {formatter(v)}")
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
    data = await load_data_async()
    uid = str(membre.id)
    user = get_user(data, uid)

    jt = user.get("join_time")
    s1d  = seconds_in_period(user["vocal_sessions"], 1, join_time=jt)
    s7d  = seconds_in_period(user["vocal_sessions"], 7, join_time=jt)
    s14d = seconds_in_period(user["vocal_sessions"], 14, join_time=jt)
    s_tot = total_seconds(user["vocal_sessions"], join_time=jt)
    m1d  = messages_in_period(user["messages"], 1)
    m7d  = messages_in_period(user["messages"], 7)
    m14d = messages_in_period(user["messages"], 14)
    m_tot = total_messages(user["messages"])

    hours_7d  = s7d / 3600
    hours_tot = s_tot / 3600
    rank_actuel = get_rank_for_hours(hours_7d) or "Aucun"
    r_emoji = RANK_EMOJIS.get(rank_actuel, "💀")
    ranks_display = format_all_ranks_display(hours_7d)
    prime_val = calculate_prime(hours_tot, m_tot)
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



CITATION_HISTORY: list[str] = []

# Cache URL image par personnage (Jikan API)
# Persos non présents sur MAL (cartoons occidentaux, jeux vidéo hors anime, etc.)
_NO_MAL_CHARS: frozenset[str] = frozenset({"Zuko"})
_CHAR_IMAGE_CACHE: dict[str, str | None] = {n: None for n in _NO_MAL_CHARS}
# Cache bytes PIL par personnage (évite re-téléchargement)
_CHAR_IMG_BYTES_CACHE: dict[str, bytes | None] = {}

_CHAR_IMG_URL = "cdn.myanimelist.net/images/characters"

def _name_matches(searched: str, returned: str) -> bool:
    """Toutes les parties significatives (>2 chars) du nom cherché
    doivent apparaître dans le nom retourné — évite les faux positifs."""
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
    """Récupère l'URL image Jikan avec corrélation stricte nom↔image.

    - ID connu  → fetch direct par ID (garanti bon perso), accepte toute URL myanimelist.
    - Sans ID   → recherche par nom, toutes les parties doivent correspondre,
                  URL filtrée sur /images/characters/ pour éviter les logos.
    Retry automatique sur 429. Résultat mis en cache en mémoire.
    """
    if name in _CHAR_IMAGE_CACHE:
        return _CHAR_IMAGE_CACHE[name]

    from urllib.parse import quote as _uq
    img_url = None
    jikan_id = CHAR_JIKAN_IDS.get(name)

    try:
        async with aiohttp.ClientSession() as sess:
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
                data_root = await _jikan_get(sess, f"https://api.jikan.moe/v4/characters?q={_uq(name)}&limit=8")
                if data_root:
                    for char in data_root.get("data", []):
                        returned_name = char.get("name", "")
                        if not _name_matches(name, returned_name):
                            continue
                        candidate = char.get("images", {}).get("jpg", {}).get("image_url", "")
                        # Filtre logos MAL : doit être une image de personnage
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
        return None
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    raw = await resp.read()
                    _CHAR_IMG_BYTES_CACHE[name] = raw
                    return raw
                print(f"[CITATION] DL image HTTP {resp.status} pour '{name}'")
    except Exception as e:
        print(f"[CITATION] DL image erreur '{name}': {e}")
    _CHAR_IMG_BYTES_CACHE[name] = None
    return None

async def _citation_handler(interaction: discord.Interaction, perso: str = None):
    """Logique commune à /citation et /quote."""
    try:
        await interaction.response.defer()
    except discord.NotFound:
        print("⚠️ /citation : interaction expirée avant defer")
        return
    except Exception as e:
        print(f"❌ /citation defer failed: {e}")
        return

    # Filtrage par personnage si demandé
    if perso:
        pool = [q for q in QUOTES_DB if perso.lower() in q["character"].lower()]
        if not pool:
            chars = sorted(set(q["character"] for q in QUOTES_DB))
            await interaction.followup.send(
                f"❌ Personnage introuvable.\n**Disponibles :** {', '.join(chars[:30])}{'…' if len(chars) > 30 else ''}",
                ephemeral=True,
            )
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
        img_buf = await make_citation_image(chosen)
    except Exception as e:
        print(f"❌ make_citation_image: {e}")
        await interaction.followup.send("❌ Erreur lors de la génération de la carte.", ephemeral=True)
        return

    try:
        await interaction.followup.send(file=discord.File(img_buf, "citation.png"))
    except discord.NotFound:
        print("⚠️ /citation : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /citation followup failed: {e}")


@bot.tree.command(name="citation", description="Citation aléatoire d'un personnage anime")
@app_commands.describe(perso="Filtrer par personnage (optionnel)")
async def citation(interaction: discord.Interaction, perso: str = None):
    await _citation_handler(interaction, perso)


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
    data = await load_data_async()
    uid = str(membre.id)
    user = get_user(data, uid)
    now = now_ts()
    user["vocal_sessions"].append({"start": now - heures * 3600, "end": now, "channel": None})
    clean_old_data(user)
    await save_user_async(uid, user)
    seconds_7d = seconds_in_period(user["vocal_sessions"], 7)
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
    data = await load_data_async()
    uid = str(membre.id)
    user = get_user(data, uid)
    user["vocal_sessions"] = []
    user["join_time"] = None
    user["last_rank"] = None
    user["alerted"] = False
    await save_user_async(uid, user)
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
    rank_emojis = {
        "Pirate": "🏴‍☠️",
        "Shichibukai": "<:5505zorohappy:1132289837056151622>",
        "Amiral": "🪖",
        "Yonkou": "⚜️",
    }
    emoji = rank_emojis.get(rang, "")
    await channel.send(
        content=f"Bravo à {target.mention} qui a débloqué le rank **{rang}** {emoji}",
        file=discord.File(img_buf, fname)
    )
    try:
        await interaction.followup.send(f"✅ Annonce envoyée pour {target.mention} ({rang})", ephemeral=True)
    except discord.NotFound:
        print("⚠️ /testrank : token expiré, impossible d'envoyer")
    except Exception as e:
        print(f"❌ /testrank followup failed: {e}")

# ─────────────────────────────────────────
#  /test  (ADMIN — simulation d'événements)
# ─────────────────────────────────────────
@bot.tree.command(name="test", description="[ADMIN] Simuler un événement sans affecter les données réelles")
@app_commands.default_permissions(administrator=True)
@app_commands.checks.has_permissions(administrator=True)
@app_commands.describe(evenement="Type d'événement à simuler", membre="Membre cible (optionnel, défaut : toi)")
@app_commands.choices(evenement=[
    app_commands.Choice(name="Montée de rang", value="rankup"),
    app_commands.Choice(name="Perte de rang (derank)", value="derank"),
    app_commands.Choice(name="Avertissement MP derank", value="warning"),
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
        channel = bot.get_channel(ANNOUNCE_CHANNEL_ID)
        if channel is None:
            await interaction.followup.send("❌ Channel d'annonce introuvable.", ephemeral=True)
            return
        await channel.send(
            content=f"[TEST] ⬇️ {target.mention} a perdu le rang **{rank_name}** 🪖 (simulation)"
        )
        await interaction.followup.send(f"✅ Simulation derank envoyée pour {target.mention}", ephemeral=True)

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
            f"Il te manque environ `{heures_manquantes}h` — passe en vocal dès que possible ! 🚨\n\n"
            f"*(Ceci est un message de test — tes données ne sont pas affectées)*\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"*BRAMS SCORE  |  by Freydiss*"
        )
        try:
            await target.send(dm_text)
            await interaction.followup.send(f"✅ MP de test envoyé à {target.mention}", ephemeral=True)
        except discord.Forbidden:
            await interaction.followup.send(f"❌ DM fermés pour {target.mention}", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Erreur : {e}", ephemeral=True)


# ─────────────────────────────────────────
#  /quiz  (Quiz animé généré par IA — Groq)
# ─────────────────────────────────────────
QUIZ_SESSIONS: dict = {}
_GROQ_MODEL         = "groq/llama-3.3-70b-versatile"

# Historique par utilisateur : dernières questions vues (évite les répétitions)
QUIZ_USER_HISTORY: dict[int, list[str]] = {}
_QUIZ_HISTORY_MAX = 60

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
}

# System prompt strict
_QUIZ_SYSTEM = (
    "Tu es un expert des animés japonais. "
    "Tu réponds UNIQUEMENT avec un JSON valide contenant exactement cette structure : "
    '{"questions": [{"question": "...", "bonne_reponse": "...", '
    '"mauvaises_reponses": ["...", "...", "..."], "anime": "...", "difficulte": "facile|moyen|difficile|expert", '
    '"type": "personnage|technique|lieu|arc|pouvoir|objet|studio|auteur", "explication": "..."}]}. '
    "Règles strictes : "
    "1. Toutes les réponses (correcte ET fausses) doivent être crédibles — jamais de mauvaise réponse ridicule ou évidente. "
    "2. Les mauvaises réponses doivent appartenir au MÊME univers ou genre que la bonne. "
    "3. Varie les types de questions : pas plus de 3 questions 'personnage' d'affilée. "
    "4. Pour difficulte='expert' : questions ultra-précises sur des détails rares (épisode exact, technique complète, chapitre). "
    "5. L'explication (1-2 phrases) explique POURQUOI c'est la bonne réponse, avec un détail de lore. "
    "6. Orthographe et grammaire françaises parfaites. Aucune faute. "
    "Aucun texte avant ou après le JSON. Aucun commentaire."
)

# User prompt : catégorie + seed + anti-répétition
_QUIZ_USER = (
    "Génère exactement {n} questions de quiz sur : {categorie}. "
    "Questions INÉDITES et surprenantes — évite les questions trop classiques comme 'Qui est le capitaine de...' ou 'Quel est le pouvoir de...'. "
    "Préfère : détails d'arcs précis, techniques secondaires, lieux rares, citations cultes, auteurs/studios, scènes emblématiques. "
    "Répartition des difficultés : 20%% facile, 45%% moyen, 25%% difficile, 10%% expert. "
    "{avoid_hint}"
    "Seed de variété : {seed}."
)


async def _generate_quiz_questions(n: int, category: str = "general", seen_questions: list[str] | None = None) -> tuple:
    """Génère n questions via Groq. Retourne (questions: list, erreur: str)."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        msg = "GROQ_API_KEY manquante — configure-la dans Railway > Variables"
        print(f"[QUIZ] ERREUR : {msg}")
        return [], msg

    categorie_desc = _QUIZ_CATEGORIES.get(category, _QUIZ_CATEGORIES["general"])
    seed = random.randint(1000, 9999)

    last_error = ""
    for attempt in range(3):
        raw = ""
        try:
            print(f"[QUIZ] Appel Groq attempt {attempt + 1}/3 — {n} questions — catégorie={category} seed={seed}")
            response = await litellm.acompletion(
                model=_GROQ_MODEL,
                api_key=api_key,
                max_tokens=3000,
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
                    and q.get("bonne_reponse")
                    and isinstance(q.get("mauvaises_reponses"), list)
                ]
                if valid:
                    print(f"[QUIZ] OK — {len(valid)} questions valides")
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

class _QuizSession:
    __slots__ = ("questions", "idx", "score", "points", "best_combo", "combo", "user_id", "interaction", "category")
    def __init__(self, questions, user_id, interaction, category: str = "general"):
        self.questions = questions
        self.idx = 0
        self.score = 0
        self.points = 0
        self.best_combo = 0
        self.combo = 0
        self.user_id = user_id
        self.interaction = interaction
        self.category = category

def _quiz_score_message(score, total):
    pct = score / total if total > 0 else 0
    if pct == 1.0:
        return "PARFAIT ! Tu es une légende de l'animé 🏆"
    elif pct >= 0.7:
        return "Impressionnant, tu es un vrai otaku 🎌"
    elif pct >= 0.4:
        return "Pas mal, tu connais tes classiques 👍"
    else:
        return "Tu débutes, continue à regarder des animés 👀"

async def _send_next_question(inter: discord.Interaction, sess: _QuizSession, feedback: str = ""):
    total = len(sess.questions)
    if sess.idx >= total:
        QUIZ_SESSIONS.pop(sess.user_id, None)
        result_msg = _quiz_score_message(sess.score, total)
        embed = discord.Embed(
            title="Quiz terminé !",
            description=(
                f"{feedback}\n\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"**Score final** : {sess.score} / {total}\n"
                f"**Points totaux** : {sess.points} pts\n"
                f"**Meilleur combo** : x{sess.best_combo}\n\n"
                f"*{result_msg}*"
            ),
            color=discord.Color.from_rgb(212, 175, 55)
        )
        replay_view = _ReplayView(sess.user_id, total, sess.category)
        try:
            await inter.followup.send(embed=embed, view=replay_view)
        except Exception:
            pass
        return

    q = sess.questions[sess.idx]
    choices_next = [q["bonne_reponse"]] + q["mauvaises_reponses"][:3]
    random.shuffle(choices_next)
    next_view = _QuizAnswerView(sess, choices_next, q["bonne_reponse"])

    diff = q.get("difficulte", "moyen").lower()
    q_type = q.get("type", "")
    diff_emoji = _DIFF_EMOJI.get(diff, "⚪")
    type_emoji = _TYPE_EMOJI.get(q_type, "")
    pts = _DIFF_POINTS.get(diff, 1)
    type_str = f" {type_emoji}" if type_emoji else ""
    desc = f"{diff_emoji} *{diff.capitalize()}*{type_str} — {q.get('anime', '?')} • **+{pts} pt{'s' if pts > 1 else ''}**\n\n**{q['question']}**"
    if feedback:
        desc = f"{feedback}\n\n━━━━━━━━━━━━━━━━━━━━\n{desc}"

    color = _DIFF_COLORS.get(diff, 0x6432c8)
    embed = discord.Embed(
        title=f"❓ Question {sess.idx + 1} / {total}",
        description=desc,
        color=color,
    )
    embed.set_footer(text=f"⏱️ 30 secondes • Score : {sess.score}/{sess.idx} • Points : {sess.points} • Combo : x{sess.combo}")
    try:
        msg = await inter.followup.send(embed=embed, view=next_view)
        next_view.message = msg
    except Exception as e:
        print(f"❌ _send_next_question followup failed: {e}")


class _AnswerButton(discord.ui.Button):
    def __init__(self, label_text: str, choice_text: str, is_correct: bool, session: _QuizSession):
        super().__init__(label=label_text[:80], style=discord.ButtonStyle.secondary)
        self._choice = choice_text
        self._is_correct = is_correct
        self._session = session

    async def callback(self, inter: discord.Interaction):
        sess = self._session
        if inter.user.id != sess.user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        view: _QuizAnswerView = self.view
        # Colorer + désactiver tous les boutons
        for btn in view.children:
            if isinstance(btn, _AnswerButton):
                btn.disabled = True
                if btn._is_correct:
                    btn.style = discord.ButtonStyle.success
                elif btn._choice == self._choice and not self._is_correct:
                    btn.style = discord.ButtonStyle.danger
        view.stop()
        await inter.response.edit_message(view=view)

        q = sess.questions[sess.idx]
        diff = q.get("difficulte", "moyen").lower()
        pts = _DIFF_POINTS.get(diff, 1)
        explication = q.get("explication", "")
        if self._is_correct:
            sess.score += 1
            sess.points += pts
            sess.combo += 1
            if sess.combo > sess.best_combo:
                sess.best_combo = sess.combo
            combo_str = f"\n🔥 **COMBO x{sess.combo} ! {'Tu es en feu !' if sess.combo == 5 else 'Incroyable !'}**" if sess.combo >= 5 else ""
            feedback = f"✅ Bonne réponse ! **+{pts} pt{'s' if pts > 1 else ''}**{combo_str}"
            if explication:
                feedback += f"\n📚 *{explication}*"
        else:
            sess.combo = 0
            feedback = f"❌ Mauvais choix ! La bonne réponse était : **{view.correct}**"
            if explication:
                feedback += f"\n📚 *{explication}*"
            feedback += "\nCourage, tu feras mieux la prochaine fois ! 💪"

        sess.idx += 1
        await _send_next_question(inter, sess, feedback)


class _QuizAnswerView(discord.ui.View):
    def __init__(self, session: _QuizSession, choices: list, correct: str):
        super().__init__(timeout=30)
        self.session = session
        self.correct = correct
        labels = ["A", "B", "C", "D"]
        for i, choice in enumerate(choices[:4]):
            is_correct = (choice == correct)
            btn = _AnswerButton(f"{labels[i]}. {choice}", choice, is_correct, session)
            self.add_item(btn)

    async def on_timeout(self):
        QUIZ_SESSIONS.pop(self.session.user_id, None)
        for item in self.children:
            item.disabled = True
        if hasattr(self, "message") and self.message:
            try:
                await self.message.edit(content="⏰ Temps écoulé ! La session a expiré.", view=self)
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

class _QuizSelect(discord.ui.Select):
    """Select Menu : choix du nombre de questions."""
    def __init__(self, user_id: int, category: str = "general"):
        self.user_id = user_id
        self.category = category
        options = [
            discord.SelectOption(label="5 questions",  value="5",  emoji="🎯", description="Quiz rapide"),
            discord.SelectOption(label="10 questions", value="10", emoji="⚡", description="Quiz standard"),
            discord.SelectOption(label="15 questions", value="15", emoji="🔥", description="Quiz marathon"),
        ]
        super().__init__(placeholder="Choisis le nombre de questions...", min_values=1, max_values=1, options=options)

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self.user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        self.view.stop()
        n = int(self.values[0])
        await inter.response.defer()
        await _start_quiz_session(inter, n, self.category)


class _DurationView(discord.ui.View):
    def __init__(self, user_id: int, category: str = "general"):
        super().__init__(timeout=60)
        self.add_item(_QuizSelect(user_id, category))


class _QuizCategorySelect(discord.ui.Select):
    """Select Menu : choix de la catégorie de quiz."""
    def __init__(self, user_id: int):
        self.user_id = user_id
        _LABELS = [
            ("general",      "🎌 Anime général",        "Tous les animés mélangés"),
            ("one_piece",    "🌊 One Piece",             "Fruits du Démon, arcs, personnages"),
            ("naruto",       "🍥 Naruto",                "Jutsu, clans, Akatsuki, arcs"),
            ("bleach",       "🗡️ Bleach",               "Bankai, Shinigami, Espada"),
            ("deathnote",    "💀 Death Note",            "Kira, L, règles du Death Note"),
            ("aot",          "🔥 Attack on Titan",       "Titans, Survey Corps, Shifters"),
            ("dbz",          "🏋️ Dragon Ball Z",        "Saiyans, transformations, arcs"),
            ("hxh",          "🎯 Hunter x Hunter",       "Nen, Gon, Killua, arcs"),
            ("jojo",         "✨ JoJo's Bizarre Adv.",   "Stands, parties, antagonistes"),
            ("demon_slayer", "🔥 Demon Slayer",          "Respirations, Piliers, démons"),
            ("mha",          "💪 My Hero Academia",      "Alter, U.A., League of Villains"),
            ("jjk",          "👁️ Jujutsu Kaisen",       "Techniques maudites, Fléaux, grades"),
            ("fma",          "⚗️ Fullmetal Alchemist",  "Alchimie, Homoncules, arcs"),
            ("chainsaw",     "🪚 Chainsaw Man",          "Diables, contrats, Chasseurs"),
            ("black_clover", "🍀 Black Clover",          "Magie, grimoires, Chevaliers"),
        ]
        options = [
            discord.SelectOption(label=label, value=val, description=desc)
            for val, label, desc in _LABELS
        ]
        super().__init__(placeholder="Choisis une catégorie...", min_values=1, max_values=1, options=options)

    async def callback(self, inter: discord.Interaction):
        if inter.user.id != self.user_id:
            await inter.response.send_message("Ce quiz ne t'appartient pas.", ephemeral=True)
            return
        self.view.stop()
        category = self.values[0]
        await inter.response.edit_message(
            embed=discord.Embed(
                title="Quiz Animé 🎌",
                description="Combien de questions veux-tu ?",
                color=discord.Color.from_rgb(100, 50, 200),
            ),
            view=_DurationView(self.user_id, category),
        )


class _CategoryView(discord.ui.View):
    def __init__(self, user_id: int):
        super().__init__(timeout=60)
        self.add_item(_QuizCategorySelect(user_id))


async def _start_quiz_session(inter: discord.Interaction, n: int, category: str = "general"):
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
    }
    cat_display = cat_labels.get(category, "anime")
    loading_embed = discord.Embed(
        title="🎌 Génération du quiz...",
        description=f"L'IA prépare **{n} questions** sur **{cat_display}** ⏳\n*Que le meilleur gagne !*",
        color=discord.Color.from_rgb(100, 50, 200)
    )
    loading_msg = None
    try:
        loading_msg = await inter.followup.send(embed=loading_embed)
    except Exception as e:
        print(f"⚠️ Quiz loading send failed: {e}")

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
    QUIZ_SESSIONS[uid] = session

    # Mémorise les questions de cette session
    history = QUIZ_USER_HISTORY.setdefault(uid, [])
    history.extend(q["question"] for q in questions)
    if len(history) > _QUIZ_HISTORY_MAX:
        QUIZ_USER_HISTORY[uid] = history[-_QUIZ_HISTORY_MAX:]

    if loading_msg:
        try:
            await loading_msg.delete()
        except Exception:
            pass

    await _send_next_question(inter, session)


async def _quiz_entry(interaction: discord.Interaction, category: str = ""):
    """Point d'entrée commun pour /quiz et /quizz."""
    try:
        await interaction.response.defer(ephemeral=False)
    except discord.NotFound:
        return
    except Exception as e:
        print(f"❌ quiz defer: {e}")
        return

    uid = interaction.user.id
    if category:
        # Catégorie fournie en paramètre → passe directement au choix du nombre
        embed = discord.Embed(
            title="Quiz Animé 🎌",
            description="Combien de questions veux-tu ?",
            color=discord.Color.from_rgb(100, 50, 200)
        )
        view = _DurationView(uid, category)
    else:
        # Pas de catégorie → affiche le select de catégorie d'abord
        embed = discord.Embed(
            title="Quiz Animé 🎌",
            description="Choisis une catégorie pour commencer !",
            color=discord.Color.from_rgb(100, 50, 200)
        )
        view = _CategoryView(uid)

    try:
        await interaction.followup.send(embed=embed, view=view)
    except discord.NotFound:
        pass
    except Exception as e:
        print(f"❌ quiz followup: {e}")


@bot.tree.command(name="quizz", description="Quiz animé — teste tes connaissances sur les animés !")
@app_commands.describe(categorie="Catégorie (optionnel — laisse vide pour choisir)")
@app_commands.choices(categorie=[
    app_commands.Choice(name="🎌 Anime général",        value="general"),
    app_commands.Choice(name="🌊 One Piece",             value="one_piece"),
    app_commands.Choice(name="🍥 Naruto",                value="naruto"),
    app_commands.Choice(name="🗡️ Bleach",               value="bleach"),
    app_commands.Choice(name="💀 Death Note",            value="deathnote"),
    app_commands.Choice(name="🔥 Attack on Titan",       value="aot"),
    app_commands.Choice(name="🏋️ Dragon Ball Z",        value="dbz"),
    app_commands.Choice(name="🎯 Hunter x Hunter",       value="hxh"),
    app_commands.Choice(name="✨ JoJo's Bizarre Adv.",  value="jojo"),
    app_commands.Choice(name="🔥 Demon Slayer",          value="demon_slayer"),
    app_commands.Choice(name="💪 My Hero Academia",      value="mha"),
    app_commands.Choice(name="👁️ Jujutsu Kaisen",      value="jjk"),
    app_commands.Choice(name="⚗️ Fullmetal Alchemist",  value="fma"),
    app_commands.Choice(name="🪚 Chainsaw Man",          value="chainsaw"),
    app_commands.Choice(name="🍀 Black Clover",          value="black_clover"),
])
async def quizz(interaction: discord.Interaction, categorie: str = ""):
    await _quiz_entry(interaction, categorie)


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
    await interaction.followup.send(f"{status} Sync terminée — {ok} commandes ({fail} erreur(s))", ephemeral=True)


bot.run(TOKEN)
