"""
Système de log de transactions Berry.
Utilise son propre pool psycopg2 pour éviter les imports circulaires avec bot.py.
"""

import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from psycopg2 import pool as _pgpool

_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_pool: _pgpool.ThreadedConnectionPool | None = None
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="tx")


def _get_pool() -> _pgpool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = _pgpool.ThreadedConnectionPool(1, 3, dsn=_SUPABASE_URL)
    return _pool


def _get_conn():
    return _get_pool().getconn()


def _release_conn(conn):
    try:
        _get_pool().putconn(conn)
    except Exception:
        pass


def _sync_log(user_id: str, type_: str, categorie: str,
              montant: int, description: str, solde_apres: int) -> None:
    conn = _get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO transactions (user_id, type, categorie, montant, description, solde_apres)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, type_, categorie, montant, description, solde_apres),
        )
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"[TRANSACTIONS] Erreur log: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
    finally:
        _release_conn(conn)


async def log_transaction(
    user_id: str,
    type_: str,
    categorie: str,
    montant: int,
    description: str,
    solde_apres: int,
) -> None:
    """
    Log une transaction en base de façon non-bloquante.

    Args:
        user_id     : ID Discord du membre (str)
        type_       : "gain" ou "depense"
        categorie   : clé parmi CATEGORIES ci-dessous
        montant     : entier positif (le type indique le sens)
        description : texte court lisible par l'utilisateur
        solde_apres : solde du membre après cette transaction
    """
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        _executor,
        _sync_log,
        str(user_id), type_, categorie, montant, description, solde_apres,
    )


# Catégories reconnues par le dashboard /banque
CATEGORIES = {
    "vocal":             "Vocal",
    "quiz":              "Quiz",
    "casino_gain":       "Casino",
    "casino_perte":      "Casino",
    "vol_recu":          "Vol",
    "vol_perdu":         "Vol",
    "achat_boutique":    "Boutique",
    "transfert_envoye":  "Transfert",
    "transfert_recu":    "Transfert",
    "akinator":          "Akinator",
    "duel_gagne":        "Duel",
    "duel_perdu":        "Duel",
    "daily":             "Daily",
    "autre":             "Autre",
}
