import os
import asyncio
import psycopg2
import psycopg2.extras
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone, timedelta

from .constants import BANK_RANKS, VAULT_INTEREST_BASE, VAULT_LOCK_RATES, VAULT_DAILY_CAP

_executor     = ThreadPoolExecutor(max_workers=6, thread_name_prefix="bank_db")
_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")


def _conn():
    return psycopg2.connect(_SUPABASE_URL, sslmode="require", connect_timeout=10)


def _put(conn) -> None:
    try:
        conn.close()
    except Exception:
        pass


async def _run(fn):
    return await asyncio.get_running_loop().run_in_executor(_executor, fn)


# ── Rang bancaire ─────────────────────────────────────────────────

def get_bank_rank(total: int) -> dict:
    """Rang correspondant à la richesse totale (poche + coffre)."""
    rank = BANK_RANKS[0]
    for r in BANK_RANKS:
        if total >= r["seuil"]:
            rank = r
    return rank


def get_next_rank(total: int) -> dict | None:
    """Prochain rang à atteindre, None si déjà au maximum."""
    for r in BANK_RANKS:
        if total < r["seuil"]:
            return r
    return None


# ── Compte bancaire ───────────────────────────────────────────────

async def ensure_account(uid: str, guild_id: str) -> None:
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    "INSERT INTO bank_accounts (user_id, guild_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                    (uid, guild_id),
                )
        finally:
            _put(conn)
    await _run(_do)


async def ensure_and_get_account(uid: str, guild_id: str) -> dict:
    """Crée le compte si absent et retourne les données — 1 seule connexion."""
    _default = {
        "user_id": uid, "guild_id": guild_id,
        "vault": 0, "vault_locked_until": None,
        "vault_lock_days": 0, "last_daily": None,
        "streak": 0, "bank_rank": "Mousse",
    }
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "INSERT INTO bank_accounts (user_id, guild_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (uid, guild_id),
            )
            conn.commit()
            cur.execute(
                "SELECT * FROM bank_accounts WHERE user_id=%s AND guild_id=%s",
                (uid, guild_id),
            )
            row = cur.fetchone()
            return dict(row) if row else _default
        finally:
            _put(conn)
    return await _run(_do)


async def get_bank_account(uid: str, guild_id: str) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT * FROM bank_accounts WHERE user_id=%s AND guild_id=%s",
                (uid, guild_id),
            )
            row = cur.fetchone()
            return dict(row) if row else {
                "user_id": uid, "guild_id": guild_id,
                "vault": 0, "vault_locked_until": None,
                "vault_lock_days": 0, "last_daily": None,
                "streak": 0, "bank_rank": "Mousse",
            }
        finally:
            _put(conn)
    return await _run(_do)


async def get_week_stats(uid: str) -> tuple[int, int]:
    """Retourne (gains_7j, dépenses_7j). Retourne (0,0) si la table n'est pas disponible."""
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            # Tente avec le nom de colonne réel — fallback silencieux si absent
            try:
                cur.execute(
                    """SELECT "type", COALESCE(SUM(montant),0) FROM bank_transactions
                       WHERE user_id=%s AND created_at >= NOW()-INTERVAL '7 days'
                       GROUP BY "type" """,
                    (uid,),
                )
                gain = dep = 0
                for t, v in cur.fetchall():
                    if t == "gain":
                        gain = int(v)
                    else:
                        dep = int(v)
                return gain, dep
            except Exception:
                conn.rollback()
                return 0, 0
        finally:
            _put(conn)
    return await _run(_do)


async def update_bank_rank_db(uid: str, guild_id: str, new_rank: str) -> None:
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    """INSERT INTO bank_accounts (user_id, guild_id, bank_rank) VALUES (%s,%s,%s)
                       ON CONFLICT (user_id, guild_id) DO UPDATE SET bank_rank=%s""",
                    (uid, guild_id, new_rank, new_rank),
                )
        finally:
            _put(conn)
    await _run(_do)


# ── Coffre-fort ───────────────────────────────────────────────────

async def deposit_vault(uid: str, guild_id: str, amount: int, lock_days: int = 0) -> None:
    def _do():
        conn = _conn()
        try:
            with conn:
                cur = conn.cursor()
                if lock_days > 0:
                    locked_until = datetime.now(timezone.utc) + timedelta(days=lock_days)
                    cur.execute(
                        """INSERT INTO bank_accounts (user_id, guild_id, vault, vault_locked_until, vault_lock_days)
                           VALUES (%s,%s,%s,%s,%s)
                           ON CONFLICT (user_id, guild_id) DO UPDATE
                           SET vault = bank_accounts.vault + %s,
                               vault_locked_until = %s,
                               vault_lock_days = %s""",
                        (uid, guild_id, amount, locked_until, lock_days,
                         amount, locked_until, lock_days),
                    )
                else:
                    cur.execute(
                        """INSERT INTO bank_accounts (user_id, guild_id, vault) VALUES (%s,%s,%s)
                           ON CONFLICT (user_id, guild_id) DO UPDATE
                           SET vault = bank_accounts.vault + %s""",
                        (uid, guild_id, amount, amount),
                    )
        finally:
            _put(conn)
    await _run(_do)


async def withdraw_vault(uid: str, guild_id: str, amount: int) -> tuple[bool, str]:
    """Retourne (succès, message_erreur)."""
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT vault, vault_locked_until FROM bank_accounts WHERE user_id=%s AND guild_id=%s",
                (uid, guild_id),
            )
            row = cur.fetchone()
            if not row:
                return False, "Compte introuvable."
            vault = row["vault"] or 0
            if vault < amount:
                return False, f"Solde coffre insuffisant (`{vault:,}` ฿ disponible).".replace(",", " ")
            locked = row["vault_locked_until"]
            if locked:
                if locked.tzinfo is None:
                    locked = locked.replace(tzinfo=timezone.utc)
                if locked > datetime.now(timezone.utc):
                    jours = (locked - datetime.now(timezone.utc)).days + 1
                    return False, f"Coffre verrouillé — encore **{jours}** jour(s)."
            with conn:
                conn.cursor().execute(
                    "UPDATE bank_accounts SET vault = vault - %s WHERE user_id=%s AND guild_id=%s",
                    (amount, uid, guild_id),
                )
            return True, ""
        finally:
            _put(conn)
    return await _run(_do)


async def apply_vault_interests(guild_id: str) -> list[tuple[str, int]]:
    """Applique les intérêts quotidiens sur tous les coffres du guild. Retourne [(uid, gain)]."""
    def _do():
        conn = _conn()
        results = []
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT user_id, vault, vault_lock_days FROM bank_accounts WHERE guild_id=%s AND vault > 0",
                (guild_id,),
            )
            rows = cur.fetchall()
            for row in rows:
                lock_days = row["vault_lock_days"] or 0
                rate = VAULT_LOCK_RATES.get(lock_days, VAULT_INTEREST_BASE)
                gain = min(int(row["vault"] * rate), VAULT_DAILY_CAP)
                if gain <= 0:
                    continue
                with conn:
                    conn.cursor().execute(
                        "UPDATE bank_accounts SET vault = vault + %s WHERE user_id=%s AND guild_id=%s",
                        (gain, row["user_id"], guild_id),
                    )
                results.append((row["user_id"], gain))
        except Exception as e:
            print(f"[BANK] Intérêts coffre erreur: {e}")
        finally:
            _put(conn)
        return results
    return await _run(_do)


# ── Daily ─────────────────────────────────────────────────────────

async def claim_daily(uid: str, guild_id: str) -> tuple[int, int, bool]:
    """Retourne (montant, streak, déjà_réclamé_aujourd'hui)."""
    import random
    from .constants import DAILY_MIN, DAILY_MAX, STREAK_BONUS, STREAK_MAX

    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT last_daily, streak FROM bank_accounts WHERE user_id=%s AND guild_id=%s",
                (uid, guild_id),
            )
            row = cur.fetchone()
            now   = datetime.now(timezone.utc)
            today = now.date()

            streak     = (row["streak"] or 0) if row else 0
            last_daily = row["last_daily"] if row else None

            if last_daily:
                if last_daily.tzinfo is None:
                    last_daily = last_daily.replace(tzinfo=timezone.utc)
                ld_date = last_daily.date()
                if ld_date == today:
                    return 0, streak, True
                elif (today - ld_date).days == 1:
                    streak += 1
                else:
                    streak = 1
            else:
                streak = 1

            mult   = min(1.0 + (streak - 1) * STREAK_BONUS, STREAK_MAX)
            base   = random.randint(DAILY_MIN, DAILY_MAX)
            amount = int(base * mult)

            with conn:
                conn.cursor().execute(
                    """INSERT INTO bank_accounts (user_id, guild_id, last_daily, streak)
                       VALUES (%s,%s,%s,%s)
                       ON CONFLICT (user_id, guild_id) DO UPDATE SET last_daily=%s, streak=%s""",
                    (uid, guild_id, now, streak, now, streak),
                )
            return amount, streak, False
        finally:
            _put(conn)
    return await _run(_do)


# ── Classement ────────────────────────────────────────────────────

async def get_vaults_for_guild(guild_id: str, member_ids: list[str]) -> dict[str, int]:
    """Retourne {uid: vault} pour les membres du guild."""
    def _do():
        conn = _conn()
        try:
            if not member_ids:
                return {}
            cur = conn.cursor()
            cur.execute(
                "SELECT user_id, vault FROM bank_accounts WHERE guild_id=%s AND user_id = ANY(%s)",
                (guild_id, member_ids),
            )
            return {row[0]: row[1] for row in cur.fetchall()}
        finally:
            _put(conn)
    return await _run(_do)


# ── Historique ────────────────────────────────────────────────────

async def get_history(uid: str, filtre: str, page: int, per_page: int = 10) -> tuple[list, int]:
    def _do():
        conn = _conn()
        try:
            cur    = conn.cursor()
            conds  = ["user_id=%s"]
            params: list = [uid]
            if filtre == "gains":
                conds.append("type='gain'")
            elif filtre == "depenses":
                conds.append("type='depense'")
            elif filtre == "transferts":
                conds.append("categorie IN ('transfert_envoye','transfert_recu')")
            elif filtre == "casino":
                conds.append("categorie IN ('casino_gain','casino_perte')")

            where = " AND ".join(conds)
            cur.execute(f"SELECT COUNT(*) FROM bank_transactions WHERE {where}", params)
            total      = cur.fetchone()[0]
            total_pages = max(1, (total + per_page - 1) // per_page)

            cur.execute(
                f"""SELECT type, montant, description, created_at, categorie
                    FROM bank_transactions WHERE {where}
                    ORDER BY created_at DESC LIMIT %s OFFSET %s""",
                params + [per_page, page * per_page],
            )
            return cur.fetchall(), total_pages
        finally:
            _put(conn)
    return await _run(_do)


async def get_transfer_total_today(uid: str) -> int:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT COALESCE(SUM(montant),0) FROM bank_transactions
                   WHERE user_id=%s AND categorie='transfert_envoye'
                   AND created_at >= NOW() - INTERVAL '24 hours'""",
                (uid,),
            )
            return int(cur.fetchone()[0])
        finally:
            _put(conn)
    return await _run(_do)


async def get_casino_lost_today(uid: str) -> int:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute(
                """SELECT COALESCE(SUM(montant),0) FROM bank_transactions
                   WHERE user_id=%s AND categorie='casino_perte'
                   AND created_at >= NOW() - INTERVAL '24 hours'""",
                (uid,),
            )
            return int(cur.fetchone()[0])
        finally:
            _put(conn)
    return await _run(_do)


# ── Achievements ──────────────────────────────────────────────────

async def unlock_achievement(uid: str, achievement_id: str) -> bool:
    """Retourne True si c'est une première déblocation."""
    def _do():
        conn = _conn()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO bank_achievements (user_id, achievement_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                    (uid, achievement_id),
                )
                return cur.rowcount > 0
        finally:
            _put(conn)
    return await _run(_do)


async def get_achievements(uid: str) -> list[str]:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT achievement_id FROM bank_achievements WHERE user_id=%s", (uid,))
            return [r[0] for r in cur.fetchall()]
        finally:
            _put(conn)
    return await _run(_do)


# ── Paramètres ────────────────────────────────────────────────────

async def get_bank_settings(uid: str) -> dict:
    def _do():
        conn = _conn()
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute("SELECT * FROM bank_settings WHERE user_id=%s", (uid,))
            row = cur.fetchone()
            return dict(row) if row else {
                "user_id": uid, "dm_notifications": False,
                "confirm_large_transfers": True, "thumbnail_url": None,
            }
        finally:
            _put(conn)
    return await _run(_do)


async def set_thumbnail_url(uid: str, url: str | None) -> None:
    def _do():
        conn = _conn()
        try:
            with conn:
                conn.cursor().execute(
                    """INSERT INTO bank_settings (user_id, thumbnail_url) VALUES (%s, %s)
                       ON CONFLICT (user_id) DO UPDATE SET thumbnail_url = %s""",
                    (uid, url, url),
                )
        finally:
            _put(conn)
    await _run(_do)


async def toggle_setting(uid: str, field: str) -> bool:
    """Toggle un champ booléen et retourne la nouvelle valeur."""
    def _do():
        conn = _conn()
        try:
            with conn:
                cur = conn.cursor()
                cur.execute(
                    f"""INSERT INTO bank_settings (user_id, {field}) VALUES (%s, TRUE)
                        ON CONFLICT (user_id) DO UPDATE
                        SET {field} = NOT bank_settings.{field}
                        RETURNING {field}""",
                    (uid,),
                )
                row = cur.fetchone()
                return row[0] if row else True
        finally:
            _put(conn)
    return await _run(_do)
