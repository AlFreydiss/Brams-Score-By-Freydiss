"""Fix sur : retablit la lecture de shop_transactions scopee a l'utilisateur.
Additif et reversible (rollback : DROP POLICY shop_transactions_own_read).
Calque exact de la policy existante user_inventory_own."""
import os, psycopg2

conn = psycopg2.connect(os.environ["SUPABASE_URL"])
conn.autocommit = True
cur = conn.cursor()

# Garde-fou : verifier que la colonne discord_id existe avant de creer la policy
cur.execute("""
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='shop_transactions' AND column_name='discord_id';
""")
if not cur.fetchone():
    raise SystemExit("ABORT: shop_transactions.discord_id introuvable")

cur.execute("DROP POLICY IF EXISTS shop_transactions_own_read ON public.shop_transactions;")
cur.execute("""
    CREATE POLICY shop_transactions_own_read ON public.shop_transactions
      FOR SELECT TO public
      USING (discord_id = _resolve_discord_id());
""")

cur.execute("""
    SELECT policyname, cmd, roles, qual FROM pg_policies
    WHERE schemaname='public' AND tablename='shop_transactions';
""")
print("OK - policies shop_transactions :")
for r in cur.fetchall():
    print("  ", r)
cur.close(); conn.close()
