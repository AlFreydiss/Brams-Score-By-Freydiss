import os
import asyncio
import psycopg2
import psycopg2.extras
from concurrent.futures import ThreadPoolExecutor
from discord.ext import commands
import discord

ANNONCES_CHANNEL_ID = 924378497336631348

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="annonces_db")
_conn: psycopg2.extensions.connection | None = None


def _get_conn() -> psycopg2.extensions.connection:
    global _conn
    url = os.environ.get("SUPABASE_URL", "")
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(dsn=url, sslmode="require", connect_timeout=10)
    return _conn


def _setup_table() -> None:
    conn = _get_conn()
    with conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS community_announcements (
                    id         TEXT PRIMARY KEY,
                    content    TEXT NOT NULL,
                    author_name   TEXT,
                    author_avatar TEXT,
                    created_at TIMESTAMPTZ NOT NULL,
                    channel_id TEXT,
                    edited_at  TIMESTAMPTZ
                );
            """)


def _insert(msg_id, content, author_name, author_avatar, created_at, channel_id) -> None:
    conn = _get_conn()
    with conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO community_announcements
                    (id, content, author_name, author_avatar, created_at, channel_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
                """,
                (str(msg_id), content, author_name, author_avatar, created_at, str(channel_id)),
            )


def _update(msg_id, content, edited_at) -> None:
    conn = _get_conn()
    with conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE community_announcements SET content=%s, edited_at=%s WHERE id=%s;",
                (content, edited_at, str(msg_id)),
            )


def _delete(msg_id) -> None:
    conn = _get_conn()
    with conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM community_announcements WHERE id=%s;", (str(msg_id),))


class AnnoncesCog(commands.Cog, name="Annonces"):
    """Miroir du salon annonces Discord → Supabase (site web)."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def cog_load(self) -> None:
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(_executor, _setup_table)
            print("[ANNONCES] Table community_announcements prête ✅")
        except Exception as e:
            print(f"[ANNONCES] Erreur setup table: {e}")

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        if message.channel.id != ANNONCES_CHANNEL_ID:
            return
        if not message.content:
            return

        avatar = str(message.author.display_avatar.url) if message.author.display_avatar else None
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(
                _executor, _insert,
                message.id, message.content,
                message.author.display_name, avatar,
                message.created_at, message.channel.id,
            )
        except Exception as e:
            print(f"[ANNONCES] Erreur insert: {e}")

    @commands.Cog.listener()
    async def on_message_edit(self, before: discord.Message, after: discord.Message) -> None:
        if after.channel.id != ANNONCES_CHANNEL_ID:
            return
        if not after.content:
            return
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(_executor, _update, after.id, after.content, after.edited_at)
        except Exception as e:
            print(f"[ANNONCES] Erreur update: {e}")

    @commands.Cog.listener()
    async def on_message_delete(self, message: discord.Message) -> None:
        if message.channel.id != ANNONCES_CHANNEL_ID:
            return
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(_executor, _delete, message.id)
        except Exception as e:
            print(f"[ANNONCES] Erreur delete: {e}")


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AnnoncesCog(bot))
