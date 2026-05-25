from .bank import BankCog


async def setup(bot):
    await bot.add_cog(BankCog(bot))
