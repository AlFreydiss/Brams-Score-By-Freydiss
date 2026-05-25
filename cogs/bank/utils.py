from __future__ import annotations
import random
from datetime import datetime, timezone

import discord

from .constants import RANKS, DAILY_RATIO, DAILY_MIN, DAILY_MAX, FOOTER, GOLD, CARD_VALS, CARD_SUITS, CARD_RANKS

# ── Formatage ─────────────────────────────────────────────────────

def fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ") + " ฿"


# ── Rangs ─────────────────────────────────────────────────────────

def get_rank(total_earned: int) -> dict:
    rank = RANKS[0]
    for r in RANKS:
        if total_earned >= r["threshold"]:
            rank = r
    return rank


def get_next_rank(total_earned: int) -> dict | None:
    for r in RANKS:
        if total_earned < r["threshold"]:
            return r
    return None


# ── Limite journalière ────────────────────────────────────────────

_GAME_TODAY: dict = {}  # uid -> {"date": str, "earned": int}


def get_earned_today(uid: str) -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = _GAME_TODAY.get(uid, {"date": "", "earned": 0})
    return entry["earned"] if entry["date"] == today else 0


def add_earned_today(uid: str, amount: int):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = _GAME_TODAY.get(uid, {"date": today, "earned": 0})
    if entry["date"] != today:
        entry = {"date": today, "earned": 0}
    entry["earned"] += amount
    _GAME_TODAY[uid] = entry


def daily_cap(balance: int) -> int:
    return max(DAILY_MIN, min(int(balance * DAILY_RATIO), DAILY_MAX))


# ── Parsing montant ───────────────────────────────────────────────

def parse_amount(s: str, wallet: int) -> int | None:
    s = s.lower().strip().replace(" ", "").replace(" ", "").replace("_", "")
    if s in ("all", "tout", "max"):
        return wallet
    try:
        if s.endswith("k"):
            return int(float(s[:-1]) * 1_000)
        if s.endswith("m"):
            return int(float(s[:-1]) * 1_000_000)
        return int(s)
    except ValueError:
        return None


# ── Embeds ────────────────────────────────────────────────────────

def mk_embed(title: str, desc: str = "", color: int = GOLD) -> discord.Embed:
    e = discord.Embed(title=title, description=desc, color=color)
    e.set_footer(text=FOOTER)
    return e


def err_embed(msg: str) -> discord.Embed:
    return mk_embed("❌ Erreur", msg, color=0xe74c3c)


# ── Check propriétaire ────────────────────────────────────────────

def is_owner(uid: str, interaction: discord.Interaction) -> bool:
    return str(interaction.user.id) == uid


async def deny(interaction: discord.Interaction):
    await interaction.response.send_message(
        embed=err_embed("Ce menu ne t'appartient pas, Rookie !"), ephemeral=True
    )


# ── Blackjack helpers ─────────────────────────────────────────────

def new_deck() -> list[dict]:
    deck = [{"rank": r, "suit": s} for r in CARD_RANKS for s in CARD_SUITS]
    random.shuffle(deck)
    return deck


def hand_value(hand: list[dict]) -> int:
    total = sum(CARD_VALS[c["rank"]] for c in hand)
    aces  = sum(1 for c in hand if c["rank"] == "A")
    while total > 21 and aces:
        total -= 10
        aces  -= 1
    return total


def fmt_hand(hand: list[dict]) -> str:
    return "  ".join(f"{c['rank']}{c['suit']}" for c in hand)
