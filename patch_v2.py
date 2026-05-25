import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('bot.py', 'r', encoding='utf-8') as f:
    c = f.read()

# Fonts — plus grands, plus impactants
c = c.replace(
    '_CF_QUOTE  = _cit_font("BebasNeue-Regular.ttf",        50)',
    '_CF_QUOTE  = _cit_font("BebasNeue-Regular.ttf",        56)'
)
c = c.replace(
    '_CF_NAME   = _cit_font("CormorantGaramond-Bold.ttf",   38)',
    '_CF_NAME   = _cit_font("CormorantGaramond-Bold.ttf",   44)'
)
c = c.replace(
    '_CF_SERIE  = _cit_font("Rajdhani-SemiBold.ttf",        19)',
    '_CF_SERIE  = _cit_font("Rajdhani-SemiBold.ttf",        21)'
)
c = c.replace(
    '_CF_QMARK  = _cit_font("CormorantGaramond-Bold.ttf",   65)',
    '_CF_QMARK  = _cit_font("CormorantGaramond-Bold.ttf",   80)'
)

NEW_OVERLAY = """
def _build_citation_overlay(W: int, H: int, citation: str, perso: str, serie: str) -> Image.Image:
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    GOLD   = (215, 175, 58)
    MARGIN = 48

    # Teinte sombre sur toute l'image (tue la paleur du perso)
    for y in range(H):
        t = y / H
        a = int(60 * (1 - t) + 30 * t)
        d.line([(0, y), (W, y)], fill=(0, 0, 8, a))

    # Degrade bas fort et dense
    GRAD_S = int(H * 0.38)
    for y in range(GRAD_S, H):
        t = (y - GRAD_S) / (H - GRAD_S)
        d.line([(0, y), (W, y)], fill=(2, 3, 12, int(210 * (t ** 0.58))))

    # Vignette bords
    for i in range(70):
        t = ((70 - i) / 70) ** 2
        a = int(100 * t)
        d.line([(0, i), (W, i)], fill=(0, 0, 0, a))
        d.line([(i, 0), (i, H // 2)], fill=(0, 0, 0, a))
        d.line([(W - 1 - i, 0), (W - 1 - i, H // 2)], fill=(0, 0, 0, a))

    # Watermark
    WM    = "BRAMS COMMUNITY"
    wm_bb = d.textbbox((0, 0), WM, font=_CF_WM)
    d.text((W - (wm_bb[2] - wm_bb[0]) - 20, 16), WM, font=_CF_WM, fill=(255, 255, 255, 30))

    # Wrap citation — zone large pour remplir la carte
    MAX_W = int(W * 0.72)
    words, lines, cur = citation.split(), [], ""
    for word in words:
        test = (cur + " " + word).strip()
        bb   = d.textbbox((0, 0), test, font=_CF_QUOTE)
        if bb[2] - bb[0] <= MAX_W:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
        if len(lines) == 3:
            cur = ""
            break
    if cur and len(lines) < 3:
        lines.append(cur)
    if not lines:
        lines = [citation[:50]]
    if len(lines) == 3:
        last = lines[-1]
        while last:
            bb = d.textbbox((0, 0), last + " ...", font=_CF_QUOTE)
            if bb[2] - bb[0] <= MAX_W:
                break
            last = last.rsplit(" ", 1)[0]
        lines[-1] = last + " ..."

    # Layout calcule depuis le bas
    LINE_H  = 60
    n       = len(lines)
    NAME_H  = 48
    GAP_BOT = 16
    GAP_NS  = 12
    GAP_SN  = 20
    GAP_TS  = 24
    total   = n * LINE_H + GAP_TS + GAP_SN + NAME_H + GAP_NS + 24 + GAP_BOT
    quote_y = H - total

    # Barre doree verticale gauche (haute)
    BAR_TOP = quote_y - 20
    d.rectangle([(MARGIN - 16, BAR_TOP), (MARGIN - 12, H - GAP_BOT)], fill=(*GOLD, 230))

    # Guillemet dore visible au-dessus
    d.text((MARGIN - 4, quote_y - 22), "\\u201c", font=_CF_QMARK, fill=(*GOLD, 220))

    # Texte citation — ombre epaisse pour lisibilite
    for i, line in enumerate(lines):
        y = quote_y + i * LINE_H
        # Ombre forte
        for ox, oy in [(2, 2), (3, 3), (-1, 2)]:
            d.text((MARGIN + ox, y + oy), line, font=_CF_QUOTE, fill=(0, 0, 0, 200))
        d.text((MARGIN, y), line, font=_CF_QUOTE, fill=(255, 255, 255, 255))

    # Separateur large et visible
    SEP_Y  = quote_y + n * LINE_H + GAP_TS
    SEP_R  = MARGIN + MAX_W
    SEP_MX = MARGIN + MAX_W // 2
    d.line([(MARGIN, SEP_Y), (SEP_MX - 14, SEP_Y)], fill=(*GOLD, 200), width=2)
    d.polygon([(SEP_MX - 9, SEP_Y), (SEP_MX, SEP_Y - 7),
               (SEP_MX + 9, SEP_Y), (SEP_MX, SEP_Y + 7)], fill=(*GOLD, 240))
    d.line([(SEP_MX + 14, SEP_Y), (SEP_R, SEP_Y)], fill=(*GOLD, 200), width=2)

    # Nom perso en or, grand
    NAME_Y = SEP_Y + GAP_SN
    d.text((MARGIN + 2, NAME_Y + 2), perso, font=_CF_NAME, fill=(0, 0, 0, 160))
    d.text((MARGIN,     NAME_Y),     perso, font=_CF_NAME, fill=(*GOLD, 255))

    # Serie en dessous, espacee
    SERIE_Y   = NAME_Y + NAME_H + GAP_NS
    serie_str = "  ".join(serie.upper())
    d.text((MARGIN, SERIE_Y), serie_str, font=_CF_SERIE, fill=(*GOLD, 180))

    return overlay

"""

start = c.find('\ndef _build_citation_overlay(')
end   = c.find('\nasync def make_citation_image(')
c = c[:start] + NEW_OVERLAY + c[end:]

with open('bot.py', 'w', encoding='utf-8') as f:
    f.write(c)
print("Done")
