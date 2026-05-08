import os
import asyncio
import discord
from discord.ext import tasks
from . import database as db
from .embeds import leaderboard_embed

ANNOUNCE_CH = int(os.environ.get("CREWS_ANNOUNCEMENT_CHANNEL_ID", "0"))
LOGS_CH     = int(os.environ.get("CREWS_LOGS_CHANNEL_ID", "0"))


class CrewTasks:
    """Mixin de tâches planifiées pour CrewCog."""

    @tasks.loop(hours=24)
    async def _daily_bounty_recalc(self):
        try:
            await db.recalc_all_bounties()
            print("[CREWS] Primes recalculées ✅")
        except Exception as e:
            print(f"[CREWS] Erreur recalc bounties: {e}")

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
            from .utils import award_xp
            from .constants import XP_WAR_WIN
            att_score = war['attacker_score']
            def_score = war['defender_score']
            winner_id = war['attacker_id'] if att_score >= def_score else war['defender_id']
            loser_id  = war['defender_id']  if winner_id == war['attacker_id'] else war['attacker_id']

            winner_crew, loser_crew = await asyncio.gather(
                db.get_crew(winner_id),
                db.get_crew(loser_id),
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
            )
            await asyncio.gather(
                db.add_treasury_log(winner_id, 0,      total_prize, 'war_prize', f"Victoire vs {loser_crew['name']}"),
                db.add_treasury_log(loser_id,  0,     -theft,       'war_loss',  f"Défaite vs {winner_crew['name']}"),
                award_xp(self.bot, winner_id, XP_WAR_WIN),
            )

            ch = self.bot.get_channel(ANNOUNCE_CH)
            if ch:
                from .utils import fmt_berries
                await ch.send(embed=discord.Embed(
                    title="⚔️ Fin de Guerre !",
                    description=(
                        f"🏆 **{winner_crew['name']}** a vaincu **{loser_crew['name']}** !\n\n"
                        f"Score : **{att_score}** vs **{def_score}**\n"
                        f"Butin : **{fmt_berries(total_prize)} 🍊**"
                    ),
                    color=0xFFD700,
                ))
            print(f"[CREWS] Guerre #{war['id']} résolue → vainqueur {winner_id}")
        except Exception as e:
            print(f"[CREWS] Erreur résolution guerre #{war['id']}: {e}")

    @tasks.loop(hours=168)
    async def _weekly_leaderboard(self):
        try:
            ch = self.bot.get_channel(ANNOUNCE_CH)
            if not ch:
                return
            crews = await db.leaderboard_crews(5)
            embed = leaderboard_embed(crews)
            embed.title = "🏆 Classement Hebdomadaire des Équipages"
            await ch.send(embed=embed)
        except Exception as e:
            print(f"[CREWS] Erreur leaderboard hebdo: {e}")
