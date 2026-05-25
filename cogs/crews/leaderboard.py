import io
import discord
from PIL import Image, ImageDraw, ImageFont
from .utils import fmt_berries


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in ["PirataOne-Regular.ttf", "Righteous-Regular.ttf", "BebasNeue-Regular.ttf"]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def generate_leaderboard_image(crews: list[dict]) -> discord.File:
    crews = crews[:20]
    ROW_H = 58
    W     = 820
    H     = 70 + len(crews) * ROW_H + 20

    img  = Image.new("RGBA", (W, H), (10, 8, 25))
    draw = ImageDraw.Draw(img)

    # Dégradé vertical simple en fond
    for y in range(H):
        alpha = int(30 * (1 - y / H))
        draw.line([(0, y), (W, y)], fill=(30, 20, 60, alpha))

    font_title = _font(30)
    font_name  = _font(20)
    font_sub   = _font(15)

    # Titre
    draw.rectangle([(0, 0), (W, 52)], fill=(20, 15, 50))
    draw.text((W // 2, 26), "CLASSEMENT DES EQUIPAGES", font=font_title,
              fill=(255, 215, 0), anchor="mm")

    RANK_COLORS = [(255, 215, 0), (200, 200, 210), (205, 127, 50)]
    ROW_COLORS  = [(28, 22, 52), (22, 17, 42)]

    for i, crew in enumerate(crews):
        y  = 58 + i * ROW_H
        bg = ROW_COLORS[i % 2]
        draw.rectangle([(8, y + 2), (W - 8, y + ROW_H - 2)], fill=bg)

        # Séparateur gauche coloré pour top 3
        if i < 3:
            draw.rectangle([(8, y + 2), (14, y + ROW_H - 2)], fill=RANK_COLORS[i])

        rank_col = RANK_COLORS[i] if i < 3 else (160, 160, 180)
        draw.text((32, y + ROW_H // 2), f"#{i + 1}", font=font_name,
                  fill=rank_col, anchor="lm")

        name = crew['name'][:24]
        tag  = f"[{crew['tag']}]"
        draw.text((90, y + 10),       name, font=font_name, fill=(245, 245, 255))
        draw.text((90, y + 32),       tag,  font=font_sub,  fill=(160, 140, 220))

        lvl_txt    = f"Niv. {crew['level']}"
        bounty_txt = f"{fmt_berries(crew['total_bounty'])} B"
        wars_txt   = f"{crew['wars_won']}V/{crew['wars_lost']}D"

        draw.text((W - 20, y + 10),  bounty_txt, font=font_sub, fill=(255, 215, 80),  anchor="rm")
        draw.text((W - 20, y + 32),  f"{lvl_txt}  {wars_txt}", font=font_sub,
                  fill=(130, 190, 255), anchor="rm")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return discord.File(buf, filename="leaderboard.png")
