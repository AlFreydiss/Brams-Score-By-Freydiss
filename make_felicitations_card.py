"""
make_felicitations_card.py
==========================
Génère une carte de félicitations / badge de rank premium One Piece.

Usage standalone :
    python make_felicitations_card.py "YONKOU"
    python make_felicitations_card.py "ROI DES PIRATES"

Usage depuis bot.py / cog :
    buf = make_felicitations_card("Yonkou")   # → io.BytesIO (PNG)
"""

from __future__ import annotations

import io
import math
import os
import random
import sys
from typing import Optional

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─── Chemins des polices ────────────────────────────────────────
_ROOT = os.path.dirname(os.path.abspath(__file__))

FONT_TITLE  = os.path.join(_ROOT, "Bangers-Regular.ttf")    # FÉLICITATIONS (bold display)
FONT_GRADE  = os.path.join(_ROOT, "KOMIKAX_.ttf")           # NOM DU GRADE  (épais)
FONT_CREDIT = os.path.join(_ROOT, "Righteous-Regular.ttf")  # by Freydiss

# ─── Dimensions ─────────────────────────────────────────────────
CARD_W = 1200
CARD_H = 600

# ─── Labels des rangs ────────────────────────────────────────────
RANK_LABELS: dict[str, str] = {
    "Pirate":          "PIRATE",
    "Shichibukai":     "SHICHIBUKAI",
    "Amiral":          "AMIRAL",
    "Yonkou":          "YONKOU",
    "Roi des pirates": "ROI DES PIRATES",
}

# Gradient couleurs pour chaque rang (liste de stops RGB)
RANK_GRADIENTS: dict[str, list[tuple[int, int, int]]] = {
    "Pirate": [
        (46, 230, 120),
        (80, 255, 160),
        (200, 255, 220),
        (80, 255, 160),
        (46, 230, 120),
    ],
    "Shichibukai": [
        (0, 220, 120),
        (50, 255, 180),
        (200, 255, 230),
        (50, 255, 180),
        (0, 220, 120),
    ],
    "Amiral": [
        (255, 180, 0),
        (255, 220, 60),
        (255, 255, 180),
        (255, 220, 60),
        (255, 180, 0),
    ],
    "Yonkou": [
        (160, 60, 255),
        (200, 100, 255),
        (240, 180, 255),
        (200, 100, 255),
        (160, 60, 255),
    ],
    "Roi des pirates": [
        (0, 200, 255),
        (100, 80, 255),
        (220, 60, 200),
        (255, 160, 0),
        (255, 240, 120),
        (255, 255, 255),
        (255, 240, 120),
        (255, 160, 0),
        (220, 60, 200),
        (100, 80, 255),
        (0, 200, 255),
    ],
}

# Couleur du halo/glow du grade par rang
RANK_GLOW: dict[str, tuple[int, int, int]] = {
    "Pirate":          (46,  230, 120),
    "Shichibukai":     (0,   220, 120),
    "Amiral":          (255, 200,  30),
    "Yonkou":          (180,  80, 255),
    "Roi des pirates": (100, 200, 255),
}

# ─── Helpers ─────────────────────────────────────────────────────

def _lerp_color(
    c1: tuple[int, int, int],
    c2: tuple[int, int, int],
    t: float,
) -> tuple[int, int, int]:
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def _gradient_h(
    width: int,
    height: int,
    stops: list[tuple[int, int, int]],
) -> Image.Image:
    """Génère une image RGBA avec un dégradé horizontal multi-stops."""
    img = Image.new("RGBA", (width, height))
    px  = img.load()
    n   = len(stops) - 1
    for x in range(width):
        t_global = x / max(width - 1, 1)
        seg      = min(int(t_global * n), n - 1)
        t_local  = t_global * n - seg
        c = _lerp_color(stops[seg], stops[seg + 1], t_local)
        for y in range(height):
            px[x, y] = (*c, 255)
    return img


def _load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def _text_bbox(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int, int, int]:
    """Retourne (x0, y0, x1, y1) de la bounding box du texte."""
    bb = draw.textbbox((0, 0), text, font=font)
    return bb


def _text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int]:
    bb = _text_bbox(draw, text, font)
    return bb[2] - bb[0], bb[3] - bb[1]


# ─── Couches graphiques ──────────────────────────────────────────

def _draw_background(img: Image.Image) -> None:
    """Fond sombre avec dégradé radial légèrement bleuté au centre."""
    draw = ImageDraw.Draw(img)
    cx, cy = CARD_W // 2, CARD_H // 2

    # Fond de base très sombre
    img.paste((8, 8, 16), [0, 0, CARD_W, CARD_H])

    # Halo central bleu-nuit (radial simulé par des ellipses concentriques)
    for r in range(300, 0, -4):
        alpha = int(18 * (1 - r / 300) ** 1.6)
        color = (20 + int(r * 0.08), 25 + int(r * 0.05), 60 + int(r * 0.1), alpha)
        draw.ellipse(
            [cx - r * 2, cy - r, cx + r * 2, cy + r],
            fill=color,
        )


def _draw_particles(img: Image.Image, seed: int = 42) -> None:
    """Particules dorées et blanches légères en arrière-plan."""
    rng   = random.Random(seed)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)

    # Petites particules dorées
    for _ in range(120):
        x  = rng.randint(0, CARD_W)
        y  = rng.randint(0, CARD_H)
        r  = rng.uniform(0.5, 2.5)
        a  = rng.randint(40, 160)
        br = int(rng.uniform(180, 255))
        g  = int(rng.uniform(140, 210))
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(br, g, 30, a))

    # Quelques étincelles blanches plus visibles
    for _ in range(30):
        x  = rng.randint(0, CARD_W)
        y  = rng.randint(0, CARD_H)
        r  = rng.uniform(1, 3.5)
        a  = rng.randint(60, 180)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))

    # Lignes de lumière subtiles
    for _ in range(8):
        x1 = rng.randint(0, CARD_W)
        y1 = rng.randint(0, CARD_H)
        length = rng.randint(30, 120)
        angle  = rng.uniform(0, math.pi * 2)
        x2 = int(x1 + math.cos(angle) * length)
        y2 = int(y1 + math.sin(angle) * length)
        a  = rng.randint(15, 50)
        draw.line([x1, y1, x2, y2], fill=(212, 175, 55, a), width=1)

    img.alpha_composite(layer)


def _draw_neon_border(img: Image.Image) -> None:
    """Cadre néon fin avec coins arrondis, lueur externe dorée subtile."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)
    margin = 14
    radius = 22

    # Halo externe (plusieurs passes pour le glow)
    for offset, alpha in [(8, 20), (5, 40), (3, 60), (1, 90)]:
        draw.rounded_rectangle(
            [margin - offset, margin - offset,
             CARD_W - margin + offset, CARD_H - margin + offset],
            radius=radius + offset,
            outline=(212, 175, 55, alpha),
            width=2,
        )

    # Trait principal doré
    draw.rounded_rectangle(
        [margin, margin, CARD_W - margin, CARD_H - margin],
        radius=radius,
        outline=(212, 175, 55, 200),
        width=2,
    )

    # Trait intérieur blanc très transparent
    draw.rounded_rectangle(
        [margin + 5, margin + 5, CARD_W - margin - 5, CARD_H - margin - 5],
        radius=radius - 4,
        outline=(255, 255, 255, 25),
        width=1,
    )

    blurred = layer.filter(ImageFilter.GaussianBlur(radius=3))
    img.alpha_composite(blurred)
    img.alpha_composite(layer)


def _draw_corner_ornaments(img: Image.Image) -> None:
    """Petits ornements géométriques dans les coins."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)
    gold  = (212, 175, 55, 180)
    size  = 28
    gap   = 22

    corners = [
        (gap, gap),
        (CARD_W - gap, gap),
        (gap, CARD_H - gap),
        (CARD_W - gap, CARD_H - gap),
    ]
    for cx, cy in corners:
        # Petit losange
        pts = [
            (cx, cy - size // 2),
            (cx + size // 2, cy),
            (cx, cy + size // 2),
            (cx - size // 2, cy),
        ]
        draw.polygon(pts, outline=gold, fill=(212, 175, 55, 40))

    img.alpha_composite(layer)


def _draw_glow_text(
    base: Image.Image,
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    font: ImageFont.FreeTypeFont,
    glow_color: tuple[int, int, int],
    glow_radius: int = 18,
    glow_passes: int = 5,
) -> None:
    """Dessine un texte avec halo lumineux (glow) autour."""
    for i in range(glow_passes, 0, -1):
        radius = glow_radius * i // glow_passes
        alpha  = int(80 / i)
        glow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow_layer)
        gd.text((x, y), text, font=font, fill=(*glow_color, alpha), anchor="mm")
        blurred = glow_layer.filter(ImageFilter.GaussianBlur(radius=radius))
        base.alpha_composite(blurred)


def _draw_gradient_text(
    base: Image.Image,
    text: str,
    cx: int,
    cy: int,
    font: ImageFont.FreeTypeFont,
    stops: list[tuple[int, int, int]],
    glow_color: tuple[int, int, int],
) -> None:
    """
    Dessine le nom du grade avec dégradé horizontal arc-en-ciel métallique.
    Technique : masque alpha du texte appliqué sur une image gradient.
    """
    dummy_draw = ImageDraw.Draw(base)
    tw, th = _text_size(dummy_draw, text, font)
    bb = dummy_draw.textbbox((cx, cy), text, font=font, anchor="mm")
    tx0, ty0, tx1, ty1 = bb

    # Génère le dégradé aux dimensions du texte
    grad = _gradient_h(tw + 60, th + 40, stops)

    # Masque alpha = forme du texte
    mask = Image.new("RGBA", (tw + 60, th + 40), (0, 0, 0, 0))
    md   = ImageDraw.Draw(mask)

    # Reflet 3D simulé : version légèrement décalée plus sombre (ombre)
    md.text(
        (30 + 4, 20 + 5),
        text,
        font=font,
        fill=(0, 0, 0, 120),
        anchor="lt",
    )
    md.text((30, 20), text, font=font, fill=(255, 255, 255, 255), anchor="lt")

    # Applique le gradient sur le masque
    grad_masked = Image.new("RGBA", grad.size, (0, 0, 0, 0))
    grad_masked.paste(grad, (0, 0))
    grad_masked.putalpha(mask.split()[3])

    # Glow coloré autour du texte
    glow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    for radius, alpha in [(30, 40), (20, 60), (12, 90), (6, 130)]:
        tmp = Image.new("RGBA", base.size, (0, 0, 0, 0))
        tmp_d = ImageDraw.Draw(tmp)
        tmp_d.text(
            (cx, cy),
            text,
            font=font,
            fill=(*glow_color, alpha),
            anchor="mm",
        )
        blurred = tmp.filter(ImageFilter.GaussianBlur(radius=radius))
        glow_layer.alpha_composite(blurred)
    base.alpha_composite(glow_layer)

    # Colle le texte gradienté sur la base
    paste_x = tx0 - 30
    paste_y = ty0 - 20
    base.alpha_composite(grad_masked, dest=(paste_x, paste_y))

    # Reflet blanc semi-transparent sur la moitié haute (effet chrome)
    shine = Image.new("RGBA", (tw + 60, th // 2 + 20), (0, 0, 0, 0))
    sd    = ImageDraw.Draw(shine)
    sd.text((30, 20), text, font=font, fill=(255, 255, 255, 55), anchor="lt")
    base.alpha_composite(shine, dest=(paste_x, paste_y))


def _draw_separator(img: Image.Image, y: int, alpha: int = 100) -> None:
    """Ligne décorative dorée horizontale centrée."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)
    w     = 340
    cx    = CARD_W // 2

    # Ligne centrale
    draw.line([(cx - w, y), (cx + w, y)], fill=(212, 175, 55, alpha), width=1)

    # Petits losanges au centre et aux extrémités
    for bx, size in [(cx, 5), (cx - w, 3), (cx + w, 3)]:
        pts = [(bx, y - size), (bx + size, y), (bx, y + size), (bx - size, y)]
        draw.polygon(pts, fill=(212, 175, 55, alpha + 40))

    # Glow de la ligne
    blurred = layer.filter(ImageFilter.GaussianBlur(radius=2))
    img.alpha_composite(blurred)
    img.alpha_composite(layer)


def _draw_subtitle(base: Image.Image, text: str, cx: int, y: int, font) -> None:
    """Texte 'FÉLICITATIONS POUR LE RANK' blanc lumineux avec glow blanc."""
    glow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    for radius, alpha in [(20, 30), (12, 60), (6, 100), (2, 150)]:
        tmp = Image.new("RGBA", base.size, (0, 0, 0, 0))
        td  = ImageDraw.Draw(tmp)
        td.text((cx, y), text, font=font, fill=(255, 255, 255, alpha), anchor="mm")
        blurred = tmp.filter(ImageFilter.GaussianBlur(radius=radius))
        glow_layer.alpha_composite(blurred)
    base.alpha_composite(glow_layer)

    draw = ImageDraw.Draw(base)
    draw.text((cx, y), text, font=font, fill=(255, 255, 255, 255), anchor="mm")


def _draw_credit(base: Image.Image, cx: int, y: int, font) -> None:
    """'by Freydiss' en doré avec séparateurs décoratifs."""
    text  = "by Freydiss"
    dummy = ImageDraw.Draw(base)
    tw, _ = _text_size(dummy, text, font)

    # Petites lignes décoratives dorées
    _draw_separator(base, y - 18, alpha=70)

    # Glow doré
    glow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    for radius, alpha in [(14, 25), (8, 50), (3, 90)]:
        tmp = Image.new("RGBA", base.size, (0, 0, 0, 0))
        td  = ImageDraw.Draw(tmp)
        td.text((cx, y), text, font=font, fill=(212, 175, 55, alpha), anchor="mm")
        blurred = tmp.filter(ImageFilter.GaussianBlur(radius=radius))
        glow_layer.alpha_composite(blurred)
    base.alpha_composite(glow_layer)

    # Texte doré métallique : deux passes (ombre + texte)
    draw = ImageDraw.Draw(base)
    draw.text((cx + 2, y + 2), text, font=font, fill=(100, 80, 10, 160), anchor="mm")
    draw.text((cx, y), text, font=font, fill=(212, 175, 55, 255), anchor="mm")

    # Petite ligne sous le crédit
    _draw_separator(base, y + 20, alpha=70)


# ─── Fonction principale ─────────────────────────────────────────

def make_felicitations_card(rank_name: str, seed: int = 0) -> io.BytesIO:
    """
    Génère la carte de félicitations pour le rang donné.

    Args:
        rank_name: Clé du rang ("Pirate", "Yonkou", "Roi des pirates", etc.)
                   ou texte libre (affiché tel quel en majuscules).
        seed:      Graine aléatoire pour les particules (reproducible par membre).

    Returns:
        io.BytesIO contenant l'image PNG prête à être envoyée sur Discord.
    """
    rank_key   = rank_name.strip()
    grade_text = RANK_LABELS.get(rank_key, rank_key.upper())
    stops      = RANK_GRADIENTS.get(rank_key, RANK_GRADIENTS["Roi des pirates"])
    glow_col   = RANK_GLOW.get(rank_key, (100, 200, 255))

    # ── Canvas ──────────────────────────────────────────────────
    img = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 255))

    _draw_background(img)
    _draw_particles(img, seed=seed)

    # ── Polices ──────────────────────────────────────────────────
    font_felicit = _load_font(FONT_TITLE, 54)
    font_credit  = _load_font(FONT_CREDIT, 28)

    # Taille dynamique du grade selon la longueur du texte
    grade_size = 130 if len(grade_text) <= 8 else 98 if len(grade_text) <= 13 else 76
    font_grade = _load_font(FONT_GRADE, grade_size)

    cx = CARD_W // 2

    # ── Layout vertical (3 zones) ────────────────────────────────
    # Zone titre : ~28% du haut
    y_title  = int(CARD_H * 0.30)
    # Zone grade : ~57% du haut
    y_grade  = int(CARD_H * 0.56)
    # Zone crédit : ~86% du haut
    y_credit = int(CARD_H * 0.86)

    # ── Séparateur supérieur ─────────────────────────────────────
    _draw_separator(img, y_title - 46, alpha=80)

    # ── Texte "FÉLICITATIONS POUR LE RANK" ──────────────────────
    _draw_subtitle(img, "FÉLICITATIONS POUR LE RANK", cx, y_title, font_felicit)

    # ── Séparateur entre titre et grade ──────────────────────────
    _draw_separator(img, y_title + 46, alpha=60)

    # ── Nom du grade avec dégradé arc-en-ciel ───────────────────
    _draw_gradient_text(img, grade_text, cx, y_grade, font_grade, stops, glow_col)

    # ── Crédit "by Freydiss" ─────────────────────────────────────
    _draw_credit(img, cx, y_credit, font_credit)

    # ── Bordure néon + ornements ─────────────────────────────────
    _draw_neon_border(img)
    _draw_corner_ornaments(img)

    # ── Export PNG ───────────────────────────────────────────────
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG", optimize=False)
    buf.seek(0)
    return buf


# ─── CLI de prévisualisation ─────────────────────────────────────

if __name__ == "__main__":
    ranks_to_preview = (
        [sys.argv[1]] if len(sys.argv) > 1
        else list(RANK_LABELS.keys())
    )

    for rank in ranks_to_preview:
        buf = make_felicitations_card(rank, seed=random.randint(0, 9999))
        filename = f"preview_{rank.replace(' ', '_').lower()}.png"
        with open(filename, "wb") as f:
            f.write(buf.read())
        print(f"[OK] Genere : {filename}")
