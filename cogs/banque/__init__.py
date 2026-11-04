from .banque import BankCog
from .tasks import BankTasksCog
from . import database as db


async def setup(bot):
    # Une migration ratée ne doit pas empêcher /banque d'exister.
    try:
        await db.migrate_vault_weekly_limit()
    except Exception as e:
        print(f"[BANK] migration ignorée, cog chargé quand même: {e}", flush=True)
    await bot.add_cog(BankCog(bot))
    await bot.add_cog(BankTasksCog(bot))
