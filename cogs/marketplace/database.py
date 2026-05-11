import os
import asyncio
import psycopg2
import psycopg2.extras
import psycopg2.pool
from concurrent.futures import ThreadPoolExecutor

_executor     = ThreadPoolExecutor(max_workers=3, thread_name_prefix="mp_db")
_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            2, 6, dsn=_SUPABASE_URL, sslmode="require", connect_timeout=10
        )
    return _pool


def _conn():
    return _get_pool().getconn()


def _put(conn) -> None:
    try:
        _get_pool().putconn(conn)
    except Exception:
        try:
            _put(conn)
        except Exception:
            pass


async def _run(fn):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, fn)


# ── Listings ──────────────────────────────────────────────────────

async def create_listing(seller_id: int, title: str, description: str,
                          price: int, category: str, image_url) -> str:
    def _do():
        conn = _conn()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    """INSERT INTO listings (seller_id, title, description, price, category, image_url)
                       VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
                    (seller_id, title, description, price, category, image_url),
                )
                return str(cur.fetchone()[0])
        finally:
            _put(conn)
    return await _run(_do)


async def set_listing_message_id(listing_id: str, message_id: int):
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    "UPDATE listings SET message_id=%s WHERE id=%s",
                    (message_id, listing_id),
                )
        finally:
            _put(conn)
    await _run(_do)


async def get_listing(listing_id: str):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM listings WHERE id=%s::uuid", (listing_id,))
            row = cur.fetchone()
            if row:
                r = dict(row)
                r["id"] = str(r["id"])
                return r
            return None
        finally:
            _put(conn)
    return await _run(_do)


async def update_listing_status(listing_id: str, status: str):
    def _do():
        conn = _conn()
        try:
            with conn:
                extra = ", sold_at=NOW()" if status == "sold" else ""
                conn.cursor().execute(
                    f"UPDATE listings SET status=%s{extra} WHERE id=%s::uuid",
                    (status, listing_id),
                )
        finally:
            _put(conn)
    await _run(_do)


async def update_listing(listing_id: str, title: str, description: str,
                          price: int, category: str, image_url):
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    "UPDATE listings SET title=%s,description=%s,price=%s,category=%s,image_url=%s WHERE id=%s::uuid",
                    (title, description, price, category, image_url, listing_id),
                )
        finally:
            _put(conn)
    await _run(_do)


async def get_listings(category=None, max_price=None, search=None,
                        offset: int = 0, limit: int = 5):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            conds  = ["status='active'"]
            params = []
            if category:
                conds.append("category=%s");  params.append(category)
            if max_price:
                conds.append("price<=%s");    params.append(max_price)
            if search:
                conds.append("(title ILIKE %s OR description ILIKE %s)")
                params += [f"%{search}%", f"%{search}%"]
            where = " AND ".join(conds)
            cur.execute(f"SELECT COUNT(*) FROM listings WHERE {where}", params)
            total = cur.fetchone()["count"]
            cur.execute(
                f"SELECT * FROM listings WHERE {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
                params + [limit, offset],
            )
            rows = []
            for r in cur.fetchall():
                d = dict(r)
                d["id"] = str(d["id"])
                rows.append(d)
            return rows, int(total)
        finally:
            _put(conn)
    return await _run(_do)


async def get_user_listings(seller_id: int):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT * FROM listings WHERE seller_id=%s ORDER BY created_at DESC",
                (seller_id,),
            )
            rows = []
            for r in cur.fetchall():
                d = dict(r)
                d["id"] = str(d["id"])
                rows.append(d)
            return rows
        finally:
            _put(conn)
    return await _run(_do)


async def count_active_listings(seller_id: int) -> int:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT COUNT(*) FROM listings WHERE seller_id=%s AND status='active'",
                (seller_id,),
            )
            return cur.fetchone()[0]
        finally:
            _put(conn)
    return await _run(_do)


async def count_listings_today(seller_id: int) -> int:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT COUNT(*) FROM listings WHERE seller_id=%s AND created_at>=NOW()-INTERVAL '24 hours'",
                (seller_id,),
            )
            return cur.fetchone()[0]
        finally:
            _put(conn)
    return await _run(_do)


async def increment_views(listing_id: str):
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    "UPDATE listings SET views=views+1 WHERE id=%s::uuid", (listing_id,)
                )
        finally:
            _put(conn)
    await _run(_do)


# ── Transactions ──────────────────────────────────────────────────

async def create_transaction(listing_id: str, buyer_id: int,
                              seller_id: int, price: int) -> str:
    def _do():
        conn = _conn()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO transactions (listing_id,buyer_id,seller_id,price) VALUES (%s::uuid,%s,%s,%s) RETURNING id",
                    (listing_id, buyer_id, seller_id, price),
                )
                return str(cur.fetchone()[0])
        finally:
            _put(conn)
    return await _run(_do)


async def get_transaction(transaction_id: str):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM transactions WHERE id=%s::uuid", (transaction_id,))
            row = cur.fetchone()
            if row:
                r = dict(row)
                r["id"]         = str(r["id"])
                r["listing_id"] = str(r["listing_id"])
                return r
            return None
        finally:
            _put(conn)
    return await _run(_do)


async def get_pending_transaction(listing_id: str):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT * FROM transactions WHERE listing_id=%s::uuid AND status='pending'",
                (listing_id,),
            )
            row = cur.fetchone()
            if row:
                r = dict(row)
                r["id"]         = str(r["id"])
                r["listing_id"] = str(r["listing_id"])
                return r
            return None
        finally:
            _put(conn)
    return await _run(_do)


async def confirm_transaction(transaction_id: str):
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    "UPDATE transactions SET status='confirmed',confirmed_at=NOW() WHERE id=%s::uuid",
                    (transaction_id,),
                )
        finally:
            _put(conn)
    await _run(_do)


async def cancel_transaction(transaction_id: str):
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    "UPDATE transactions SET status='cancelled' WHERE id=%s::uuid",
                    (transaction_id,),
                )
        finally:
            _put(conn)
    await _run(_do)


async def get_expired_transactions():
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT * FROM transactions WHERE status='pending' AND created_at<NOW()-INTERVAL '48 hours'"
            )
            rows = []
            for r in cur.fetchall():
                d = dict(r)
                d["id"]         = str(d["id"])
                d["listing_id"] = str(d["listing_id"])
                rows.append(d)
            return rows
        finally:
            _put(conn)
    return await _run(_do)


# ── Ratings ───────────────────────────────────────────────────────

async def create_rating(transaction_id: str, rater_id: int,
                         rated_id: int, score: int, comment):
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    """INSERT INTO ratings (transaction_id,rater_id,rated_id,score,comment)
                       VALUES (%s::uuid,%s,%s,%s,%s) ON CONFLICT (transaction_id, rater_id) DO NOTHING""",
                    (transaction_id, rater_id, rated_id, score, comment),
                )
        finally:
            _put(conn)
    await _run(_do)


async def has_rated(transaction_id: str, rater_id: int) -> bool:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT 1 FROM ratings WHERE transaction_id=%s::uuid AND rater_id=%s",
                (transaction_id, rater_id),
            )
            return cur.fetchone() is not None
        finally:
            _put(conn)
    return await _run(_do)


async def get_seller_stats(seller_id: int) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT COUNT(*) as n FROM transactions WHERE seller_id=%s AND status='confirmed'",
                (seller_id,),
            )
            total_sales = cur.fetchone()["n"]
            cur.execute(
                "SELECT AVG(score)::numeric(3,1) as avg, COUNT(*) as cnt FROM ratings WHERE rated_id=%s",
                (seller_id,),
            )
            r     = cur.fetchone()
            avg   = float(r["avg"]) if r["avg"] else None
            count = int(r["cnt"])
            cur.execute(
                """SELECT score, comment, created_at FROM ratings
                   WHERE rated_id=%s ORDER BY created_at DESC LIMIT 3""",
                (seller_id,),
            )
            comments = [dict(x) for x in cur.fetchall()]
            cur.execute(
                "SELECT COUNT(*) as n FROM listings WHERE seller_id=%s AND status='active'",
                (seller_id,),
            )
            active = cur.fetchone()["n"]
            return {
                "total_sales":     total_sales,
                "avg_score":       avg,
                "rating_count":    count,
                "comments":        comments,
                "active_listings": active,
            }
        finally:
            _put(conn)
    return await _run(_do)


# ── Favorites ─────────────────────────────────────────────────────

async def toggle_favorite(user_id: int, listing_id: str) -> bool:
    def _do():
        conn = _conn()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "SELECT 1 FROM favorites WHERE user_id=%s AND listing_id=%s::uuid",
                    (user_id, listing_id),
                )
                if cur.fetchone():
                    cur.execute(
                        "DELETE FROM favorites WHERE user_id=%s AND listing_id=%s::uuid",
                        (user_id, listing_id),
                    )
                    return False
                cur.execute(
                    "INSERT INTO favorites (user_id,listing_id) VALUES (%s,%s::uuid)",
                    (user_id, listing_id),
                )
                return True
        finally:
            _put(conn)
    return await _run(_do)


async def get_favorites(user_id: int, offset: int = 0, limit: int = 5):
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                """SELECT COUNT(*) FROM favorites f
                   JOIN listings l ON l.id=f.listing_id
                   WHERE f.user_id=%s AND l.status='active'""",
                (user_id,),
            )
            total = cur.fetchone()["count"]
            cur.execute(
                """SELECT l.* FROM listings l
                   JOIN favorites f ON f.listing_id=l.id
                   WHERE f.user_id=%s AND l.status='active'
                   ORDER BY f.created_at DESC LIMIT %s OFFSET %s""",
                (user_id, limit, offset),
            )
            rows = []
            for r in cur.fetchall():
                d = dict(r)
                d["id"] = str(d["id"])
                rows.append(d)
            return rows, int(total)
        finally:
            _put(conn)
    return await _run(_do)


# ── Reports ───────────────────────────────────────────────────────

async def create_report(listing_id: str, reporter_id: int, reason: str):
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    "INSERT INTO reports (listing_id,reporter_id,reason) VALUES (%s::uuid,%s,%s)",
                    (listing_id, reporter_id, reason),
                )
        finally:
            _put(conn)
    await _run(_do)
