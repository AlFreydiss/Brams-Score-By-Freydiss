import asyncio
import hashlib
import io
import ipaddress
import re
import time
import urllib.parse
from pathlib import Path
from typing import Optional

import aiohttp
import discord
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageSequence

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

BANNER_W, BANNER_H   = 1100, 350
BANNER_TEXT_ZONE_END = 700
BANNER_CHAR_START    = 680
BANNER_FADE_PX       = 200
BG_DIM_ALPHA         = 140    # voile noir sur le GIF de fond (0-255)
MAX_FRAMES           = 40     # nombre max de frames en sortie GIF

# Palette — dégradé 3 stops : noir → bordeaux → or sombre
BG_LEFT  = (10,  10,  10)   # #0a0a0a
BG_MID   = (61,  26,  26)   # #3d1a1a
BG_RIGHT = (107, 79,  29)   # #6b4f1d

C_GOLD  = (244, 197,  66)   # #f4c542
C_CREAM = (232, 220, 200)   # blanc cassé

# Cache des images distantes (24 h)
CACHE_DIR = ROOT_DIR / "cache" / "characters"
CACHE_TTL = 86400

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
    return f"{amount:,}".replace(",", " ") + " ฿"


_RE_EMOJI = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U00002300-\U000027BF"
    "\U0000200D"
    "\U0000FE0F"
    "]+",
    flags=re.UNICODE,
)


def _strip_emoji(text: str) -> str:
    return _RE_EMOJI.sub("", text).strip()


def _lerp3(v0: int, v1: int, v2: int, t: np.ndarray) -> np.ndarray:
    t1    = np.clip(t * 2.0, 0.0, 1.0)
    t2    = np.clip(t * 2.0 - 1.0, 0.0, 1.0)
    left  = v0 + t1 * (v1 - v0)
    right = v1 + t2 * (v2 - v1)
    return np.clip(np.where(t <= 0.5, left, right), 0, 255).astype(np.uint8)


def _is_safe_url(url: str) -> bool:
    """Refuse localhost, IPs privées/link-local, schemes non-http(s)."""
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        try:
            addr = ipaddress.ip_address(hostname)
            if addr.is_private or addr.is_loopback or addr.is_link_local:
                return False
        except ValueError:
            pass  # hostname textuel — OK
        return True
    except Exception:
        return False


def _cover_crop(img: Image.Image, w: int, h: int) -> Image.Image:
    """Redimensionne en cover (remplit w×h) et recadre au centre."""
    img_w, img_h = img.size
    scale = max(w / img_w, h / img_h)
    nw    = max(1, int(img_w * scale))
    nh    = max(1, int(img_h * scale))
    img   = img.resize((nw, nh), Image.LANCZOS)
    x     = (nw - w) // 2
    y     = (nh - h) // 2
    return img.crop((x, y, x + w, y + h))


# ── Couche avant partagée (texte + déco + personnage) ────────────────────────

def _build_foreground(
    user_name: str,
    rang_label: str,
    fortune: int,
    char_bytes: Optional[bytes],
    prog_ratio: float,
    prog_next: str,
) -> Image.Image:
    """Construit la couche RGBA transparente : personnage, texte, décorations."""
    W, H   = BANNER_W, BANNER_H
    margin = 45
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

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

    # Pièces de berry décoratives en transparence
    for cx, cy, cr in [(55, 305, 28), (175, 22, 20), (635, 320, 16),
                       (690, 40, 14), (355, 332, 11), (495, 12, 13)]:
        draw.ellipse([cx-cr, cy-cr, cx+cr, cy+cr],
                     outline=(244, 197, 66, 28), width=2)
        if cr > 12:
            draw.ellipse([cx-cr+6, cy-cr+6, cx+cr-6, cy+cr-6],
                         outline=(244, 197, 66, 16), width=1)

    # Séparateur vertical subtil
    draw.line(
        [(BANNER_TEXT_ZONE_END, 20), (BANNER_TEXT_ZONE_END, H - 20)],
        fill=(244, 197, 66, 30), width=1,
    )

    # Étiquette "FREYDISS BANK"
    f_sub = _font("BebasNeue-Regular.ttf", 20)
    draw.text((margin, 20), "FREYDISS BANK", font=f_sub, fill=(*C_GOLD, 145))

    # Nom du joueur
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

    # Rang
    rang_clean = _strip_emoji(rang_label)
    f_rang     = _font("Righteous-Regular.ttf", 26)
    draw.text((margin, 128), rang_clean, font=f_rang, fill=C_CREAM)

    # Label fortune
    f_flabel = _font("Righteous-Regular.ttf", 18)
    draw.text((margin, 192), "— Fortune Totale —", font=f_flabel, fill=(*C_GOLD, 165))

    # Montant
    f_fortune = _font("BebasNeue-Regular.ttf", 50)
    draw.text((margin, 212), _fmt_fortune(fortune), font=f_fortune, fill=C_GOLD)

    # Barre de progression
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

    # Liseré doré double
    draw.rectangle([0, 0, W - 1, H - 1], outline=(*C_GOLD, 185), width=2)
    draw.rectangle([5, 5, W - 6, H - 6], outline=(*C_GOLD, 45),  width=1)

    return canvas


# ── Composition synchrone PNG (run_in_executor) ───────────────────────────────

def _build_banque_banner_sync(
    user_name: str,
    rang_label: str,
    fortune: int,
    char_bytes: Optional[bytes],
    prog_ratio: float = 0.0,
    prog_next: str = "",
) -> bytes:
    W, H = BANNER_W, BANNER_H
    xs  = np.linspace(0.0, 1.0, W)
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[:, :, 0] = np.broadcast_to(_lerp3(BG_LEFT[0], BG_MID[0], BG_RIGHT[0], xs), (H, W))
    arr[:, :, 1] = np.broadcast_to(_lerp3(BG_LEFT[1], BG_MID[1], BG_RIGHT[1], xs), (H, W))
    arr[:, :, 2] = np.broadcast_to(_lerp3(BG_LEFT[2], BG_MID[2], BG_RIGHT[2], xs), (H, W))
    arr[:, :, 3] = 255
    background = Image.fromarray(arr, "RGBA")

    fg     = _build_foreground(user_name, rang_label, fortune, char_bytes, prog_ratio, prog_next)
    canvas = Image.alpha_composite(background, fg)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


# ── Composition synchrone GIF animé (run_in_executor) ────────────────────────

def _build_banque_banner_gif_sync(
    user_name: str,
    rang_label: str,
    fortune: int,
    bg_gif_bytes: bytes,
    char_bytes: Optional[bytes],
    prog_ratio: float = 0.0,
    prog_next: str = "",
) -> bytes:
    W, H = BANNER_W, BANNER_H

    bg_img: Image.Image = Image.open(io.BytesIO(bg_gif_bytes))
    frames_raw: list[Image.Image] = []
    durations: list[int] = []
    try:
        for frame in ImageSequence.Iterator(bg_img):
            dur = frame.info.get("duration", 100)
            frames_raw.append(frame.copy().convert("RGBA"))
            durations.append(max(int(dur), 20))
    except Exception:
        pass

    if not frames_raw:
        return _build_banque_banner_sync(user_name, rang_label, fortune, char_bytes, prog_ratio, prog_next)

    # Échantillonnage si trop de frames
    n = len(frames_raw)
    if n > MAX_FRAMES:
        step = n / MAX_FRAMES
        sampled: list[Image.Image] = []
        sampled_dur: list[int] = []
        for i in range(MAX_FRAMES):
            start = int(i * step)
            end   = int((i + 1) * step) if i + 1 < MAX_FRAMES else n
            sampled.append(frames_raw[start])
            sampled_dur.append(sum(durations[start:end]))
        frames_raw, durations = sampled, sampled_dur

    fg  = _build_foreground(user_name, rang_label, fortune, char_bytes, prog_ratio, prog_next)
    dim = Image.new("RGBA", (W, H), (0, 0, 0, BG_DIM_ALPHA))

    output: list[Image.Image] = []
    for frame in frames_raw:
        bg_frame = _cover_crop(frame, W, H)
        bg_frame = Image.alpha_composite(bg_frame, dim)
        composed = Image.alpha_composite(bg_frame, fg)
        output.append(composed.convert("RGB"))

    buf = io.BytesIO()
    output[0].save(
        buf, format="GIF", save_all=True,
        append_images=output[1:],
        duration=durations, loop=0,
        optimize=False,
    )
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
    bg_gif_url: Optional[str] = None,
) -> discord.File:
    """
    Génère la bannière /banque.
    Si bg_gif_url est défini et valide, produit un GIF animé.
    Sinon, produit un PNG statique avec fond dégradé.
    """
    char_bytes: Optional[bytes] = None
    if char_url:
        char_bytes = await _fetch_with_cache(char_url)

    if bg_gif_url and _is_safe_url(bg_gif_url):
        bg_gif_bytes = await _fetch_with_cache(bg_gif_url)
        if bg_gif_bytes:
            loop = asyncio.get_running_loop()
            try:
                gif_data = await asyncio.wait_for(
                    loop.run_in_executor(
                        None,
                        _build_banque_banner_gif_sync,
                        user_name, rang_label, fortune,
                        bg_gif_bytes, char_bytes,
                        prog_ratio, prog_next,
                    ),
                    timeout=25.0,
                )
                return discord.File(io.BytesIO(gif_data), filename="banque.gif")
            except Exception:
                pass  # fallback PNG

    loop = asyncio.get_running_loop()
    png_bytes = await loop.run_in_executor(
        None,
        _build_banque_banner_sync,
        user_name, rang_label, fortune,
        char_bytes, prog_ratio, prog_next,
    )
    return discord.File(io.BytesIO(png_bytes), filename="banner.png")
