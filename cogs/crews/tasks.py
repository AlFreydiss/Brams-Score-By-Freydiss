import os
import random
import asyncio
from datetime import datetime, timezone, timedelta

import discord
from discord.ext import tasks

from . import database as db
from .embeds import leaderboard_embed
from .constants import (
    MISSION_TEMPLATES, MISSIONS_PER_CREW, ISLANDS,
    XP_WAR_WIN, TOURNAMENT_MATCH_HOURS,
)

ANNOUNCE_CH = int(os.environ.get("CREWS_ANNOUNCEMENT_CHANNEL_ID", "0"))
LOGS_CH     = int(os.environ.get("CREWS_LOGS_CHANNEL_ID", "0"))


class CrewTasks:

    # ── Bounty recalc quotidien ─────────────────────────────────────────────────

    @tasks.loop(hours=24)
    async def _daily_bounty_recalc(self):
        try:
            await db.recalc_all_bounties()
            print("[CREWS] Primes recalculées ✅")
        except Exception as e:
            print(f"[CREWS] Erreur recalc bounties: {e}")

    # ── Guerres expirées ────────────────────────────────────────────────────────

    @tasks.loop(hours=1)
    async def _war_expire_check(self):
        try:
            expired = await db.get_expired_wars()
            if expired:
                await asyncio.gather(*[self._resolve_war(w) for w in expired])
        except Exception as e:
            print(f"[CREWS] Erreur war expire: {e}")

    async def _resolve_war(self, war: dict):
        try:
            from .utils import award_xp, fmt_berries
            att_score = war['attacker_score']
            def_score = war['defender_score']
            winner_id = war['attacker_id'] if att_score >= def_score else war['defender_id']
            loser_id  = war['defender_id'] if winner_id == war['attacker_id'] else war['attacker_id']

            winner_crew, loser_crew = await asyncio.gather(
                db.get_crew(winner_id), db.get_crew(loser_id),
            )
            if not winner_crew or not loser_crew:
                return

            theft       = int(loser_crew['treasury'] * 0.05)
            total_prize = war['prize_pool'] + theft

            await asyncio.gather(
                db.finish_war(war['id'], winner_id),
                db.update_crew(winner_id,
                    treasury=winner_crew['treasury'] + total_prize,
                    wars_won=winner_crew['wars_won'] + 1),
                db.update_crew(loser_id,
                    treasury=max(0, loser_crew['treasury'] - theft),
                    wars_lost=loser_crew['wars_lost'] + 1),
                db.add_treasury_log(winner_id, 0, total_prize, 'war_prize',
                                    f"Victoire vs {loser_crew['name']}"),
                db.add_treasury_log(loser_id, 0, -theft, 'war_loss',
                                    f"Défaite vs {winner_crew['name']}"),
                award_xp(self.bot, winner_id, XP_WAR_WIN),
                db.add_history(winner_id, winner_crew['captain_id'], 'war_won',
                               f"vs {loser_crew['name']} ({att_score}-{def_score})"),
                db.add_history(loser_id,  loser_crew['captain_id'],  'war_lost',
                               f"vs {winner_crew['name']} ({def_score}-{att_score})"),
            )

            ch = self.bot.get_channel(ANNOUNCE_CH)
            if ch:
                await ch.send(embed=discord.Embed(
                    title="⚔️ Fin de Guerre !",
                    description=(
                        f"🏆 **{winner_crew['name']}** a vaincu **{loser_crew['name']}** !\n"
                        f"Score : **{att_score}** vs **{def_score}**\n"
                        f"Butin : **{fmt_berries(total_prize)} 🍊**"
                    ),
                    color=0xFFD700,
                ))
        except Exception as e:
            print(f"[CREWS] Erreur résolution guerre #{war['id']}: {e}")

    # ── Leaderboard hebdomadaire ────────────────────────────────────────────────

    @tasks.loop(hours=168)
    async def _weekly_leaderboard(self):
        try:
            ch = self.bot.get_channel(ANNOUNCE_CH)
            if not ch:
                return
            crews = await db.leaderboard_crews(10)
            from .leaderboard import generate_leaderboard_image
            file  = generate_leaderboard_image(crews)
            embed = leaderboard_embed(crews)
            embed.title = "🏆 Classement Hebdomadaire"
            embed.set_image(url="attachment://leaderboard.png")
            await ch.send(embed=embed, file=file)
        except Exception as e:
            print(f"[CREWS] Erreur leaderboard hebdo: {e}")

    # ── Génération de missions hebdomadaires ────────────────────────────────────

    @tasks.loop(hours=168)
    async def _weekly_missions(self):
        """Génère 3 missions aléatoires par crew actif chaque lundi."""
        try:
            await db.expire_old_missions()
            crews, _ = await db.list_crews(limit=200)
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            for crew in crews:
                existing = await db.get_active_missions(crew['id'])
                if existing:
                    continue
                from .constants import mission_difficulty
                diff = mission_difficulty(crew['level'])
                templates = random.sample(MISSION_TEMPLATES, min(MISSIONS_PER_CREW, len(MISSION_TEMPLATES)))
                for tpl in templates:
                    lvl_data = tpl['levels'][diff]
                    label    = tpl['label'].format(target=lvl_data['target'])
                    await db.create_mission(
                        crew['id'], tpl['type'], label,
                        lvl_data['target'], lvl_data['xp'], lvl_data['gold'],
                        expires_at,
                    )
            print("[CREWS] Missions hebdomadaires générées ✅")
        except Exception as e:
            print(f"[CREWS] Erreur génération missions: {e}")

    # ── Bonus quotidien des territoires ────────────────────────────────────────

    @tasks.loop(hours=24)
    async def _daily_territory_bonus(self):
        """Distribue XP + or aux crews propriétaires d'un territoire."""
        try:
            from .utils import award_xp
            territories = await db.get_all_territories()
            for t in territories:
                if not t.get('owner_crew_id'):
                    continue
                crew = await db.get_crew(t['owner_crew_id'])
                if not crew:
                    continue
                gold = t['daily_gold_bonus']
                await asyncio.gather(
                    award_xp(self.bot, crew['id'], t['daily_xp_bonus']),
                    db.update_crew(crew['id'], treasury=crew['treasury'] + gold),
                    db.add_treasury_log(crew['id'], 0, gold, 'territory_bonus',
                                        f"Territoire {t['zone_name']}"),
                )
            print("[CREWS] Bonus territoires distribués ✅")
        except Exception as e:
            print(f"[CREWS] Erreur bonus territoires: {e}")

    # ── Contestations expirées ──────────────────────────────────────────────────

    @tasks.loop(minutes=5)
    async def _contest_expire_check(self):
        try:
            expired = await db.get_expired_contests()
            for contest in expired:
                result = await db.tally_and_close_contest(contest['id'])
                if not result:
                    continue
                ch = self.bot.get_channel(ANNOUNCE_CH)
                if ch:
                    winner_crew = await db.get_crew(result['winner_id']) if result.get('winner_id') else None
                    territory   = await db.get_territory(contest['zone_key'])
                    name = winner_crew['name'] if winner_crew else "Personne"
                    zone = territory['zone_name'] if territory else contest['zone_key']
                    await ch.send(embed=discord.Embed(
                        title="🗺️ Territoire Conquis !",
                        description=(
                            f"**{name}** contrôle maintenant **{zone}** !\n"
                            f"Votes : {result['att_votes']} vs {result['def_votes']}"
                        ),
                        color=0x00C8B0,
                    ))
        except Exception as e:
            print(f"[CREWS] Erreur contestation expire: {e}")

    # ── Duels vocaux expirés ────────────────────────────────────────────────────

    @tasks.loop(minutes=5)
    async def _vocal_duel_expire_check(self):
        try:
            expired = await db.get_expired_vocal_duels()
            for duel in expired:
                await db.cancel_vocal_duel(duel['id'])
                vc_id = duel.get('voice_channel_id')
                if vc_id:
                    for guild in self.bot.guilds:
                        vc = guild.get_channel(vc_id)
                        if vc:
                            try:
                                await vc.delete(reason="Duel vocal expiré")
                            except Exception:
                                pass
        except Exception as e:
            print(f"[CREWS] Erreur vocal duel expire: {e}")

    # ── Matchs de tournoi expirés ───────────────────────────────────────────────

    @tasks.loop(hours=1)
    async def _tournament_match_expire(self):
        try:
            expired = await db.get_expired_tournament_matches()
            for match in expired:
                result = await db.close_tournament_match(match['id'])
                if not result:
                    continue
                ch = self.bot.get_channel(ANNOUNCE_CH)
                if ch:
                    w = await db.get_crew(result['winner_id']) if result.get('winner_id') else None
                    a = await db.get_crew(match['crew_a_id'])
                    b = await db.get_crew(match['crew_b_id'])
                    await ch.send(embed=discord.Embed(
                        title=f"🏆 Match Tournoi — Round {match['round']}",
                        description=(
                            f"**{a['name'] if a else '?'}** {match['score_a']} — "
                            f"{match['score_b']} **{b['name'] if b else '?'}**\n"
                            f"Vainqueur : **{w['name'] if w else '?'}** passe au round suivant !"
                        ),
                        color=0xFFD700,
                    ))
        except Exception as e:
            print(f"[CREWS] Erreur tournoi match expire: {e}")
