import os
import asyncio
import psycopg2
import psycopg2.extras
import psycopg2.pool
from concurrent.futures import ThreadPoolExecutor

_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_executor     = ThreadPoolExecutor(max_workers=2, thread_name_prefix="memory_db")
_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            1, 3, dsn=_SUPABASE_URL, sslmode="require", connect_timeout=10
        )
    return _pool


def _get():
    return _get_pool().getconn()


def _put(conn) -> None:
    try:
        _get_pool().putconn(conn)
    except Exception:
        try:
            conn.close()
        except Exception:
            pass


async def _run(fn):
    return await asyncio.get_running_loop().run_in_executor(_executor, fn)


# ── Écriture ──────────────────────────────────────────────────────

async def save_alias_pair(guild_id: str, name1: str, name2: str, added_by: str) -> None:
    """Sauvegarde les deux sens de l'alias en une seule transaction."""
    def _do():
        conn = _get()
        try:
            with conn:
                cur = conn.cursor()
                cur.executemany(
                    """INSERT INTO bot_knowledge (guild_id, type, key, value, added_by)
                       VALUES (%s, 'alias', %s, %s, %s)
                       ON CONFLICT (guild_id, type, key)
                       DO UPDATE SET value = EXCLUDED.value, added_by = EXCLUDED.added_by""",
                    [
                        (guild_id, name1.lower(), name2, added_by),
                        (guild_id, name2.lower(), name1, added_by),
                    ],
                )
        finally:
            _put(conn)
    await _run(_do)


async def save_fact(guild_id: str, key: str, value: str, added_by: str) -> None:
    def _do():
        conn = _get()
        try:
            with conn:
                conn.cursor().execute(
                    """INSERT INTO bot_knowledge (guild_id, type, key, value, added_by)
                       VALUES (%s, 'fact', %s, %s, %s)
                       ON CONFLICT (guild_id, type, key)
                       DO UPDATE SET value = EXCLUDED.value, added_by = EXCLUDED.added_by""",
                    (guild_id, key.lower(), value, added_by),
                )
        finally:
            _put(conn)
    await _run(_do)


# ── Lecture ───────────────────────────────────────────────────────

async def get_knowledge_for_name(guild_id: str, name: str) -> tuple[list[str], list[str]]:
    """Retourne (aliases, facts) en une seule connexion."""
    name_lower = name.lower()
    def _do():
        conn = _get()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT type, key, value FROM bot_knowledge
                   WHERE guild_id = %s
                     AND (
                       (type = 'alias' AND (key = %s OR value ILIKE %s))
                       OR (type = 'fact' AND (key ILIKE %s OR value ILIKE %s))
                     )
                   ORDER BY created_at DESC LIMIT 10""",
                (guild_id, name_lower, name, f"%{name}%", f"%{name}%"),
            )
            aliases, facts = [], []
            for type_, key, value in cur.fetchall():
                if type_ == "alias":
                    aliases.append(value if key == name_lower else key)
                else:
                    facts.append(value)
            return list(set(aliases)), facts
        finally:
            _put(conn)
    return await _run(_do)


async def get_all_knowledge(guild_id: str) -> list[dict]:
    def _do():
        conn = _get()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                """SELECT type, key, value, created_at
                   FROM bot_knowledge WHERE guild_id = %s
                   ORDER BY created_at DESC LIMIT 100""",
                (guild_id,),
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            _put(conn)
    return await _run(_do)


async def delete_knowledge(guild_id: str, type_: str, key: str) -> bool:
    def _do():
        conn = _get()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "DELETE FROM bot_knowledge WHERE guild_id=%s AND type=%s AND key=%s",
                    (guild_id, type_, key.lower()),
                )
                return cur.rowcount > 0
        finally:
            _put(conn)
    return await _run(_do)
