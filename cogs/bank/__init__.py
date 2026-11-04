from .bank import BankDashboardCog


async def setup(bot):
    await bot.add_cog(BankDashboardCog(bot))
