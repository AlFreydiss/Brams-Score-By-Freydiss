"""
utils/constellation_builder.py

Génère une image "mur d'enquête Marine" (1920×1080 PNG) avec wanted posters
disposés en constellation hiérarchique. Rendu interne en 2× puis downscale
pour l'antialiasing.

Polices attendues dans assets/fonts/ :
  Cinzel-Bold.ttf, Cinzel-Regular.ttf
  EBGaramond-BoldItalic.ttf, EBGaramond-Italic.ttf
  IMFellEnglish-Italic.ttf
Télécharger sur Google Fonts :
  https://fonts.google.com/specimen/Cinzel
  https://fonts.google.com/specimen/EB+Garamond
  https://fonts.google.com/specimen/IM+Fell+English
Fallbacks automatiques : PirataOne-Regular.ttf (racine) → Arial → default
"""
from __future__ import annotations

import asyncio
import io
import logging
import math
import random
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

log = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="constellation")
_BASE     = Path(__file__).parent.parent

# ── Dimensions ────────────────────────────────────────────────────────────────
W,  H  = 1920, 1080
WW, WH = W * 2,  H * 2          # résolution de travail 2×
CX, CY = WW // 2, WH // 2       # centre à 2×
MARGIN = 160                      # marge interne (= 80px en sortie)

# ── Palette ───────────────────────────────────────────────────────────────────
PARCHMENT       = (232, 212, 160)
PARCHMENT_LIGHT = (242, 228, 190)
PARCHMENT_DARK  = (196, 168, 112)
INK             = ( 26,  18,   8)
INK_SOFT        = ( 61,  48,  28)
GOLD_OLD        = (184, 134,  11)
GOLD_LIGHT      = (220, 168,  24)
BROWN_MEDIUM    = ( 92,  61,  26)
BROWN_LIGHT     = (184, 149, 106)

ROLE_COLORS: dict[str, tuple[int, int, int]] = {
    'capitaine':   (185,  28,  28),
    'second':      ( 30,  58, 138),
    'navigateur':  (234,  88,  12),
    'cuisinier':   (202, 138,   4),
    'sniper':      (120,  53,  15),
    'medecin':     (190,  24,  93),
    'archeologue': (107,  33, 168),
    'charpentier': ( 14, 116, 144),
    'musicien':    ( 31,  41,  55),
    'bretteur':    ( 90,  30,  40),
    'timonier':    ( 50,  60, 100),
    'mousse':      (139,  69,  19),
}

LINK_COLORS: dict[str, tuple[int, int, int]] = {
    'hierarchy': (184, 134,  11),
    'team':      ( 92,  61,  26),
    'strong':    (153,  27,  27),
    'distant':   (120, 113, 108),
}
LINK_WIDTHS: dict[str, int] = {
    'hierarchy': 6,
    'team':      4,
    'strong':    5,
    'distant':   3,
}

# ── Layout ────────────────────────────────────────────────────────────────────
ROLE_LEVEL: dict[str, int] = {
    'capitaine':   0,
    'second':      1, 'navigateur': 1, 'bretteur': 1,
    'cuisinier':   2, 'sniper': 2, 'medecin': 2,
    'musicien':    2, 'charpentier': 2, 'archeologue': 2, 'timonier': 2,
    'mousse':      3,
}
RADII_2X = [0, 560, 960, 1300]        # rayons en pixels à 2×
SCALES   = [1.15, 0.85, 0.65, 0.50]  # échelle par niveau
POSTER_W, POSTER_H = 720, 1040        # poster de base à 2×

# ── Font cache ────────────────────────────────────────────────────────────────
_FONT_CACHE: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def _font(name: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Charge une police avec fallbacks progressifs."""
    key = (name, size)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    candidates = [_BASE / "assets" / "fonts" / name, _BASE / name]
    for path in candidates:
        try:
            f = ImageFont.truetype(str(path), size)
            _FONT_CACHE[key] = f
            return f
        except OSError:
            continue
    for sf in ("arial.ttf", "ArialBD.ttf", "DejaVuSans.ttf", "times.ttf"):
        try:
            f = ImageFont.truetype(sf, size)
            _FONT_CACHE[key] = f
            return f
        except OSError:
            continue
    return ImageFont.load_default()


def _fw(sz: int):  return _font("Cinzel-Bold.ttf",          sz)  # WANTED / primes
def _fn(sz: int):  return _font("EBGaramond-BoldItalic.ttf", sz)  # noms
def _fi(sz: int):  return _font("EBGaramond-Italic.ttf",     sz)  # surnoms
def _fd(sz: int):  return _font("IMFellEnglish-Italic.ttf",  sz)  # déco
def _fl(sz: int):  return _font("Cinzel-Regular.ttf",        sz)  # labels


# ── Utilitaires ───────────────────────────────────────────────────────────────

def _bezier(p0: tuple, p1: tuple, p2: tuple, n: int = 50) -> list[tuple[int, int]]:
    """Interpolation Bézier quadratique en n+1 points."""
    pts = []
    for i in range(n + 1):
        t   = i / n
        u   = 1 - t
        x   = u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0]
        y   = u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]
        pts.append((int(x), int(y)))
    return pts


def _ctrl_point(p0: tuple, p2: tuple, offset: int) -> tuple[int, int]:
    """Point de contrôle Bézier : milieu + décalage perpendiculaire."""
    mx, my = (p0[0] + p2[0]) // 2, (p0[1] + p2[1]) // 2
    dx, dy = p2[0] - p0[0], p2[1] - p0[1]
    lng    = math.hypot(dx, dy) or 1
    return (int(mx - dy / lng * offset), int(my + dx / lng * offset))


def _fmt_bounty(bounty: int | None) -> str:
    if bounty is None:
        return "??? Berry"
    if bounty >= 1_000_000_000:
        return f"{bounty / 1_000_000_000:.3g} Md Berry"
    if bounty >= 1_000_000:
        return f"{bounty // 1_000_000} M Berry"
    return f"{bounty:,} Berry".replace(",", " ")


def _role_color(role: str) -> tuple[int, int, int]:
    return ROLE_COLORS.get(role.lower(), BROWN_MEDIUM)


def _clamp(v: float, lo: float, hi: float) -> int:
    return int(max(lo, min(hi, v)))


# ── Fond parchemin ────────────────────────────────────────────────────────────

def _draw_background(canvas: Image.Image, rng: random.Random) -> None:
    """Fond texturé parchemin avec vignette bois et coins brûlés."""
    draw = ImageDraw.Draw(canvas, "RGBA")

    # Remplissage de base
    canvas.paste(PARCHMENT, (0, 0, WW, WH))

    # Grain de lignes horizontales
    for y in range(0, WH, 22):
        draw.line([(0, y), (WW, y)], fill=(*PARCHMENT_DARK, rng.randint(5, 12)), width=1)

    # Panneau central légèrement plus clair
    pad = MARGIN * 2
    draw.rectangle([pad, pad, WW - pad, WH - pad], fill=(*PARCHMENT_LIGHT, 50))

    # Taches d'encre (3-5)
    for _ in range(rng.randint(3, 5)):
        sx, sy = rng.randint(MARGIN, WW - MARGIN), rng.randint(MARGIN, WH - MARGIN)
        rx, ry = rng.randint(30, 90), rng.randint(20, 60)
        draw.ellipse([sx - rx, sy - ry, sx + rx, sy + ry], fill=(70, 45, 15, rng.randint(12, 24)))

    # Vignette bords
    for i in range(90):
        a = int(110 * (1 - i / 90) ** 1.8)
        draw.rectangle([i, i, WW - i - 1, WH - i - 1], outline=(*PARCHMENT_DARK, a))

    # Coins brûlés
    for cx_c, cy_c in ((0, 0), (WW, 0), (0, WH), (WW, WH)):
        r = rng.randint(130, 190)
        for j in range(r):
            draw.ellipse([cx_c - j, cy_c - j, cx_c + j, cy_c + j],
                         outline=(38, 24, 8, int(70 * (1 - j / r) ** 2)))

    # Cadre or
    draw.rectangle([12, 12, WW - 13, WH - 13], outline=(*GOLD_OLD, 200), width=4)
    draw.rectangle([22, 22, WW - 23, WH - 23], outline=(*BROWN_MEDIUM, 100), width=2)


# ── Construction d'un poster ──────────────────────────────────────────────────

def _poster_bg(img: Image.Image, draw: ImageDraw.ImageDraw,
               role_color: tuple, rng: random.Random) -> None:
    draw.rounded_rectangle([0, 0, POSTER_W - 1, POSTER_H - 1], radius=8,
                            fill=PARCHMENT_LIGHT)
    for y in range(0, POSTER_H, 16):
        draw.line([(8, y), (POSTER_W - 8, y)],
                  fill=(*PARCHMENT_DARK, rng.randint(4, 10)), width=1)
    for _ in range(rng.randint(1, 3)):
        sx = rng.randint(20, POSTER_W - 20)
        sy = rng.randint(200, POSTER_H - 120)
        draw.ellipse([sx - 10, sy - 6, sx + 10, sy + 6], fill=(*INK, rng.randint(8, 18)))


def _poster_header(draw: ImageDraw.ImageDraw, role_color: tuple) -> None:
    hh = 160
    draw.rounded_rectangle([0, 0, POSTER_W - 1, hh], radius=8, fill=role_color)
    draw.rectangle([0, hh // 2, POSTER_W - 1, hh], fill=role_color)
    draw.text((POSTER_W // 2, 76), "WANTED",
              font=_fw(112), fill=(245, 240, 225), anchor="mm")
    draw.text((POSTER_W // 2, 136), "DEAD  OR  ALIVE",
              font=_fl(44), fill=(245, 240, 225, 200), anchor="mm")


def _poster_photo(img: Image.Image, draw: ImageDraw.ImageDraw,
                  member: dict, role_color: tuple) -> None:
    px, py, fw, fh = 36, 172, POSTER_W - 72, 560
    draw.rectangle([px - 6, py - 6, px + fw + 6, py + fh + 6], fill=role_color)
    draw.rectangle([px - 2, py - 2, px + fw + 2, py + fh + 2], fill=(*GOLD_OLD, 180))
    draw.rectangle([px, py, px + fw, py + fh], fill=PARCHMENT_DARK)

    raw = member.get("_avatar_bytes") or member.get("image_bytes")
    if raw:
        _paste_photo(img, raw, px, py, fw, fh)
    else:
        _draw_question_silhouette(draw, px, py, fw, fh)


def _paste_photo(canvas: Image.Image, raw: bytes,
                 px: int, py: int, fw: int, fh: int) -> None:
    try:
        photo = Image.open(io.BytesIO(raw)).convert("RGBA")
        photo.thumbnail((fw, fh), Image.LANCZOS)
        canvas.paste(photo, (px + (fw - photo.width) // 2,
                              py + (fh - photo.height) // 2), photo)
    except Exception:
        pass


def _draw_question_silhouette(draw: ImageDraw.ImageDraw,
                               px: int, py: int, fw: int, fh: int) -> None:
    cx, cy = px + fw // 2, py + fh // 2
    draw.ellipse([cx - 110, py + 40, cx + 110, py + 280],  fill=(*PARCHMENT_DARK, 170))
    draw.ellipse([cx - 160, py + 270, cx + 160, py + fh - 20], fill=(*PARCHMENT_DARK, 150))
    draw.text((cx, cy), "?", font=_fw(200), fill=(*INK_SOFT, 110), anchor="mm")


def _poster_texts(draw: ImageDraw.ImageDraw, member: dict) -> None:
    cx, y = POSTER_W // 2, 752
    name = (member.get("name") or "Inconnu")[:22]
    draw.text((cx, y), name, font=_fn(64), fill=INK, anchor="mm")
    y += 80
    nick = member.get("nickname") or member.get("epithete") or ""
    if nick:
        draw.text((cx, y), f"« {nick[:26]} »", font=_fi(36), fill=INK_SOFT, anchor="mm")
        y += 56
    else:
        y += 12
    draw.line([(60, y), (POSTER_W - 60, y)], fill=(*GOLD_OLD, 160), width=2)
    y += 20
    draw.text((cx, y), _fmt_bounty(member.get("bounty")),
              font=_fw(56), fill=INK, anchor="mm")
    y += 64
    draw.text((cx, y), "P  R  I  M  E", font=_fl(28), fill=INK_SOFT, anchor="mm")


def _poster_frame(draw: ImageDraw.ImageDraw, role_color: tuple) -> None:
    draw.rounded_rectangle([0, 0, POSTER_W - 1, POSTER_H - 1],
                            radius=8, outline=role_color, width=14)
    draw.rounded_rectangle([14, 14, POSTER_W - 15, POSTER_H - 15],
                            radius=6, outline=(*GOLD_OLD, 150), width=4)


def _poster_pin(draw: ImageDraw.ImageDraw, role_color: tuple) -> None:
    cx, cy, r = POSTER_W // 2, 16, 24
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(80, 80, 90))
    draw.ellipse([cx - r + 4, cy - r + 4, cx + r - 6, cy + r - 6], fill=(160, 165, 175))
    draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=role_color)
    draw.ellipse([cx - r + 4, cy + r - 2, cx + r + 4, cy + r + 14],
                 fill=(30, 20, 10, 55))


def _poster_creases(draw: ImageDraw.ImageDraw, rng: random.Random) -> None:
    for _ in range(rng.randint(1, 2)):
        x1 = rng.randint(0, POSTER_W)
        draw.line([(x1, 0), (x1 + rng.randint(-60, 60), POSTER_H)],
                  fill=(*PARCHMENT_DARK, 28), width=1)


def _make_poster(member: dict, role_color: tuple, rng: random.Random) -> Image.Image:
    """Assemble le poster WANTED complet 720×1040 (RGBA, 2×)."""
    img  = Image.new("RGBA", (POSTER_W, POSTER_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _poster_bg(img, draw, role_color, rng)
    _poster_header(draw, role_color)
    _poster_photo(img, draw, member, role_color)
    _poster_texts(draw, member)
    _poster_frame(draw, role_color)
    _poster_pin(draw, role_color)
    _poster_creases(draw, rng)
    return img


# ── Placement poster ──────────────────────────────────────────────────────────

def _place_poster(canvas: Image.Image, poster: Image.Image,
                  cx: int, cy: int, scale: float,
                  rot: float, opacity: float = 1.0) -> None:
    nw, nh = int(POSTER_W * scale), int(POSTER_H * scale)
    scaled = poster.resize((nw, nh), Image.LANCZOS)
    if rot != 0.0:
        scaled = scaled.rotate(-rot, expand=True, resample=Image.BICUBIC)

    # Ombre portée
    shadow = Image.new("RGBA", scaled.size, (0, 0, 0, 0))
    if scaled.mode == "RGBA":
        _, _, _, a = scaled.split()
        a_s = a.point(lambda p: int(p * 0.35 * opacity))
        shadow = Image.merge("RGBA", (
            Image.new("L", scaled.size, 42),
            Image.new("L", scaled.size, 30),
            Image.new("L", scaled.size, 10),
            a_s,
        ))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    canvas.paste(shadow, (cx - scaled.width // 2 + 16,
                           cy - scaled.height // 2 + 24), shadow)

    # Opacité
    if opacity < 1.0 and scaled.mode == "RGBA":
        r2, g2, b2, a2 = scaled.split()
        a2 = a2.point(lambda p: int(p * opacity))
        scaled = Image.merge("RGBA", (r2, g2, b2, a2))

    canvas.paste(scaled, (cx - scaled.width // 2, cy - scaled.height // 2), scaled)


# ── Layout ────────────────────────────────────────────────────────────────────

def _compute_layout(members: list[dict], seed: int | None) -> list[dict]:
    """Attribue '_pos' à chaque membre selon la hiérarchie."""
    rng = random.Random(seed)
    n   = len(members)
    if n == 0:
        return members

    members = sorted(members, key=lambda m: ROLE_LEVEL.get(m.get("role", "mousse"), 3))

    if n == 1:
        members[0]["_pos"] = {"x": CX, "y": CY, "scale": 1.3, "rot": 0.0, "opacity": 1.0}
        return members
    if n == 2:
        return _layout_two(members, rng)
    if n > 20:
        return _layout_mosaic(members, rng)

    gs = 0.9 if n > 12 else 1.0
    return _layout_concentric(members, rng, gs)


def _layout_two(members: list[dict], rng: random.Random) -> list[dict]:
    for i, m in enumerate(members):
        m["_pos"] = {"x": CX + (660 if i else -660), "y": CY,
                     "scale": 0.95, "rot": rng.uniform(-5, 5), "opacity": 1.0}
    return members


def _layout_concentric(members: list[dict], rng: random.Random,
                        gs: float) -> list[dict]:
    """Placement en 4 cercles concentriques."""
    by_lv: dict[int, list] = {0: [], 1: [], 2: [], 3: []}
    for m in members:
        lv = ROLE_LEVEL.get(m.get("role", "mousse"), 3)
        by_lv[min(lv, 3)].append(m)

    # Niveau 0 — capitaine
    for m in by_lv[0]:
        m["_pos"] = {"x": CX, "y": CY, "scale": SCALES[0] * gs, "rot": 0.0, "opacity": 1.0}

    # Niveau 1 — officiers (angles diagonaux)
    l1_angles = [-45, 45, 135, -135]
    for i, m in enumerate(by_lv[1][:4]):
        a = math.radians(l1_angles[i])
        m["_pos"] = {
            "x": _clamp(CX + RADII_2X[1] * math.cos(a), MARGIN, WW - MARGIN),
            "y": _clamp(CY + RADII_2X[1] * math.sin(a), MARGIN, WH - MARGIN),
            "scale": SCALES[1] * gs, "rot": rng.uniform(-8, 8), "opacity": 1.0,
        }

    # Niveau 2 — membres standard (cercle externe + décalage 22.5°)
    l2 = by_lv[2][:8]
    for i, m in enumerate(l2):
        a = math.radians(22.5 + i * 360 / max(len(l2), 1))
        m["_pos"] = {
            "x": _clamp(CX + RADII_2X[2] * math.cos(a), MARGIN, WW - MARGIN),
            "y": _clamp(CY + RADII_2X[2] * math.sin(a), MARGIN + 200, WH - MARGIN),
            "scale": SCALES[2] * gs, "rot": rng.uniform(-12, 12), "opacity": 1.0,
        }

    # Niveau 3 — recrues (périphérie)
    for i, m in enumerate(by_lv[3]):
        a = math.radians(i * 360 / max(len(by_lv[3]), 1))
        m["_pos"] = {
            "x": _clamp(CX + RADII_2X[3] * math.cos(a), MARGIN + 100, WW - MARGIN - 100),
            "y": _clamp(CY + RADII_2X[3] * math.sin(a), MARGIN + 200, WH - MARGIN - 100),
            "scale": SCALES[3] * gs, "rot": rng.uniform(-15, 15), "opacity": 0.85,
        }
    return members


def _layout_mosaic(members: list[dict], rng: random.Random) -> list[dict]:
    """Mode mosaïque 4 colonnes pour 20+ membres."""
    cols   = 4
    rows   = math.ceil(len(members) / cols)
    cell_w = (WW - 2 * MARGIN) // cols
    cell_h = (WH - 2 * MARGIN - 300) // max(rows, 1)
    for i, m in enumerate(members):
        col = i % cols
        row = i // cols
        m["_pos"] = {
            "x": MARGIN + col * cell_w + cell_w // 2,
            "y": MARGIN + 300 + row * cell_h + cell_h // 2,
            "scale": 0.45, "rot": -5.0 if i % 2 == 0 else 5.0, "opacity": 1.0,
        }
    return members


# ── Connexions ────────────────────────────────────────────────────────────────

def _build_links(members: list[dict]) -> list[dict]:
    """Construit liens hiérarchiques automatiques + liens explicites."""
    links: list[dict] = []
    captain: str | None = None
    officers: list[str] = []

    for m in members:
        lv = ROLE_LEVEL.get(m.get("role", "mousse"), 3)
        n  = m.get("name", "")
        if lv == 0:
            captain = n
        elif lv == 1:
            officers.append(n)

    if captain:
        for off in officers:
            links.append({"from": captain, "to": off, "type": "hierarchy"})

    for m in members:
        for lnk in m.get("links", []):
            links.append({"from": m.get("name", ""), "to": lnk["target"],
                          "type": lnk.get("type", "team")})
    return links


def _draw_connections(canvas: Image.Image, members: list[dict],
                       links: list[dict]) -> None:
    """Trace les courbes de Bézier derrière les posters."""
    pos_map = {m["name"]: m["_pos"] for m in members if "_pos" in m}
    layer   = Image.new("RGBA", (WW, WH), (0, 0, 0, 0))
    draw    = ImageDraw.Draw(layer, "RGBA")
    counts: dict[str, int] = {}

    for i, lnk in enumerate(links):
        frm, to, ltype = lnk.get("from",""), lnk.get("to",""), lnk.get("type","team")
        if frm not in pos_map or to not in pos_map:
            continue
        if counts.get(frm, 0) >= 3 or counts.get(to, 0) >= 3:
            continue

        p0  = (pos_map[frm]["x"], pos_map[frm]["y"])
        p2  = (pos_map[to]["x"],  pos_map[to]["y"])
        ofs = 120 if i % 2 == 0 else -120
        p1  = _ctrl_point(p0, p2, ofs)
        pts = _bezier(p0, p1, p2, n=50)

        col, w = LINK_COLORS.get(ltype, BROWN_MEDIUM), LINK_WIDTHS.get(ltype, 4)
        _draw_curve(draw, pts, col, w, dashed=(ltype == "distant"))
        _draw_node(draw, p0, col)
        _draw_node(draw, p2, col)

        counts[frm] = counts.get(frm, 0) + 1
        counts[to]  = counts.get(to,  0) + 1

    canvas.paste(layer, mask=layer.split()[3])


def _draw_curve(draw: ImageDraw.ImageDraw, pts: list, col: tuple,
                w: int, dashed: bool) -> None:
    n = len(pts)
    fade = 8
    for i in range(n - 1):
        if dashed and (i // 3) % 2 == 1:
            continue
        if i < fade:
            alpha = int(220 * i / fade)
        elif i > n - fade:
            alpha = int(220 * (n - i) / fade)
        else:
            alpha = 220
        draw.line([pts[i], pts[i + 1]], fill=(*col, alpha), width=w)


def _draw_node(draw: ImageDraw.ImageDraw, pt: tuple, col: tuple) -> None:
    r = 10
    px, py = pt
    draw.ellipse([px - r, py - r, px + r, py + r], fill=(*col, 180))


# ── Décorations globales ──────────────────────────────────────────────────────

def _draw_title(draw: ImageDraw.ImageDraw, crew_name: str) -> None:
    cx = WW // 2
    draw.text((cx, 80), "ÉQUIPAGE  RECHERCHÉ",
              font=_fw(128), fill=(*INK, 220), anchor="mm")
    for sign, ox in ((1, 820), (-1, -820)):
        draw.text((cx + sign * ox, 80), "✦",
                  font=_fd(80), fill=(*GOLD_OLD, 200), anchor="mm")
    draw.text((cx, 164), crew_name.upper(),
              font=_fd(56), fill=(*BROWN_MEDIUM, 200), anchor="mm")
    draw.line([(cx - 700, 194), (cx + 700, 194)], fill=(*GOLD_OLD, 120), width=3)


def _draw_marine_seal(draw: ImageDraw.ImageDraw) -> None:
    cx, cy, r = WW - 240, WH - 240, 240
    draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                 fill=(27, 42, 70, 95), outline=(27, 42, 70, 160), width=6)
    draw.ellipse([cx - r + 20, cy - r + 20, cx + r - 20, cy + r - 20],
                 outline=(*GOLD_OLD, 120), width=3)
    draw.text((cx, cy),      "MARINE",           font=_fw(60), fill=(245, 240, 225, 175), anchor="mm")
    draw.text((cx, cy + 74), "WORLD GOVERNMENT", font=_fl(22), fill=(245, 240, 225, 135), anchor="mm")


def _draw_date_stamp(draw: ImageDraw.ImageDraw) -> None:
    today = date.today().strftime("%d / %m / %Y")
    draw.text((MARGIN + 20, WH - 80), f"Émis le : {today}",
              font=_fd(36), fill=(*BROWN_MEDIUM, 175), anchor="lm")


def _draw_total_box(draw: ImageDraw.ImageDraw, total: int, n: int) -> None:
    x1, y1 = WW - MARGIN - 600, MARGIN
    x2, y2 = WW - MARGIN,       MARGIN + 230
    draw.rounded_rectangle([x1, y1, x2, y2], radius=12,
                            fill=(*PARCHMENT_DARK, 180), outline=(*GOLD_OLD, 160), width=4)
    cx = (x1 + x2) // 2
    draw.text((cx, y1 + 52),  "PRIME TOTALE",     font=_fl(36), fill=INK,     anchor="mm")
    draw.text((cx, y1 + 112), f"{n} membres",     font=_fi(32), fill=INK_SOFT, anchor="mm")
    draw.line([(x1 + 20, y1 + 140), (x2 - 20, y1 + 140)], fill=(*GOLD_OLD, 120), width=2)
    draw.text((cx, y1 + 192), _fmt_bounty(total), font=_fw(44), fill=INK,     anchor="mm")


def _draw_decorations(canvas: Image.Image, crew_name: str,
                       members: list[dict], show_total: bool) -> None:
    draw = ImageDraw.Draw(canvas, "RGBA")
    _draw_title(draw, crew_name)
    _draw_marine_seal(draw)
    _draw_date_stamp(draw)
    if show_total:
        total = sum(m.get("bounty", 0) or 0 for m in members)
        _draw_total_box(draw, total, len(members))


# ── Post-processing ───────────────────────────────────────────────────────────

def _apply_aging(canvas: Image.Image, rng: random.Random) -> Image.Image:
    """Grain, désaturation légère, color-grading sépia, blur périphérique."""
    try:
        import numpy as np

        arr = np.array(canvas.convert("RGB"), dtype=np.float32)
        rng_np = np.random.default_rng(rng.randint(0, 2**32))

        # Grain papier 5%
        grain = rng_np.normal(0, 5, arr.shape[:2])
        arr[:, :, 0] = np.clip(arr[:, :, 0] + grain,       0, 255)
        arr[:, :, 1] = np.clip(arr[:, :, 1] + grain * 0.9, 0, 255)
        arr[:, :, 2] = np.clip(arr[:, :, 2] + grain * 0.7, 0, 255)

        # Désaturation -8%
        lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
        for c in range(3):
            arr[:, :, c] = arr[:, :, c] * 0.92 + lum * 0.08

        # Color-grading sépia
        arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.02, 0, 255)
        arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.96, 0, 255)

        result = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    except ImportError:
        result = canvas.convert("RGB")

    # Blur périphérique 30px
    blurred = result.filter(ImageFilter.GaussianBlur(1))
    mask    = Image.new("L", result.size, 255)
    d       = ImageDraw.Draw(mask)
    d.rectangle([30, 30, WW - 31, WH - 31], fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(20))
    result.paste(blurred, mask=mask)
    return result


# ── Point d'entrée ────────────────────────────────────────────────────────────

def _build_sync(crew_data: dict, output_path: str,
                show_links: bool, show_total: bool, seed: int) -> str:
    """Génération synchrone — exécutée dans l'executor."""
    t0      = time.monotonic()
    rng     = random.Random(seed)
    members = list(crew_data.get("members", []))
    if not members:
        raise ValueError("crew_data['members'] est vide")

    members = _compute_layout(members, seed)

    # Canvas 2×
    canvas = Image.new("RGBA", (WW, WH), PARCHMENT)
    _draw_background(canvas, rng)

    # Connexions (derrière les posters)
    if show_links:
        _draw_connections(canvas, members, _build_links(members))

    # Posters — du plus petit au plus grand (z-order)
    for m in sorted(members, key=lambda m: m.get("_pos", {}).get("scale", 0)):
        pos = m.get("_pos", {})
        _place_poster(canvas, _make_poster(m, _role_color(m.get("role", "mousse")), rng),
                      pos.get("x", CX), pos.get("y", CY),
                      pos.get("scale", 0.65), pos.get("rot", 0.0),
                      pos.get("opacity", 1.0))

    _draw_decorations(canvas, crew_data.get("name", "???"), members, show_total)

    final = _apply_aging(canvas, rng).resize((W, H), Image.LANCZOS)

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    final.save(str(out), format="PNG", compress_level=6)
    log.info("Constellation générée en %.2fs (%d membres) → %s",
             time.monotonic() - t0, len(members), output_path)
    return str(out)


async def build_constellation(
    crew_data:   dict,
    output_path: str,
    style:       str       = "classic",   # réservé pour future extension
    show_links:  bool      = True,
    show_total:  bool      = True,
    seed:        int | None = None,
) -> str:
    """
    Génère la constellation PNG pour un équipage.

    Args:
        crew_data:   {"name": str, "members": list[dict]}
        output_path: chemin du fichier PNG de sortie
        style:       "classic" | "dark" | "marine" (réservé)
        show_links:  afficher les lignes de connexion
        show_total:  afficher l'encadré prime totale
        seed:        graine aléatoire (reproductibilité)

    Returns:
        Chemin absolu du fichier généré.

    Structure d'un membre :
        {
          "name": str, "nickname": str | None,
          "bounty": int | None, "role": str,
          "image_bytes": bytes | None,   # avatar brut
          "links": [{"target": str, "type": "hierarchy"|"team"|"strong"|"distant"}]
        }
    """
    if seed is None:
        seed = random.randint(0, 2**31)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _executor,
        _build_sync,
        crew_data, output_path, show_links, show_total, seed,
    )
