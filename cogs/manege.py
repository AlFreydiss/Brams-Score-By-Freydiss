import asyncio
import json
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

# Qui a le droit d'ÊTRE dans un salon gardé (même s'il y va seul). Les admins n'ont pas de
# passe-droit : seuls ceux-là, le rôle Division 0, et ceux qu'un déplaceur autorisé y met.
GUARD_MEMBER_IDS = {
    1094070545248694342,  # Freydiss
    1529571471205072936,  # Freydiss (2e compte)
    994546252995907754,   # Hakuji
    1079054995917381672,  # Brams
    1495896013037113366,  # Amel (accès perso au salon)
}
GUARD_MEMBER_ROLES = {1502420669244248156}  # Division 0

# Son joué dans Central 46 quand quelqu'un y arrive (et y reste). Certains membres ont
# leurs propres sons (un au hasard, jamais deux fois le même d'affilée), d'autres aucun.
_SOUNDS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sounds")
ARRIVAL_SOUND = os.path.join(_SOUNDS_DIR, "central46_clochard.mp3")
# Membres sans droit propre mais mis dans un salon gardé par un déplaceur autorisé : retenus ici (fichier local
# de la VM, hors git) pour que la ronde de vérification ne les sorte pas, même après un redémarrage du bot.
_ADMIS_PATH = os.path.join(os.path.dirname(_SOUNDS_DIR), "central46_admis.json")
GUARD_SWEEP_S = 30  # ronde : sort toute personne présente sans autorisation (rattrape les arrivées ratées)
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
ARRIVAL_SOUND_COOLDOWN_S = 20 * 60  # 1 son max toutes les 20 min par salon, toutes personnes confondues

# Discord regroupe les déplacements d'un même auteur vers un même salon dans UNE
# entrée d'audit (compteur qui monte). Quand quelqu'un en déplace plusieurs d'affilée,
# seule la 1re lecture voit le compteur bouger : on garde donc l'auteur quelques secondes.
_MOVER_FRESH_S = 1.0  # un déplacement noté plus de 1 s avant l'arrivée ne compte pas (autre personne)


def _allowed(interaction: discord.Interaction) -> bool:
    if interaction.user.id in OWNER_IDS:
        return True
    raise app_commands.MissingPermissions(["move_members"])


async def attendre_chiffrement(vc: discord.VoiceClient, max_s: float = 5.0) -> bool:
    """Discord chiffre la voix de bout en bout (DAVE) : tant que l'échange de clés avec les
    membres du salon n'est pas fini, l'audio envoyé est indéchiffrable et personne ne l'entend.
    On attend donc que le chiffrement soit prêt, plus une petite marge. Renvoie True si prêt.
    (23/11 : davey 0.2 ne donnait jamais de clé à discord.py 2.7.1 -> davey<0.2 dans requirements.txt.)"""
    etat = getattr(vc, "_connection", None)
    loop = asyncio.get_running_loop()
    debut = loop.time()
    fin = debut + max_s
    pret = True
    while etat is not None and getattr(etat, "dave_protocol_version", 0) and not getattr(etat, "can_encrypt", True):
        if loop.time() > fin:
            sess = getattr(etat, "dave_session", None)
            print(f"[VOIX] chiffrement pas prêt après {max_s:.0f} s (DAVE v{etat.dave_protocol_version}, "
                  f"session={'oui' if sess else 'non'}, ready={getattr(sess, 'ready', None)}, "
                  f"transitions en attente={dict(getattr(etat, 'dave_pending_transitions', {}))})")
            pret = False
            break
        await asyncio.sleep(0.1)
    if pret:
        print(f"[VOIX] chiffrement prêt en {loop.time() - debut:.1f} s "
              f"(DAVE v{getattr(etat, 'dave_protocol_version', 0) if etat else 0})")
    await asyncio.sleep(0.6)
    return pret


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
        self._sound_cd: dict[int, float] = {}  # salon -> instant du dernier son joué
        self._last_sound: dict[int, str] = {}
        self._admitted: dict[int, set[int]] = self._load_admitted()  # salon gardé -> membres admis
        self._deciding: set[int] = set()  # membres dont l'arrivée est en cours d'examen (la ronde attend)
        self._sweeper: asyncio.Task | None = None

    async def cog_load(self) -> None:
        self._sweeper = asyncio.create_task(self._sweep_loop())

    async def cog_unload(self) -> None:
        if self._sweeper:
            self._sweeper.cancel()

    @staticmethod
    def _load_admitted() -> dict[int, set[int]]:
        try:
            with open(_ADMIS_PATH, encoding="utf-8") as f:
                return {int(k): set(v) for k, v in json.load(f).items()}
        except (OSError, ValueError):
            return {}

    def _save_admitted(self) -> None:
        try:
            with open(_ADMIS_PATH, "w", encoding="utf-8") as f:
                json.dump({str(k): sorted(v) for k, v in self._admitted.items()}, f)
        except OSError as e:
            print(f"[GARDE] sauvegarde des admis impossible : {e}")

    async def _sweep_loop(self) -> None:
        """Ronde toutes les 30 s : quiconque est dans un salon gardé sans en avoir le droit (ni liste, ni rôle,
        ni admis par un déplaceur) est sorti. Rattrape les arrivées pendant un redémarrage du bot. Au tout
        premier passage (pas encore de fichier), les présents sont gardés tels quels."""
        await self.bot.wait_until_ready()
        premier = not os.path.exists(_ADMIS_PATH)
        while True:
            try:
                await self._sweep(premier)
                premier = False
            except Exception as e:
                print(f"[GARDE] ronde en erreur : {type(e).__name__}: {e}")
            await asyncio.sleep(GUARD_SWEEP_S)

    async def _sweep(self, premier: bool) -> None:
        changed = premier
        for cid in GUARDED_CHANNELS:
            ch = self.bot.get_channel(cid)
            if not isinstance(ch, (discord.VoiceChannel, discord.StageChannel)):
                continue
            admis = self._admitted.setdefault(cid, set())
            present = {m.id for m in ch.members}
            if admis - present:  # partis entre-temps (événement de départ raté)
                admis &= present
                changed = True
            for m in list(ch.members):
                if m.bot or self._may_be_in_guarded(m) or m.id in admis or m.id in self._deciding:
                    continue
                if premier:
                    admis.add(m.id)
                    print(f"[GARDE] premier passage : {m} déjà dans {ch.name}, gardé")
                    continue
                try:
                    await m.move_to(None, reason="Salon gardé : présent sans autorisation")
                    print(f"[GARDE] ronde : {m} sorti de {ch.name} (présent sans autorisation)")
                except discord.HTTPException as e:
                    print(f"[GARDE] ronde : sortie de {m} impossible : {e}")
        if changed:
            self._save_admitted()

    async def _move_entries(self, guild: discord.Guild) -> list[discord.AuditLogEntry]:
        if not guild.me.guild_permissions.view_audit_log:
            return []
        try:
            return [e async for e in guild.audit_logs(limit=10, action=discord.AuditLogAction.member_move)]
        except discord.HTTPException:
            return []

    async def _poll_audit(self, guild: discord.Guild) -> None:
        """Relit le journal d'audit (déplacements) et note, par salon d'arrivée, qui vient d'y déplacer quelqu'un."""
        loop = asyncio.get_running_loop()
        now = discord.utils.utcnow()
        for e in await self._move_entries(guild):
            count = getattr(e.extra, "count", 1) or 1
            new = count > self._seen_moves[e.id] if e.id in self._seen_moves else (now - e.created_at).total_seconds() < 15
            self._seen_moves[e.id] = count
            target = getattr(e.extra, "channel", None)
            if new and target and e.user:
                self._last_mover[target.id] = (e.user.id, loop.time())

    @commands.Cog.listener()
    async def on_audit_log_entry_create(self, entry: discord.AuditLogEntry):
        """Journal d'audit en direct (passerelle) : un déplacement est connu presque en même temps que l'arrivée."""
        if entry.action != discord.AuditLogAction.member_move:
            return
        target = getattr(entry.extra, "channel", None)
        uid = entry.user_id
        if target and uid:
            self._last_mover[target.id] = (uid, asyncio.get_running_loop().time())
            self._seen_moves[entry.id] = getattr(entry.extra, "count", 1) or 1

    async def _mover_of(self, member: discord.Member, channel: discord.abc.GuildChannel,
                        deadline_s: float = 0.8) -> tuple[int | None, float]:
        """Qui vient de déplacer `member` dans `channel` ? (None = il y est allé lui-même : un changement de salon
        fait soi-même ne laisse rien dans le journal d'audit.) Regarde le journal en direct et le relit toutes les
        0,25 s ; répond dès qu'un déplaceur est connu, sinon au bout de `deadline_s`. Renvoie (déplaceur, attente)."""
        loop = asyncio.get_running_loop()
        t0 = loop.time()
        next_poll = t0
        while True:
            hit = self._last_mover.get(channel.id)
            if hit and hit[1] >= t0 - _MOVER_FRESH_S:
                return hit[0], loop.time() - t0
            now = loop.time()
            if now - t0 >= deadline_s:
                return None, now - t0
            if now >= next_poll:
                next_poll = now + 0.25
                async with self._audit_lock:
                    await self._poll_audit(member.guild)
                continue
            await asyncio.sleep(0.05)

    @staticmethod
    def _may_be_in_guarded(member: discord.Member) -> bool:
        return member.id in GUARD_MEMBER_IDS or any(r.id in GUARD_MEMBER_ROLES for r in member.roles)

    def _may_move_into_guarded(self, member: discord.Member, mover_id: int | None) -> bool:
        if mover_id is None:
            return False
        if mover_id == self.bot.user.id:  # le bot : seulement pour /manege (ses renvois ne comptent pas)
            return (member.guild.id, member.id) in self._runs
        if mover_id in GUARD_MOVER_IDS:
            return True
        mover = member.guild.get_member(mover_id)
        return bool(mover and any(r.id in GUARD_MOVER_ROLES for r in mover.roles))

    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        if before.channel == after.channel or member.bot:
            return
        # `after` est mis à jour en place par discord.py : on fige les salons avant toute attente
        source, target = before.channel, after.channel
        if source and source.id in GUARDED_CHANNELS and member.id in self._admitted.get(source.id, set()):
            self._admitted[source.id].discard(member.id)  # il part : il devra être remis par un déplaceur
            self._save_admitted()
        if not target:
            return
        in_guarded = target.id in GUARDED_CHANNELS
        guarded = in_guarded and not self._may_be_in_guarded(member) and (member.guild.id, member.id) not in self._runs
        shielded = source is not None and (member.guild.id, member.id) in self._shield
        if not guarded and not shielded:
            if in_guarded:
                print(f"[GARDE] {member} entre dans {target.name} : autorisé (liste / rôle)")
                self._arrival_sound(member, target)
            return
        if guarded:
            await self._guard(member, source, target)
            return
        mover, _ = await self._mover_of(member, target, deadline_s=1.5)
        if shielded and mover not in (None, member.id, self.bot.user.id):
            try:
                await member.move_to(source, reason="/antimove")
            except discord.HTTPException:
                pass

    async def _guard(self, member: discord.Member, source, target) -> None:
        """Arrivée dans un salon gardé de quelqu'un qui n'a pas le droit d'y être lui-même : il reste seulement si
        un déplaceur autorisé vient de l'y mettre ; sinon il est sorti aussitôt (salon d'avant, ou déconnecté)."""
        origin = source if source and source.id not in GUARDED_CHANNELS else None
        self._deciding.add(member.id)
        try:
            mover, attente = await self._mover_of(member, target)
            if self._may_move_into_guarded(member, mover):
                self._admitted.setdefault(target.id, set()).add(member.id)
                self._save_admitted()
                print(f"[GARDE] {member} admis dans {target.name} (déplacé par {mover}, vu en {attente:.2f} s)")
                self._arrival_sound(member, target)
                return
            try:
                await member.move_to(origin, reason=f"Salon gardé : {'venu seul' if mover is None else f'déplacé par {mover}'}, non autorisé")
                print(f"[GARDE] {member} sorti de {target.name} en {attente:.2f} s ({'venu seul' if mover is None else f'déplacé par {mover}'}, non autorisé)")
            except discord.HTTPException as e:
                print(f"[GARDE] renvoi de {member} impossible : {e}")
        finally:
            self._deciding.discard(member.id)

    def _sound_on_cooldown(self, channel_id: int) -> bool:
        last = self._sound_cd.get(channel_id)
        return last is not None and asyncio.get_running_loop().time() - last < ARRIVAL_SOUND_COOLDOWN_S

    def _arrival_sound(self, member: discord.Member, channel: discord.VoiceChannel) -> None:
        if member.id in ARRIVAL_SOUND_EXEMPT:
            return
        if self._sound_on_cooldown(channel.id):
            return
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
            if member not in channel.members or self._sound_on_cooldown(channel.id):
                return
            vc = None
            try:
                if channel.guild.voice_client:
                    await channel.guild.voice_client.disconnect(force=True)
                vc = await channel.connect(timeout=10)
                await attendre_chiffrement(vc)
                done = asyncio.Event()
                loop = asyncio.get_running_loop()
                source = discord.PCMVolumeTransformer(discord.FFmpegPCMAudio(path, options="-vn"), volume=0.9)
                vc.play(source, after=lambda err: loop.call_soon_threadsafe(done.set))
                self._sound_cd[channel.id] = loop.time()  # compté seulement si le son part vraiment
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
