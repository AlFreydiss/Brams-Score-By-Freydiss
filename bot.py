from flask import Flask
from threading import Thread
import os
import asyncio
import psycopg2
import json

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
import json
import io
import math
import random
import aiohttp
import matplotlib
matplotlib.use("Agg")
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
    "Pirate": "attached_assets/ace_gif_1776357473293.gif",
    "Shichibukai": "attached_assets/jinbei_shishibukai_1776355951654.gif",
    "Amiral": "fujitoraaaa.gif",
    "Yonkou": "BAERBBBBBBBBE_NOIR.gif",
    
}
RANK_BG_DEFAULT = "attached_assets/3731-boa-hancock_1776349698684.png"

if os.path.exists(GRAPH_FONT_PATH):
    fm.fontManager.addfont(GRAPH_FONT_PATH)
    CUSTOM_FONT = fm.FontProperties(fname=GRAPH_FONT_PATH).get_name()
else:
    CUSTOM_FONT = None

def add_background(fig, alpha=0.18):
    if not os.path.exists(BG_IMAGE_PATH):
        return
    try:
        img = mpimg.imread(BG_IMAGE_PATH)
        bg_ax = fig.add_axes([0, 0, 1, 1], zorder=0)
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
GUILD_IDS = [924346730194014220]

RANK_ROLES = {
    "Pirate": 1486554682263343284,
    "Shichibukai": 1486554770306236596,
    "Amiral": 1486554823573766164,
    "Yonkou": 1486554858075984043,
}

RANKS = [
    (70, "Yonkou"),
    (40, "Amiral"),
    (25, "Shichibukai"),
    (10, "Pirate"),
]

# ─────────────────────────────────────────
#  CITATIONS ONE PIECE
# ─────────────────────────────────────────
CHAR_JIKAN_IDS = {
    "Monkey D. Luffy": 40,
    "Roronoa Zoro": 62,
    "Trafalgar Law": 13767,
    "Portgas D. Ace": 2072,
    "Nami": 723,
    "Nico Robin": 61,
    "Usopp": 724,
    "Barbe Blanche": 2751,
    "Shanks": 727,
    "Akainu": 22687,
    "Sanji": 305,
}
CHAR_IMAGE_CACHE = {}

async def get_char_image(name):
    if name in CHAR_IMAGE_CACHE:
        return CHAR_IMAGE_CACHE[name]
    jikan_id = CHAR_JIKAN_IDS.get(name)
    if not jikan_id:
        return None
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.jikan.moe/v4/characters/{jikan_id}") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    img_url = data.get("data", {}).get("images", {}).get("jpg", {}).get("image_url")
                    if img_url:
                        async with session.get(img_url) as img_resp:
                            img_bytes = await img_resp.read()
                        CHAR_IMAGE_CACHE[name] = img_bytes
                        return img_bytes
    except Exception:
        pass
    return None

CITATIONS = [
    {"nom": "Monkey D. Luffy", "citation": "Je vais devenir le Roi des Pirates !", "couleur": 0xf97316, "emoji": "🍖"},
    {"nom": "Monkey D. Luffy", "citation": "Un homme qui abandonne ses rêves n'est pas digne d'être pirate !", "couleur": 0xf97316, "emoji": "🍖"},
    {"nom": "Monkey D. Luffy", "citation": "Je serai le roi des pirates !", "couleur": 0xf97316, "emoji": "🍖"},
    {"nom": "Monkey D. Luffy", "citation": "La vie, c'est une aventure !", "couleur": 0xf97316, "emoji": "🍖"},
    {"nom": "Monkey D. Luffy", "citation": "Peu importe le danger, je n'abandonnerai jamais mes amis !", "couleur": 0xf97316, "emoji": "🍖"},
    {"nom": "Roronoa Zoro", "citation": "Je vais devenir le meilleur épéiste du monde, sinon je mourrai à la tâche.", "couleur": 0x22c55e, "emoji": "⚔️"},
    {"nom": "Roronoa Zoro", "citation": "Si tu n'essaies pas, tu as déjà perdu.", "couleur": 0x22c55e, "emoji": "⚔️"},
    {"nom": "Roronoa Zoro", "citation": "Je n'ai pas besoin d'un bras si je peux tenir mon sabre.", "couleur": 0x22c55e, "emoji": "⚔️"},
    {"nom": "Roronoa Zoro", "citation": "Il n'y a pas de honte à tomber. La honte c'est de ne pas se relever.", "couleur": 0x22c55e, "emoji": "⚔️"},
    {"nom": "Roronoa Zoro", "citation": "Les monstres ne pleurent pas.", "couleur": 0x22c55e, "emoji": "⚔️"},
    {"nom": "Roronoa Zoro", "citation": "Je ne me bats pas pour ma gloire. Je me bats pour ceux qui croient en moi.", "couleur": 0x22c55e, "emoji": "⚔️"},
    {"nom": "Trafalgar Law", "citation": "Je ne suis pas un héros. Je suis un chirurgien du destin.", "couleur": 0x3b82f6, "emoji": "🔵"},
    {"nom": "Trafalgar Law", "citation": "Rien ne se passe comme prévu dans ce monde. C'est pour ça que c'est amusant.", "couleur": 0x3b82f6, "emoji": "🔵"},
    {"nom": "Portgas D. Ace", "citation": "Même si je dois en mourir, je ne fuirai jamais.", "couleur": 0xef4444, "emoji": "🔥"},
    {"nom": "Portgas D. Ace", "citation": "Je préfère mourir que d'abandonner ce en quoi je crois.", "couleur": 0xef4444, "emoji": "🔥"},
    {"nom": "Portgas D. Ace", "citation": "Je vis, donc je combats !", "couleur": 0xef4444, "emoji": "🔥"},
    {"nom": "Nami", "citation": "Mes rêves valent bien quelques mensonges.", "couleur": 0xeab308, "emoji": "🗺️"},
    {"nom": "Nico Robin", "citation": "Un rêve ne se réalise jamais par hasard.", "couleur": 0xa855f7, "emoji": "📖"},
    {"nom": "Usopp", "citation": "Seuls ceux qui ont connu la vraie faiblesse peuvent devenir vraiment forts.", "couleur": 0xeab308, "emoji": "🎯"},
    {"nom": "Barbe Blanche", "citation": "Vis bien. Meurs bien. Et si tu dois mourir, assure-toi d'y croire jusqu'à la fin.", "couleur": 0x94a3b8, "emoji": "⚓"},
    {"nom": "Barbe Blanche", "citation": "Un homme vit pour protéger ce qui lui est cher.", "couleur": 0x94a3b8, "emoji": "⚓"},
    {"nom": "Shanks", "citation": "Le vrai pouvoir ne vient pas de la force, mais de la volonté.", "couleur": 0xef4444, "emoji": "🍶"},
    {"nom": "Akainu", "citation": "La marine protège le monde. Nous sommes la justice absolue.", "couleur": 0xb91c1c, "emoji": "🌋"},
    {"nom": "Sanji", "citation": "Un vrai homme ne frappe jamais une femme, quoi qu'il arrive.", "couleur": 0xfbbf24, "emoji": "🍳"},
]

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

def save_data(data):
    conn = get_db()
    cur = conn.cursor()
    for uid, udata in data.items():
        cur.execute("""
            INSERT INTO users (uid, data) VALUES (%s, %s)
            ON CONFLICT (uid) DO UPDATE SET data = EXCLUDED.data
        """, (uid, json.dumps(udata)))
    conn.commit()
    cur.close()
    conn.close()


def save_user(uid, udata):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO users (uid, data) VALUES (%s, %s)
        ON CONFLICT (uid) DO UPDATE SET data = EXCLUDED.data
    """, (uid, json.dumps(udata)))
    conn.commit()
    cur.close()
    conn.close()


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

def clean_old_data(user):
    pass

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

# ─────────────────────────────────────────
#  RANK UPDATE + ANNONCES
# ─────────────────────────────────────────
async def update_rank(member: discord.Member, hours_7d: float, announce=True):
    guild = member.guild
    data = load_data()
    uid = str(member.id)
    user = get_user(data, uid)

    new_rank = get_rank_for_hours(hours_7d)
    old_rank = user.get("last_rank")

    current_rank_role_ids = [r.id for r in member.roles if r.id in RANK_ROLES.values()]
    expected_role_id = RANK_ROLES.get(new_rank) if new_rank else None

    needs_role_update = (
        (expected_role_id is None and current_rank_role_ids) or
        (expected_role_id is not None and current_rank_role_ids != [expected_role_id])
    )

    if needs_role_update:
        roles_to_remove = [r for r in member.roles if r.id in RANK_ROLES.values()]
        if roles_to_remove:
            try:
                await member.remove_roles(*roles_to_remove)
            except Exception as e:
                print(f"⚠️ Erreur remove_roles {member.display_name}: {e}")
        if new_rank and expected_role_id:
            role = guild.get_role(expected_role_id)
            if role:
                try:
                    await member.add_roles(role)
                except Exception as e:
                    print(f"⚠️ Erreur add_roles {member.display_name}: {e}")

    if announce and new_rank != old_rank and new_rank is not None and old_rank is not None:
        rank_order = {r: i for i, (_, r) in enumerate(reversed(RANKS))}
        old_order = rank_order.get(old_rank, -1)
        new_order = rank_order.get(new_rank, -1)
        if new_order > old_order:
            channel = bot.get_channel(ANNOUNCE_CHANNEL_ID)
            if channel:
                img_buf, is_gif = await make_rank_image(member, new_rank, hours_7d)
                fname = "rank_up.gif" if is_gif else "rank_up.png"
                rank_emojis = {
                    "Pirate": "🏴‍☠️",
                    "Shichibukai": "<:5505zorohappy:1132289837056151622>",
                    "Amiral": "<:Winner:997169279336206398>",
                    "Yonkou": "⚜️",
                }
                emoji = rank_emojis.get(new_rank, "")
                await channel.send(
                    content=f"Bravo à {member.mention} qui a débloqué le rank **{new_rank}** {emoji}",
                    file=discord.File(img_buf, fname)
                )

    if user.get("last_rank") != new_rank:
        user["last_rank"] = new_rank
        save_user(uid, user)

async def make_rank_image(member: discord.Member, rank_name: str, hours_7d: float):
    CARD_W = 900
    CARD_H = 500
    GOLD = (212, 175, 55)
    WHITE = (255, 255, 255)
    AVATAR_SIZE = 160
    BG_OPACITY = 0.45

    bg_path = RANK_BG_PATHS.get(rank_name, RANK_BG_DEFAULT)
    src_img = Image.open(bg_path)
    is_gif = getattr(src_img, "is_animated", False)

    try:
        font_felicit = ImageFont.truetype("attached_assets/KomikaAxis.ttf", 36)
        font_grade = ImageFont.truetype("attached_assets/KomikaAxis.ttf", 64)
        font_pseudo = ImageFont.truetype("attached_assets/KomikaAxis.ttf", 38)
        font_community = ImageFont.truetype("attached_assets/KomikaAxis.ttf", 20)
    except Exception:
        font_felicit = ImageFont.load_default()
        font_grade = font_felicit
        font_pseudo = font_felicit
        font_community = font_felicit

    rank_labels = {"Pirate": "PIRATE", "Shichibukai": "SHICHIBUKAI",
                   "Amiral": "AMIRAL", "Yonkou": "YONKOU"}
    grade_text = rank_labels.get(rank_name, rank_name.upper())
    pseudo = member.display_name

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
        r, g, b, a = photo.split()
        a = a.point(lambda x: int(x * BG_OPACITY))
        photo = Image.merge("RGBA", (r, g, b, a))

        card = Image.new("RGBA", (CARD_W, CARD_H), (15, 15, 22, 255))
        card = Image.alpha_composite(card, photo)
        draw = ImageDraw.Draw(card, "RGBA")

        draw_text_centered(draw, f"FELICITATIONS POUR LE RANK", font_felicit, 30, (*GOLD, 255))
        draw_text_centered(draw, grade_text, font_grade, 78, (*WHITE, 255))

        if avatar_circle is not None:
            ax = (CARD_W - AVATAR_SIZE) // 2
            ay = 200
            draw.ellipse(
                [ax - 4, ay - 4, ax + AVATAR_SIZE + 4, ay + AVATAR_SIZE + 4],
                outline=GOLD, width=3
            )
            card.paste(avatar_circle, (ax, ay), avatar_circle)
            pseudo_y = ay + AVATAR_SIZE + 24
        else:
            pseudo_y = 280

        draw_text_centered(draw, pseudo, font_pseudo, pseudo_y, (*WHITE, 255))
        draw_text_centered(draw, "BRAMS COMMUNITY", font_community, pseudo_y + 56, (*GOLD, 230))

        return card

    buf = io.BytesIO()
    if is_gif:
        frames = []
        durations = []
        try:
            n_frames = src_img.n_frames
        except Exception:
            n_frames = 1
        max_frames = 60
        step = max(1, n_frames // max_frames)
        for i in range(0, n_frames, step):
            src_img.seek(i)
            frames.append(compose_frame(src_img.copy()))
            src_img.seek(i)
            dur = src_img.info.get("duration", 80)
            durations.append(max(40, dur * step))
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

async def check_alert(member: discord.Member, hours_7d: float):
    data = load_data()
    uid = str(member.id)
    user = get_user(data, uid)

    threshold, current_rank = get_current_rank_threshold(hours_7d)
    if current_rank is None:
        if user.get("alerted"):
            user["alerted"] = False
            save_user(uid, user)
        return

    cutoff_7d = now_ts() - 7 * 86400
    sessions = user.get("vocal_sessions", [])

    expiring_soon = 0
    for s in sessions:
        if cutoff_7d <= s["end"] <= cutoff_7d + 86400:
            expiring_soon += s["end"] - max(s["start"], cutoff_7d)

    hours_expiring = expiring_soon / 3600
    future_hours = hours_7d - hours_expiring

    will_lose_rank = future_hours < threshold
    already_alerted = user.get("alerted", False)

    if will_lose_rank and not already_alerted:
        user["alerted"] = True
        save_user(uid, user)
        try:
            embed = discord.Embed(
                title="⚠️ Tu vas perdre ton rank !",
                description=(
                    f"Attention **{member.display_name}** !\n\n"
                    f"Tu risques de perdre ton rang **{current_rank}** dans les prochaines 24h.\n"
                    f"Il te faut encore **{hours_expiring:.1f}h** de vocal pour le garder !\n\n"
                    f"Connecte-toi vite sur le serveur 🎙️"
                ),
                color=discord.Color.red()
            )
            await member.send(embed=embed)
        except discord.Forbidden:
            pass
    elif not will_lose_rank and already_alerted:
        user["alerted"] = False
        save_user(uid, user)

# ─────────────────────────────────────────
#  GRAPHIQUES
# ─────────────────────────────────────────
def make_activity_graph(vocal_by_day, msg_by_day, title="Activité des 7 derniers jours"):
    font_kw = {"fontfamily": CUSTOM_FONT} if CUSTOM_FONT else {}

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), facecolor="#1a1a2e")
    fig.suptitle(title, color="#e0e0e0", fontsize=18, fontweight="bold", y=0.98, **font_kw)
    add_background(fig, alpha=0.12)

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
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    buf.seek(0)
    plt.close()
    return buf

def make_peak_hours_graph(hour_counts):
    import numpy as np
    font_kw = {"fontfamily": CUSTOM_FONT} if CUSTOM_FONT else {}

    fig, ax = plt.subplots(figsize=(14, 5), facecolor="#1a1a2e")
    ax.set_facecolor("#16213e")
    add_background(fig, alpha=0.12)

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
    ax.set_title("🕐 Heures de pointe (7 jours)", color="#e0e0e0", fontsize=16, fontweight="bold", pad=15, **font_kw)
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
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    buf.seek(0)
    plt.close()
    return buf


# ─────────────────────────────────────────
#  GÉNÉRATEUR IMAGE WANTED (template)
# ─────────────────────────────────────────
TEMPLATE_PATH = "template.png"

async def generate_wanted_image(membre, bounty_str, rank, vocal_7d, vocal_14d, msg_7d, msg_14d, next_rank_str):
    img = Image.open(TEMPLATE_PATH).convert("RGB")
    W, H = img.size
    BLACK = (30, 25, 15)
    BG = (218, 187, 142)

    def try_font(path, size):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            return ImageFont.load_default()

    use_bangers = os.path.exists(FONT_PATH)
    bp = FONT_PATH if use_bangers else "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

    font_name        = try_font(bp, 55)
    font_doa         = try_font(bp, 48)
    font_prime       = try_font(bp, 70)
    font_grade_label = try_font(bp, 32)
    font_grade       = try_font(bp, 26)

    av_x, av_y, av_w, av_h = 140, 240, 780, 445

    try:
        av_url = str(membre.display_avatar.replace(size=512, format="png"))
        async with aiohttp.ClientSession() as session:
            async with session.get(av_url) as resp:
                av_bytes = await resp.read()
        av_img = Image.open(io.BytesIO(av_bytes)).convert("RGBA")
        av_img = av_img.resize((av_w, av_h), Image.LANCZOS)
        av_rgb = av_img.convert("RGB")
        av_rgb = ImageEnhance.Color(av_rgb).enhance(0.7)
        av_rgb = ImageEnhance.Contrast(av_rgb).enhance(1.1)
        sepia = Image.new("RGB", (av_w, av_h), (40, 30, 15))
        av_rgb = Image.blend(av_rgb, sepia, 0.06)
        img.paste(av_rgb, (av_x, av_y))
    except Exception as e:
        print(f"[WANTED] Erreur avatar: {e}")

    draw = ImageDraw.Draw(img)

    name_txt = membre.display_name.upper()
    if len(name_txt) > 20:
        name_txt = name_txt[:19] + "."
    draw.text((W//2, 720), name_txt, font=font_name, fill=BLACK, anchor="mm")

    draw.rectangle([50, 770, 1005, 1210], fill=BG)
    draw.text((W//2, 820), "DEAD OR ALIVE", font=font_doa, fill=BLACK, anchor="mm")
    draw.text((W//2, 920), bounty_str + " -", font=font_prime, fill=BLACK, anchor="mm")
    draw.line([(120, 975), (940, 975)], fill=BLACK, width=4)
    draw.line([(120, 983), (940, 983)], fill=BLACK, width=3)

    draw.rectangle([140, 1010, 920, 1130], outline=BLACK, width=3)
    draw.text((W//2, 1045), "GRADE :", font=font_grade_label, fill=BLACK, anchor="mm")

    grades = ["PIRATE", "AMIRAL", "SHICHIBUKAI", "YONKOU"]
    gx_positions = [220, 400, 600, 800]
    for i, g in enumerate(grades):
        gx = gx_positions[i]
        gy = 1095
        checked = g.lower() == rank.lower()
        draw.rectangle([gx - 13, gy - 13, gx + 13, gy + 13], outline=BLACK, width=2)
        if checked:
            draw.rectangle([gx - 9, gy - 9, gx + 9, gy + 9], fill=BLACK)
        draw.text((gx + 20, gy), g, font=font_grade, fill=BLACK, anchor="lm")

    buf = io.BytesIO()
    img.save(buf, format="PNG", quality=95)
    buf.seek(0)
    return buf

# ─────────────────────────────────────────
#  GÉNÉRATEUR WANTED CUSTOM (prefix !wanted)
# ─────────────────────────────────────────
async def generate_wanted_custom(name, bounty, grade, avatar_url=None):
    img = Image.open(TEMPLATE_PATH).convert("RGB")
    W, H = img.size
    BLACK = (30, 25, 15)
    BG = (218, 187, 142)

    def try_font(path, size):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            return ImageFont.load_default()

    use_bangers = os.path.exists(FONT_PATH)
    bp = FONT_PATH if use_bangers else "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

    font_name        = try_font(bp, 55)
    font_doa         = try_font(bp, 48)
    font_prime       = try_font(bp, 70)
    font_grade_label = try_font(bp, 32)
    font_grade       = try_font(bp, 26)

    av_x, av_y, av_w, av_h = 140, 240, 780, 445

    if avatar_url:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(avatar_url) as resp:
                    av_bytes = await resp.read()
            av_img = Image.open(io.BytesIO(av_bytes)).convert("RGB")
            av_img = av_img.resize((av_w, av_h), Image.LANCZOS)
            av_img = ImageEnhance.Color(av_img).enhance(0.7)
            av_img = ImageEnhance.Contrast(av_img).enhance(1.1)
            sepia = Image.new("RGB", (av_w, av_h), (40, 30, 15))
            av_img = Image.blend(av_img, sepia, 0.06)
            img.paste(av_img, (av_x, av_y))
        except Exception as e:
            print(f"[WANTED CUSTOM] Erreur avatar: {e}")

    draw = ImageDraw.Draw(img)

    name_txt = name.upper()
    if len(name_txt) > 20:
        name_txt = name_txt[:19] + "."
    draw.text((W//2, 720), name_txt, font=font_name, fill=BLACK, anchor="mm")

    draw.rectangle([50, 770, 1005, 1210], fill=BG)
    draw.text((W//2, 820), "DEAD OR ALIVE", font=font_doa, fill=BLACK, anchor="mm")
    draw.text((W//2, 920), f"{bounty} -", font=font_prime, fill=BLACK, anchor="mm")
    draw.line([(120, 975), (940, 975)], fill=BLACK, width=4)
    draw.line([(120, 983), (940, 983)], fill=BLACK, width=3)

    draw.rectangle([140, 1010, 920, 1130], outline=BLACK, width=3)
    draw.text((W//2, 1045), "GRADE :", font=font_grade_label, fill=BLACK, anchor="mm")

    grades_list = ["PIRATE", "AMIRAL", "SHICHIBUKAI", "YONKOU"]
    gx_positions = [220, 400, 600, 800]
    for i, g in enumerate(grades_list):
        gx = gx_positions[i]
        gy = 1095
        checked = g.lower() == grade.lower()
        draw.rectangle([gx - 13, gy - 13, gx + 13, gy + 13], outline=BLACK, width=2)
        if checked:
            draw.rectangle([gx - 9, gy - 9, gx + 9, gy + 9], fill=BLACK)
        draw.text((gx + 20, gy), g, font=font_grade, fill=BLACK, anchor="lm")

    buf = io.BytesIO()
    img.save(buf, format="PNG", quality=95)
    buf.seek(0)
    return buf



# ─────────────────────────────────────────
#  EVENTS
# ─────────────────────────────────────────
@bot.event
async def on_ready():
    print(f"✅ Bot connecté : {bot.user}")
    init_db()
    if not check_ranks_loop.is_running():
        check_ranks_loop.start()
    for gid in [924346730194014220, 1478937064031518892]:
        guild = discord.Object(id=gid)
        try:
            bot.tree.copy_global_to(guild=guild)
            synced = await bot.tree.sync(guild=guild)
            print(f"📡 {len(synced)} commandes sync sur {gid}")
        except Exception as e:
            print(f"⚠️ Erreur sync {gid}: {e}")
    data = load_data()
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
        save_data(data)
        print(f"🔄 {recovered} membres en vocal récupérés au démarrage")
    print("✅ Bot prêt !")

@bot.event
async def on_message(message):
    if message.author.bot:
        return
    data = load_data()
    uid = str(message.author.id)
    user = get_user(data, uid)
    user["messages"].append(now_ts())
    clean_old_data(user)
    save_user(uid, user)
    await bot.process_commands(message)

@bot.event
async def on_voice_state_update(member, before, after):
    if member.bot:
        return

    data = load_data()
    uid = str(member.id)
    user = get_user(data, uid)

    if before.channel is None and after.channel is not None:
        user["join_time"] = now_ts()
        save_user(uid, user)

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
            save_user(uid, user)

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
        save_user(uid, user)

# ─────────────────────────────────────────
#  LOOP HORAIRE
# ─────────────────────────────────────────
@tasks.loop(hours=1)
async def check_ranks_loop():
    data = load_data()
    for guild in bot.guilds:
        for member in guild.members:
            if member.bot:
                continue
            uid = str(member.id)
            user = get_user(data, uid)
            clean_old_data(user)
            jt = user.get("join_time")
            seconds_7d = seconds_in_period(user["vocal_sessions"], 7, join_time=jt)
            hours_7d = seconds_7d / 3600
            await update_rank(member, hours_7d, announce=False)
            await check_alert(member, hours_7d)
            await asyncio.sleep(2)
    print("🔄 Vérification horaire des ranks effectuée.")

# ─────────────────────────────────────────
#  COMMANDES SLASH
# ─────────────────────────────────────────

def make_progress_bar(current, target, length=10):
    filled = int(min(current / target, 1.0) * length) if target > 0 else 0
    empty = length - filled
    return "▰" * filled + "▱" * empty

RANK_EMOJIS = {"Pirate": "🏴‍☠️", "Shichibukai": "⚔️", "Amiral": "🪖", "Yonkou": "👑"}

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
    await interaction.response.defer(ephemeral=False)
    data = load_data()
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
    next_thresh, next_rank = get_next_rank(hours_7d)
    prime_val = calculate_prime(s_tot / 3600, m_tot)

    live_tag = "  🔴 EN VOCAL" if jt else ""

    if next_rank:
        bar = make_progress_bar(hours_7d, next_thresh, 12)
        rank_value = f"{r_emoji} **{rank_actuel}** — `{bar}` **{hours_7d:.1f}h**/{next_thresh}h → {next_rank}"
    else:
        rank_value = f"{r_emoji} **{rank_actuel}** — `▰▰▰▰▰▰▰▰▰▰▰▰` 👑 Rang maximum !"

    embed = discord.Embed(
        title=f"⚓ {me.display_name.upper()}{live_tag}",
        description=(
            f"{rank_value}\n"
            f"💰 Prime : **{format_prime(prime_val)}**\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"**🎙️ Vocal**\n"
            f"> Aujourd'hui `{format_duration(s1d)}` · 7j `{format_duration(s7d)}` · 14j `{format_duration(s14d)}`\n"
            f"> Total : **{format_duration(s_tot)}**\n\n"
            f"**💬 Messages**\n"
            f"> Aujourd'hui `{m1d}` · 7j `{m7d}` · 14j `{m14d}`\n"
            f"> Total : **{m_tot}**"
        ),
        color=discord.Color.from_rgb(212, 175, 55)
    )
    embed.set_thumbnail(url=me.display_avatar.url)

    vocal_by_day, msg_by_day = build_vocal_by_day(user)
    graph_buf = make_activity_graph(vocal_by_day, msg_by_day, f"Activite de {me.display_name}")

    embed.set_image(url="attachment://graph.png")
    embed.set_footer(text=f"Brams Score  •  {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"))


@bot.tree.command(name="top", description="Classement vocal et messages")
@app_commands.describe(periode="Période")
@app_commands.choices(periode=[
    app_commands.Choice(name="📅 Aujourd'hui", value="1"),
    app_commands.Choice(name="📆 7 Jours", value="7"),
    app_commands.Choice(name="📆 14 Jours", value="14"),
    app_commands.Choice(name="🏴‍☠️ All Time", value="all"),
])
async def top(interaction: discord.Interaction, periode: app_commands.Choice[str]):
    await interaction.response.defer()
    data = load_data()
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
        vocal_list.append((member.display_name, sec))
        msg_list.append((member.display_name, msgs))

    vocal_list.sort(key=lambda x: x[1], reverse=True)
    msg_list.sort(key=lambda x: x[1], reverse=True)
    medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]

    vocal_lines = []
    for i, (n, v) in enumerate(vocal_list[:5]):
        if v <= 0:
            break
        vocal_lines.append(f"{medals[i]} **{n}** — {format_duration(v)}")

    msg_lines = []
    for i, (n, v) in enumerate(msg_list[:5]):
        if v <= 0:
            break
        msg_lines.append(f"{medals[i]} **{n}** — {v} msg")

    embed = discord.Embed(
        title=f"🏆 CLASSEMENT — {periode.name.upper()}",
        color=discord.Color.from_rgb(212, 175, 55)
    )
    if guild.icon:
        embed.set_thumbnail(url=guild.icon.url)

    embed.add_field(
        name="🎙️ Top Vocal",
        value="\n".join(vocal_lines) if vocal_lines else "*Aucune donnée*",
        inline=False
    )
    embed.add_field(
        name="💬 Top Messages",
        value="\n".join(msg_lines) if msg_lines else "*Aucune donnée*",
        inline=False
    )

    embed.set_footer(text=f"Brams Score • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    await interaction.followup.send(embed=embed)


@bot.tree.command(name="serveur", description="Stats globales du serveur")
async def serveur(interaction: discord.Interaction):
    await interaction.response.defer()
    data = load_data()
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
    embed1.add_field(name="🔴 En vocal maintenant", value=f"**{en_vocal_now}**", inline=True)
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
    embed2.set_footer(text=f"Brams Score • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    await interaction.followup.send(
        embeds=[embed1, embed2],
        file=discord.File(graph_buf, "peaks.png")
    )


@bot.tree.command(name="tout", description="Tout voir : tes stats + serveur + classement")
async def tout(interaction: discord.Interaction):
    await interaction.response.defer()
    data = load_data()
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
    live_indicator = " 🔴 *EN VOCAL*" if jt else ""

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
        color=discord.Color.from_rgb(185, 22, 22)
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
    embed3.set_footer(text=f"Brams Score • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    await interaction.followup.send(
        embeds=[embed1, embed2, embed3],
        file=discord.File(graph_buf, "graph.png")
    )


@bot.tree.command(name="chercher", description="Voir toutes les stats d'un membre")
@app_commands.describe(membre="Le membre à inspecter")
async def chercher(interaction: discord.Interaction, membre: discord.Member):
    await interaction.response.defer()
    data = load_data()
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
    prime_val = calculate_prime(hours_tot, m_tot)
    next_thresh, next_rank = get_next_rank(hours_7d)
    live_indicator = " 🔴 *EN VOCAL*" if jt else ""

    if next_rank:
        bar = make_progress_bar(hours_7d, next_thresh)
        progress_str = f"`{bar}` {hours_7d:.1f}h / {next_thresh}h\nProchain : **{next_rank}**"
    else:
        progress_str = "`▰▰▰▰▰▰▰▰▰▰` 👑 **Rang maximum !**"

    embed = discord.Embed(
        title=f"🔍 {membre.display_name.upper()}{live_indicator}",
        color=discord.Color.from_rgb(212, 175, 55)
    )
    embed.set_thumbnail(url=membre.display_avatar.url)

    embed.add_field(
        name=f"{r_emoji} Rang — **{rank_actuel}**",
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
    embed.set_footer(text=f"Brams Score • {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC")

    await interaction.followup.send(embed=embed, file=discord.File(graph_buf, "graph.png"))


# @bot.tree.command(name="prime", description="Génère une vraie fiche WANTED One Piece")
# @app_commands.describe(membre="Le membre à mettre sur la fiche wanted")
# async def wanted(interaction: discord.Interaction, membre: discord.Member = None):
#     if membre is None:
#         membre = interaction.user
#     await interaction.response.defer()
#     data = load_data()
#     uid = str(membre.id)
#     user = get_user(data, uid)
#     s7d  = seconds_in_period(user["vocal_sessions"], 7)
#     s14d = seconds_in_period(user["vocal_sessions"], 14)
#     m7d  = messages_in_period(user["messages"], 7)
#     m14d = messages_in_period(user["messages"], 14)
#     s_total = total_seconds(user["vocal_sessions"])
#     m_total = total_messages(user["messages"])
#     hours_7d  = s7d / 3600
#     hours_total = s_total / 3600
#     bounty    = calculate_prime(hours_total, m_total)
#     rank_actuel = get_rank_for_hours(hours_7d) or "Sans rang"
#     next_thresh, next_rank = get_next_rank(hours_7d)
#     next_str = f"{next_rank} ({next_thresh - hours_7d:.1f}h)" if next_rank else "MAX"
#     img_buf = await generate_wanted_image(
#         membre        = membre,
#         bounty_str    = format_prime(bounty),
#         rank          = rank_actuel,
#         vocal_7d      = format_duration(s7d),
#         vocal_14d     = format_duration(s14d),
#         msg_7d        = str(m7d),
#         msg_14d       = str(m14d),
#         next_rank_str = next_str,
#     )
#     await interaction.followup.send(file=discord.File(img_buf, filename="wanted.png"))


CITATION_HISTORY = []

@bot.tree.command(name="citation", description="Affiche une citation One Piece")
@app_commands.describe(perso="Nom du personnage (optionnel, sinon aléatoire)")
async def citation(interaction: discord.Interaction, perso: str = None):
    await interaction.response.defer()

    if perso:
        matches = [c for c in CITATIONS if perso.lower() in c["nom"].lower()]
        if not matches:
            noms = list(set(c["nom"] for c in CITATIONS))
            await interaction.followup.send(
                f"Personnage introuvable. Dispo : {', '.join(sorted(noms))}"
            )
            return
        available = [c for c in matches if c["citation"] not in CITATION_HISTORY]
        if not available:
            CITATION_HISTORY.clear()
            available = matches
        data = random.choice(available)
    else:
        available = [c for c in CITATIONS if c["citation"] not in CITATION_HISTORY]
        if not available:
            CITATION_HISTORY.clear()
            available = list(CITATIONS)
        data = random.choice(available)
    CITATION_HISTORY.append(data["citation"])

    embed = discord.Embed(
        description=f'> *" {data["citation"]} "*',
        color=data["couleur"]
    )
    embed.set_author(name=f'{data["emoji"]}  {data["nom"].upper()}')
    embed.set_footer(text="ONE PIECE • Brams Score")

    img_bytes = await get_char_image(data["nom"])
    if img_bytes:
        file = discord.File(io.BytesIO(img_bytes), filename="char.jpg")
        embed.set_thumbnail(url="attachment://char.jpg")
        await interaction.followup.send(embed=embed, file=file)
    else:
        await interaction.followup.send(embed=embed)


@bot.tree.command(name="addheures", description="[ADMIN] Ajouter des heures vocales à un membre")
@app_commands.checks.has_permissions(administrator=True)
async def addheures(interaction: discord.Interaction, membre: discord.Member, heures: float):
    data = load_data()
    uid = str(membre.id)
    user = get_user(data, uid)
    now = now_ts()
    user["vocal_sessions"].append({"start": now - heures * 3600, "end": now, "channel": None})
    clean_old_data(user)
    save_user(uid, user)
    seconds_7d = seconds_in_period(user["vocal_sessions"], 7)
    hours_7d = seconds_7d / 3600
    await update_rank(membre, hours_7d)
    await interaction.response.send_message(
        f"✅ +{heures}h ajoutées à {membre.mention} → {hours_7d:.1f}h sur 7j", ephemeral=True
    )


@bot.tree.command(name="forcerank", description="[ADMIN] Recalculer le rank d'un membre")
@app_commands.checks.has_permissions(administrator=True)
async def forcerank(interaction: discord.Interaction, membre: discord.Member):
    data = load_data()
    uid = str(membre.id)
    user = get_user(data, uid)
    seconds_7d = seconds_in_period(user.get("vocal_sessions", []), 7)
    hours_7d = seconds_7d / 3600
    await update_rank(membre, hours_7d)
    await interaction.response.send_message(
        f"✅ Rank recalculé pour {membre.mention} ({hours_7d:.1f}h/7j)", ephemeral=True
    )

@bot.tree.command(name="testrank", description="[ADMIN] Tester l'image d'annonce de rank")
@app_commands.checks.has_permissions(administrator=True)
@app_commands.describe(rang="Rang a tester")
@app_commands.choices(rang=[
    app_commands.Choice(name="Pirate", value="Pirate"),
    app_commands.Choice(name="Shichibukai", value="Shichibukai"),
    app_commands.Choice(name="Amiral", value="Amiral"),
    app_commands.Choice(name="Yonkou", value="Yonkou"),
])
async def testrank(interaction: discord.Interaction, membre: discord.Member = None, rang: str = "Shichibukai"):
    await interaction.response.defer(ephemeral=True)
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
        "Amiral": "<:Winner:997169279336206398>",
        "Yonkou": "⚜️",
    }
    emoji = rank_emojis.get(rang, "")
    await channel.send(
        content=f"Bravo à {target.mention} qui a débloqué le rank **{rang}** {emoji}",
        file=discord.File(img_buf, fname)
    )
    await interaction.followup.send(f"✅ Annonce envoyée pour {target.mention} ({rang})", ephemeral=True)

@bot.tree.command(name="recalcul", description="[ADMIN] Recalculer les ranks (tous ou un membre)")
@app_commands.checks.has_permissions(administrator=True)
async def recalcul(interaction: discord.Interaction, membre: discord.Member = None):
    await interaction.response.defer(ephemeral=True)
    data = load_data()
    if membre:
        uid = str(membre.id)
        user = get_user(data, uid)
        seconds_7d = seconds_in_period(user.get("vocal_sessions", []), 7)
        hours_7d = seconds_7d / 3600
        await update_rank(membre, hours_7d, announce=False)
        await interaction.followup.send(f"✅ Rank recalculé pour {membre.mention} ({hours_7d:.1f}h/7j)", ephemeral=True)
    else:
        guild = interaction.guild
        count = 0
        for m in guild.members:
            if m.bot:
                continue
            uid = str(m.id)
            user = get_user(data, uid)
            seconds_7d = seconds_in_period(user.get("vocal_sessions", []), 7)
            hours_7d = seconds_7d / 3600
            await update_rank(m, hours_7d, announce=False)
            count += 1
            await asyncio.sleep(0.5)
        await interaction.followup.send(f"✅ Ranks recalculés pour {count} membres.", ephemeral=True)

@bot.tree.command(name="exportheures", description="[ADMIN] Exporter les ID et heures vocales de tous les membres")
@app_commands.checks.has_permissions(administrator=True)
async def exportheures(interaction: discord.Interaction):
    await interaction.response.defer(ephemeral=True)
    data = load_data()
    guild = interaction.guild
    lines = ["# ID_DISCORD (NOM) HEURES"]
    for member in guild.members:
        if member.bot:
            continue
        if len(member.roles) <= 1:
            continue
        uid = str(member.id)
        udata = data.get(uid, {})
        ujt = udata.get("join_time")
        s_tot = total_seconds(udata.get("vocal_sessions", []), join_time=ujt)
        h_tot = s_tot / 3600
        lines.append(f"{uid} ({member.display_name}) {h_tot:.1f}")
    content = "\n".join(lines)
    buf = io.BytesIO(content.encode("utf-8"))
    buf.seek(0)
    await interaction.followup.send(
        f"📋 **{len(lines) - 1}** membres exportés",
        file=discord.File(buf, filename="heures_export.txt"),
        ephemeral=True
    )

@bot.tree.command(name="importheures", description="[ADMIN] Importer des heures vocales en masse via fichier .txt")
@app_commands.checks.has_permissions(administrator=True)
@app_commands.describe(fichier="Fichier .txt avec une ligne par membre : ID_DISCORD HEURES")
async def importheures(interaction: discord.Interaction, fichier: discord.Attachment):
    await interaction.response.defer(ephemeral=True)

    if not fichier.filename.endswith((".txt", ".csv")):
        await interaction.followup.send("Le fichier doit être un `.txt` ou `.csv`.", ephemeral=True)
        return

    content = (await fichier.read()).decode("utf-8", errors="ignore")
    lines = [l.strip() for l in content.strip().splitlines() if l.strip() and not l.strip().startswith("#")]

    data = load_data()
    guild = interaction.guild
    imported = 0
    errors = []

    for line in lines:
        parts = line.replace(",", " ").replace(";", " ").replace("\t", " ").split()
        if len(parts) < 2:
            errors.append(f"❌ `{line}` — format invalide")
            continue

        raw_id = parts[0].strip("<@!>")
        try:
            uid = str(int(raw_id))
        except ValueError:
            errors.append(f"❌ `{line}` — ID invalide")
            continue

        try:
            heures = float(parts[1].replace("h", "").replace(",", "."))
        except ValueError:
            errors.append(f"❌ `{line}` — heures invalides")
            continue

        if heures <= 0:
            continue

        user = get_user(data, uid)
        now = now_ts()
        user["vocal_sessions"].append({"start": now - heures * 3600, "end": now, "channel": None})
        imported += 1

        member = guild.get_member(int(uid))
        if member:
            seconds_7d = seconds_in_period(user["vocal_sessions"], 7)
            hours_7d = seconds_7d / 3600
            await update_rank(member, hours_7d, announce=False)
            await asyncio.sleep(0.3)

    save_data(data)

    result = f"✅ **{imported}** membres importés avec succès !"
    if errors:
        result += f"\n\n⚠️ **{len(errors)} erreurs :**\n" + "\n".join(errors[:10])
        if len(errors) > 10:
            result += f"\n... et {len(errors) - 10} autres"

    await interaction.followup.send(result, ephemeral=True)

@bot.tree.command(name="bonjour", description="Un salut dans 20 langues avec style !")
async def bonjour(interaction: discord.Interaction):
    await interaction.response.defer()
    saluts = [
        ("Francais", "Bonjour"),
        ("Anglais", "Hello"),
        ("Espagnol", "Hola"),
        ("Japonais", "Konnichiwa"),
        ("Arabe", "Salam"),
        ("Portugais", "Ola"),
        ("Allemand", "Hallo"),
        ("Italien", "Ciao"),
        ("Russe", "Privet"),
        ("Chinois", "Ni hao"),
        ("Coreen", "Annyeong"),
        ("Turc", "Merhaba"),
        ("Hindi", "Namaste"),
        ("Neerlandais", "Hallo"),
        ("Suedois", "Hej"),
        ("Polonais", "Czesc"),
        ("Grec", "Geia sou"),
        ("Roumain", "Salut"),
        ("Swahili", "Jambo"),
        ("Hebreu", "Shalom"),
    ]
    width, height = 750, 540
    img = Image.new("RGB", (width, height), (24, 24, 32))
    draw = ImageDraw.Draw(img)
    try:
        title_font = ImageFont.truetype(GRAPH_FONT_PATH, 32)
        lang_font = ImageFont.truetype(GRAPH_FONT_PATH, 16)
        word_font = ImageFont.truetype(GRAPH_FONT_PATH, 18)
    except:
        title_font = ImageFont.load_default()
        lang_font = ImageFont.load_default()
        word_font = ImageFont.load_default()
    title_text = "Salut le Monde"
    bbox = draw.textbbox((0, 0), title_text, font=title_font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, 22), title_text, font=title_font, fill=(255, 255, 255))
    draw.line([(60, 65), (width - 60, 65)], fill=(60, 60, 80), width=1)
    col1_x = 55
    col2_x = width // 2 + 15
    start_y = 85
    row_h = 40
    for i, (langue, mot) in enumerate(saluts):
        col = 0 if i < 10 else 1
        row = i if i < 10 else i - 10
        x = col1_x if col == 0 else col2_x
        y = start_y + row * row_h
        draw.rounded_rectangle([(x, y), (x + 320, y + 32)], radius=6, fill=(34, 34, 46), outline=(50, 50, 65))
        draw.text((x + 12, y + 7), langue, font=lang_font, fill=(140, 140, 170))
        draw.text((x + 150, y + 6), mot, font=word_font, fill=(255, 255, 255))
    draw.line([(60, height - 40), (width - 60, height - 40)], fill=(60, 60, 80), width=1)
    footer = f"{interaction.user.display_name}"
    bbox2 = draw.textbbox((0, 0), footer, font=lang_font)
    fw = bbox2[2] - bbox2[0]
    draw.text(((width - fw) // 2, height - 30), footer, font=lang_font, fill=(100, 100, 130))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    await interaction.followup.send(file=discord.File(buf, filename="bonjour.png"))

bot.run(TOKEN)
