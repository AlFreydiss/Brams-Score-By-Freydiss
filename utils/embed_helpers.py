import asyncio
import hashlib
import io
import re
import time
from pathlib import Path
from typing import Optional

import aiohttp
import discord
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT_DIR = Path(__file__).parent.parent

# ══════════════════════════════════════════════════════════════════════════════
# Bannière générique (autres commandes)
# ══════════════════════════════════════════════════════════════════════════════

def get_spacer_file() -> discord.File:
    """PNG transparent 800×1 — force Discord à élargir l'embed au maximum."""
    buf = io.BytesIO()
    Image.new("RGBA", (800, 1), (0, 0, 0, 0)).save(buf, format="PNG")
    buf.seek(0)
    return discord.File(buf, filename="spacer.png")


def _build_banner_sync(char_bytes: Optional[bytes]) -> bytes:
    W, H = 800, 300
    xs  = np.linspace(0.0, 1.0, W)
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[:, :, 0] = np.broadcast_to((15 + xs * 40).astype(np.uint8), (H, W))
    arr[:, :, 1] = np.broadcast_to((10 + xs *  5).astype(np.uint8), (H, W))
    arr[:, :, 2] = np.broadcast_to((45 + xs * 10).astype(np.uint8), (H, W))
    arr[:, :, 3] = 255
    canvas = Image.fromarray(arr, "RGBA")

    if char_bytes:
        try:
            char_img = Image.open(io.BytesIO(char_bytes)).convert("RGBA")
            scale = min(H / char_img.height, 380 / char_img.width)
            nw    = int(char_img.width  * scale)
            nh    = int(char_img.height * scale)
            char_img = char_img.resize((nw, nh), Image.LANCZOS)
            fade_w   = min(180, nw // 2)
            fade_row = np.zeros(nw, dtype=np.uint8)
            fade_row[:fade_w] = np.linspace(0, 255, fade_w, dtype=np.uint8)
            fade_row[fade_w:] = 255
            fade = Image.fromarray(np.broadcast_to(fade_row, (nh, nw)).copy(), "L")
            a_ch = char_img.split()[3]
            char_img.putalpha(ImageChops.multiply(a_ch, fade))
            canvas.paste(char_img, (W - nw, (H - nh) // 2), char_img)
        except Exception:
            pass

    draw = ImageDraw.Draw(canvas)
    draw.line([(0, H - 4), (W, H - 4)], fill=(220, 180, 40, 200), width=3)
    draw.line([(0, 2),     (W, 2)],     fill=(220, 180, 40,  60), width=1)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


async def build_banner(image_url: Optional[str] = None) -> discord.File:
    char_bytes: Optional[bytes] = None
    if image_url:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    image_url, timeout=aiohttp.ClientTimeout(total=8)
                ) as resp:
                    if resp.status == 200:
                        char_bytes = await resp.read()
        except Exception:
            pass

    loop      = asyncio.get_running_loop()
    png_bytes = await loop.run_in_executor(None, _build_banner_sync, char_bytes)
    return discord.File(io.BytesIO(png_bytes), filename="banner.png")


# ══════════════════════════════════════════════════════════════════════════════
# Bannière Banque — constantes tunable en haut pour itérer vite
# ══════════════════════════════════════════════════════════════════════════════

BANNER_W, BANNER_H   = 1100, 350   # dimensions finales
BANNER_TEXT_ZONE_END = 700          # frontière zone texte / personnage (px)
BANNER_CHAR_START    = 680          # overlap léger : le perso commence avant la frontière
BANNER_FADE_PX       = 200          # largeur du fondu gauche du personnage

# Palette — dégradé 3 stops : noir → bordeaux → or sombre
BG_LEFT  = (10,  10,  10)   # #0a0a0a
BG_MID   = (61,  26,  26)   # #3d1a1a
BG_RIGHT = (107, 79,  29)   # #6b4f1d

C_GOLD  = (244, 197,  66)   # #f4c542
C_CREAM = (232, 220, 200)   # blanc cassé

# Cache des images de personnage
CACHE_DIR = ROOT_DIR / "cache" / "characters"
CACHE_TTL = 86400   # secondes — 24 h

# ── Helpers internes ──────────────────────────────────────────────────────────

_font_cache: dict[str, ImageFont.ImageFont] = {}


def _font(name: str, size: int) -> ImageFont.ImageFont:
    key = f"{name}:{size}"
    if key not in _font_cache:
        try:
            _font_cache[key] = ImageFont.truetype(str(ROOT_DIR / name), size)
        except Exception:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


def _fmt_fortune(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " ฿"   # espace fin + ฿


_RE_EMOJI = re.compile(
    "["
    "\U0001F300-\U0001FAFF"   # blocs emoji modernes
    "\U00002300-\U000027BF"   # symboles divers + dingbats (contient ⚓ U+2693)
    "\U0000200D"              # ZWJ
    "\U0000FE0F"              # variation selector-16
    "]+",
    flags=re.UNICODE,
)


def _strip_emoji(text: str) -> str:
    return _RE_EMOJI.sub("", text).strip()


def _lerp3(v0: int, v1: int, v2: int, t: np.ndarray) -> np.ndarray:
    """Interpolation linéaire 3 stops."""
    t1    = np.clip(t * 2.0, 0.0, 1.0)
    t2    = np.clip(t * 2.0 - 1.0, 0.0, 1.0)
    left  = v0 + t1 * (v1 - v0)
    right = v1 + t2 * (v2 - v1)
    return np.clip(np.where(t <= 0.5, left, right), 0, 255).astype(np.uint8)


# ── Composition synchrone (run_in_executor) ───────────────────────────────────

def _build_banque_banner_sync(
    user_name: str,
    rang_label: str,
    fortune: int,
    char_bytes: Optional[bytes],
    prog_ratio: float = 0.0,
    prog_next: str = "",
) -> bytes:
    W, H   = BANNER_W, BANNER_H
    margin = 45

    # ── Fond dégradé 3 stops ─────────────────────────────────────────────────
    xs  = np.linspace(0.0, 1.0, W)
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[:, :, 0] = np.broadcast_to(_lerp3(BG_LEFT[0], BG_MID[0], BG_RIGHT[0], xs), (H, W))
    arr[:, :, 1] = np.broadcast_to(_lerp3(BG_LEFT[1], BG_MID[1], BG_RIGHT[1], xs), (H, W))
    arr[:, :, 2] = np.broadcast_to(_lerp3(BG_LEFT[2], BG_MID[2], BG_RIGHT[2], xs), (H, W))
    arr[:, :, 3] = 255
    canvas = Image.fromarray(arr, "RGBA")

    # ── Personnage côté droit avec fondu vers la gauche ───────────────────────
    if char_bytes:
        try:
            char_img  = Image.open(io.BytesIO(char_bytes)).convert("RGBA")
            char_zone = W - BANNER_CHAR_START
            scale     = min(H / char_img.height, char_zone / char_img.width)
            nw        = int(char_img.width  * scale)
            nh        = int(char_img.height * scale)
            char_img  = char_img.resize((nw, nh), Image.LANCZOS)

            actual_fade              = min(BANNER_FADE_PX, nw // 2)
            fade_row                 = np.zeros(nw, dtype=np.uint8)
            fade_row[:actual_fade]   = np.linspace(0, 255, actual_fade, dtype=np.uint8)
            fade_row[actual_fade:]   = 255
            fade    = Image.fromarray(np.broadcast_to(fade_row, (nh, nw)).copy(), "L")
            a_ch    = char_img.split()[3]
            char_img.putalpha(ImageChops.multiply(a_ch, fade))
            canvas.paste(char_img, (W - nw, (H - nh) // 2), char_img)
        except Exception:
            pass

    draw = ImageDraw.Draw(canvas, "RGBA")

    # ── Pièces de berry en transparence dans le fond ──────────────────────────
    for cx, cy, cr in [(55, 305, 28), (175, 22, 20), (635, 320, 16),
                       (690, 40, 14), (355, 332, 11), (495, 12, 13)]:
        draw.ellipse([cx-cr, cy-cr, cx+cr, cy+cr],
                     outline=(244, 197, 66, 28), width=2)
        if cr > 12:
            draw.ellipse([cx-cr+6, cy-cr+6, cx+cr-6, cy+cr-6],
                         outline=(244, 197, 66, 16), width=1)

    # ── Séparateur vertical subtil ────────────────────────────────────────────
    draw.line(
        [(BANNER_TEXT_ZONE_END, 20), (BANNER_TEXT_ZONE_END, H - 20)],
        fill=(244, 197, 66, 30), width=1,
    )

    # ── Étiquette "FREYDISS BANK" ─────────────────────────────────────────────
    f_sub = _font("BebasNeue-Regular.ttf", 20)
    draw.text((margin, 20), "FREYDISS BANK", font=f_sub, fill=(*C_GOLD, 145))

    # ── Nom du joueur ─────────────────────────────────────────────────────────
    name_clean = _strip_emoji(user_name).upper()[:20]
    f_name     = _font("BebasNeue-Regular.ttf", 58)
    draw.text((margin, 46), name_clean, font=f_name, fill=C_GOLD)

    # Ligne décorative sous le nom
    try:
        bbox     = f_name.getbbox(name_clean)
        line_end = min(margin + (bbox[2] - bbox[0]) + 20, BANNER_TEXT_ZONE_END - 40)
    except Exception:
        line_end = 480
    draw.line([(margin, 118), (line_end, 118)], fill=(*C_GOLD, 105), width=2)

    # ── Rang ──────────────────────────────────────────────────────────────────
    rang_clean = _strip_emoji(rang_label)
    f_rang     = _font("Righteous-Regular.ttf", 26)
    draw.text((margin, 128), rang_clean, font=f_rang, fill=C_CREAM)

    # ── Label fortune ─────────────────────────────────────────────────────────
    f_flabel = _font("Righteous-Regular.ttf", 18)
    draw.text((margin, 192), "— Fortune Totale —", font=f_flabel,
              fill=(*C_GOLD, 165))

    # ── Montant ───────────────────────────────────────────────────────────────
    f_fortune = _font("BebasNeue-Regular.ttf", 50)
    draw.text((margin, 212), _fmt_fortune(fortune), font=f_fortune, fill=C_GOLD)

    # ── Barre de progression (optionnel) ─────────────────────────────────────
    if 0.0 < prog_ratio <= 1.0 and prog_next:
        bx1, by1, bx2, by2 = margin, 293, 620, 307
        draw.rectangle([bx1, by1, bx2, by2], fill=(40, 25, 10, 175))
        fill_x = bx1 + max(4, int((bx2 - bx1) * prog_ratio))
        draw.rectangle([bx1, by1, fill_x, by2], fill=(*C_GOLD, 195))
        draw.rectangle([bx1, by1, bx2, by2], outline=(*C_GOLD, 75), width=1)
        f_prog     = _font("Righteous-Regular.ttf", 14)
        next_clean = _strip_emoji(prog_next)
        draw.text((margin, 312), f"Vers {next_clean}", font=f_prog,
                  fill=(*C_CREAM, 135))

    # ── Liseré doré double ────────────────────────────────────────────────────
    draw.rectangle([0, 0, W - 1, H - 1], outline=(*C_GOLD, 185), width=2)
    draw.rectangle([5, 5, W - 6, H - 6], outline=(*C_GOLD, 45),  width=1)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ── Cache image distante (24 h) ───────────────────────────────────────────────

async def _fetch_with_cache(url: str) -> Optional[bytes]:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    url_hash   = hashlib.md5(url.encode()).hexdigest()
    cache_file = CACHE_DIR / f"{url_hash}.bin"

    if cache_file.exists() and time.time() - cache_file.stat().st_mtime < CACHE_TTL:
        try:
            return cache_file.read_bytes()
        except Exception:
            pass

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    data = await resp.read()
                    try:
                        cache_file.write_bytes(data)
                    except Exception:
                        pass
                    return data
    except Exception:
        pass
    return None


# ── Point d'entrée public ─────────────────────────────────────────────────────

async def build_banque_banner(
    user_name: str,
    rang_label: str,
    fortune: int,
    char_url: Optional[str] = None,
    prog_ratio: float = 0.0,
    prog_next: str = "",
) -> discord.File:
    """
    Génère la bannière thématique One Piece pour /banque.
    char_url  : URL de l'image du personnage (cachée 24 h en local).
    prog_ratio: float 0–1 pour la barre de progression vers le prochain rang.
    prog_next : nom du prochain rang (affiché sous la barre).
    """
    char_bytes: Optional[bytes] = None
    if char_url:
        char_bytes = await _fetch_with_cache(char_url)

    loop      = asyncio.get_running_loop()
    png_bytes = await loop.run_in_executor(
        None,
        _build_banque_banner_sync,
        user_name,
        rang_label,
        fortune,
        char_bytes,
        prog_ratio,
        prog_next,
    )
    return discord.File(io.BytesIO(png_bytes), filename="banner.png")
