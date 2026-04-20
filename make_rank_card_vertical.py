"""
make_rank_card_vertical.py
===========================
Carte verticale premium One Piece — style anime gaming cinématographique.

Usage standalone (génère previews) :
    python make_rank_card_vertical.py

Usage depuis bot / cog :
    from make_rank_card_vertical import make_rank_card_vertical
    buf = make_rank_card_vertical("Yonkou", portrait_path="luffy.jpg")
    buf = make_rank_card_vertical("Amiral", portrait_bytes=avatar_bytes)
"""

from __future__ import annotations

import io
import math
import os
import random
import sys
from typing import Optional, Union

from PIL import (
    Image,
    ImageDraw,
    ImageEnhance,
    ImageFilter,
    ImageFont,
)

# ═══════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

_ROOT = os.path.dirname(os.path.abspath(__file__))

FONT_TITLE   = os.path.join(_ROOT, "Bangers-Regular.ttf")    # FÉLICITATIONS…
FONT_GRADE   = os.path.join(_ROOT, "KOMIKAX_.ttf")           # NOM DU RANG
FONT_BOLD    = os.path.join(_ROOT, "Bangers-Regular.ttf")    # BRAMS SCORE / BRAMS COMMUNITY
FONT_CREDIT  = os.path.join(_ROOT, "Righteous-Regular.ttf")  # by Freydiss

BG_IMAGE     = os.path.join(_ROOT, "background.jpeg")        # fond anime assombri

CARD_W = 620
CARD_H = 960

PORTRAIT_DIAMETER = 260   # diamètre du cercle portrait
BORDER_THICKNESS  = 5     # épaisseur bordure dorée

# ─── Labels & couleurs par rang ──────────────────────────────────

RANK_LABELS: dict[str, str] = {
    "Pirate":          "PIRATE",
    "Shichibukai":     "SHICHIBUKAI",
    "Amiral":          "AMIRAL",
    "Yonkou":          "YONKOU",
    "Roi des pirates": "ROI DES PIRATES",
}

# Dégradé horizontal pour chaque rang (stops RGB, appliqué sur le texte du grade)
RANK_CHROME: dict[str, list[tuple[int,int,int]]] = {
    "Pirate": [
        (30, 180, 80), (100, 255, 150), (220, 255, 230),
        (100, 255, 150), (30, 180, 80),
    ],
    "Shichibukai": [
        (0, 160, 90), (60, 230, 160), (200, 255, 230),
        (60, 230, 160), (0, 160, 90),
    ],
    "Amiral": [
        (200, 130, 0), (255, 200, 40), (255, 255, 180),
        (255, 200, 40), (200, 130, 0),
    ],
    "Yonkou": [
        (100, 20, 200), (180, 60, 255), (240, 160, 255),
        (255, 255, 255), (240, 160, 255),
        (180, 60, 255), (100, 20, 200),
    ],
    "Roi des pirates": [
        (0, 180, 255), (80, 60, 255), (200, 40, 200),
        (255, 140, 0), (255, 240, 100), (255, 255, 255),
        (255, 240, 100), (255, 140, 0),
        (200, 40, 200), (80, 60, 255), (0, 180, 255),
    ],
}

# Couleur de glow du grade
RANK_GLOW: dict[str, tuple[int,int,int]] = {
    "Pirate":          (40,  220, 100),
    "Shichibukai":     (0,   200, 120),
    "Amiral":          (255, 180,  20),
    "Yonkou":          (160,  40, 255),
    "Roi des pirates": (80,  180, 255),
}

# Couleur de glow du cercle portrait
RANK_CIRCLE_GLOW: dict[str, tuple[int,int,int]] = {
    "Pirate":          (40,  220, 100),
    "Shichibukai":     (0,   200, 120),
    "Amiral":          (220, 160,  20),
    "Yonkou":          (140,  30, 240),
    "Roi des pirates": (60,  150, 255),
}

GOLD = (212, 175, 55)


# ═══════════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════════

def _load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def _text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int,int]:
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0], bb[3] - bb[1]


def _lerp(c1: tuple[int,int,int], c2: tuple[int,int,int], t: float) -> tuple[int,int,int]:
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def _gradient_h(w: int, h: int, stops: list[tuple[int,int,int]]) -> Image.Image:
    img = Image.new("RGBA", (w, h))
    px  = img.load()
    n   = len(stops) - 1
    for x in range(w):
        t   = x / max(w - 1, 1)
        seg = min(int(t * n), n - 1)
        c   = _lerp(stops[seg], stops[seg + 1], t * n - seg)
        for y in range(h):
            px[x, y] = (*c, 255)
    return img


def _circle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    return mask


def _glow_layer(
    size: tuple[int,int],
    draw_fn,
    radius: int,
    color: tuple[int,int,int],
    alpha: int,
) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw_fn(layer, (*color, alpha))
    return layer.filter(ImageFilter.GaussianBlur(radius=radius))


# ═══════════════════════════════════════════════════════════════════
#  COUCHES GRAPHIQUES
# ═══════════════════════════════════════════════════════════════════

def _build_background(rank_key: str) -> Image.Image:
    """
    Fond sombre : background anime fortement assombri + désaturé + vignette.
    Le personnage reste en ombre portée, effet silhouette cinématographique.
    """
    canvas = Image.new("RGBA", (CARD_W, CARD_H), (6, 6, 14, 255))

    if os.path.exists(BG_IMAGE):
        bg = Image.open(BG_IMAGE).convert("RGBA")
        # Redimensionne pour couvrir la carte (center-crop)
        ratio = max(CARD_W / bg.width, CARD_H / bg.height)
        new_w = int(bg.width  * ratio)
        new_h = int(bg.height * ratio)
        bg = bg.resize((new_w, new_h), Image.LANCZOS)
        ox = (new_w - CARD_W) // 2
        oy = (new_h - CARD_H) // 2
        bg = bg.crop((ox, oy, ox + CARD_W, oy + CARD_H))

        # Désaturation quasi-totale → silhouette sombre
        bg_gray = ImageEnhance.Color(bg).enhance(0.15)
        # Assombrissement fort
        bg_dark = ImageEnhance.Brightness(bg_gray).enhance(0.22)
        # Légère teinte violacée selon le rang
        tint_col = RANK_GLOW.get(rank_key, (80, 60, 120))
        tint = Image.new("RGBA", (CARD_W, CARD_H), (*tint_col, 30))

        canvas.alpha_composite(bg_dark)
        canvas.alpha_composite(tint)

    # Gradient vertical sombre : bas très noir, haut moins
    for y in range(CARD_H):
        t     = y / CARD_H
        alpha = int(120 + 100 * t)          # plus opaque vers le bas
        overlay = Image.new("RGBA", (CARD_W, 1), (4, 4, 10, alpha))
        canvas.alpha_composite(overlay, dest=(0, y))

    # Vignette radiale (coins sombres)
    vign = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    vd   = ImageDraw.Draw(vign)
    cx, cy = CARD_W // 2, CARD_H // 2
    for r in range(max(CARD_W, CARD_H), 0, -6):
        a = int(160 * (r / max(CARD_W, CARD_H)) ** 1.4)
        vd.ellipse([cx - r, cy - r * 1.5, cx + r, cy + r * 1.5],
                   fill=(0, 0, 0, min(a, 200)))
    vign_blurred = vign.filter(ImageFilter.GaussianBlur(radius=40))
    # Inverser : vignette = coins sombres = soustraction
    inv_vign = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    for y in range(CARD_H):
        for x in range(CARD_W):
            # Distance normalisée au bord
            dx = min(x, CARD_W - x) / (CARD_W / 2)
            dy = min(y, CARD_H - y) / (CARD_H / 2)
            dist = min(dx, dy)
            a    = int(max(0, 1 - dist) ** 2.5 * 180)
            inv_vign.putpixel((x, y), (0, 0, 0, a))
    canvas.alpha_composite(inv_vign)

    return canvas


def _draw_particles(img: Image.Image, seed: int = 0) -> None:
    rng   = random.Random(seed)
    layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    d     = ImageDraw.Draw(layer)

    for _ in range(80):
        x = rng.randint(0, CARD_W)
        y = rng.randint(0, CARD_H)
        r = rng.uniform(0.5, 2.2)
        a = rng.randint(30, 130)
        br = rng.randint(180, 255)
        gv = rng.randint(140, 205)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(br, gv, 25, a))

    for _ in range(20):
        x = rng.randint(0, CARD_W)
        y = rng.randint(0, CARD_H)
        r = rng.uniform(1.0, 2.8)
        a = rng.randint(50, 140)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))

    img.alpha_composite(layer)


def _draw_neon_border(img: Image.Image, rank_key: str) -> None:
    """Cadre doré avec glow de la couleur du rang."""
    glow_col = RANK_CIRCLE_GLOW.get(rank_key, (212, 175, 55))
    layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    d     = ImageDraw.Draw(layer)
    m, r  = 12, 18

    for off, a in [(9, 15), (6, 28), (4, 45), (2, 65), (1, 90)]:
        d.rounded_rectangle(
            [m - off, m - off, CARD_W - m + off, CARD_H - m + off],
            radius=r + off, outline=(*glow_col, a), width=2,
        )
    # Trait doré principal
    d.rounded_rectangle(
        [m, m, CARD_W - m, CARD_H - m],
        radius=r, outline=(*GOLD, 220), width=2,
    )
    # Trait intérieur blanc très discret
    d.rounded_rectangle(
        [m + 5, m + 5, CARD_W - m - 5, CARD_H - m - 5],
        radius=r - 4, outline=(255, 255, 255, 18), width=1,
    )
    blurred = layer.filter(ImageFilter.GaussianBlur(radius=4))
    img.alpha_composite(blurred)
    img.alpha_composite(layer)


def _draw_corner_gems(img: Image.Image) -> None:
    """Petits losanges dorés dans les quatre coins."""
    layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    d     = ImageDraw.Draw(layer)
    gap, sz = 20, 24
    gold_dim = (*GOLD, 160)

    for cx, cy in [(gap, gap), (CARD_W - gap, gap),
                   (gap, CARD_H - gap), (CARD_W - gap, CARD_H - gap)]:
        pts = [(cx, cy - sz // 2), (cx + sz // 2, cy),
               (cx, cy + sz // 2), (cx - sz // 2, cy)]
        d.polygon(pts, outline=gold_dim, fill=(*GOLD, 35))

    img.alpha_composite(layer)


def _draw_separator(img: Image.Image, y: int, alpha: int = 110, width: int = 220) -> None:
    """Ligne horizontale dorée avec losange central."""
    layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    d     = ImageDraw.Draw(layer)
    cx    = CARD_W // 2

    d.line([(cx - width, y), (cx + width, y)], fill=(*GOLD, alpha), width=1)

    sz = 5
    pts = [(cx, y - sz), (cx + sz, y), (cx, y + sz), (cx - sz, y)]
    d.polygon(pts, fill=(*GOLD, alpha + 40))
    for bx in [cx - width, cx + width]:
        sz2 = 3
        pts2 = [(bx, y - sz2), (bx + sz2, y), (bx, y + sz2), (bx - sz2, y)]
        d.polygon(pts2, fill=(*GOLD, alpha))

    blurred = layer.filter(ImageFilter.GaussianBlur(radius=2))
    img.alpha_composite(blurred)
    img.alpha_composite(layer)


def _glow_text_white(img: Image.Image, text: str, cx: int, cy: int, font) -> None:
    """Texte blanc pur avec glow blanc puissant, ancre centré."""
    for radius, alpha in [(28, 25), (18, 50), (10, 90), (5, 140), (2, 200)]:
        layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).text((cx, cy), text, font=font,
                                   fill=(255, 255, 255, alpha), anchor="mm")
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius=radius)))

    d = ImageDraw.Draw(img)
    d.text((cx, cy), text, font=font, fill=(255, 255, 255, 255), anchor="mm")


def _draw_chrome_grade(
    img: Image.Image,
    text: str,
    cx: int,
    cy: int,
    font,
    stops: list[tuple[int,int,int]],
    glow_col: tuple[int,int,int],
) -> None:
    """
    Nom du grade avec dégradé chrome brillant + ombre 3D + glow coloré.
    Technique : masque alpha du texte × image gradient.
    """
    dummy = ImageDraw.Draw(img)
    bb    = dummy.textbbox((cx, cy), text, font=font, anchor="mm")
    tw    = bb[2] - bb[0]
    th    = bb[3] - bb[1]
    pad_x, pad_y = 50, 30

    # Glow coloré multi-passes
    for radius, alpha in [(36, 30), (24, 55), (14, 85), (7, 120), (3, 160)]:
        layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).text(
            (cx, cy), text, font=font, fill=(*glow_col, alpha), anchor="mm"
        )
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius=radius)))

    # Gradient aux dimensions du texte + padding
    grad_w = tw + pad_x * 2
    grad_h = th + pad_y * 2
    grad   = _gradient_h(grad_w, grad_h, stops)

    # Masque texte
    mask      = Image.new("RGBA", (grad_w, grad_h), (0, 0, 0, 0))
    mask_draw = ImageDraw.Draw(mask)

    # Ombre décalée (effet 3D)
    mask_draw.text(
        (pad_x + 5, pad_y + 6), text, font=font,
        fill=(0, 0, 0, 140), anchor="lt",
    )
    # Texte principal
    mask_draw.text(
        (pad_x, pad_y), text, font=font,
        fill=(255, 255, 255, 255), anchor="lt",
    )

    grad_masked = grad.copy()
    grad_masked.putalpha(mask.split()[3])

    paste_x = bb[0] - pad_x
    paste_y = bb[1] - pad_y
    img.alpha_composite(grad_masked, dest=(paste_x, paste_y))

    # Reflet blanc (shine) sur la moitié supérieure → effet chrome
    shine      = Image.new("RGBA", (grad_w, grad_h // 2 + 10), (0, 0, 0, 0))
    shine_draw = ImageDraw.Draw(shine)
    shine_draw.text(
        (pad_x, pad_y), text, font=font,
        fill=(255, 255, 255, 60), anchor="lt",
    )
    img.alpha_composite(shine, dest=(paste_x, paste_y))


def _draw_portrait_circle(
    img: Image.Image,
    portrait: Optional[Image.Image],
    cx: int,
    cy: int,
    diameter: int,
    rank_key: str,
) -> None:
    """
    Cercle portrait avec :
    - Glow coloré externe
    - Halo doré
    - Bordure dorée épaisse
    - Portrait centré dans le cercle (ou placeholder stylé)
    """
    r        = diameter // 2
    glow_col = RANK_CIRCLE_GLOW.get(rank_key, (180, 140, 40))

    # ── Glow externe coloré ──────────────────────────────────────
    for glow_r, alpha in [(r + 45, 18), (r + 32, 35), (r + 20, 55), (r + 10, 80)]:
        layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).ellipse(
            [cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r],
            fill=(*glow_col, alpha),
        )
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius=glow_r // 3)))

    # ── Halo doré intermédiaire ──────────────────────────────────
    for glow_r, alpha in [(r + 12, 60), (r + 6, 100)]:
        layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).ellipse(
            [cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r],
            outline=(*GOLD, alpha), width=3,
        )
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(radius=4)))

    # ── Portrait (ou placeholder) ────────────────────────────────
    if portrait is not None:
        prt = portrait.convert("RGBA")
        # Crop centré au carré, puis resize au diamètre
        pw, ph = prt.size
        sq     = min(pw, ph)
        ox     = (pw - sq) // 2
        oy     = (ph - sq) // 2
        prt    = prt.crop((ox, oy, ox + sq, oy + sq))
        prt    = prt.resize((diameter, diameter), Image.LANCZOS)

        circle = _circle_mask(diameter)
        prt_circle = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
        prt_circle.paste(prt, (0, 0))
        prt_circle.putalpha(circle)

        img.alpha_composite(prt_circle, dest=(cx - r, cy - r))
    else:
        # Placeholder : cercle sombre avec initiales du rang et couleur du glow
        ph_layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
        phd      = ImageDraw.Draw(ph_layer)
        phd.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(*glow_col, 40),
        )
        img.alpha_composite(ph_layer)

        font_ph = _load_font(FONT_GRADE, 64)
        initials = RANK_LABELS.get(rank_key, rank_key[:2].upper())[:2]
        _glow_text_white(img, initials, cx, cy, font_ph)

    # ── Bordure dorée principale ─────────────────────────────────
    border_layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    bd           = ImageDraw.Draw(border_layer)

    # Double anneau doré (épaisseur principale + intérieur fin)
    bd.ellipse(
        [cx - r - BORDER_THICKNESS, cy - r - BORDER_THICKNESS,
         cx + r + BORDER_THICKNESS, cy + r + BORDER_THICKNESS],
        outline=(*GOLD, 255), width=BORDER_THICKNESS,
    )
    bd.ellipse(
        [cx - r - BORDER_THICKNESS - 3, cy - r - BORDER_THICKNESS - 3,
         cx + r + BORDER_THICKNESS + 3, cy + r + BORDER_THICKNESS + 3],
        outline=(*GOLD, 100), width=2,
    )
    bd.ellipse(
        [cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2],
        outline=(255, 255, 255, 40), width=1,
    )

    # Petit glow de la bordure
    blurred_border = border_layer.filter(ImageFilter.GaussianBlur(radius=3))
    img.alpha_composite(blurred_border)
    img.alpha_composite(border_layer)

    # ── Petits losanges dorés aux 4 points cardinaux de la bordure ──
    ornament = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    od       = ImageDraw.Draw(ornament)
    gem_sz   = 7
    for gx, gy in [
        (cx, cy - r - BORDER_THICKNESS),
        (cx, cy + r + BORDER_THICKNESS),
        (cx - r - BORDER_THICKNESS, cy),
        (cx + r + BORDER_THICKNESS, cy),
    ]:
        pts = [(gx, gy - gem_sz), (gx + gem_sz, gy),
               (gx, gy + gem_sz), (gx - gem_sz, gy)]
        od.polygon(pts, fill=(*GOLD, 230))

    img.alpha_composite(ornament)


def _draw_community_block(
    img: Image.Image,
    cx: int,
    y_top: int,
) -> int:
    """
    Dessine BRAMS SCORE / BRAMS COMMUNITY.
    Retourne le y du bas du bloc.
    """
    font_brams = _load_font(FONT_BOLD, 42)
    font_comm  = _load_font(FONT_BOLD, 30)

    line_h_1 = 52
    line_h_2 = 40

    y1 = y_top + 20
    y2 = y1 + line_h_1

    _glow_text_white(img, "BRAMS SCORE", cx, y1, font_brams)
    _glow_text_white(img, "BRAMS COMMUNITY", cx, y2, font_comm)

    return y2 + line_h_2


def _draw_credit_br(img: Image.Image, margin_r: int, margin_b: int, font) -> None:
    """'by Freydiss' en bas à droite, doré discret."""
    text  = "by Freydiss"
    layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    d     = ImageDraw.Draw(layer)

    # Glow doré léger
    for radius, alpha in [(8, 20), (4, 45)]:
        tmp = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
        ImageDraw.Draw(tmp).text(
            (CARD_W - margin_r, CARD_H - margin_b),
            text, font=font, fill=(*GOLD, alpha), anchor="rb",
        )
        layer.alpha_composite(tmp.filter(ImageFilter.GaussianBlur(radius=radius)))

    # Ombre
    d.text(
        (CARD_W - margin_r + 1, CARD_H - margin_b + 1),
        text, font=font, fill=(60, 45, 5, 140), anchor="rb",
    )
    # Texte doré
    d.text(
        (CARD_W - margin_r, CARD_H - margin_b),
        text, font=font, fill=(*GOLD, 220), anchor="rb",
    )

    img.alpha_composite(layer)


# ═══════════════════════════════════════════════════════════════════
#  FONCTION PRINCIPALE
# ═══════════════════════════════════════════════════════════════════

def make_rank_card_vertical(
    rank_name: str,
    portrait_path: Optional[str]  = None,
    portrait_bytes: Optional[bytes] = None,
    seed: int = 0,
) -> io.BytesIO:
    """
    Génère la carte verticale premium pour le rang donné.

    Args:
        rank_name:     Clé du rang ("Pirate", "Yonkou", "Roi des pirates"…)
                       ou texte libre affiché en majuscules.
        portrait_path: Chemin local vers une image portrait (facultatif).
        portrait_bytes: Bytes d'une image portrait (ex: avatar Discord).
        seed:          Graine aléatoire pour les particules.

    Returns:
        io.BytesIO contenant l'image PNG.
    """
    rank_key    = rank_name.strip()
    grade_label = RANK_LABELS.get(rank_key, rank_key.upper())
    chrome_stops = RANK_CHROME.get(rank_key, RANK_CHROME["Roi des pirates"])
    glow_col     = RANK_GLOW.get(rank_key, (160, 120, 255))

    # ── Chargement portrait ──────────────────────────────────────
    portrait: Optional[Image.Image] = None
    if portrait_bytes:
        try:
            portrait = Image.open(io.BytesIO(portrait_bytes))
        except Exception:
            portrait = None
    elif portrait_path and os.path.exists(portrait_path):
        try:
            portrait = Image.open(portrait_path)
        except Exception:
            portrait = None

    # ── Canvas ──────────────────────────────────────────────────
    img = _build_background(rank_key)
    _draw_particles(img, seed=seed)

    cx = CARD_W // 2

    # ── Polices ──────────────────────────────────────────────────
    font_title  = _load_font(FONT_TITLE, 48)
    font_credit = _load_font(FONT_CREDIT, 20)

    # Taille dynamique du grade
    grade_size = 110 if len(grade_label) <= 6 else 86 if len(grade_label) <= 10 else 66
    font_grade = _load_font(FONT_GRADE, grade_size)

    # ── Layout vertical ───────────────────────────────────────────
    #  Zone 1 — FÉLICITATIONS (y ~ 9%)
    y_title   = int(CARD_H * 0.09)
    #  Zone 2 — Nom du grade (y ~ 18%)
    y_grade   = int(CARD_H * 0.19)
    #  Séparateur (y ~ 28%)
    y_sep1    = int(CARD_H * 0.285)
    #  Zone 3 — Portrait cercle (centre y ~ 52%)
    y_portrait = int(CARD_H * 0.515)
    #  Séparateur (y ~ 74%)
    y_sep2    = int(CARD_H * 0.74)
    #  Zone 4 — BRAMS SCORE / BRAMS COMMUNITY (y ~ 77%)
    y_brams   = int(CARD_H * 0.77)

    # ── 1. Titre "FÉLICITATIONS POUR LE RANK" ───────────────────
    _glow_text_white(img, "FÉLICITATIONS POUR LE RANK", cx, y_title, font_title)

    # ── 2. Nom du grade chrome ───────────────────────────────────
    _draw_chrome_grade(img, grade_label, cx, y_grade, font_grade, chrome_stops, glow_col)

    # ── Séparateur entre grade et portrait ───────────────────────
    _draw_separator(img, y_sep1, alpha=100, width=200)

    # ── 3. Portrait cercle ───────────────────────────────────────
    _draw_portrait_circle(img, portrait, cx, y_portrait, PORTRAIT_DIAMETER, rank_key)

    # ── Séparateur entre portrait et texte ───────────────────────
    _draw_separator(img, y_sep2, alpha=100, width=200)

    # ── 4. BRAMS SCORE / BRAMS COMMUNITY ────────────────────────
    _draw_community_block(img, cx, y_brams)

    # ── 5. Bordure néon + coins ──────────────────────────────────
    _draw_neon_border(img, rank_key)
    _draw_corner_gems(img)

    # ── 6. Crédit "by Freydiss" (bas droite) ─────────────────────
    _draw_credit_br(img, margin_r=30, margin_b=25, font=font_credit)

    # ── Export ───────────────────────────────────────────────────
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG", optimize=False)
    buf.seek(0)
    return buf


# ═══════════════════════════════════════════════════════════════════
#  CLI PREVIEW
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    ranks = (
        [sys.argv[1]] if len(sys.argv) > 1
        else list(RANK_LABELS.keys())
    )
    portrait_arg = sys.argv[2] if len(sys.argv) > 2 else None

    for rank in ranks:
        rng  = random.Random(rank)
        seed = rng.randint(0, 9999)
        buf  = make_rank_card_vertical(rank, portrait_path=portrait_arg, seed=seed)
        fname = f"vertical_{rank.replace(' ', '_').lower()}.png"
        with open(fname, "wb") as f:
            f.write(buf.read())
        print(f"[OK] {fname}")
