import io
import discord
from PIL import Image, ImageDraw, ImageFont
from .utils import fmt_berries


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in ["PirataOne-Regular.ttf", "Righteous-Regular.ttf", "KOMIKAX_.ttf"]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def generate_leaderboard_image(crews: list[dict]) -> discord.File:
    W, H   = 800, 60 + len(crews) * 56 + 20
    img    = Image.new("RGBA", (W, H), (15, 12, 30))
    draw   = ImageDraw.Draw(img)
    font_t = _load_font(28)
    font_n = _load_font(20)
    font_s = _load_font(16)

    # Titre
    draw.text((W // 2, 20), "🏆 Classement des Équipages", font=font_t, fill=(255, 215, 0), anchor="mt")

    medals = ["🥇", "🥈", "🥉"]
    top3_colors = [(255, 215, 0), (192, 192, 192), (205, 127, 50)]

    for i, crew in enumerate(crews[:20]):
        y      = 60 + i * 56
        is_top3 = i < 3
        bg     = (30, 25, 55) if i % 2 == 0 else (22, 18, 44)
        draw.rectangle([(10, y), (W - 10, y + 50)], fill=bg, outline=(80, 70, 120), width=1)

        rank_color = top3_colors[i] if is_top3 else (180, 180, 200)
        rank_txt   = f"#{i+1}" if i >= 3 else ["1st", "2nd", "3rd"][i]
        draw.text((30, y + 12), rank_txt, font=font_n, fill=rank_color)

        name  = crew['name'][:22]
        tag   = f"[{crew['tag']}]"
        draw.text((100, y + 8),  name, font=font_n, fill=(255, 255, 255))
        draw.text((100, y + 30), tag,  font=font_s, fill=(180, 160, 255))

        bounty = f"{fmt_berries(crew['total_bounty'])} 🍊"
        lvl    = f"Niv. {crew['level']}"
        draw.text((W - 200, y + 8),  bounty, font=font_s, fill=(255, 220, 80))
        draw.text((W - 200, y + 30), lvl,    font=font_s, fill=(140, 200, 255))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return discord.File(buf, filename="leaderboard.png")
