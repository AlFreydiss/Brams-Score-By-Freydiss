import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('bot.py', 'r', encoding='utf-8') as f:
    c = f.read()

# --- Polices ---
c = c.replace(
    '_CF_QUOTE  = _cit_font("BebasNeue-Regular.ttf",        56)',
    '_CF_QUOTE  = _cit_font("CormorantGaramond-Italic.ttf", 40)'
)
c = c.replace(
    '_CF_NAME   = _cit_font("CormorantGaramond-Bold.ttf",   44)',
    '_CF_NAME   = _cit_font("CormorantGaramond-Bold.ttf",   38)'
)
c = c.replace(
    '_CF_SERIE  = _cit_font("Rajdhani-SemiBold.ttf",        21)',
    '_CF_SERIE  = _cit_font("Rajdhani-Light.ttf",           16)'
)
c = c.replace(
    '_CF_QMARK  = _cit_font("CormorantGaramond-Bold.ttf",   80)',
    '_CF_QMARK  = _cit_font("CormorantGaramond-Italic.ttf", 90)'
)

NEW_OVERLAY = """
def _build_citation_overlay(W: int, H: int, citation: str, perso: str, serie: str) -> Image.Image:
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    GOLD   = (212, 175, 55)
    IVORY  = (245, 240, 225)
    MARGIN = 56

    # Vignette tres douce — preserves l'image
    for i in range(50):
        t = ((50 - i) / 50) ** 2.2
        a = int(55 * t)
        d.line([(0, i), (W, i)], fill=(0, 0, 0, a))
        d.line([(i, 0), (i, H)], fill=(0, 0, 0, int(40 * t)))
        d.line([(W - 1 - i, 0), (W - 1 - i, H)], fill=(0, 0, 0, int(40 * t)))

    # Gradient bas — doux, preserve le ciel
    GRAD_S = int(H * 0.45)
    for y in range(GRAD_S, H):
        t = (y - GRAD_S) / (H - GRAD_S)
        d.line([(0, y), (W, y)], fill=(4, 4, 10, int(175 * (t ** 0.7))))

    # Watermark
    WM    = "BRAMS COMMUNITY"
    wm_bb = d.textbbox((0, 0), WM, font=_CF_WM)
    d.text((W - (wm_bb[2] - wm_bb[0]) - 20, 16), WM, font=_CF_WM, fill=(255, 255, 255, 22))

    # Wrap citation
    MAX_W = int(W * 0.68)
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
        if len(lines) == 4:
            cur = ""
            break
    if cur and len(lines) < 4:
        lines.append(cur)
    if not lines:
        lines = [citation[:60]]
    if len(lines) == 4:
        last = lines[-1]
        while last:
            bb = d.textbbox((0, 0), last + "…", font=_CF_QUOTE)
            if bb[2] - bb[0] <= MAX_W:
                break
            last = last.rsplit(" ", 1)[0]
        lines[-1] = last + "…"

    # Layout bottom-up
    LINE_H  = 50
    n       = len(lines)
    NAME_H  = 40
    GAP_BOT = 22
    GAP_QM  = 14
    GAP_TS  = 18
    GAP_SN  = 8
    GAP_NS  = 10
    total   = GAP_QM + 36 + n * LINE_H + GAP_TS + NAME_H + GAP_NS + 20 + GAP_BOT
    block_y = H - total

    # Guillemet ouvrant — grand, or, positionne en haut du bloc
    qm_bb = d.textbbox((0, 0), "“", font=_CF_QMARK)
    qm_h  = qm_bb[3] - qm_bb[1]
    QM_Y  = block_y
    d.text((MARGIN - 4, QM_Y), "“", font=_CF_QMARK, fill=(*GOLD, 200))

    # Filet dore vertical tres fin — de sous le guillemet jusqu'en bas
    LINE_X  = MARGIN - 1
    LINE_Y0 = QM_Y + qm_h - 10
    LINE_Y1 = H - GAP_BOT
    d.rectangle([(LINE_X, LINE_Y0), (LINE_X + 1, LINE_Y1)], fill=(*GOLD, 90))

    # Texte citation en italique
    TEXT_Y = QM_Y + qm_h + GAP_QM - 8
    for i, line in enumerate(lines):
        y = TEXT_Y + i * LINE_H
        d.text((MARGIN + 1, y + 1), line, font=_CF_QUOTE, fill=(0, 0, 0, 130))
        d.text((MARGIN, y), line, font=_CF_QUOTE, fill=(*IVORY, 240))

    # Separateur — fine ligne or simple
    SEP_Y = TEXT_Y + n * LINE_H + GAP_TS
    d.line([(MARGIN, SEP_Y), (MARGIN + 80, SEP_Y)], fill=(*GOLD, 180), width=1)

    # Nom perso
    NAME_Y = SEP_Y + GAP_SN
    d.text((MARGIN + 1, NAME_Y + 1), perso, font=_CF_NAME, fill=(0, 0, 0, 120))
    d.text((MARGIN, NAME_Y), perso, font=_CF_NAME, fill=(*GOLD, 255))

    # Serie — espacee et legere
    SERIE_Y   = NAME_Y + NAME_H + GAP_NS
    serie_str = "  ".join(serie.upper())
    d.text((MARGIN, SERIE_Y), serie_str, font=_CF_SERIE, fill=(*GOLD, 150))

    return overlay

"""

start = c.find('\ndef _build_citation_overlay(')
end   = c.find('\nasync def make_citation_image(')
c = c[:start] + NEW_OVERLAY + c[end:]

with open('bot.py', 'w', encoding='utf-8') as f:
    f.write(c)
print("Done")
