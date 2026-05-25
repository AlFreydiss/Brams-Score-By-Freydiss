import asyncio
import json
import os
import shutil
from datetime import datetime, timezone
from typing import Any

from config import DATA_FILE, TOP_BERRIES_DIR, TOP_BERRIES_FILE

_lock = asyncio.Lock()

_DEFAULTS: dict[str, Any] = {
    "vocal_sessions": [],
    "join_time": None,
    "messages": [],
    "berrys": 0,
    "berrys_vocal_seconds_paid": 0,
    "last_rank": None,
    "alerted": False,
}


async def load_data() -> dict:
    """Lecture thread-safe avec encodage UTF-8 et récupération sur corruption."""
    async with _lock:
        if not os.path.exists(DATA_FILE):
            return {}
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            shutil.copy2(DATA_FILE, DATA_FILE + ".bak")
            return {}


async def save_data(data: dict) -> None:
    """Écriture atomique via fichier temporaire — aucune corruption en cas de crash."""
    tmp = DATA_FILE + ".tmp"
    async with _lock:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, DATA_FILE)


def build_berry_leaderboard(data: dict, names: dict[str, str] | None = None) -> dict[str, Any]:
    entries: list[dict[str, Any]] = []
    name_map = names or {}

    for uid, user in data.items():
        if not isinstance(user, dict):
            continue
        berries = int(user.get("berrys") or 0)
        if berries <= 0:
            continue

        entries.append(
            {
                "uid": str(uid),
                "display_name": name_map.get(str(uid), str(uid)),
                "berrys": berries,
                "berrys_vocal_seconds_paid": int(user.get("berrys_vocal_seconds_paid") or 0),
            }
        )

    entries.sort(key=lambda item: (-item["berrys"], item["display_name"].lower(), item["uid"]))
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "entries": entries,
    }


async def refresh_berry_leaderboard(data: dict, names: dict[str, str] | None = None) -> dict[str, Any]:
    payload = build_berry_leaderboard(data, names=names)
    async with _lock:
        os.makedirs(TOP_BERRIES_DIR, exist_ok=True)
        tmp = TOP_BERRIES_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        os.replace(tmp, TOP_BERRIES_FILE)
    return payload


async def load_berry_leaderboard() -> dict[str, Any]:
    async with _lock:
        if not os.path.exists(TOP_BERRIES_FILE):
            return {"generated_at": None, "entries": []}
        try:
            with open(TOP_BERRIES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {"generated_at": None, "entries": []}


def get_user(data: dict, uid: str) -> dict:
    if uid not in data:
        data[uid] = {
            k: list(v) if isinstance(v, list) else v
            for k, v in _DEFAULTS.items()
        }
    else:
        for key, default in _DEFAULTS.items():
            if key not in data[uid]:
                data[uid][key] = list(default) if isinstance(default, list) else default
    return data[uid]
