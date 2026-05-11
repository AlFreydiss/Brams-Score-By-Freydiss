import io
import discord
from PIL import Image


def get_spacer_file() -> discord.File:
    """PNG transparent 800×1 — force Discord à élargir l'embed au maximum."""
    buf = io.BytesIO()
    Image.new("RGBA", (800, 1), (0, 0, 0, 0)).save(buf, format="PNG")
    buf.seek(0)
    return discord.File(buf, filename="spacer.png")
