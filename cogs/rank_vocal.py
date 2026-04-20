"""
Cog — Système de Ranks Vocaux One Piece
========================================
• Suivi du temps vocal sur 7 jours glissants via aiosqlite
• Rangs CUMULATIFS avec seuils configurables en haut du fichier
• Ajout ET retrait de rôles en temps réel (derank automatique)
• Annonces dans le channel rappel-rank pour TOUS les rangs (Pirate → Roi des Pirates)
• Tâche background toutes les 5 minutes pour les membres encore en vocal
• Cooldown anti-spam par (membre, rang, direction) pour éviter les doublons
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

import aiosqlite
import discord
from discord.ext import commands, tasks

# ═══════════════════════════════════════════════════════════════════
#  ██████╗ ██████╗ ███╗   ██╗███████╗██╗ ██████╗
#  ██╔════╝██╔═══██╗████╗  ██║██╔════╝██║██╔════╝
#  ██║     ██║   ██║██╔██╗ ██║█████╗  ██║██║  ███╗
#  ██║     ██║   ██║██║╚██╗██║██╔══╝  ██║██║   ██║
#  ╚██████╗╚██████╔╝██║ ╚████║██║     ██║╚██████╔╝
#   ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝
#  Modifier uniquement cette section pour configurer le système
# ═══════════════════════════════════════════════════════════════════

# Seuils en heures vocales sur 7 jours glissants
RANK_THRESHOLDS: dict[str, float] = {
    "Pirate":          10.0,
    "Shichibukai":     25.0,
    "Amiral":          40.0,
    "Yonkou":          70.0,
    "Roi des pirates": 150.0,
}

# IDs des rôles Discord — ordre du plus bas au plus haut
RANK_ROLE_IDS: dict[str, int] = {
    "Pirate":          1486554682263343284,
    "Shichibukai":     1486554770306236596,
    "Amiral":          1486554823573766164,
    "Yonkou":          1486554858075984043,
    "Roi des pirates": 1494656848622518412,
}

# Channel où envoyer les annonces rank-up / derank
RAPPEL_RANK_CHANNEL_ID: int = 1494342996848672828

# IDs des serveurs gérés par le bot
GUILD_IDS: list[int] = [924346730194014220, 1478937064031518892]

# Intervalle de la tâche background en secondes (300 = 5 minutes)
LIVE_UPDATE_INTERVAL: int = 300

# Fenêtre de calcul des heures (jours glissants)
WINDOW_DAYS: int = 7

# Durée de conservation des sessions en DB (légèrement supérieure à la fenêtre)
SESSION_RETENTION_DAYS: int = 8

# Cooldown anti-spam entre deux annonces identiques (secondes)
ANNOUNCE_COOLDOWN: int = 300

# Chemin du fichier SQLite
DB_PATH: str = "rank_vocal.db"

# ═══════════════════════════════════════════════════════════════════
#  CONSTANTES INTERNES (ne pas modifier)
# ═══════════════════════════════════════════════════════════════════

# Ordre canonique du plus bas au plus haut rang
RANK_ORDER: list[str] = [
    "Pirate",
    "Shichibukai",
    "Amiral",
    "Yonkou",
    "Roi des pirates",
]

RANK_EMOJIS: dict[str, str] = {
    "Pirate":          "🏴‍☠️",
    "Shichibukai":     "⚔️",
    "Amiral":          "🪖",
    "Yonkou":          "⚜️",
    "Roi des pirates": "👑",
}

RANK_COLORS: dict[str, discord.Color] = {
    "Pirate":          discord.Color.from_rgb(46,  204, 113),
    "Shichibukai":     discord.Color.from_rgb(22,   96,  45),
    "Amiral":          discord.Color.from_rgb(241, 196,  15),
    "Yonkou":          discord.Color.from_rgb(155,  89, 182),
    "Roi des pirates": discord.Color.from_rgb(255, 215,   0),
}

RANK_UP_MESSAGES: dict[str, str] = {
    "Pirate": (
        "Les mers ne connaissent pas encore ton nom… mais ça ne durera pas longtemps !\n"
        "Bienvenue parmi les **Pirates** ! 🏴‍☠️"
    ),
    "Shichibukai": (
        "Le Gouvernement Mondial t'a remarqué… et t'a offert un accord.\n"
        "Tu es désormais un **Shichibukai** ! Que tes ennemis tremblent. ⚔️"
    ),
    "Amiral": (
        "La Marine t'a élevé au rang suprême.\n"
        "Tu es **Amiral** — la justice sera appliquée selon ta volonté ! 🪖"
    ),
    "Yonkou": (
        "Les quatre souverains des mers… et maintenant tu en fais partie.\n"
        "Salut à toi, **Yonkou** ! Le Grand Line t'appartient. ⚜️"
    ),
    "Roi des pirates": (
        "Tu as trouvé le One Piece. Tu as conquis le Grand Line.\n"
        "**ROI DES PIRATES** — le titre suprême t'appartient ! 👑"
    ),
}

DERANK_MESSAGES: dict[str, str] = {
    "Pirate":          "redescend sous les flots… Le rang **Pirate** est perdu. 🌊",
    "Shichibukai":     "perd la faveur du Gouvernement. Le titre **Shichibukai** est révoqué. 📜",
    "Amiral":          "est rétrogradé par la Marine. Le grade **Amiral** est retiré. ⚓",
    "Yonkou":          "perd sa place parmi les Quatre Empereurs. Le rang **Yonkou** s'effondre. ⚡",
    "Roi des pirates": "voit sa couronne tomber. Le titre de **Roi des Pirates** est perdu… 💔",
}


# ═══════════════════════════════════════════════════════════════════
#  HELPERS PURS
# ═══════════════════════════════════════════════════════════════════

def _now() -> float:
    return time.time()


def _hours_in_window(
    sessions: list[tuple[float, float]],
    join_time: Optional[float] = None,
) -> float:
    """
    Calcule les heures vocales dans la fenêtre glissante WINDOW_DAYS.
    join_time est inclus si le membre est encore en vocal.
    """
    cutoff = _now() - WINDOW_DAYS * 86400
    total = 0.0
    for start, end in sessions:
        if end < cutoff:
            continue
        total += end - max(start, cutoff)
    if join_time and join_time > 0:
        # Session en cours : on compte jusqu'à maintenant
        total += _now() - max(join_time, cutoff)
    return total / 3600


def _deserved_ranks(hours: float) -> set[str]:
    """Retourne l'ensemble des rangs mérités pour un nombre d'heures donné."""
    return {name for name, threshold in RANK_THRESHOLDS.items() if hours >= threshold}


# ═══════════════════════════════════════════════════════════════════
#  COG
# ═══════════════════════════════════════════════════════════════════

class RankVocal(commands.Cog):
    """Gestion des rangs One Piece basés sur le temps vocal cumulatif."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self.log = logging.getLogger("RankVocal")
        self.db: Optional[aiosqlite.Connection] = None

        # join_time en mémoire : évite des allers-retours DB à chaque event
        # {user_id: timestamp_unix}
        self._join_times: dict[int, float] = {}

        # Cooldown annonces : (user_id, rank_name, "up"|"down") → last_announce_ts
        self._cooldowns: dict[tuple, float] = {}

        # Map rapide id_rôle → nom du rang
        self._id_to_name: dict[int, str] = {v: k for k, v in RANK_ROLE_IDS.items()}
        self._rank_role_id_set: set[int] = set(RANK_ROLE_IDS.values())

    # ──────────────────────────────────────────────────────────────
    #  LIFECYCLE
    # ──────────────────────────────────────────────────────────────

    async def cog_load(self) -> None:
        self.db = await aiosqlite.connect(DB_PATH)
        await self._init_db()
        await self._restore_join_times()
        self.live_update_task.start()
        self.log.info(
            "RankVocal chargé — %d join_times restaurés — tâche toutes les %ds",
            len(self._join_times),
            LIVE_UPDATE_INTERVAL,
        )

    async def cog_unload(self) -> None:
        self.live_update_task.cancel()
        await self._flush_active_sessions()
        if self.db:
            await self.db.close()
        self.log.info("RankVocal déchargé proprement")

    # ──────────────────────────────────────────────────────────────
    #  BASE DE DONNÉES
    # ──────────────────────────────────────────────────────────────

    async def _init_db(self) -> None:
        await self.db.executescript("""
            CREATE TABLE IF NOT EXISTS vocal_sessions (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id   INTEGER NOT NULL,
                guild_id  INTEGER NOT NULL,
                start_ts  REAL    NOT NULL,
                end_ts    REAL    NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_voc_user_end
                ON vocal_sessions (user_id, end_ts);

            CREATE TABLE IF NOT EXISTS rank_state (
                user_id   INTEGER PRIMARY KEY,
                join_time REAL NOT NULL DEFAULT 0
            );
        """)
        await self.db.commit()

    async def _get_sessions(self, user_id: int) -> list[tuple[float, float]]:
        cutoff = _now() - SESSION_RETENTION_DAYS * 86400
        async with self.db.execute(
            "SELECT start_ts, end_ts FROM vocal_sessions "
            "WHERE user_id = ? AND end_ts >= ? ORDER BY start_ts",
            (user_id, cutoff),
        ) as cur:
            return await cur.fetchall()

    async def _save_session(
        self, user_id: int, guild_id: int, start: float, end: float
    ) -> None:
        await self.db.execute(
            "INSERT INTO vocal_sessions (user_id, guild_id, start_ts, end_ts) VALUES (?,?,?,?)",
            (user_id, guild_id, start, end),
        )
        # Purge des sessions trop anciennes
        cutoff = _now() - SESSION_RETENTION_DAYS * 86400
        await self.db.execute(
            "DELETE FROM vocal_sessions WHERE user_id = ? AND end_ts < ?",
            (user_id, cutoff),
        )
        await self.db.commit()

    async def _upsert_join_time(self, user_id: int, ts: float) -> None:
        await self.db.execute(
            "INSERT INTO rank_state (user_id, join_time) VALUES (?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET join_time = excluded.join_time",
            (user_id, ts),
        )
        await self.db.commit()

    async def _restore_join_times(self) -> None:
        """Relit les join_times persistés — utile après un redémarrage du bot."""
        async with self.db.execute(
            "SELECT user_id, join_time FROM rank_state WHERE join_time > 0"
        ) as cur:
            rows = await cur.fetchall()
        for uid, jt in rows:
            self._join_times[uid] = jt

    async def _flush_active_sessions(self) -> None:
        """
        Avant un arrêt, convertit les sessions en cours en sessions terminées.
        Au prochain démarrage, _restore_join_times repartira de zéro pour eux.
        """
        now = _now()
        for user_id, jt in list(self._join_times.items()):
            if not jt:
                continue
            guild_id = 0
            for g in self.bot.guilds:
                m = g.get_member(user_id)
                if m and m.voice:
                    guild_id = g.id
                    break
            await self._save_session(user_id, guild_id, jt, now)
            # Repart d'un join_time frais = maintenant (session continuée après restart)
            self._join_times[user_id] = now
            await self._upsert_join_time(user_id, now)

    # ──────────────────────────────────────────────────────────────
    #  LOGIQUE DES RANGS
    # ──────────────────────────────────────────────────────────────

    async def _get_hours(self, user_id: int) -> float:
        sessions = await self._get_sessions(user_id)
        jt = self._join_times.get(user_id) or None
        return _hours_in_window(sessions, jt)

    def _can_announce(self, user_id: int, rank: str, direction: str) -> bool:
        """Retourne True si le cooldown est expiré et l'enregistre."""
        key = (user_id, rank, direction)
        if _now() - self._cooldowns.get(key, 0) < ANNOUNCE_COOLDOWN:
            return False
        self._cooldowns[key] = _now()
        return True

    async def update_member_rank(
        self,
        member: discord.Member,
        hours: float,
        *,
        announce: bool = True,
    ) -> None:
        """
        Cœur du système.
        Compare les rangs mérités aux rangs actuels et :
          • ajoute les rôles manquants (rank-up)
          • retire les rôles non mérités (derank)
          • envoie les annonces si announce=True et cooldown ok
        """
        guild = member.guild
        deserved = _deserved_ranks(hours)
        current = {
            self._id_to_name[r.id]
            for r in member.roles
            if r.id in self._rank_role_id_set
        }

        to_add    = deserved - current
        to_remove = current  - deserved

        # ── Ajout des rôles ──────────────────────────────────────
        for rank_name in sorted(to_add, key=lambda r: RANK_ORDER.index(r)):
            role = guild.get_role(RANK_ROLE_IDS[rank_name])
            if role is None:
                self.log.warning(
                    "Rôle '%s' introuvable dans %s (id=%d)",
                    rank_name, guild.name, RANK_ROLE_IDS[rank_name],
                )
                continue
            try:
                await member.add_roles(role, reason=f"Rank-up One Piece : {rank_name}")
                self.log.info(
                    "✅ [RANK-UP] %s → %s (%.1fh)", member.display_name, rank_name, hours
                )
            except discord.Forbidden:
                self.log.error(
                    "Permission refusée pour add_roles(%s, %s)", member.display_name, rank_name
                )
                continue
            except discord.HTTPException as exc:
                self.log.error("HTTPException add_roles %s / %s : %s", member.display_name, rank_name, exc)
                continue

            if announce and self._can_announce(member.id, rank_name, "up"):
                await self._send_rankup(member, rank_name, hours)

        # ── Retrait des rôles (derank) ───────────────────────────
        for rank_name in sorted(to_remove, key=lambda r: RANK_ORDER.index(r)):
            role = guild.get_role(RANK_ROLE_IDS[rank_name])
            if role is None:
                continue
            try:
                await member.remove_roles(role, reason=f"Derank One Piece : {rank_name}")
                self.log.info(
                    "⬇️ [DERANK] %s → -%s (%.1fh)", member.display_name, rank_name, hours
                )
            except discord.Forbidden:
                self.log.error(
                    "Permission refusée pour remove_roles(%s, %s)", member.display_name, rank_name
                )
                continue
            except discord.HTTPException as exc:
                self.log.error("HTTPException remove_roles %s / %s : %s", member.display_name, rank_name, exc)
                continue

            if announce and self._can_announce(member.id, rank_name, "down"):
                await self._send_derank(member, rank_name, hours)

        if to_add or to_remove:
            self.log.info(
                "[RANK] %s | +%s | -%s | %.1fh sur 7j",
                member.display_name, to_add, to_remove, hours,
            )

    # ──────────────────────────────────────────────────────────────
    #  ANNONCES
    # ──────────────────────────────────────────────────────────────

    async def _get_channel(self) -> Optional[discord.TextChannel]:
        ch = self.bot.get_channel(RAPPEL_RANK_CHANNEL_ID)
        if ch is None:
            try:
                ch = await self.bot.fetch_channel(RAPPEL_RANK_CHANNEL_ID)
            except Exception as exc:
                self.log.error(
                    "Impossible de récupérer le channel rappel-rank (%d) : %s",
                    RAPPEL_RANK_CHANNEL_ID, exc,
                )
        return ch

    async def _send_rankup(
        self, member: discord.Member, rank_name: str, hours: float
    ) -> None:
        ch = await self._get_channel()
        if ch is None:
            return

        emoji   = RANK_EMOJIS.get(rank_name, "🎖️")
        color   = RANK_COLORS.get(rank_name, discord.Color.blurple())
        message = RANK_UP_MESSAGES.get(rank_name, "Félicitations pour ce nouveau rang !")

        embed = discord.Embed(
            title=f"{emoji}  NOUVEAU RANG — {rank_name.upper()} !",
            description=f"{member.mention}\n\n{message}",
            color=color,
        )
        embed.add_field(
            name="⏱️ Heures vocales (7 jours)",
            value=f"`{hours:.1f}h`",
            inline=True,
        )
        embed.add_field(
            name="🎯 Seuil atteint",
            value=f"`{RANK_THRESHOLDS[rank_name]:.0f}h`",
            inline=True,
        )
        embed.set_thumbnail(url=member.display_avatar.url)
        embed.set_footer(text="Brams Score • One Piece")

        try:
            await ch.send(content=member.mention, embed=embed)
            self.log.info("[ANNOUNCE] Rank-up → %s : %s", member.display_name, rank_name)
        except Exception as exc:
            self.log.error(
                "[ANNOUNCE] Échec rank-up %s (%s) : %s", member.display_name, rank_name, exc
            )

    async def _send_derank(
        self, member: discord.Member, rank_name: str, hours: float
    ) -> None:
        ch = await self._get_channel()
        if ch is None:
            return

        msg = DERANK_MESSAGES.get(rank_name, f"perd le rang **{rank_name}**.")
        threshold = RANK_THRESHOLDS[rank_name]

        embed = discord.Embed(
            title=f"⬇️  Perte de rang — {rank_name}",
            description=f"{member.mention} {msg}",
            color=discord.Color.from_rgb(100, 100, 100),
        )
        embed.add_field(
            name="⏱️ Heures vocales (7 jours)",
            value=f"`{hours:.1f}h`",
            inline=True,
        )
        embed.add_field(
            name="📉 Seuil requis",
            value=f"`{threshold:.0f}h`",
            inline=True,
        )
        embed.set_footer(text="Brams Score • One Piece")

        try:
            await ch.send(embed=embed)
            self.log.info("[ANNOUNCE] Derank → %s : -%s", member.display_name, rank_name)
        except Exception as exc:
            self.log.error(
                "[ANNOUNCE] Échec derank %s (%s) : %s", member.display_name, rank_name, exc
            )

    # ──────────────────────────────────────────────────────────────
    #  EVENTS VOCAUX
    # ──────────────────────────────────────────────────────────────

    @commands.Cog.listener()
    async def on_voice_state_update(
        self,
        member: discord.Member,
        before: discord.VoiceState,
        after: discord.VoiceState,
    ) -> None:
        if member.bot:
            return

        now = _now()
        uid = member.id

        # ── Rejoint le vocal ─────────────────────────────────────
        if before.channel is None and after.channel is not None:
            self._join_times[uid] = now
            await self._upsert_join_time(uid, now)
            self.log.info("🎤 %s rejoint #%s", member.display_name, after.channel.name)

        # ── Quitte le vocal ──────────────────────────────────────
        elif before.channel is not None and after.channel is None:
            jt = self._join_times.pop(uid, None)
            if jt:
                await self._save_session(uid, member.guild.id, jt, now)
                await self._upsert_join_time(uid, 0)
                hours = await self._get_hours(uid)
                self.log.info(
                    "🔇 %s quitte vocal — %.1fh sur 7j", member.display_name, hours
                )
                await self.update_member_rank(member, hours, announce=True)

        # ── Changement de channel (move) ─────────────────────────
        elif (
            before.channel is not None
            and after.channel is not None
            and before.channel != after.channel
        ):
            jt = self._join_times.get(uid)
            if jt:
                # Clôture la session dans l'ancien channel
                await self._save_session(uid, member.guild.id, jt, now)
            # Nouvelle session dans le nouveau channel
            self._join_times[uid] = now
            await self._upsert_join_time(uid, now)
            self.log.info(
                "🔀 %s déplacé : #%s → #%s",
                member.display_name,
                before.channel.name,
                after.channel.name,
            )

    # ──────────────────────────────────────────────────────────────
    #  TÂCHE BACKGROUND (toutes les 5 minutes)
    # ──────────────────────────────────────────────────────────────

    @tasks.loop(seconds=LIVE_UPDATE_INTERVAL)
    async def live_update_task(self) -> None:
        """
        Vérifie tous les membres actuellement en vocal.
        Applique les rank-up et derank même si la personne ne quitte pas.
        Le cooldown ANNOUNCE_COOLDOWN empêche le spam d'annonces.
        """
        tick_start = time.time()
        checked = 0

        for guild in self.bot.guilds:
            if guild.id not in GUILD_IDS:
                continue

            for vc in guild.voice_channels:
                for member in vc.members:
                    if member.bot:
                        continue

                    # Sécurité : join_time manquant après un restart
                    if member.id not in self._join_times:
                        self._join_times[member.id] = _now()
                        await self._upsert_join_time(member.id, self._join_times[member.id])
                        self.log.warning(
                            "join_time absent pour %s → réinitialisé", member.display_name
                        )

                    hours = await self._get_hours(member.id)
                    try:
                        # announce=True : si un seuil est franchi pendant la session,
                        # l'annonce part immédiatement (protégée par le cooldown)
                        await self.update_member_rank(member, hours, announce=True)
                    except Exception as exc:
                        self.log.error(
                            "Erreur update_member_rank %s : %s", member.display_name, exc
                        )

                    checked += 1
                    # Yield régulier pour ne pas bloquer la gateway Discord
                    if checked % 30 == 0:
                        await asyncio.sleep(0)

        elapsed = time.time() - tick_start
        if checked:
            self.log.info(
                "live_update_task : %d membres en vocal traités en %.1fs",
                checked, elapsed,
            )

    @live_update_task.before_loop
    async def _before_live_update(self) -> None:
        await self.bot.wait_until_ready()

    @live_update_task.error
    async def _live_update_error(self, error: Exception) -> None:
        self.log.error("live_update_task erreur critique : %s", error, exc_info=True)
        # La tâche redémarre automatiquement grâce au décorateur tasks.loop

    # ──────────────────────────────────────────────────────────────
    #  COMMANDES OWNER / DEBUG
    # ──────────────────────────────────────────────────────────────

    @commands.command(name="rank_debug", hidden=True)
    @commands.is_owner()
    async def rank_debug(
        self, ctx: commands.Context, member: discord.Member = None
    ) -> None:
        """[OWNER] Affiche les heures vocales et rangs d'un membre."""
        target = member or ctx.author
        hours  = await self._get_hours(target.id)
        deserved = _deserved_ranks(hours)
        jt = self._join_times.get(target.id)
        jt_str = f"<t:{int(jt)}:R>" if jt else "Non en vocal"

        lines = [
            f"**{target.display_name}** — `{hours:.2f}h` sur {WINDOW_DAYS}j",
            f"Rangs mérités : `{', '.join(deserved) or 'Aucun'}`",
            f"En vocal depuis : {jt_str}",
        ]
        await ctx.send("\n".join(lines))

    @commands.command(name="rank_sync", hidden=True)
    @commands.is_owner()
    async def rank_sync(
        self, ctx: commands.Context, member: discord.Member = None
    ) -> None:
        """[OWNER] Force la mise à jour des rangs d'un membre ou de tous."""
        targets = [member] if member else [
            m for g in self.bot.guilds if g.id in GUILD_IDS for m in g.members if not m.bot
        ]
        await ctx.send(f"🔄 Synchronisation de {len(targets)} membre(s)…")
        for m in targets:
            hours = await self._get_hours(m.id)
            await self.update_member_rank(m, hours, announce=False)
        await ctx.send("✅ Synchronisation terminée.")


# ═══════════════════════════════════════════════════════════════════
#  SETUP — appelé par bot.load_extension("cogs.rank_vocal")
# ═══════════════════════════════════════════════════════════════════

async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(RankVocal(bot))
