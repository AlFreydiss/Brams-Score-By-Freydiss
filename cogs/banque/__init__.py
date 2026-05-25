from .banque import BankCog
from .tasks import BankTasksCog
from . import database as db


async def setup(bot):
    await db.migrate_vault_weekly_limit()
    await bot.add_cog(BankCog(bot))
    await bot.add_cog(BankTasksCog(bot))
