import os
import asyncio
import psycopg2
import psycopg2.extras
import psycopg2.pool
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="crews_db")
_pool: psycopg2.pool.ThreadedConnectionPool | None = None
_DC = psycopg2.extras.RealDictCursor


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2, maxconn=8,
            dsn=os.environ.get("SUPABASE_URL", ""),
            sslmode="require",
        )
    return _pool


@contextmanager
def _conn():
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)


async def _run(fn):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, fn)


# ── Crews ─────────────────────────────────────────────────────────

async def create_crew(name: str, tag: str, description: str,
                       captain_id: int) -> int:
    def _do():
        with _conn() as conn:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO crews (name, tag, description, captain_id)"
                    " VALUES (%s,%s,%s,%s) RETURNING id",
                    (name, tag, description, captain_id),
                )
                return cur.fetchone()[0]
    return await _run(_do)


async def get_crew(crew_id: int) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute("SELECT * FROM crews WHERE id=%s AND disbanded_at IS NULL", (crew_id,))
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def get_crews_by_ids(ids: list[int]) -> list[dict]:
    if not ids:
        return []
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crews WHERE id = ANY(%s) AND disbanded_at IS NULL",
                (ids,),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


async def get_crew_by_name(name: str) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crews WHERE LOWER(name)=LOWER(%s) AND disbanded_at IS NULL",
                (name,),
            )
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def get_crew_by_tag(tag: str) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crews WHERE UPPER(tag)=UPPER(%s) AND disbanded_at IS NULL",
                (tag,),
            )
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def get_crew_by_captain(captain_id: int) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crews WHERE captain_id=%s AND disbanded_at IS NULL",
                (captain_id,),
            )
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def update_crew(crew_id: int, **kwargs):
    if not kwargs:
        return
    def _do():
        with _conn() as conn:
            with conn:
                cols   = ", ".join(f"{k}=%s" for k in kwargs)
                values = list(kwargs.values()) + [crew_id]
                conn.cursor().execute(f"UPDATE crews SET {cols} WHERE id=%s", values)
    await _run(_do)


async def dissolve_crew(crew_id: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crews SET disbanded_at=NOW() WHERE id=%s", (crew_id,)
                )
    await _run(_do)


async def list_crews(recruiting_only: bool = False, offset: int = 0,
                      limit: int = 10) -> tuple[list[dict], int]:
    def _do():
        with _conn() as conn:
            cur  = conn.cursor(cursor_factory=_DC)
            where = "disbanded_at IS NULL"
            if recruiting_only:
                where += " AND is_recruiting=TRUE"
            cur.execute(f"SELECT COUNT(*) FROM crews WHERE {where}")
            total = cur.fetchone()["count"]
            cur.execute(
                f"SELECT * FROM crews WHERE {where}"
                " ORDER BY total_bounty DESC LIMIT %s OFFSET %s",
                (limit, offset),
            )
            return [dict(r) for r in cur.fetchall()], int(total)
    return await _run(_do)


async def leaderboard_crews(limit: int = 20) -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crews WHERE disbanded_at IS NULL"
                " ORDER BY total_bounty DESC LIMIT %s",
                (limit,),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


async def update_total_bounty(crew_id: int, bounty: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crews SET total_bounty=%s WHERE id=%s", (bounty, crew_id)
                )
    await _run(_do)


async def recalc_all_bounties():
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute("""
                    UPDATE crews c
                    SET total_bounty = COALESCE((
                        SELECT SUM((u.data->>'berrys')::bigint)
                        FROM crew_members cm
                        JOIN users u ON u.uid = cm.user_id::text
                        WHERE cm.crew_id = c.id
                    ), 0)
                    WHERE c.disbanded_at IS NULL
                """)
    await _run(_do)


# ── Crew Members ──────────────────────────────────────────────────

async def add_member(user_id: int, crew_id: int, position: str = 'mousse'):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "INSERT INTO crew_members (user_id, crew_id, position) VALUES (%s,%s,%s)"
                    " ON CONFLICT (user_id) DO UPDATE"
                    " SET crew_id=%s, position=%s, joined_at=NOW()",
                    (user_id, crew_id, position, crew_id, position),
                )
    await _run(_do)


async def remove_member(user_id: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "DELETE FROM crew_members WHERE user_id=%s", (user_id,)
                )
    await _run(_do)


async def get_member(user_id: int) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute("SELECT * FROM crew_members WHERE user_id=%s", (user_id,))
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def get_member_and_crew(user_id: int) -> tuple[dict | None, dict | None]:
    """Single-query join: retourne (member, crew) ou (None, None)."""
    def _do():
        with _conn() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT
                    cm.id          AS m_id,
                    cm.crew_id,
                    cm.user_id,
                    cm.position,
                    cm.contribution,
                    cm.joined_at,
                    c.id           AS c_id,
                    c.name, c.tag, c.description, c.captain_id,
                    c.level, c.xp, c.treasury, c.total_bounty,
                    c.wars_won, c.wars_lost, c.is_recruiting,
                    c.flag_url, c.role_id, c.text_channel_id,
                    c.voice_channel_id, c.created_at
                FROM crew_members cm
                JOIN crews c ON c.id = cm.crew_id
                WHERE cm.user_id = %s AND c.disbanded_at IS NULL
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return None, None
            cols = [d[0] for d in cur.description]
            data = dict(zip(cols, row))
            member = {
                'id': data['m_id'], 'crew_id': data['crew_id'],
                'user_id': data['user_id'], 'position': data['position'],
                'contribution': data['contribution'], 'joined_at': data['joined_at'],
            }
            crew = {k: data[k] for k in (
                'name','tag','description','captain_id','level','xp','treasury',
                'total_bounty','wars_won','wars_lost','is_recruiting','flag_url',
                'role_id','text_channel_id','voice_channel_id','created_at',
            )}
            crew['id'] = data['c_id']
            return member, crew
    return await _run(_do)


async def get_crew_members(crew_id: int) -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_members WHERE crew_id=%s ORDER BY joined_at ASC",
                (crew_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


async def update_member_position(user_id: int, position: str):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_members SET position=%s WHERE user_id=%s",
                    (position, user_id),
                )
    await _run(_do)


async def add_contribution(user_id: int, amount: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_members SET contribution=contribution+%s WHERE user_id=%s",
                    (amount, user_id),
                )
    await _run(_do)


async def count_members(crew_id: int) -> int:
    def _do():
        with _conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM crew_members WHERE crew_id=%s", (crew_id,))
            return cur.fetchone()[0]
    return await _run(_do)


async def last_crew_leave(user_id: int) -> str | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT created_at FROM crew_history"
                " WHERE user_id=%s AND action IN ('left','kicked','betrayed')"
                " ORDER BY created_at DESC LIMIT 1",
                (user_id,),
            )
            r = cur.fetchone()
            return str(r[0]) if r else None
    return await _run(_do)


# ── Applications ──────────────────────────────────────────────────

async def create_application(crew_id: int, user_id: int, message: str) -> int:
    def _do():
        with _conn() as conn:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO crew_applications (crew_id, user_id, message)"
                    " VALUES (%s,%s,%s) RETURNING id",
                    (crew_id, user_id, message),
                )
                return cur.fetchone()[0]
    return await _run(_do)


async def get_pending_applications(crew_id: int) -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_applications"
                " WHERE crew_id=%s AND status='pending' ORDER BY created_at ASC",
                (crew_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


async def get_user_pending_application(user_id: int, crew_id: int) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_applications"
                " WHERE user_id=%s AND crew_id=%s AND status='pending'",
                (user_id, crew_id),
            )
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def update_application(app_id: int, status: str, reviewed_by: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_applications"
                    " SET status=%s, reviewed_by=%s, reviewed_at=NOW() WHERE id=%s",
                    (status, reviewed_by, app_id),
                )
    await _run(_do)


# ── Alliances ─────────────────────────────────────────────────────

def _sorted_pair(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a < b else (b, a)


async def propose_alliance(crew_a: int, crew_b: int, proposed_by: int) -> int:
    a, b = _sorted_pair(crew_a, crew_b)
    def _do():
        with _conn() as conn:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO crew_alliances (crew_a_id, crew_b_id, proposed_by)"
                    " VALUES (%s,%s,%s)"
                    " ON CONFLICT (crew_a_id, crew_b_id) DO UPDATE"
                    " SET status='proposed', proposed_by=%s, proposed_at=NOW(), accepted_at=NULL"
                    " RETURNING id",
                    (a, b, proposed_by, proposed_by),
                )
                return cur.fetchone()[0]
    return await _run(_do)


async def accept_alliance(crew_a: int, crew_b: int):
    a, b = _sorted_pair(crew_a, crew_b)
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_alliances SET status='active', accepted_at=NOW()"
                    " WHERE crew_a_id=%s AND crew_b_id=%s",
                    (a, b),
                )
    await _run(_do)


async def break_alliance(crew_a: int, crew_b: int, broken_by: int):
    a, b = _sorted_pair(crew_a, crew_b)
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_alliances"
                    " SET status='broken', broken_by=%s, broken_at=NOW()"
                    " WHERE crew_a_id=%s AND crew_b_id=%s",
                    (broken_by, a, b),
                )
    await _run(_do)


async def get_alliance(crew_a: int, crew_b: int) -> dict | None:
    a, b = _sorted_pair(crew_a, crew_b)
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_alliances WHERE crew_a_id=%s AND crew_b_id=%s",
                (a, b),
            )
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def get_active_alliances(crew_id: int) -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_alliances"
                " WHERE (crew_a_id=%s OR crew_b_id=%s) AND status='active'",
                (crew_id, crew_id),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


async def get_pending_alliance(crew_id: int) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_alliances"
                " WHERE (crew_a_id=%s OR crew_b_id=%s) AND status='proposed'"
                " ORDER BY proposed_at DESC LIMIT 1",
                (crew_id, crew_id),
            )
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


# ── Wars ──────────────────────────────────────────────────────────

async def declare_war(attacker_id: int, defender_id: int,
                       prize_pool: int, duration_hours: int) -> int:
    def _do():
        with _conn() as conn:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO crew_wars"
                    " (attacker_id, defender_id, prize_pool, duration_hours)"
                    " VALUES (%s,%s,%s,%s) RETURNING id",
                    (attacker_id, defender_id, prize_pool, duration_hours),
                )
                return cur.fetchone()[0]
    return await _run(_do)


async def get_war(war_id: int) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute("SELECT * FROM crew_wars WHERE id=%s", (war_id,))
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def get_active_war(crew_id: int) -> dict | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_wars"
                " WHERE (attacker_id=%s OR defender_id=%s)"
                " AND status IN ('pending','active')"
                " ORDER BY declared_at DESC LIMIT 1",
                (crew_id, crew_id),
            )
            r = cur.fetchone()
            return dict(r) if r else None
    return await _run(_do)


async def accept_war(war_id: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_wars"
                    " SET status='active', started_at=NOW(),"
                    "     ends_at=NOW() + (duration_hours || ' hours')::interval"
                    " WHERE id=%s",
                    (war_id,),
                )
    await _run(_do)


async def update_war_score(war_id: int, crew_id: int, points: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_wars SET"
                    " attacker_score = CASE WHEN attacker_id=%s THEN attacker_score+%s ELSE attacker_score END,"
                    " defender_score = CASE WHEN defender_id=%s THEN defender_score+%s ELSE defender_score END"
                    " WHERE id=%s",
                    (crew_id, points, crew_id, points, war_id),
                )
    await _run(_do)


async def finish_war(war_id: int, winner_id: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_wars SET status='finished', winner_id=%s, ended_at=NOW()"
                    " WHERE id=%s",
                    (winner_id, war_id),
                )
    await _run(_do)


async def cancel_war(war_id: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "UPDATE crew_wars SET status='cancelled', ended_at=NOW() WHERE id=%s",
                    (war_id,),
                )
    await _run(_do)


async def get_finished_wars(crew_id: int, limit: int = 10) -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_wars"
                " WHERE (attacker_id=%s OR defender_id=%s) AND status='finished'"
                " ORDER BY ended_at DESC LIMIT %s",
                (crew_id, crew_id, limit),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


async def get_expired_wars() -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_wars WHERE status='active' AND ends_at < NOW()"
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


# ── War Battles ───────────────────────────────────────────────────

async def add_battle(war_id: int, user_id: int, crew_id: int,
                      opponent_id: int, result: str, points: int):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "INSERT INTO war_battles"
                    " (war_id, user_id, crew_id, opponent_id, result, points)"
                    " VALUES (%s,%s,%s,%s,%s,%s)",
                    (war_id, user_id, crew_id, opponent_id, result, points),
                )
    await _run(_do)


async def get_last_battle_time(war_id: int, user_id: int) -> str | None:
    def _do():
        with _conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT created_at FROM war_battles"
                " WHERE war_id=%s AND user_id=%s ORDER BY created_at DESC LIMIT 1",
                (war_id, user_id),
            )
            r = cur.fetchone()
            return str(r[0]) if r else None
    return await _run(_do)


async def get_war_top_contributors(war_id: int) -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT user_id, crew_id, SUM(points) as total_points, COUNT(*) as battles"
                " FROM war_battles WHERE war_id=%s"
                " GROUP BY user_id, crew_id ORDER BY total_points DESC LIMIT 5",
                (war_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


# ── Treasury Logs ─────────────────────────────────────────────────

async def add_treasury_log(crew_id: int, user_id: int, amount: int,
                            action: str, reason: str = None):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "INSERT INTO crew_treasury_logs"
                    " (crew_id, user_id, amount, action, reason)"
                    " VALUES (%s,%s,%s,%s,%s)",
                    (crew_id, user_id, amount, action, reason),
                )
    await _run(_do)


async def get_treasury_logs(crew_id: int, limit: int = 10) -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_treasury_logs"
                " WHERE crew_id=%s ORDER BY created_at DESC LIMIT %s",
                (crew_id, limit),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)


# ── History ───────────────────────────────────────────────────────

async def add_history(crew_id: int, user_id: int, action: str, details: str = None):
    def _do():
        with _conn() as conn:
            with conn:
                conn.cursor().execute(
                    "INSERT INTO crew_history (crew_id, user_id, action, details)"
                    " VALUES (%s,%s,%s,%s)",
                    (crew_id, user_id, action, details),
                )
    await _run(_do)


async def get_history(crew_id: int, limit: int = 15) -> list[dict]:
    def _do():
        with _conn() as conn:
            cur = conn.cursor(cursor_factory=_DC)
            cur.execute(
                "SELECT * FROM crew_history"
                " WHERE crew_id=%s ORDER BY created_at DESC LIMIT %s",
                (crew_id, limit),
            )
            return [dict(r) for r in cur.fetchall()]
    return await _run(_do)
