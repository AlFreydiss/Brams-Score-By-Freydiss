import os, json, asyncio, random as _rnd
import psycopg2, psycopg2.extras
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="bank2_db")
_URL = os.environ.get("SUPABASE_URL", "")


def _conn():
    return psycopg2.connect(_URL, sslmode="require", connect_timeout=10)


async def _run(fn):
    return await asyncio.get_running_loop().run_in_executor(_executor, fn)


# ── INIT ──────────────────────────────────────────────────────────

async def init_tables():
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS bank_profiles (
                    user_id          TEXT PRIMARY KEY,
                    guild_id         TEXT,
                    total_earned     BIGINT DEFAULT 0,
                    total_lost       BIGINT DEFAULT 0,
                    invested         BIGINT DEFAULT 0,
                    last_collect     TIMESTAMPTZ DEFAULT NOW(),
                    bounty           BIGINT DEFAULT 0,
                    pillage_last     TIMESTAMPTZ,
                    updated_at       TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS bank_transactions (
                    id          SERIAL PRIMARY KEY,
                    user_id     TEXT,
                    guild_id    TEXT,
                    type        TEXT,
                    amount      BIGINT,
                    description TEXT,
                    ts          TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS bank_shop_effects (
                    id          SERIAL PRIMARY KEY,
                    user_id     TEXT,
                    guild_id    TEXT,
                    effect_type TEXT,
                    expires_at  TIMESTAMPTZ
                );
                CREATE TABLE IF NOT EXISTS bank_lottery (
                    id             SERIAL PRIMARY KEY,
                    guild_id       TEXT,
                    ticket_holders JSONB DEFAULT '[]'::jsonb,
                    winner_id      TEXT,
                    pot            BIGINT DEFAULT 0,
                    drawn_at       TIMESTAMPTZ,
                    active         BOOLEAN DEFAULT TRUE,
                    created_at     TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            conn.commit()
            cur.close()
        finally:
            conn.close()
    await _run(_do)


# ── PROFIL ────────────────────────────────────────────────────────

async def get_or_create(uid: str, guild_id: str) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "INSERT INTO bank_profiles (user_id, guild_id) VALUES (%s,%s) ON CONFLICT (user_id) DO NOTHING",
                (uid, guild_id),
            )
            conn.commit()
            cur.execute("SELECT * FROM bank_profiles WHERE user_id=%s", (uid,))
            row = cur.fetchone()
            cur.close()
            return dict(row) if row else {}
        finally:
            conn.close()
    return await _run(_do)


async def get_profile(uid: str) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM bank_profiles WHERE user_id=%s", (uid,))
            row = cur.fetchone()
            cur.close()
            return dict(row) if row else {}
        finally:
            conn.close()
    return await _run(_do)


# ── TRANSACTIONS ─────────────────────────────────────────────────

async def log_tx(uid: str, guild_id: str, type_: str, amount: int, desc: str = ""):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO bank_transactions (user_id,guild_id,type,amount,description) VALUES (%s,%s,%s,%s,%s)",
                (uid, guild_id, type_, amount, desc),
            )
            if amount > 0:
                cur.execute(
                    "UPDATE bank_profiles SET total_earned=total_earned+%s, bounty=bounty+%s, updated_at=NOW() WHERE user_id=%s",
                    (amount, amount, uid),
                )
            else:
                cur.execute(
                    "UPDATE bank_profiles SET total_lost=total_lost+%s, updated_at=NOW() WHERE user_id=%s",
                    (-amount, uid),
                )
            conn.commit()
            cur.close()
        finally:
            conn.close()
    await _run(_do)


async def get_day_stats(uid: str, guild_id: str) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT
                    COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) AS earned,
                    COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0) AS lost
                FROM bank_transactions
                WHERE user_id=%s AND guild_id=%s AND ts >= NOW() - INTERVAL '1 day'
            """, (uid, guild_id))
            row = cur.fetchone()
            cur.close()
            return dict(row) if row else {"earned": 0, "lost": 0}
        finally:
            conn.close()
    return await _run(_do)


async def get_game_stats(uid: str) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("""
                SELECT type,
                    COUNT(*) FILTER (WHERE amount > 0) AS wins,
                    COUNT(*) FILTER (WHERE amount < 0) AS losses,
                    COALESCE(SUM(amount)  FILTER (WHERE amount > 0),  0) AS earned,
                    COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0) AS lost
                FROM bank_transactions
                WHERE user_id=%s AND type LIKE 'jeu_%%'
                GROUP BY type
            """, (uid,))
            rows = cur.fetchall()
            cur.close()
            return {r["type"]: dict(r) for r in rows}
        finally:
            conn.close()
    return await _run(_do)


# ── INVESTISSEMENT ────────────────────────────────────────────────

async def update_invest(uid: str, invested: int, last_collect: datetime):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE bank_profiles SET invested=%s, last_collect=%s, updated_at=NOW() WHERE user_id=%s",
                (invested, last_collect, uid),
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()
    await _run(_do)


async def get_all_investors() -> list[dict]:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM bank_profiles WHERE invested > 0")
            rows = cur.fetchall()
            cur.close()
            return [dict(r) for r in rows]
        finally:
            conn.close()
    return await _run(_do)


# ── EFFETS BOUTIQUE ───────────────────────────────────────────────

async def get_effect(uid: str, effect_type: str) -> dict | None:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT * FROM bank_shop_effects WHERE user_id=%s AND effect_type=%s AND expires_at > NOW() LIMIT 1",
                (uid, effect_type),
            )
            row = cur.fetchone()
            cur.close()
            return dict(row) if row else None
        finally:
            conn.close()
    return await _run(_do)


async def add_effect(uid: str, guild_id: str, effect_type: str, duration_h: int):
    expires = datetime.now(timezone.utc) + timedelta(hours=duration_h)
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO bank_shop_effects (user_id,guild_id,effect_type,expires_at) VALUES (%s,%s,%s,%s)",
                (uid, guild_id, effect_type, expires),
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()
    await _run(_do)


# ── PILLAGE ───────────────────────────────────────────────────────

async def set_pillage_cooldown(uid: str):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE bank_profiles SET pillage_last=NOW() WHERE user_id=%s", (uid,))
            conn.commit()
            cur.close()
        finally:
            conn.close()
    await _run(_do)


# ── LOTERIE ───────────────────────────────────────────────────────

async def ensure_lottery(guild_id: str) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM bank_lottery WHERE guild_id=%s AND active=TRUE ORDER BY id DESC LIMIT 1", (guild_id,))
            row = cur.fetchone()
            if row:
                conn.close()
                return dict(row)
            cur.execute("INSERT INTO bank_lottery (guild_id) VALUES (%s) RETURNING *", (guild_id,))
            row = cur.fetchone()
            conn.commit()
            cur.close()
            return dict(row)
        finally:
            conn.close()
    return await _run(_do)


async def add_ticket(lottery_id: int, uid: str, ticket_price: int) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "UPDATE bank_lottery SET ticket_holders=ticket_holders||%s::jsonb, pot=pot+%s WHERE id=%s RETURNING *",
                (json.dumps([uid]), ticket_price, lottery_id),
            )
            row = cur.fetchone()
            conn.commit()
            cur.close()
            return dict(row)
        finally:
            conn.close()
    return await _run(_do)


async def draw_lottery(guild_id: str) -> dict | None:
    def _get():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM bank_lottery WHERE guild_id=%s AND active=TRUE ORDER BY id DESC LIMIT 1", (guild_id,))
            row = cur.fetchone()
            cur.close()
            return dict(row) if row else None
        finally:
            conn.close()
    lotto = await _run(_get)
    if not lotto:
        return None
    holders = lotto.get("ticket_holders") or []
    if not holders:
        return None
    winner = _rnd.choice(holders)
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE bank_lottery SET active=FALSE, winner_id=%s, drawn_at=NOW() WHERE id=%s",
                (winner, lotto["id"]),
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()
    await _run(_do)
    return {"winner_id": winner, "pot": lotto["pot"], "tickets": len(holders)}


# ── CLASSEMENT ────────────────────────────────────────────────────

async def get_leaderboard(guild_id: str, member_ids: list[str]) -> list[dict]:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT user_id, total_earned FROM bank_profiles WHERE guild_id=%s AND user_id=ANY(%s) ORDER BY total_earned DESC LIMIT 10",
                (guild_id, member_ids),
            )
            rows = cur.fetchall()
            cur.close()
            return [dict(r) for r in rows]
        finally:
            conn.close()
    return await _run(_do)
