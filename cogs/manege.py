import asyncio
import os
import random

import discord
from discord import app_commands
from discord.ext import commands

# /manege : fait défiler un membre dans tous les salons vocaux (AFK et
# conférences compris), de haut en bas, en boucle, jusqu'à /manege_stop. Réservé à OWNER_IDS.
# Aucune pause entre deux déplacements : discord.py attend tout seul quand
# Discord renvoie un 429, c'est donc Discord qui fixe la cadence maximale.
# Pas de durée max : arrêt seulement via /manege_stop ou si le membre quitte
# le vocal, retour dans son salon d'origine à la fin.

# Seul Freydiss peut lancer ou arrêter le manège.
OWNER_IDS = {1094070545248694342}

# /antimove : qui peut se protéger des déplacements.
ANTIMOVE_IDS = OWNER_IDS

# Salons gardés : un membre sans droit d'y entrer qui s'y fait déplacer est renvoyé
# aussitôt d'où il vient, sauf si c'est un de ces membres (ou un porteur d'un de ces
# rôles) qui l'a déplacé. Le bot lui-même compte comme autorisé (/manege).
GUARDED_CHANNELS = {1554871712137347164}  # 👑・Central 46
GUARD_MOVER_IDS = {
    1094070545248694342,  # Freydiss
    1529571471205072936,  # Freydiss (2e compte)
    994546252995907754,   # Hakuji
}
GUARD_MOVER_ROLES = {1502420669244248156}  # Division 0

# Son joué dans Central 46 quand quelqu'un y arrive (et y reste). Certains membres ont
# leurs propres sons (un au hasard, jamais deux fois le même d'affilée), d'autres aucun.
_SOUNDS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sounds")
ARRIVAL_SOUND = os.path.join(_SOUNDS_DIR, "central46_clochard.mp3")
_BLAZE_SOUNDS  = [os.path.join(_SOUNDS_DIR, f"central46_blaze_{i}.mp3") for i in range(1, 5)]
_HAKUJI_SOUNDS = [os.path.join(_SOUNDS_DIR, f"central46_hakuji_{i}.mp3") for i in range(1, 4)]
ARRIVAL_SOUNDS_BY_MEMBER = {
    847832035909435413:  _BLAZE_SOUNDS,   # BLAZE
    994546252995907754:  _HAKUJI_SOUNDS,  # Hakuji
    1191446549369196697: _HAKUJI_SOUNDS,  # Hakuji (2e compte, H4kuji)
}
ARRIVAL_SOUND_EXEMPT = {
    1094070545248694342,  # Freydiss
    1529571471205072936,  # Freydiss (2e compte)
}
ARRIVAL_SOUND_COOLDOWN_S = 30  # par membre : pas de spam s'il sort et revient en boucle

# Discord regroupe les déplacements d'un même auteur vers un même salon dans UNE
# entrée d'audit (compteur qui monte). Quand quelqu'un en déplace plusieurs d'affilée,
# seule la 1re lecture voit le compteur bouger : on garde donc l'auteur quelques secondes.
_MOVER_MEMORY_S = 6


def _allowed(interaction: discord.Interaction) -> bool:
    if interaction.user.id in OWNER_IDS:
        return True
    raise app_commands.MissingPermissions(["move_members"])


class ManegeCog(commands.Cog):

    def __init__(self, bot):
        self.bot = bot
        self._runs: dict[tuple[int, int], asyncio.Task] = {}
        # /antimove : (guild_id, member_id) protégés + compteurs déjà vus des
        # entrées « membre déplacé » du journal d'audit (Discord les regroupe).
        self._shield: set[tuple[int, int]] = set()
        self._seen_moves: dict[int, int] = {}
        self._last_mover: dict[int, tuple[int, float]] = {}  # salon -> (auteur, instant)
        self._audit_lock = asyncio.Lock()
        self._sound_cd: dict[int, float] = {}
        self._last_sound: dict[int, str] = {}

    async def _move_entries(self, guild: discord.Guild) -> list[discord.AuditLogEntry]:
        if not guild.me.guild_permissions.view_audit_log:
            return []
        try:
            return [e async for e in guild.audit_logs(limit=10, action=discord.AuditLogAction.member_move)]
        except discord.HTTPException:
            return []

    async def _mover_of(self, member: discord.Member, channel: discord.abc.GuildChannel) -> int | None:
        """Qui vient de déplacer `member` dans `channel` ? None = il y est allé lui-même
        (un changement de salon fait soi-même ne laisse rien dans le journal d'audit)."""
        loop = asyncio.get_running_loop()
        async with self._audit_lock:  # deux événements simultanés ne se volent pas l'entrée
            for delay in (0.4, 1.2):  # l'entrée d'audit arrive juste après l'événement vocal
                await asyncio.sleep(delay)
                now = discord.utils.utcnow()
                for e in await self._move_entries(member.guild):
                    count = getattr(e.extra, "count", 1) or 1
                    new = count > self._seen_moves[e.id] if e.id in self._seen_moves else (now - e.created_at).total_seconds() < 15
                    self._seen_moves[e.id] = count
                    target = getattr(e.extra, "channel", None)
                    if new and target and e.user:
                        self._last_mover[target.id] = (e.user.id, loop.time())
                hit = self._last_mover.get(channel.id)
                if hit and loop.time() - hit[1] < _MOVER_MEMORY_S:
                    return hit[0]
        return None

    def _may_move_into_guarded(self, guild: discord.Guild, mover_id: int | None) -> bool:
        if mover_id is None:
            return False
        if mover_id in GUARD_MOVER_IDS or mover_id == self.bot.user.id:
            return True
        mover = guild.get_member(mover_id)
        return bool(mover and any(r.id in GUARD_MOVER_ROLES for r in mover.roles))

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        if not after.channel or before.channel == after.channel or member.bot:
            return
        in_guarded = after.channel.id in GUARDED_CHANNELS
        guarded = in_guarded and not after.channel.permissions_for(member).connect
        shielded = before.channel is not None and (member.guild.id, member.id) in self._shield
        if not guarded and not shielded:
            if in_guarded:
                self._arrival_sound(member, after.channel)
            return
        mover = await self._mover_of(member, after.channel)
        if guarded and not self._may_move_into_guarded(member.guild, mover):
            back = before.channel if before.channel and before.channel.id not in GUARDED_CHANNELS else None
            try:
                await member.move_to(back, reason=f"Salon gardé : déplacé par {mover or 'inconnu'}, non autorisé")
            except discord.HTTPException as e:
                print(f"[GARDE] renvoi de {member} impossible : {e}")
            else:
                print(f"[GARDE] {member} renvoyé de {after.channel.name} (déplacé par {mover})")
            return
        if in_guarded:
            self._arrival_sound(member, after.channel)
        if shielded and mover not in (None, member.id, self.bot.user.id):
            try:
                await member.move_to(before.channel, reason="/antimove")
            except discord.HTTPException:
                pass

    def _arrival_sound(self, member: discord.Member, channel: discord.VoiceChannel) -> None:
        if member.id in ARRIVAL_SOUND_EXEMPT:
            return
        now = asyncio.get_running_loop().time()
        if now - self._sound_cd.get(member.id, -1e9) < ARRIVAL_SOUND_COOLDOWN_S:
            return
        self._sound_cd[member.id] = now
        pool = ARRIVAL_SOUNDS_BY_MEMBER.get(member.id) or [ARRIVAL_SOUND]
        choices = [f for f in pool if f != self._last_sound.get(member.id)] or pool
        path = random.choice(choices)
        self._last_sound[member.id] = path
        asyncio.create_task(self._play_arrival(member, channel, path))

    async def _play_arrival(self, member: discord.Member, channel: discord.VoiceChannel, path: str) -> None:
        locks = getattr(self.bot, "_entry_sound_locks", None)
        if locks is None:
            locks = self.bot._entry_sound_locks = {}
        lock = locks.setdefault(channel.guild.id, asyncio.Lock())
        if lock.locked():  # un autre son passe déjà : on n'empile pas
            return
        async with lock:
            if member not in channel.members:
                return
            vc = None
            try:
                if channel.guild.voice_client:
                    await channel.guild.voice_client.disconnect(force=True)
                vc = await channel.connect(timeout=10)
                done = asyncio.Event()
                loop = asyncio.get_running_loop()
                source = discord.PCMVolumeTransformer(discord.FFmpegPCMAudio(path, options="-vn"), volume=0.6)
                vc.play(source, after=lambda err: loop.call_soon_threadsafe(done.set))
                await asyncio.wait_for(done.wait(), timeout=30)
                print(f"[CENTRAL46] {os.path.basename(path)} joué pour {member}")
            except Exception as e:
                print(f"[CENTRAL46] son d'arrivée impossible pour {member} : {type(e).__name__}: {e}")
            finally:
                if vc and vc.is_connected():
                    await vc.disconnect()

    def _route(self, member: discord.Member) -> list[discord.abc.GuildChannel]:
        guild = member.guild
        me = guild.me
        out = []
        channels = [*guild.voice_channels, *guild.stage_channels]
        for ch in sorted(channels, key=lambda c: (c.category.position if c.category else -1, c.position)):
            perms = ch.permissions_for(me)
            if perms.connect and perms.move_members:
                out.append(ch)
        return out

    async def _ride(self, member: discord.Member, origin: discord.abc.GuildChannel, route: list[discord.abc.GuildChannel]):
        try:
            while True:
                for ch in route:
                    if not member.voice:
                        return
                    if member.voice.channel != ch:
                        try:
                            await member.move_to(ch, reason="/manege")
                        except discord.HTTPException:
                            pass
                    await asyncio.sleep(0)
        finally:
            self._runs.pop((member.guild.id, member.id), None)
            if member.voice and origin and member.voice.channel != origin:
                try:
                    await member.move_to(origin, reason="/manege terminé")
                except discord.HTTPException:
                    pass

    @app_commands.command(name="manege", description="🎠 Fait tourner un membre dans tous les vocaux, de haut en bas, en boucle")
    @app_commands.describe(membre="Le membre à faire tourner (il doit être en vocal)")
    @app_commands.check(_allowed)
    @app_commands.guild_only()
    async def manege(self, interaction: discord.Interaction, membre: discord.Member):
        key = (interaction.guild_id, membre.id)
        if key in self._runs:
            return await interaction.response.send_message(f"{membre.mention} est déjà sur le manège. `/manege_stop` pour l'arrêter.", ephemeral=True)
        if not membre.voice or not membre.voice.channel:
            return await interaction.response.send_message(f"{membre.mention} n'est pas en vocal.", ephemeral=True)
        route = self._route(membre)
        if len(route) < 2:
            return await interaction.response.send_message("Il me faut au moins deux salons vocaux accessibles.", ephemeral=True)
        self._runs[key] = asyncio.create_task(self._ride(membre, membre.voice.channel, route))
        await interaction.response.send_message(
            f"🎠 {membre.mention} part sur le manège : {len(route)} salons, en boucle. "
            f"`/manege_stop` pour l'arrêter."
        )

    @app_commands.command(name="manege_stop", description="🛑 Arrête le manège d'un membre (ou de tout le monde)")
    @app_commands.describe(membre="Le membre à faire descendre (vide = tout le monde)")
    @app_commands.check(_allowed)
    @app_commands.guild_only()
    async def manege_stop(self, interaction: discord.Interaction, membre: discord.Member | None = None):
        keys = [k for k in self._runs if k[0] == interaction.guild_id and (membre is None or k[1] == membre.id)]
        for k in keys:
            self._runs[k].cancel()
        if not keys:
            return await interaction.response.send_message("Personne sur le manège.", ephemeral=True)
        await interaction.response.send_message(f"🛑 Manège arrêté ({len(keys)}). Retour au salon de départ.")

    @app_commands.command(name="antimove", description="🛡️ Active/désactive : si quelqu'un te déplace en vocal, le bot te remet dans ton salon")
    @app_commands.guild_only()
    async def antimove(self, interaction: discord.Interaction):
        if interaction.user.id not in ANTIMOVE_IDS:
            return await interaction.response.send_message("Commande réservée.", ephemeral=True)
        key = (interaction.guild_id, interaction.user.id)
        if key in self._shield:
            self._shield.discard(key)
            return await interaction.response.send_message("🛡️ Anti-move désactivé.", ephemeral=True)
        self._shield.add(key)
        # Marque l'historique actuel comme déjà vu pour ne pas réagir à d'anciens déplacements.
        for e in await self._move_entries(interaction.guild):
            self._seen_moves[e.id] = getattr(e.extra, "count", 1) or 1
        msg = "🛡️ Anti-move activé : si quelqu'un te déplace, je te remets dans ton salon."
        if not interaction.guild.me.guild_permissions.view_audit_log:
            msg += "\n⚠️ Il me manque la permission « Voir les logs du serveur » : sans elle je ne peux pas voir qui te déplace."
        await interaction.response.send_message(msg, ephemeral=True)

    @manege.error
    @manege_stop.error
    async def _perm_error(self, interaction: discord.Interaction, error: app_commands.AppCommandError):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("Commande réservée à Freydiss.", ephemeral=True)
        else:
            raise error


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(ManegeCog(bot))
