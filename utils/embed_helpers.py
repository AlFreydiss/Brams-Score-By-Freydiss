import asyncio
import io
from typing import Optional

import aiohttp
import discord
import numpy as np
from PIL import Image, ImageChops, ImageDraw


def get_spacer_file() -> discord.File:
    """PNG transparent 800×1 — force Discord à élargir l'embed au maximum."""
    buf = io.BytesIO()
    Image.new("RGBA", (800, 1), (0, 0, 0, 0)).save(buf, format="PNG")
    buf.seek(0)
    return discord.File(buf, filename="spacer.png")


def _build_banner_sync(char_bytes: Optional[bytes]) -> bytes:
    """
    Génère un PNG 800×300 :
    - Fond dégradé navy foncé → bordeaux One Piece
    - Image du personnage collée à droite avec fondu gauche si fournie
    - Accents dorés haut/bas
    Synchrone — appelé dans un executor.
    """
    W, H = 800, 300

    # Dégradé horizontal numpy : navy (gauche) → bordeaux sombre (droite)
    xs  = np.linspace(0.0, 1.0, W)
    arr = np.zeros((H, W, 4), dtype=np.uint8)
    arr[:, :, 0] = np.broadcast_to((15 + xs * 40).astype(np.uint8),  (H, W))  # R 15→55
    arr[:, :, 1] = np.broadcast_to((10 + xs *  5).astype(np.uint8),  (H, W))  # G 10→15
    arr[:, :, 2] = np.broadcast_to((45 + xs * 10).astype(np.uint8),  (H, W))  # B 45→55
    arr[:, :, 3] = 255
    canvas = Image.fromarray(arr, "RGBA")

    if char_bytes:
        try:
            char_img = Image.open(io.BytesIO(char_bytes)).convert("RGBA")

            # Redimensionner : hauteur max H, largeur max 380
            scale = min(H / char_img.height, 380 / char_img.width)
            nw    = int(char_img.width  * scale)
            nh    = int(char_img.height * scale)
            char_img = char_img.resize((nw, nh), Image.LANCZOS)

            # Masque de fondu horizontal : transparent à gauche → opaque à droite
            fade_w   = min(180, nw // 2)
            fade_row = np.zeros(nw, dtype=np.uint8)
            fade_row[:fade_w] = np.linspace(0, 255, fade_w, dtype=np.uint8)
            fade_row[fade_w:] = 255
            fade = Image.fromarray(
                np.broadcast_to(fade_row, (nh, nw)).copy(), "L"
            )

            a_ch = char_img.split()[3]
            char_img.putalpha(ImageChops.multiply(a_ch, fade))

            x_pos = W - nw
            y_pos = (H - nh) // 2
            canvas.paste(char_img, (x_pos, y_pos), char_img)
        except Exception:
            pass

    # Accents dorés
    draw = ImageDraw.Draw(canvas)
    draw.line([(0, H - 4), (W, H - 4)], fill=(220, 180, 40, 200), width=3)
    draw.line([(0, 2),     (W, 2)],     fill=(220, 180, 40,  60), width=1)

    buf = io.BytesIO()
    canvas.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


async def build_banner(image_url: Optional[str] = None) -> discord.File:
    """
    Télécharge image_url (aiohttp) si fournie, puis génère la bannière en executor.
    Retourne un discord.File filename='banner.png' prêt à attacher.
    """
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
