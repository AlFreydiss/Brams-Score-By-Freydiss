import os
from dotenv import load_dotenv

load_dotenv()

TOKEN: str = os.getenv("DISCORD_TOKEN", "")
DATA_FILE: str = "data.json"
TOP_BERRIES_DIR: str = "top_berries"
TOP_BERRIES_FILE: str = os.path.join(TOP_BERRIES_DIR, "leaderboard.json")
ANNOUNCE_CHANNEL: str = "rappel-rank"
BERRIES_PER_VOCAL_MINUTE: int = 1000

RANKS: list[tuple[int, str]] = [
    (70, "Yonko"),
    (40, "Amiral"),
    (25, "Shichibukai"),
    (10, "Pirate"),
]

RANK_EMOJIS: dict[str, str] = {
    "Pirate":      "🏴‍☠️",
    "Shichibukai": "⚔️",
    "Amiral":      "🪖",
    "Yonko":       "👑",
}
