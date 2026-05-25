import discord
from discord.ext import commands, tasks

from ranks import check_alert, update_rank
from storage import get_user, load_data, refresh_berry_leaderboard, save_data
from utils import award_vocal_berries, clean_old_data, now_ts, user_seconds_in_period


class EventsCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.Cog.listener()
    async def on_ready(self) -> None:
        print(f"✅ Bot connecté : {self.bot.user}")
        data = await load_data()
        started = 0
        for guild in self.bot.guilds:
            for member in guild.members:
                if member.bot:
                    continue
                if member.voice and member.voice.channel:
                    user = get_user(data, str(member.id))
                    if not user.get("join_time"):
                        user["join_time"] = now_ts()
                        started += 1
        if started:
            await save_data(data)
            names = {
                str(member.id): member.display_name
                for guild in self.bot.guilds
                for member in guild.members
                if not member.bot
            }
            await refresh_berry_leaderboard(data, names=names)
            print(f"Sessions vocales restaurées pour {started} membre(s).")
        if not self.check_ranks_loop.is_running():
            self.check_ranks_loop.start()
        try:
            synced = await self.bot.tree.sync()
            print(f"📡 {len(synced)} commandes slash synchronisées")
        except Exception as e:
            print(f"Erreur sync : {e}")

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot:
            return
        data = await load_data()
        uid = str(message.author.id)
        user = get_user(data, uid)
        user["messages"].append(now_ts())
        clean_old_data(user)
        await save_data(data)

    @commands.Cog.listener()
    async def on_voice_state_update(
        self,
        member: discord.Member,
        before: discord.VoiceState,
        after: discord.VoiceState,
    ) -> None:
        if member.bot:
            return

        data = await load_data()
        uid = str(member.id)
        user = get_user(data, uid)

        if before.channel is None and after.channel is not None:
            user["join_time"] = now_ts()
            await save_data(data)

        elif before.channel is not None and after.channel is None:
            if user["join_time"]:
                start, end = user["join_time"], now_ts()
                user["vocal_sessions"].append({"start": start, "end": end, "channel": str(before.channel.id)})
                award_vocal_berries(user, end - start)
                user["join_time"] = None
                clean_old_data(user)
                await save_data(data)
                names = {
                    str(m.id): m.display_name
                    for guild in self.bot.guilds
                    for m in guild.members
                    if not m.bot
                }
                await refresh_berry_leaderboard(data, names=names)
                hours_7d = user_seconds_in_period(user, 7) / 3600
                await update_rank(member, hours_7d)

        elif (
            before.channel is not None
            and after.channel is not None
            and before.channel != after.channel
        ):
            if user["join_time"]:
                start, end = user["join_time"], now_ts()
                user["vocal_sessions"].append({"start": start, "end": end, "channel": str(before.channel.id)})
                award_vocal_berries(user, end - start)
            user["join_time"] = now_ts()
            clean_old_data(user)
            await save_data(data)

    @tasks.loop(hours=1)
    async def check_ranks_loop(self) -> None:
        data = await load_data()
        for guild in self.bot.guilds:
            for member in guild.members:
                if member.bot:
                    continue
                uid = str(member.id)
                user = get_user(data, uid)
                clean_old_data(user)
                hours_7d = user_seconds_in_period(user, 7) / 3600
                await update_rank(member, hours_7d, announce=True, data=data)
                await check_alert(member, hours_7d, data=data)
        await save_data(data)
        print("🔄 Vérification horaire des ranks effectuée.")


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(EventsCog(bot))
