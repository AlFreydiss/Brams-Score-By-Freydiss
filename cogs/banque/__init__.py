from .banque import BankCog
from .tasks import BankTasksCog


async def setup(bot):
    await bot.add_cog(BankCog(bot))
    await bot.add_cog(BankTasksCog(bot))
