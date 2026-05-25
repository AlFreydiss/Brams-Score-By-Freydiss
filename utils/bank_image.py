"""
Génération du carnet bancaire Freydiss Bank — style parchemin One Piece.
Toutes les fonctions sont synchrones (à appeler dans un executor).
"""
from __future__ import annotations

import io
import math
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont, ImageFilter

_BASE = Path(__file__).parent.parent

# ── Couleurs ──────────────────────────────────────────────────────
_BG         = (244, 236, 216)   # parchemin crème
_HEADER_BG  = (27,  42,  70)   # bleu marine profond
_GOLD       = (220, 180,  40)   # or antique
_GOLD_LIGHT = (255, 215,   0)
_DARK       = ( 30,  20,  10)   # texte foncé
_NAVY       = ( 27,  42,  70)
_SEPARATOR  = (180, 150,  90)   # ligne de séparation dorée
_SEAL_DARK  = (160,  20,  20)   # cire rouge foncé
_SEAL_LIGHT = (200,  40,  40)


def _font(name: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(_BASE / name), size)
    except OSError:
        try:
            return ImageFont.truetype("arial.ttf", size)
        except OSError:
            return ImageFont.load_default()


def _circle_avatar(avatar_bytes: bytes, diameter: int) -> Image.Image:
    """Découpe l'avatar en cercle avec bordure dorée."""
    img  = Image.open(io.BytesIO(avatar_bytes)).convert("RGBA").resize((diameter, diameter))
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    out  = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    out.paste(img, mask=mask)

    # bordure dorée
    ring = Image.new("RGBA", (diameter + 8, diameter + 8), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse((0, 0, diameter + 7, diameter + 7), outline=_GOLD_LIGHT, width=4)
    ring.paste(out, (4, 4), out)
    return ring


def _draw_seal(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    """Dessine un sceau de cire rouge avec ฿ en or."""
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=_SEAL_DARK)
    draw.ellipse((cx - r + 4, cy - r + 4, cx + r - 4, cy + r - 4), fill=_SEAL_LIGHT)
    f = _font("PirataOne-Regular.ttf", r)
    draw.text((cx, cy), "฿", font=f, fill=_GOLD_LIGHT, anchor="mm")


def _draw_parchment_texture(draw: ImageDraw.ImageDraw, w: int, h: int) -> None:
    """Lignes subtiles pour simuler la texture parchemin."""
    for y in range(0, h, 18):
        alpha = 12 if y % 36 == 0 else 6
        color = (160, 130, 80, alpha)
        draw.line([(0, y), (w, y)], fill=(180, 150, 90), width=1)


def generate_bank_card(
    name:          str,
    avatar_bytes:  Optional[bytes],
    wallet:        int,
    vault:         int,
    rank:          dict,
    position:      int,
    total_members: int,
    streak:        int = 0,
) -> bytes:
    """
    Génère une image PNG du carnet bancaire.
    Retourne les bytes PNG.
    """
    W, H = 900, 340

    # ── Fond parchemin ────────────────────────────────────────────
    img  = Image.new("RGB", (W, H), _BG)
    draw = ImageDraw.Draw(img)

    # texture lignes légères
    for y in range(60, H - 30, 16):
        draw.line([(0, y), (W, y)], fill=(190, 160, 100), width=1)

    # vignette (bords légèrement plus sombres)
    for i in range(20):
        alpha = int(40 * (1 - i / 20))
        c     = (160, 130, 80)
        draw.rectangle([(i, i), (W - i - 1, H - i - 1)], outline=c + (alpha,) if False else c)

    # ── Header bleu marine ────────────────────────────────────────
    draw.rectangle([(0, 0), (W, 62)], fill=_HEADER_BG)
    f_title = _font("PirataOne-Regular.ttf", 36)
    draw.text((W // 2, 31), "⚓  FREYDISS BANK  ⚓", font=f_title, fill=_GOLD_LIGHT, anchor="mm")

    # ── Footer ────────────────────────────────────────────────────
    draw.rectangle([(0, H - 32), (W, H)], fill=_HEADER_BG)
    f_foot = _font("Righteous-Regular.ttf", 14)
    total_str = f"{wallet + vault:,}".replace(",", " ")
    draw.text((16, H - 16), f"Total : {total_str} ฿", font=f_foot, fill=_GOLD, anchor="lm")
    draw.text((W - 16, H - 16), "Freydiss Bank © One Piece", font=f_foot, fill=_GOLD, anchor="rm")

    # ── Panneau gauche : avatar + nom ────────────────────────────
    left_w = 240
    draw.rectangle([(0, 62), (left_w, H - 32)], fill=(235, 225, 200))
    draw.line([(left_w, 62), (left_w, H - 32)], fill=_SEPARATOR, width=2)

    if avatar_bytes:
        try:
            av = _circle_avatar(avatar_bytes, 130)
            ax = (left_w - av.width) // 2
            img.paste(av, (ax, 80), av)
        except Exception:
            pass
    else:
        draw.ellipse((55, 80, 185, 210), fill=_NAVY, outline=_GOLD_LIGHT, width=3)
        draw.text((left_w // 2, 145), "?", font=_font("PirataOne-Regular.ttf", 60),
                  fill=_GOLD_LIGHT, anchor="mm")

    f_name = _font("PirataOne-Regular.ttf", 22)
    draw.text((left_w // 2, 228), name[:18], font=f_name, fill=_NAVY, anchor="mm")

    # rang sous le nom
    rank_str = f"{rank['emoji']} {rank['nom']}"
    f_rank   = _font("Righteous-Regular.ttf", 15)
    draw.text((left_w // 2, 252), rank_str, font=f_rank, fill=_GOLD, anchor="mm")

    # streak
    if streak >= 2:
        draw.text((left_w // 2, 272), f"🔗 Streak {streak}j", font=f_rank, fill=_SEAL_LIGHT, anchor="mm")

    # ── Panneau droit : infos financières ────────────────────────
    rx   = left_w + 20
    f_lbl = _font("Righteous-Regular.ttf", 17)
    f_val = _font("BebasNeue-Regular.ttf", 26)

    def berries(n: int) -> str:
        return f"{n:,}".replace(",", " ") + " ฿"

    clr_wallet = (30, 80, 160)
    clr_vault  = (100, 60, 20)
    clr_rank   = (80, 80, 80)
    rows = [
        ("💰  Poche",      berries(wallet),                  clr_wallet),
        ("🔒  Coffre",     berries(vault),                   clr_vault),
        ("📊  Classement", f"#{position} / {total_members}", clr_rank),
    ]

    y = 90
    for label, value, color in rows:
        draw.text((rx, y), label, font=f_lbl, fill=_DARK)
        y += 22
        draw.line([(rx, y), (W - 20, y)], fill=_SEPARATOR, width=1)
        y += 4
        draw.text((rx, y), value, font=f_val, fill=color)
        y += 38

    # ── Sceau de cire ─────────────────────────────────────────────
    _draw_seal(draw, W - 60, H - 80, 42)

    # ── Cadre extérieur ───────────────────────────────────────────
    draw.rectangle([(2, 2), (W - 3, H - 3)], outline=_GOLD, width=2)
    draw.rectangle([(6, 6), (W - 7, H - 7)], outline=_SEPARATOR, width=1)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
