import os
import asyncio
import psycopg2
import psycopg2.extras
from concurrent.futures import ThreadPoolExecutor

_executor    = ThreadPoolExecutor(max_workers=2, thread_name_prefix="memory_db")
_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")


def _conn():
    return psycopg2.connect(_SUPABASE_URL, sslmode="require", connect_timeout=10)


async def _run(fn):
    return await asyncio.get_running_loop().run_in_executor(_executor, fn)


async def save_knowledge(guild_id: str, type_: str, key: str, value: str, added_by: str) -> None:
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    """INSERT INTO bot_knowledge (guild_id, type, key, value, added_by)
                       VALUES (%s, %s, %s, %s, %s)
                       ON CONFLICT (guild_id, type, key)
                       DO UPDATE SET value = EXCLUDED.value, added_by = EXCLUDED.added_by""",
                    (guild_id, type_, key.lower(), value, added_by),
                )
        finally:
            conn.close()
    await _run(_do)


async def get_alias(guild_id: str, name: str) -> str | None:
    """Retourne le vrai nom lié à cet alias, ou None."""
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT value FROM bot_knowledge WHERE guild_id=%s AND type='alias' AND key=%s",
                (guild_id, name.lower()),
            )
            row = cur.fetchone()
            return row[0] if row else None
        finally:
            conn.close()
    return await _run(_do)


async def get_all_aliases(guild_id: str, name: str) -> list[str]:
    """Retourne tous les alias connus pour un nom (dans les deux sens)."""
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT key, value FROM bot_knowledge
                   WHERE guild_id=%s AND type='alias'
                   AND (key=%s OR value ILIKE %s)""",
                (guild_id, name.lower(), name),
            )
            results = []
            for k, v in cur.fetchall():
                if k.lower() == name.lower():
                    results.append(v)
                else:
                    results.append(k)
            return list(set(results))
        finally:
            conn.close()
    return await _run(_do)


async def get_facts(guild_id: str, keyword: str) -> list[str]:
    """Retourne les faits dont la clé ou la valeur contient le mot-clé."""
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT value FROM bot_knowledge
                   WHERE guild_id=%s AND type='fact'
                   AND (key ILIKE %s OR value ILIKE %s)
                   ORDER BY created_at DESC LIMIT 5""",
                (guild_id, f"%{keyword}%", f"%{keyword}%"),
            )
            return [r[0] for r in cur.fetchall()]
        finally:
            conn.close()
    return await _run(_do)


async def get_all_knowledge(guild_id: str) -> list[dict]:
    """Retourne toute la mémoire du bot pour ce guild."""
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                """SELECT type, key, value, created_at
                   FROM bot_knowledge WHERE guild_id=%s
                   ORDER BY created_at DESC LIMIT 100""",
                (guild_id,),
            )
            return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
    return await _run(_do)


async def delete_knowledge(guild_id: str, type_: str, key: str) -> bool:
    """Supprime un fait/alias. Retourne True si supprimé."""
    def _do():
        conn = _conn()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "DELETE FROM bot_knowledge WHERE guild_id=%s AND type=%s AND key=%s",
                    (guild_id, type_, key.lower()),
                )
                return cur.rowcount > 0
        finally:
            conn.close()
    return await _run(_do)
